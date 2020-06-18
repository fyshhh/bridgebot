/*jslint browser:true*/
/*jslint node:true*/
/*jslint todo:true*/
/*global $, jQuery, alert*/

/*
To Do:
1) Add card replay support (turn by turn, may require splitting html elements).
2) UI improvements (look into pictures/animations).
3) Add advanced options (show/hide all hands, show/hide results).

Changelog:
140620: Created site and code parsing for play order. (6h)
150620: Added replay (very basic, shows all tricks and cards played) (6h)
160620: Added hand viewing and tracking and partner support. (6h)
170620: Added bid and partner parsing, as well as proper code validation. (6h)
180620: Added pass support (2h).

Known bugs:
1) Cannot support prematurely ended games (rework parsing to player by player instead of trick by trick).
*/

// use this code: b0b0abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ

"use strict";

var bid,
    bids = [],
    input,
    inputA,
    bidder,
    bidCode,
    partCode,
    playCode,
    partnerC,
    partnerP,
    tricks = [],
    points = [0, 0, 0, 0],
    players = [[], [], [], []];

function Bid(num, suit) {
    this.num = num;
    this.suit = suit;
    this.player = null;
    this.string = function () {
        return suit === "P"
            ? "Pass"
            : this.num + this.suit;
    };
    this.tricks = function () {
        return this.num + 6;
    };
}

function numToPlayer(num) {
    if (num === 0) {
        return "North";
    }
    if (num === 1) {
        return "East";
    }
    if (num === 2) {
        return "South";
    }
    return "West";
}

function Card(num, suit) {
    this.num = num;
    this.suit = suit;
    this.player = null;
    this.string = function () {
        var temp = this.num;
        if (num === 10) {
            temp = "J";
        } else if (num === 11) {
            temp = "Q";
        } else if (num === 12) {
            temp = "K";
        } else if (num === 13) {
            temp = "A";
        } else {
            temp += 1;
        }
        return temp + this.suit;
    };
    this.stringP = function () {
        return this.string() + " (" + numToPlayer(this.player) + ")";
    };
    this.equals = function (card) {
        return this.num === card.num && this.suit === card.suit;
    };
    this.smallerThan = function (card) {
        if (this.suit === bid.suit) {
            return card.suit === bid.suit && this.num < card.num;
        }
        return card.suit === bid.suit || (this.suit === card.suit
            && this.num < card.num);
    };
}

function Trick(card1, card2, card3, card4) {
    this.winner = null;
    this.cards = [card1, card2, card3, card4];
    this.string = function () {
        return "[" + this.cards[0].stringP() +
            ", " + this.cards[1].stringP() +
            ", " + this.cards[2].stringP() +
            ", " + this.cards[3].stringP() + "]";
    };
    this.parse = function (prev) {
        var i,
            x = prev,
            winner = 0;
        for (i = 0; i < 4; i += 1) {
            this.cards[i].player = x;
            players[x].push(this.cards[i]);
            if (this.cards[i].equals(partnerC)) {
                partnerP = this.cards[i].player;
            }
            x = (x + 1) % 4;
        }
        for (i = 0; i < 4; i += 1) {
            if (this.cards[winner].smallerThan(this.cards[i])) {
                winner = i;
            }
        }
        this.winner = this.cards[winner].player;
        points[this.winner] += 1;
        return this.winner;
    };
}

function charToBid(char) {
    var num,
        suit,
        temp = char;
    if (temp === 122) {
        return new Bid(0, "P");
    }
    if (temp > 90) {
        temp -= 6;
    }
    temp -= 64;
    num = Math.ceil(temp / 5);
    suit = temp % 5;
    if (suit === 1) {
        suit = "C";
    } else if (suit === 2) {
        suit = "D";
    } else if (suit === 3) {
        suit = "H";
    } else if (suit === 4) {
        suit = "S";
    } else {
        suit = "NT";
    }
    return new Bid(num, suit);
}

function charToCard(char) {
    var suit = "",
        num = char;
    if (num < 78) {
        suit = "C";
        num -= 64;
    } else if (num < 91) {
        suit = "D";
        num -= 77;
    } else if (num < 110) {
        suit = "H";
        num -= 96;
    } else {
        suit = "S";
        num -= 109;
    }
    return new Card(num, suit);
}

