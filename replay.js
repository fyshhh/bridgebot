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
190620: Jesus says you must rest 1 day a week (0h).
200620: Prototyped player-by-player parsing. (3h)
210620: Added player-by-player parsing, restructured parsing structure. (7h)
220620: Began structuring for proper card replay support, added hand sorting, additional code cleanup. (2h)
230620: Added card replay structuring. (4h)
240620: Improved upon card replay structuring, added link support (now possible to input a code via link). (4h)
250520: Added history support. (6h)
260620: Added tricks notification support and dynamic hand changing. (6h)
270620: Finished entirety of play support. (8h)
280620: Finished entirety of bid support. Ready for Milestone 2 deployment. (4h)
060720: Prototyped new mobile-friendly site (4h).
100720: Worked on mobile-friendly site (3h).
110720: Worked on mobile-friendly site (3h).
220720: add like what a few days inside, say add picture add favicon more bug fixes

hand0 and hand2 are fked need to fix.

use this code: 0CDzG-Y-kmcaNMAEXpqSvyhnoUJLBYzCGswlkdbHIKOuxQRWefjiDFPTrVZgt

*/

"use strict";

var i,
    j,
    bid,
    input,
    inputA,
    bidder,
    played,
    bidCode,
    partCode,
    playCode,
    partnerC,
    partnerP,
    bids = [],
    bidStarter,
    tricks = [],
    currBid = 0,
    currPlay = 0,
    points = [0, 0, 0, 0],
    currTrick = [0, 0, 0, 0],
    players = [[], [], [], []],
    playersEnd = [[], [], [], []],
    playersStart = [[], [], [], []],
    playersClone = [[], [], [], []];

