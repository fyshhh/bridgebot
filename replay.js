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
270620:

sample game:

1h 1s p 2d p p p

ah(0) 9h(1) kh(2) 6h(3)
4h(0) 2s(1) qh(2) 7h(3)
5h(2) jh(3) 2h(0) 3s(1)
10h(3) 2d(0) 9d(1) 3h(2)
jc(1) 9c(2) 5c(3) ac(0)
2c(0) kc(1) 10c(2) 7c(3)
3c(1) qc(2) 4d(3) 6c(0)
8d(3) qd(0) kd(1) 3d(2)
as(1) 9s(2) 6s(3) 4s(0)
4c(1) qs(2) 10d(3) 5s(0)
ad(3) 7d(0) 8c(1) 5d(2)

unplayed:
0) 10s ks
1) 7s js
2) 6d jd
3) 8h 8s

use this code: 0CDzG-Y-kmcaNMAEXpqSvyhnoUJLBYzCGswlkdbHIKOuxQRWefjiDFPTrVZgt

*/

"use strict";

var i,
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
    tricks = [],
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
        } else if (num === 11) {
            temp = "Q";
        } else if (num === 12) {
            temp = "K";
        } else if (num === 13) {
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

function compare(a, b) {
    return a.suit === b.suit
        ? a.num - b.num
        : a.suit.charCodeAt() - b.suit.charCodeAt();
}

function Trick(card1, card2, card3, card4) {
    this.winner = null;
    this.cards = [card1, card2, card3, card4];
    this.string = function () {
        return "[" + this.cards[0].stringP() +
            (this.winner === 0 ? "[W]" : "") +
            ", " + this.cards[1].stringP() +
            (this.winner === 1 ? "[W]" : "") +
            ", " + this.cards[2].stringP() +
            (this.winner === 2 ? "[W]" : "") +
            ", " + this.cards[3].stringP() +
            (this.winner === 3 ? "[W]" : "") + "]";
    };
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

function stringifyPlay() {
    var i,
        str = "";
    str += "History: ";
    for (i = 0; i < played; i += 1) {
        str += "<br>Trick " + (i + 1) + ": " + tricks[i].string();
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
                $("#hand" + i).html(computeHand(playersStart, i));
                $("#tricks_won" + i).html(0);
            }
            $("#winning_bid").html("Winning bid: " + bid.string() +
                " by " + numToPlayer(bidder));
            $("#partner_card").html("Partner card: " + partnerC.string());
            $(".replay").show();
            $("#announcement").html(numToPlayer((bidder + (bid.suit === "NT" ? 0 : 1)) % 4) + " to play!");
            console.log($(window).scrollTop());
            $("html, body").animate({scrollTop: ($(window).height() - 465) }, "slow");
            $("#valid").hide();
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

$("#restart").on('click', function () {
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
                    $("#row" + trick).addClass("bg-secondary text-muted");
                }
                if (currPlay % 10 === 6) {
                    $("#row" + trick).removeClass("bg-light");
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
            $("#hand" + i).html(computeHand(playersClone, i));
            $("#center" + i).css('visibility', 'hidden');
            currTrick[i] = 0;
            $("#tricks_won" + i).html(0);
        }
        $("#play_info").html("Skipped to start!").stop(true, true).show().fadeOut(1000);
    }
    $("#announcement").html(numToPlayer((bidder + (bid.suit === "NT" ? 0 : 1)) % 4) + " to play!");
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
                    $("#row" + trick).addClass("bg-secondary text-muted");
                }
                if (currPlay % 10 === 6) {
                    $("#row" + trick).removeClass("bg-light");
                }
                card = tricks[trick].cards[play];
                player = card.player;
                $("#play" + trick + (player + 1)).html("");
                $("#center" + player).html(card.string()).css('visibility', 'hidden');
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
                $("#hand" + player).html(computeHand(playersClone, player));
            }
        }
        if (currPlay !== 0) {
            trick = currPlay / 5 - 1;
            player = tricks[trick].winner;
            $("#play_info").html(numToPlayer(player) +
                " takes the trick!").stop(true, true).show().fadeOut(1000);
            $("#announcement").html(numToPlayer(player) + " to play!");
        } else {
            $("#announcement").html(numToPlayer((bidder + (bid.suit === "NT" ? 0 : 1)) % 4) + " to play!");
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
                $("#row" + trick).addClass("bg-secondary text-muted");
            }
            if (currPlay % 10 === 6) {
                $("#row" + trick).removeClass("bg-light");
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
                $("#center" + player).html(card.string()).css('visibility', 'visible');
            }
        }
        currPlay -= 1;
        if (currPlay % 5 !== 4) {
            playersClone[player].push(card);
            playersClone[player].sort(compare);
            $("#hand" + player).html(computeHand(playersClone, player));
        }
        if (currPlay % 5 !== 0) {
            play = currPlay % 5 - 1;
            trick = Math.floor(currPlay / 5);
            card = tricks[trick].cards[play];
            player = card.player;
            $("#play_info").html(numToPlayer(player) +
                " plays " + card.string() + "!").stop(true, true).show().fadeOut(1000);
            if (currPlay % 5 === 4) {
                $("#announcement").html("Determining winner...");
            } else {
                $("#announcement").html(numToPlayer((player + 1) % 4) + " to play!");
            }
        } else if (currPlay !== 0) {
            trick = currPlay / 5 - 1;
            player = tricks[trick].winner;
            $("#play_info").html(numToPlayer(player) +
                " takes the trick!").stop(true, true).show().fadeOut(1000);
            $("#announcement").html(numToPlayer(player) + " to play!");
        } else {
            $("#announcement").html(numToPlayer((bidder + (bid.suit === "NT" ? 0 : 1)) % 4) + " to play!");
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
                $("#row" + trick).removeClass("bg-secondary text-muted");
            }
            if (currPlay % 10 === 6) {
                $("#row" + trick).addClass("bg-light");
            }
            card = tricks[trick].cards[play];
            player = card.player;
            removeCard(playersClone[player], card);
            $("#hand" + player).html(computeHand(playersClone, player));
            $("#play" + trick + (player + 1)).html(card.string());
            if (card.equals(partnerC)) {
                $("#play" + trick + (player + 1)).css('font-style', 'italic');
            }
            $("#play_info").html(numToPlayer(player) +
                " plays " + card.string() + "!").stop(true, true).show().fadeOut(1000);
            $("#center" + player).html(card.string()).css('visibility', 'visible');
            $("#announcement").html(numToPlayer((player + 1) % 4) + " to play!");
            if (currPlay % 5 === 4) {
                $("#announcement").html("Determining winner...");
            }
        } else {
            trick = currPlay / 5 - 1;
            player = tricks[trick].winner;
            for (i = 0; i < 4; i += 1) {
                $("#center" + i).css('visibility', 'hidden');
            }
            $("#play" + trick + (player + 1)).addClass("bg-success text-white");
            $("#play_info").html(numToPlayer(player) +
                " takes the trick!").stop(true, true).show().fadeOut(1000);
            currTrick[player] += 1;
            $("#tricks_won" + player).html(currTrick[player]);
            if (currPlay === played * 5) {
                $("#announcement").html(outcome());
            }
            $("#announcement").html(numToPlayer(player % 4) + " to play!");
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
                    $("#row" + trick).removeClass("bg-secondary text-muted");
                }
                if (currPlay % 10 === 6) {
                    $("#row" + trick).addClass("bg-light");
                }
                card = tricks[trick].cards[play];
                player = card.player;
                removeCard(playersClone[player], card);
                $("#hand" + player).html(computeHand(playersClone, player));
                $("#play" + trick + (player + 1)).html(card.string());
                if (card.equals(partnerC)) {
                    $("#play" + trick + (player + 1)).css('font-style', 'italic');
                }
            } else {
                trick = currPlay / 5 - 1;
                player = tricks[trick].winner;
                $("#play" + trick + (player + 1)).addClass("bg-success text-white");
                $("#play_info").html(numToPlayer(player) +
                    " takes the trick!").stop(true, true).show().fadeOut(1000);
                currTrick[player] += 1;
                $("#tricks_won" + player).html(currTrick[player]);
                $("#announcement").html(numToPlayer(player) + " to play!");
            }
        }
        for (i = 0; i < 4; i += 1) {
            $("#center" + i).css('visibility', 'hidden');
        }
        currPlay -= 1;
        if (currPlay === played * 5) {
            $("#announcement").html(outcome());
        }
    }
});

$("#skip").on('click', function () {
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
                    $("#row" + trick).removeClass("bg-secondary text-muted");
                }
                if (currPlay % 10 === 6) {
                    $("#row" + trick).addClass("bg-light");
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
            $("#hand" + i).html(computeHand(playersClone, i));
        }
        for (i = 0; i < 4; i += 1) {
            $("#center" + i).css('visibility', 'hidden');
        }
        $("#announcement").html(outcome());
        $("#play_info").html("Skipped to end!").stop(true, true).fadeOut(1000);
    }
});
