/*jslint browser:true*/
/*jslint node:true*/
/*jslint todo:true*/
/*global $, jQuery, alert*/

/*
To Do:
1) Add card replay support (turn by turn).
2) Add bidding support.
3) UI improvements.

Changelog:
140620: Created site and code parsing for play order.
150620: Added replay (very basic, shows all tricks and cards played)
160620: Added hand viewing and tracking support.
*/

// use this code: b0abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ

"use strict";

var bid,
    input,
    bidder,
    partnerC,
    partnerP,
    tricks = [],
    points = [0, 0, 0, 0],
    players = [[], [], [], []];

function Bid(num, suit) {
    this.num = num;
    this.suit = suit;
    this.string = function () {
        return this.num + this.suit;
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

function isValid() {
    var i;
    for (i = 0; i < input.length; i += 1) {
        if (input.indexOf(input[i]) !== input.lastIndexOf(input[i]) ||
                !((input[i].charCodeAt() > 64 && input[i].charCodeAt() < 91) ||
                    (input[i].charCodeAt() > 96 && input[i].charCodeAt() < 123))) {
            return false;
        }
    }
    return true;
}

function simulate() {
    var i,
        x;
    bid = new Bid(1, "S");
    bidder = 0;
    x = bidder;
    partnerC = charToCard(110);
    for (i = 0; i < 13; i += 1) {
        tricks[i] = new Trick(charToCard(input.charCodeAt(4 * i)),
            charToCard(input.charCodeAt(4 * i + 1)),
            charToCard(input.charCodeAt(4 * i + 2)),
            charToCard(input.charCodeAt(4 * i + 3)));
        x = tricks[i].parse(x);
    }
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
    pair1 = numToPlayer(bidder) + "-" + numToPlayer(partnerP);
    remove(temp, bidder);
    remove(temp, partnerP);
    pair2 = numToPlayer(temp[0]) + "-" + numToPlayer(temp[1]);
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
    if (isValid()) {
        simulate();
        $("#valid").html("Valid code: " + input).show();
        $("#bid").html("Winning bid is " + bid.string() +
             " by " + numToPlayer(bidder) + "(" + bid.tricks() +
             " tricks required). Partner card is " +
             partnerC.string() + ".").show();
        $("#hands").html(stringifyHand()).show();
        $("#plays").html(stringifyPlay()).show();
        $("#outcome").html(stringifyOutcome()).show();
        return false;
    }
    $("#valid").html("Invalid code - please check that you have copied the" +
        " correct code.").show();
    $(".replay").hide();
    event.preventDefault();
});
