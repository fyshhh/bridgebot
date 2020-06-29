# bridgebot
BridgeBot Replay Viewer for Orbital 2020

To see a sample run of the website, use this code: 0DzHzIMzzN-y-mfJFZNDnrCzxwvbKMXWIlqeTGVgmABOYHdyjPohiaELQRScpkUsut

**Input Processing:**

On page load, the website searches for a code from the URL (in the event the user accesses the page from the bot’s given link). Should a code not be found, then the website waits for the user to enter a code and click the “Simulate” button. Either method will generate a submit request.

Once a request has been detected, the website first parses the code with `validate()`, which does the following:
* Ensures the code structure is correct (*bid code*-*partner card*-*play code*)
* Ensures the bid code is correct (*[0-3][A-Za-i (no duplicates), z]*)
* Ensures the partner card is correct (*[A-Za-z]*)
* Ensures the number of tricks played is between 1-13 (*[a-m]*)
* Ensures the play code is correct (*[A-Za-z (no duplicates)*]

This process sieves out most potentially erroneous code (with one exception, that will be touched on below), and prints the error (if there is one). Supposing the code provided is valid, `simulate()` then parses the code.

**Code Parsing:**

`simulate()` splits the code and parses each portion of the code individually - namely the bids and plays, then begins setting up the front-end portion of the site by resetting certain global variables in the event a code has already been processed.

`simulate()` fully simulates the entire game before loading any HTML elements.

**Bid Parsing:**

`simulate()` first parses the bid portion of the code, by:

* Storing the player that starts the bid - this is denoted by the first numeric character of the code;
* Iterating through the rest of the code, creating a new Bid object by calling `charToBid(char)` on each character, then storing it in the `bids` array;
* Changing the `player` property of each bid based on the player that starts the bid;
* Storing the winning bid (the last entry in `bids`);
* Determining the bidder, trump suit, and number of tricks required to win.

**Play Parsing:**

`simulate()` then parses the play portion of the code, by:

* Parsing the partner card with `charToCard(char)` and storing it as `partnerC`;
* Parsing the number of tricks played (and therefore how many Trick objects are necessary) by extracting the its ASCII code with `charCodeAt()`;
* Creating the necessary amount of Trick objects by iterating through every hand and creating a Card object for each card with `charToCard(char)`, storing each set of i-th card as the i-th Trick in the tricks array;
* As the Card objects are created, each one is tested to ascertain if it is the partner card (by using a custom `equal()` method). Should it be the partner card, then the player who holds this card is stored as `partnerP`;
* Changing the `player` property of each Card in the Trick;
* Changing the `winner` property of each Trick based on the largest card, taking into account the trump suit from the winning bid;
* Determining the play order of each trick based on whoever won the bid (for the first trick) and whoever won the previous trick (for subsequent tricks).

In this stage, the final possible error is caught - if the player who holds the partner card is the same as the bidder, an error similar to the aforementioned ones is printed instead.

**Front-End Interactions:**

Should `simulate()` be successfully completed, the HTML elements that would display the replay is loaded. The hands belonging to the players are displayed respective to their cardinal directions, and the central as well as right-most areas are occupied by the replay viewer and the history table respectively. Both are toggleable between the bids and the plays.

The navigation bar (above South’s hands) allows for interactive display of the sequence of bids and plays. In the bidding phase, it shows the order of bids as well as the winning bidder and bid. In the playing phase, it shows the order of plays, either card-by-card or trick-by-trick, as well as the partner card and the overall winner.

The website is unfortunately currently optimized for 13’’ screens, and so some elements may be displaced when viewing with smaller screen sizes.