function Bid(num, suit) {
    this.num = num;
    this.suit = suit;
    this.player = null;
    this.string = function () {
        var temp;
        if (this.suit === "P") {
            return "Pass";
        }
        if (this.suit === "C") {
            temp = "&#9827;";
        } else if (this.suit === "D") {
            temp = "&#9830;";
        } else if (this.suit === "H") {
            temp = "&#9829;";
        } else if (this.suit === "S") {
            temp = "&#9824;";
        } else {
            temp = "NT";
        }
        return this.num + temp;
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
        if (this.num === 10) {
            temp = "J";
        } else if (this.num === 11) {
            temp = "Q";
        } else if (this.num === 12) {
            temp = "K";
        } else if (this.num === 13) {
            temp = "A";
        } else {
            temp += 1;
        }
        if (this.suit === "C") {
            temp += "&#9827;";
        } else if (this.suit === "D") {
            temp += "&#9830;";
        } else if (this.suit === "H") {
            temp += "&#9829;";
        } else {
            temp += "&#9824;";
        }
        return temp;
    };
    this.pictureV = function () {
        var temp = this.num,
            fst = '<img src="media/vertical/',
            snd = '.jpg" width="45px" height="60px" />';
        if (this.num === 10) {
            temp = "J";
        } else if (this.num === 11) {
            temp = "Q";
        } else if (this.num === 12) {
            temp = "K";
        } else if (this.num === 13) {
            temp = "A";
        } else {
            temp += 1;
        }
        temp += this.suit;
        return fst + temp + snd;
    };
    this.pictureH = function () {
        var temp = this.num,
            fst = '<img src="media/horizontal/',
            snd = '.jpg" width="60px" height="45px" />';
        if (this.num === 10) {
            temp = "J";
        } else if (this.num === 11) {
            temp = "Q";
        } else if (this.num === 12) {
            temp = "K";
        } else if (this.num === 13) {
            temp = "A";
        } else {
            temp += 1;
        }
        temp += this.suit;
        return fst + temp + snd;
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

function compare(a, b) {
    return a.suit === b.suit
        ? a.num - b.num
        : a.suit.charCodeAt() - b.suit.charCodeAt();
}

function Trick(card1, card2, card3, card4) {
    this.winner = null;
    this.cards = [card1, card2, card3, card4];
    this.parse = function (prev) {
        var i,
            x = prev,
            winner = 0;
        for (i = 0; i < 4; i += 1) {
            this.cards[i].player = x;
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
    if (input.length < 57 ||
            (input.charAt(input.length - 54) !== "-" &&
            input.charAt(input.length - 56) !== "-")) {
        $("#valid").html("Invalid code - length issues.").show();
        return false;
    }
    inputA = input.split("-");
    bidCode = inputA[0];
    partCode = inputA[1];
    playCode = inputA[2];
    if (bidCode[0].charCodeAt() < 48 || bidCode[0].charCodeAt() > 51) {
        $("#valid").html("Invalid code - bidder number is wrong.").show();
        return false;
    }
    for (i = 1; i < bidCode.length; i += 1) {
        if (bidCode[i].charCodeAt() !== 122 &&
                (bidCode.indexOf(bidCode[i]) !== bidCode.lastIndexOf(bidCode[i]) ||
                !((bidCode[i].charCodeAt() > 64 && bidCode[i].charCodeAt() < 91) ||
                    (bidCode[i].charCodeAt() > 96 && bidCode[i].charCodeAt() < 106)))) {
            $("#valid").html("Invalid code - one or more of the bids are wrong.").show();
            return false;
        }
    }
    if (partCode.length !== 1 ||
            !((partCode.charCodeAt() > 64 && partCode.charCodeAt() < 91) ||
                (partCode.charCodeAt() > 96 && partCode.charCodeAt() < 123))) {
        $("#valid").html("Invalid code - partner card not recognized.").show();
        return false;
    }
    played = playCode[0].charCodeAt() - 96;
    playCode = playCode.substring(1);
    for (i = 1; i < playCode.length; i += 1) {
        if (playCode.indexOf(playCode[i]) !== playCode.lastIndexOf(playCode[i]) ||
                !((playCode[i].charCodeAt() > 64 && playCode[i].charCodeAt() < 91) ||
                    (playCode[i].charCodeAt() > 96 && playCode[i].charCodeAt() < 123))) {
            $("#valid").html("Invalid code - one or more of the plays are wrong.").show();
            return false;
        }
    }
    return true;
}

function simulate() {
    var i,
        j,
        x,
        curr,
        init = parseInt(bidCode[0], 10);
    bids = [];
    bidStarter = parseInt(bidCode[0], 10);
    for (i = 1; i < bidCode.length; i += 1) {
        curr = charToBid(bidCode[i].charCodeAt());
        curr.player = init;
        init = (init + 1) % 4;
        bids.push(curr);
    }
    bid = bids[bids.length - 1];
    bidder = bid.player;
    x = bid.suit === "NT" ? bidder : (bidder + 1) % 4;
    points = [0, 0, 0, 0];
    partnerC = charToCard(partCode.charCodeAt(0));
    for (i = 0; i < 4; i += 1) {
        for (j = 0; j < 13; j += 1) {
            players[i][j] = charToCard(playCode.charCodeAt(13 * i + j));
            if (players[i][j].equals(partnerC)) {
                partnerP = i;
            }
        }
    }
    currBid = 0;
    currPlay = 0;
    for (i = 0; i < played; i += 1) {
        tricks[i] = new Trick(players[x][i],
            players[(x + 1) % 4][i],
            players[(x + 2) % 4][i],
            players[(x + 3) % 4][i]);
        x = tricks[i].parse(x);
    }
    for (i = 0; i < 4; i += 1) {
        for (j = 0; j < 13; j += 1) {
            playersClone[i][j] = players[i][j];
        }
        playersClone[i].sort(compare);
    }
    for (i = 0; i < 4; i += 1) {
        for (j = 0; j < 13; j += 1) {
            playersStart[i][j] = playersClone[i][j];
        }
    }
    for (i = 0; i < 4; i += 1) {
        for (j = played; j < 13; j += 1) {
            playersEnd[i][j - played] = players[i][j];
        }
    }
}

function computeHand(arr, index) {
    var i = 0,
        str = "";
    while (arr[index][i] !== undefined) {
        str += arr[index][i].string() + ", ";
        i += 1;
    }
    return "[" + str.substring(0, str.length - 2) + "]";
}

function computeHandV(arr, index) {
    var i = 0,
        str = "";
    while (arr[index][i] !== undefined) {
        str += arr[index][i].pictureV();
        i += 1;
    }
    return str;
}

function computeHandH(arr, index) {
    var i = 0,
        str = "";
    while (arr[index][i] !== undefined) {
        str += arr[index][i].pictureH();
        i += 1;
    }
    return str;
}

function remove(arr, num) {
    var index = arr.indexOf(num);
    if (index > -1) {
        arr.splice(index, 1);
    }
}

function removeCard(arr, card) {
    var i;
    for (i = 0; i < 13; i += 1) {
        if (card.equals(arr[i])) {
            arr.splice(i, 1);
            return;
        }
    }
}

function outcome() {
    var pair1,
        pair2,
        str,
        temp = [0, 1, 2, 3];
    pair1 = bidder > partnerP && !(bidder === 2 && partnerP === 1)
        ? numToPlayer(partnerP) + "-" + numToPlayer(bidder)
        : numToPlayer(bidder) + "-" + numToPlayer(partnerP);
    remove(temp, bidder);
    remove(temp, partnerP);
    pair2 = temp[0] > temp[1] && !(temp[0] === 2 && temp[1] === 1)
        ? numToPlayer(temp[1]) + "-" + numToPlayer(temp[0])
        : numToPlayer(temp[0]) + "-" + numToPlayer(temp[1]);
    str = (points[bidder] + points[partnerP] >= bid.tricks() ? pair1 : pair2) +
        " wins!";
    return str;
}

$("form").submit(function (event) {
    input = $("#gamecode").val();
    if (validate()) {
        simulate();
        if (bidder !== partnerP) {
            for (i = 0; i < 4; i += 1) {
                if (i % 2 === 0) {
                    $("#hand" + i).html(computeHandV(playersStart, i));
                } else {
                    $("#hand" + i).html(computeHandH(playersStart, i));
                }
                $("#tricks_won" + i).html(0);
                $("#bid" + i).html("");
                $("#center" + i).html("");
                for (j = 0; j < 13; j += 1) {
                    if (j < 7) {
                        $("#bid" + j + (i + 1)).html("").removeClass("bg-success text-white");
                    }
                    $("#play" + j + (i + 1)).html("").removeClass("bg-success text-white");
                    $("#bid_row" + j).removeClass("bg-light").addClass("bg-secondary text-muted");
                    $("#play_row" + j).removeClass("bg-light").addClass("bg-secondary text-muted");
                }
            }
            if ($(window).width() <= 974) {
                $("#hand1").html(computeHandV(playersClone, 1));
                $("#hand3").html(computeHandV(playersClone, 3));
            } else {
                $("#hand1").html(computeHandH(playersClone, 1));
                $("#hand3").html(computeHandH(playersClone, 3));
            }
            $("#winning_bid").html("Winning bid: " + bid.string() +
                " by " + numToPlayer(bidder));
            $("#partner_card").html("Partner card: " + partnerC.string());
            $(".replay").show();
            $("#bid_announcement").html(numToPlayer(bidStarter) + " to bid!");
            $("#play_announcement").html(numToPlayer((bidder + (bid.suit === "NT" ? 0 : 1)) % 4) + " to play!");
            $("html, body").animate({scrollTop: ($(window).height() - 515) }, "slow");
            $("#valid").hide();
            $("#bid_history").show();
            $("#bid_center").show();
            $("#play_history").hide();
            $("#play_center").hide();
            if (!$("#bid_toggle").hasClass("active")) {
                $("#bid_toggle").addClass("active");
                $("#play_toggle").removeClass("active");
            }
            return false;
        }
        $("#valid").html("Invalid code - partner card is held by bidder.").show();
    }
    $(".replay").hide();
    event.preventDefault();
});

$(window).on('load', function () {
    var hash = window.location.hash;
    if (hash.length > 1) {
        hash = hash.substring(1);
        $("#gamecode").val(hash);
        $("form").submit();
    }
});

$(window).on('resize', function () {
    var win = $(this);
    if (win.width() <= 652) {
        $("#hand0").html(computeHand(playersClone, 0));
        $("#hand1").html(computeHand(playersClone, 1));
        $("#hand2").html(computeHand(playersClone, 2));
        $("#hand3").html(computeHand(playersClone, 3));
    } else if (win.width() <= 974) {
        $("#hand0").html(computeHandV(playersClone, 0)).addClass("border");
        $("#hand1").html(computeHandV(playersClone, 1)).addClass("border");
        $("#hand2").html(computeHandV(playersClone, 2)).addClass("border");
        $("#hand3").html(computeHandV(playersClone, 3)).addClass("border");
    } else {
        $("#hand0").html(computeHandV(playersClone, 0)).removeClass("border");
        $("#hand1").html(computeHandH(playersClone, 1)).removeClass("border");
        $("#hand2").html(computeHandV(playersClone, 2)).removeClass("border");
        $("#hand3").html(computeHandH(playersClone, 3)).removeClass("border");
    }
});

$("#bid_toggle").on('click', function () {
    if (!$("#bid_toggle").hasClass("active")) {
        $("#bid_toggle").addClass("active");
        $("#play_toggle").removeClass("active");
        $("#bid_center").show();
        $("#play_center").hide();
        $("#bid_history").show();
        $("#play_history").hide();
        $("#bid_nav_bar").show();
        $("#play_nav_bar").hide();
    }
});

$("#play_toggle").on('click', function () {
    if (!$("#play_toggle").hasClass("active")) {
        $("#bid_toggle").removeClass("active");
        $("#play_toggle").addClass("active");
        $("#bid_center").hide();
        $("#play_center").show();
        $("#bid_history").hide();
        $("#play_history").show();
        $("#bid_nav_bar").hide();
        $("#play_nav_bar").show();
    }
});

$("#restartbid").on('click', function () {
    var i;
    $("#bid_announcement").html(numToPlayer(bidStarter) + " to bid!");
    for (i = 0; i < 4; i += 1) {
        $("#bid" + i).html("");
    }
    while (currBid > 0) {
        if (currBid % 4 === 1) {
            $("#bid_row" + Math.floor(currBid / 4)).removeClass("bg-light").addClass("bg-secondary text-muted");
        }
        if (currBid === bids.length + 3) {
            $("#bid" + (Math.floor(currBid / 4) - 1) + (bidder + 1)).removeClass("bg-success text-white");
        }
        currBid -= 1;
        $("#bid" + Math.floor(currBid / 4) + (currBid % 4 + 1)).html("");
    }
});

$("#prev4bid").on('click', function () {
    var temp = currBid;
    if (currBid !== 0) {
        while (currBid > Math.max(0, temp - 4)) {
            if (currBid !== 0) {
                if (currBid % 4 === 1) {
                    $("#bid_row" + Math.floor(currBid / 4)).removeClass("bg-light").addClass("bg-secondary text-muted");
                }
                if (currBid === bids.length + 3) {
                    $("#bid" + (Math.floor(currBid / 4) - 1) + (bidder + 1)).removeClass("bg-success text-white");
                }
                currBid -= 1;
                $("#bid" + Math.floor(currBid / 4) + (currBid % 4 + 1)).html("");
                $("#bid" + ((bidStarter + currBid) % 4)).html((currBid >= 4 ? bids[currBid - 4].string() : ""));
                $("#bid_announcement").html(numToPlayer((bidStarter + currBid) % 4) + " to bid!");
            }
        }
    }
});

$("#prevbid").on('click', function () {
    if (currBid !== 0) {
        if (currBid % 4 === 1) {
            $("#bid_row" + Math.floor(currBid / 4)).removeClass("bg-light").addClass("bg-secondary text-muted");
        }
        if (currBid === bids.length + 3) {
            $("#bid" + (Math.floor(currBid / 4) - 1) + (bidder + 1)).removeClass("bg-success text-white");
        }
        currBid -= 1;
        $("#bid" + Math.floor(currBid / 4) + (currBid % 4 + 1)).html("");
        $("#bid" + ((bidStarter + currBid) % 4)).html((currBid >= 4 ? bids[currBid - 4].string() : ""));
        $("#bid_announcement").html(numToPlayer((bidStarter + currBid) % 4) + " to bid!");
    }
});

$("#nextbid").on('click', function () {
    var row = Math.floor(currBid / 4);
    if (currBid < bids.length) {
        $("#bid" + ((bidStarter + currBid) % 4)).html(bids[currBid].string());
        $("#bid" + row + ((bidStarter + currBid) % 4 + 1)).html(bids[currBid].string());
        $("#bid_row" + row).removeClass("bg-secondary text-muted");
        if (row % 2 === 1) {
            $("#bid_row" + row).addClass("bg-light");
        }
        currBid += 1;
        $("#bid_announcement").html(numToPlayer((bidStarter + currBid) % 4) + " to bid!");
    } else if (currBid < bids.length + 3) {
        if (currBid === bids.length + 2) {
            $("#bid" + ((bidStarter + currBid) % 4)).html(charToBid("z".charCodeAt()).string());
            $("#bid" + row + ((bidStarter + currBid) % 4 + 1)).html(charToBid("z".charCodeAt()).string());
            $("#bid_row" + row).removeClass("bg-secondary text-muted");
            if (row % 2 === 1) {
                $("#bid_row" + row).addClass("bg-light");
            }
            currBid += 1;
            $("#bid_announcement").html(numToPlayer(bidder) + " wins the bid!");
            $("#bid" + (bidder === bidStarter ? row : row - 1) + (bidder + 1)).addClass("bg-success text-white");
        } else {
            $("#bid" + ((bidStarter + currBid) % 4)).html(charToBid("z".charCodeAt()).string());
            $("#bid" + row + ((bidStarter + currBid) % 4 + 1)).html(charToBid("z".charCodeAt()).string());
            $("#bid_row" + row).removeClass("bg-secondary text-muted");
            if (row % 2 === 1) {
                $("#bid_row" + row).addClass("bg-light");
            }
            currBid += 1;
            $("#bid_announcement").html(numToPlayer((bidStarter + currBid) % 4) + " to bid!");
        }
    }
});

$("#next4bid").on('click', function () {
    var row = Math.floor(currBid / 4),
        temp = currBid;
    if (currBid < bids.length + 3) {
        while (currBid < Math.min(bids.length + 3, temp + 4)) {
            if (currBid < bids.length) {
                $("#bid" + ((bidStarter + currBid) % 4)).html(bids[currBid].string());
                $("#bid" + row + ((bidStarter + currBid) % 4 + 1)).html(bids[currBid].string());
                $("#bid_row" + row).removeClass("bg-secondary text-muted");
                if (row % 2 === 1) {
                    $("#bid_row" + row).addClass("bg-light");
                }
                currBid += 1;
                $("#bid_announcement").html(numToPlayer((bidStarter + currBid) % 4) + " to bid!");
            } else if (currBid < bids.length + 3) {
                if (currBid === bids.length + 2) {
                    $("#bid" + ((bidStarter + currBid) % 4)).html(charToBid("z".charCodeAt()).string());
                    $("#bid" + row + ((bidStarter + currBid) % 4 + 1)).html(charToBid("z".charCodeAt()).string());
                    $("#bid_row" + row).removeClass("bg-secondary text-muted");
                    if (row % 2 === 1) {
                        $("#bid_row" + row).addClass("bg-light");
                    }
                    currBid += 1;
                    $("#bid_announcement").html(numToPlayer(bidder) + " wins the bid!");
                    $("#bid" + (bidder === bidStarter ? row : row - 1) + (bidder + 1)).addClass("bg-success text-white");
                } else {
                    $("#bid" + ((bidStarter + currBid) % 4)).html(charToBid("z".charCodeAt()).string());
                    $("#bid" + row + ((bidStarter + currBid) % 4 + 1)).html(charToBid("z".charCodeAt()).string());
                    $("#bid_row" + row).removeClass("bg-secondary text-muted");
                    if (row % 2 === 1) {
                        $("#bid_row" + row).addClass("bg-light");
                    }
                    currBid += 1;
                    $("#bid_announcement").html(numToPlayer((bidStarter + currBid) % 4) + " to bid!");
                }
            }
            row = Math.floor(currBid / 4);
        }
    }
});

$("#skipbid").on('click', function () {
    var row = Math.floor(currBid / 4);
    if (currBid < bids.length + 3) {
        while (currBid < bids.length + 3) {
            if (currBid < bids.length) {
                $("#bid" + ((bidStarter + currBid) % 4)).html(bids[currBid].string());
                $("#bid" + row + ((bidStarter + currBid) % 4 + 1)).html(bids[currBid].string());
                $("#bid_row" + row).removeClass("bg-secondary text-muted");
                if (row % 2 === 1) {
                    $("#bid_row" + row).addClass("bg-light");
                }
                currBid += 1;
                $("#bid_announcement").html(numToPlayer((bidStarter + currBid) % 4) + " to bid!");
            } else if (currBid < bids.length + 3) {
                if (currBid === bids.length + 2) {
                    $("#bid" + ((bidStarter + currBid) % 4)).html(charToBid("z".charCodeAt()).string());
                    $("#bid" + row + ((bidStarter + currBid) % 4 + 1)).html(charToBid("z".charCodeAt()).string());
                    $("#bid_row" + row).removeClass("bg-secondary text-muted");
                    if (row % 2 === 1) {
                        $("#bid_row" + row).addClass("bg-light");
                    }
                    currBid += 1;
                    $("#bid_announcement").html(numToPlayer(bidder) + " wins the bid!");
                    $("#bid" + (bidder === bidStarter ? row : row - 1) + (bidder + 1)).addClass("bg-success text-white");
                } else {
                    $("#bid" + ((bidStarter + currBid) % 4)).html(charToBid("z".charCodeAt()).string());
                    $("#bid" + row + ((bidStarter + currBid) % 4 + 1)).html(charToBid("z".charCodeAt()).string());
                    $("#bid_row" + row).removeClass("bg-secondary text-muted");
                    if (row % 2 === 1) {
                        $("#bid_row" + row).addClass("bg-light");
                    }
                    currBid += 1;
                    $("#bid_announcement").html(numToPlayer((bidStarter + currBid) % 4) + " to bid!");
                }
            }
            row = Math.floor(currBid / 4);
        }
    }
});


$("#restartplay").on('click', function () {
    var i,
        j,
        card,
        play,
        prev,
        trick,
        player;
    if (currPlay !== 0) {
        prev = 0;
        for (currPlay; currPlay > prev; currPlay -= 1) {
            if (currPlay % 5 !== 0) {
                play = currPlay % 5 - 1;
                trick = Math.floor(currPlay / 5);
                if (currPlay % 5 === 1) {
                    $("#play_row" + trick).addClass("bg-secondary text-muted");
                }
                if (currPlay % 10 === 6) {
                    $("#play_row" + trick).removeClass("bg-light");
                }
                card = tricks[trick].cards[play];
                player = card.player;
                $("#play" + trick + (player + 1)).html("");
            } else {
                trick = currPlay / 5 - 1;
                player = tricks[trick].winner;
                $("#play" + trick + (player + 1)).removeClass("bg-success text-white");
            }
        }
        for (i = 0; i < 4; i += 1) {
            playersClone[i] = [];
            for (j = 0; j < 13; j += 1) {
                playersClone[i][j] = playersStart[i][j];
            }
            if (i % 2 === 0) {
                $("#hand" + i).html(computeHandV(playersClone, i));
            } else {
                $("#hand" + i).html(computeHandH(playersClone, i));
            }
            $("#center" + i).css('visibility', 'hidden');
            currTrick[i] = 0;
            $("#tricks_won" + i).html(0);
        }
        $("#play_info").html("Skipped to start!").stop(true, true).css("opacity", 1).animate({opacity: 0}, 1000);
    }
    $("#play_announcement").html(numToPlayer((bidder + (bid.suit === "NT" ? 0 : 1)) % 4) + " to play!");
});

$("#prevtrick").on('click', function () {
    var card,
        play,
        prev,
        trick,
        player;
    if (currPlay !== 0) {
        if (currPlay % 5 === 0) {
            prev = Math.max(0, currPlay - 5);
        } else {
            prev = Math.floor(currPlay / 5) * 5;
        }
        while (currPlay > prev) {
            if (currPlay % 5 !== 0) {
                play = currPlay % 5 - 1;
                trick = Math.floor(currPlay / 5);
                if (currPlay % 5 === 1) {
                    $("#play_row" + trick).addClass("bg-secondary text-muted");
                }
                if (currPlay % 10 === 6) {
                    $("#play_row" + trick).removeClass("bg-light");
                }
                card = tricks[trick].cards[play];
                player = card.player;
                $("#play" + trick + (player + 1)).html("");
                $("#center" + player).html(player % 2 === 0 ? card.pictureV() : card.pictureH()).css('visibility', 'hidden');
            } else {
                trick = currPlay / 5 - 1;
                player = tricks[trick].winner;
                currTrick[player] -= 1;
                $("#tricks_won" + player).html(currTrick[player]);
                $("#play" + trick + (player + 1)).removeClass("bg-success text-white");
            }
            currPlay -= 1;
            if (currPlay % 5 !== 4) {
                playersClone[player].push(card);
                playersClone[player].sort(compare);
                if (player % 2 === 0) {
                    $("#hand" + player).html(computeHandV(playersClone, player));
                } else {
                    $("#hand" + player).html(computeHandH(playersClone, player));
                }
            }
        }
        if (currPlay !== 0) {
            trick = currPlay / 5 - 1;
            player = tricks[trick].winner;
            $("#play_info").html(numToPlayer(player) +
                " takes the trick!").stop(true, true).css("opacity", 1).animate({opacity: 0}, 1000);
            $("#play_announcement").html(numToPlayer(player) + " to play!");
        } else {
            $("#play_announcement").html(numToPlayer((bidder + (bid.suit === "NT" ? 0 : 1)) % 4) + " to play!");
        }
    }
});

$("#prevplay").on('click', function () {
    var card,
        play,
        trick,
        player;
    if (currPlay !== 0) {
        if (currPlay % 5 !== 0) {
            play = currPlay % 5 - 1;
            trick = Math.floor(currPlay / 5);
            if (currPlay % 5 === 1) {
                $("#play_row" + trick).addClass("bg-secondary text-muted");
            }
            if (currPlay % 10 === 6) {
                $("#play_row" + trick).removeClass("bg-light");
            }
            card = tricks[trick].cards[play];
            player = card.player;
            $("#play" + trick + (player + 1)).html("");
            $("#center" + player).css('visibility', 'hidden');
        } else {
            trick = currPlay / 5 - 1;
            player = tricks[trick].winner;
            $("#play" + trick + (player + 1)).removeClass("bg-success text-white");
            currTrick[player] -= 1;
            $("#tricks_won" + player).html(currTrick[player]);
            for (i = 0; i < 4; i += 1) {
                card = tricks[trick].cards[i];
                player = card.player;
                $("#center" + player).html(player % 2 === 0 ? card.pictureV() : card.pictureH()).css('visibility', 'visible');
            }
        }
        currPlay -= 1;
        if (currPlay % 5 !== 4) {
            playersClone[player].push(card);
            playersClone[player].sort(compare);
            if (player % 2 === 0) {
                $("#hand" + player).html(computeHandV(playersClone, player));
            } else {
                $("#hand" + player).html(computeHandH(playersClone, player));
            }
        }
        if (currPlay % 5 !== 0) {
            play = currPlay % 5 - 1;
            trick = Math.floor(currPlay / 5);
            card = tricks[trick].cards[play];
            player = card.player;
            $("#play_info").html(numToPlayer(player) +
                " plays " + card.string() + "!").stop(true, true).css("opacity", 1).animate({opacity: 0}, 1000);
            if (currPlay % 5 === 4) {
                $("#play_announcement").html("Determining winner...");
            } else {
                $("#play_announcement").html(numToPlayer((player + 1) % 4) + " to play!");
            }
        } else if (currPlay !== 0) {
            trick = currPlay / 5 - 1;
            player = tricks[trick].winner;
            $("#play_info").html(numToPlayer(player) +
                " takes the trick!").stop(true, true).css("opacity", 1).animate({opacity: 0}, 1000);
            $("#play_announcement").html(numToPlayer(player) + " to play!");
        } else {
            $("#play_announcement").html(numToPlayer((bidder + (bid.suit === "NT" ? 0 : 1)) % 4) + " to play!");
        }
    }
});

$("#nextplay").on('click', function () {
    var i,
        card,
        play,
        trick,
        player;
    if (currPlay !== played * 5) {
        currPlay += 1;
        if (currPlay % 5 !== 0) {
            play = currPlay % 5 - 1;
            trick = Math.floor(currPlay / 5);
            if (currPlay % 5 === 1) {
                $("#play_row" + trick).removeClass("bg-secondary text-muted");
            }
            if (currPlay % 10 === 6) {
                $("#play_row" + trick).addClass("bg-light");
            }
            card = tricks[trick].cards[play];
            player = card.player;
            removeCard(playersClone[player], card);
            if (player % 2 === 0) {
                $("#hand" + player).html(computeHandV(playersClone, player));
            } else {
                $("#hand" + player).html(computeHandH(playersClone, player));
            }
            $("#play" + trick + (player + 1)).html(card.string());
            if (card.equals(partnerC)) {
                $("#play" + trick + (player + 1)).css('font-style', 'italic');
            }
            $("#play_info").html(numToPlayer(player) +
                " plays " + card.string() + "!").stop(true, true).css("opacity", 1).animate({opacity: 0}, 1000);
            $("#center" + player).html(player % 2 === 0 ? card.pictureV() : card.pictureH()).css('visibility', 'visible');
            $("#play_announcement").html(numToPlayer((player + 1) % 4) + " to play!");
            if (currPlay % 5 === 4) {
                $("#play_announcement").html("Determining winner...");
            }
        } else {
            trick = currPlay / 5 - 1;
            player = tricks[trick].winner;
            for (i = 0; i < 4; i += 1) {
                $("#center" + i).css('visibility', 'hidden');
            }
            $("#play" + trick + (player + 1)).addClass("bg-success text-white");
            $("#play_info").html(numToPlayer(player) +
                " takes the trick!").stop(true, true).css("opacity", 1).animate({opacity: 0}, 1000);
            currTrick[player] += 1;
            $("#tricks_won" + player).html(currTrick[player]);
            if (currPlay === played * 5) {
                $("#play_announcement").html(outcome());
            } else {
                $("#play_announcement").html(numToPlayer(player % 4) + " to play!");
            }
        }
    }
});

$("#nexttrick").on('click', function () {
    var card,
        next,
        play,
        trick,
        player;
    if (currPlay !== played * 5) {
        if (currPlay % 5 === 0) {
            next = Math.min(currPlay + 5, played * 5);
        } else {
            next = Math.ceil(currPlay / 5) * 5;
        }
        for (currPlay += 1; currPlay <= next; currPlay += 1) {
            if (currPlay % 5 !== 0) {
                play = currPlay % 5 - 1;
                trick = Math.floor(currPlay / 5);
                if (currPlay % 5 === 1) {
                    $("#play_row" + trick).removeClass("bg-secondary text-muted");
                }
                if (currPlay % 10 === 6) {
                    $("#play_row" + trick).addClass("bg-light");
                }
                card = tricks[trick].cards[play];
                player = card.player;
                removeCard(playersClone[player], card);
                if (player % 2 === 0) {
                    $("#hand" + player).html(computeHandV(playersClone, player));
                } else {
                    $("#hand" + player).html(computeHandH(playersClone, player));
                }
                $("#play" + trick + (player + 1)).html(card.string());
                if (card.equals(partnerC)) {
                    $("#play" + trick + (player + 1)).css('font-style', 'italic');
                }
            } else {
                trick = currPlay / 5 - 1;
                player = tricks[trick].winner;
                $("#play" + trick + (player + 1)).addClass("bg-success text-white");
                $("#play_info").html(numToPlayer(player) +
                    " takes the trick!").stop(true, true).css("opacity", 1).animate({opacity: 0}, 1000);
                currTrick[player] += 1;
                $("#tricks_won" + player).html(currTrick[player]);
                $("#play_announcement").html(numToPlayer(player) + " to play!");
            }
        }
        for (i = 0; i < 4; i += 1) {
            $("#center" + i).css('visibility', 'hidden');
        }
        currPlay -= 1;
        if (currPlay === played * 5) {
            $("#play_announcement").html(outcome());
        }
    }
});

$("#skipplay").on('click', function () {
    var i,
        j,
        card,
        next,
        play,
        trick,
        player;
    if (currPlay !== played * 5) {
        next = played * 5;
        for (currPlay += 1; currPlay <= next; currPlay += 1) {
            if (currPlay % 5 !== 0) {
                play = currPlay % 5 - 1;
                trick = Math.floor(currPlay / 5);
                if (currPlay % 5 === 1) {
                    $("#play_row" + trick).removeClass("bg-secondary text-muted");
                }
                if (currPlay % 10 === 6) {
                    $("#play_row" + trick).addClass("bg-light");
                }
                card = tricks[trick].cards[play];
                player = card.player;
                $("#play" + trick + (player + 1)).html(card.string());
                if (card.equals(partnerC)) {
                    $("#play" + trick + (player + 1)).css('font-style', 'italic');
                }
            } else {
                trick = currPlay / 5 - 1;
                player = tricks[trick].winner;
                $("#play" + trick + (player + 1)).addClass("bg-success text-white");
                currTrick[player] += 1;
                $("#tricks_won" + player).html(currTrick[player]);
            }
        }
        currPlay -= 1;
        for (i = 0; i < 4; i += 1) {
            playersClone[i] = [];
            for (j = 0; j < 13 - played; j += 1) {
                playersClone[i][j] = playersEnd[i][j];
            }
            if (i % 2 === 0) {
                $("#hand" + i).html(computeHandV(playersClone, i));
            } else {
                $("#hand" + i).html(computeHandH(playersClone, i));
            }
        }
        for (i = 0; i < 4; i += 1) {
            $("#center" + i).css('visibility', 'hidden');
        }
        $("#play_announcement").html(outcome());
        $("#play_info").html("Skipped to end!").stop(true, true).css("opacity", 1).animate({opacity: 0}, 1000);
    }
});