function validate() {
    var i;
    if (input.length < 56 ||
            (input.charAt(input.length - 53) !== "-" &&
            input.charAt(input.length - 55) !== "-")) {
        return false;
    }
    inputA = input.split("-");
    bidCode = inputA[0];
    partCode = inputA[1];
    playCode = inputA[2];
    if (bidCode[0].charCodeAt() < 48 || bidCode[0].charCodeAt() > 51) {
        return false;
    }
    for (i = 1; i < bidCode.length; i += 1) {
        if (bidCode[i].charCodeAt() !== 122 &&
                (bidCode.indexOf(bidCode[i]) !== bidCode.lastIndexOf(bidCode[i]) ||
                !((bidCode[i].charCodeAt() > 64 && bidCode[i].charCodeAt() < 91) ||
                    (bidCode[i].charCodeAt() > 96 && bidCode[i].charCodeAt() < 105)))) {
            return false;
        }
    }
    if (partCode.length !== 1 ||
            !((partCode.charCodeAt() > 64 && partCode.charCodeAt() < 91) ||
                (partCode.charCodeAt() > 96 && partCode.charCodeAt() < 123))) {
        return false;
    }
    for (i = 0; i < playCode.length; i += 1) {
        if (playCode.indexOf(playCode[i]) !== playCode.lastIndexOf(playCode[i]) ||
                !((playCode[i].charCodeAt() > 64 && playCode[i].charCodeAt() < 91) ||
                    (playCode[i].charCodeAt() > 96 && playCode[i].charCodeAt() < 123))) {
            return false;
        }
    }
    return true;
}

function simulate() {
    var i,
        x,
        curr,
        init = parseInt(bidCode[0], 10);
    bids = [];
    for (i = 1; i < bidCode.length; i += 1) {
        curr = charToBid(bidCode[i].charCodeAt());
        curr.player = init;
        init = (init + 1) % 4;
        bids.push(curr);
    }
    bid = bids[bids.length - 1];
    bidder = bid.player;
    x = bidder;
    points = [0, 0, 0, 0];
    partnerC = charToCard(partCode.charCodeAt(0));
    for (i = 0; i < 13; i += 1) {
        tricks[i] = new Trick(charToCard(playCode.charCodeAt(4 * i)),
            charToCard(playCode.charCodeAt(4 * i + 1)),
            charToCard(playCode.charCodeAt(4 * i + 2)),
            charToCard(playCode.charCodeAt(4 * i + 3)));
        x = tricks[i].parse(x);
    }
}

function stringifyBids() {
    var i,
        str;
    str = "Bid order:<br>";
    for (i = 0; i < bids.length; i += 1) {
        str += bids[i].string() + " by " + numToPlayer(bids[i].player) + "<br>";
    }
    return str;
}

function computeHand(index) {
    var i,
        str = "";
    for (i = 0; i < 13; i += 1) {
        str += players[index][i].string() + ", ";
    }
    return "[" + str.substring(0, str.length - 2) + "]";
}

function stringifyHand() {
    var i,
        str = "";
    for (i = 0; i < 4; i += 1) {
        str += numToPlayer(i) + ": " + computeHand(i) + "<br>";
    }
    return str;
}

function stringifyPlay() {
    var i,
        str = "";
    str += "Play order: ";
    for (i = 0; i < 13; i += 1) {
        str += "<br>Trick " + (i + 1) + " won by " +
            numToPlayer(tricks[i].winner) + ": " + tricks[i].string();
    }
    return str;
}

function remove(arr, num) {
    var index = arr.indexOf(num);
    if (index > -1) {
        arr.splice(index, 1);
    }
}

function stringifyOutcome() {
    var pair1,
        pair2,
        str,
        temp = [0, 1, 2, 3];
    pair1 = bidder === 1 && partnerP === 2
        ? numToPlayer(partnerP) + "-" + numToPlayer(bidder)
        : numToPlayer(bidder) + "-" + numToPlayer(partnerP);
    remove(temp, bidder);
    remove(temp, partnerP);
    pair2 = temp[0] === 1 && temp[1] === 2
        ? numToPlayer(temp[1]) + "-" + numToPlayer(temp[0])
        : numToPlayer(temp[0]) + "-" + numToPlayer(temp[1]);
    str = "Partners are " + pair1 + " (bidders) and " + pair2 + ".<br>" +
        pair1 + " took " + (points[bidder] + points[partnerP]) +
        " tricks and " + pair2 + " took " +
        (points[temp[0]] + points[temp[1]]) + ", leading to " +
        (points[bidder] + points[partnerP] >= bid.tricks() ? pair1 : pair2) +
        " victory!";
    return str;
}

$("form").submit(function (event) {
    input = $("#gamecode").val();
    if (validate()) {
        simulate();
        if (bidder !== partnerP) {
            $("#valid").html("Valid code: " + input).show();
            $("#bid_win").html("Winning bid is " + bid.string() +
                 " by " + numToPlayer(bidder) + " (" + bid.tricks() +
                 " tricks required). Partner card is " +
                 partnerC.string() + ".").show();
            $("#bid_gen").html(stringifyBids()).show();
            $("#hands").html(stringifyHand()).show();
            $("#plays").html(stringifyPlay()).show();
            $("#outcome").html(stringifyOutcome()).show();
            return false;
        }
    }
    $("#valid").html("Invalid code - please check that you have copied the" +
        " correct code.").show();
    $(".replay").hide();
    event.preventDefault();
});
