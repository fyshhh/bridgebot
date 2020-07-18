# bridgebot
BridgeBot Replay Viewer for Orbital 2020

To see a sample run of the website, use this code: 0DzHzIMzzN-y-mfJFZNDnrCzxwvbKMXWIlqeTGVgmABOYHdyjPohiaELQRScpkUsut

*If you're interested in reading the code but don't understand HTML, Javascript or jQuery, please scroll to the Front-End Interactions section below.*

**Input Processing:**

On page load, the website searches for a code from the URL (in the event the user accesses the page from the bot’s given link). Should a code not be found, then the website waits for the user to enter a code and click the “Simulate” button. Either method will generate a submit request.

Once a request has been detected, the website first parses the code with `validate()`, which does the following:
* Ensures the code structure is correct (*bid code*-*partner card*-*play code*)
* Ensures the bid code is correct (*[0-3][A-Za-i (no duplicates), z]*)
* Ensures the partner card is correct (*[A-Za-z]*)
* Ensures the number of tricks played is between 1-13 (*[a-m]*)
* Ensures the play code is correct (*[A-Za-z (no duplicates)]*)

This process sieves out most potentially erroneous code (with one exception, that will be touched on below), and prints the error (if there is one). Supposing the code provided is valid, `simulate()` then parses the code.

**Code Parsing:**

`simulate()` splits the code and parses each portion of the code individually - namely the bids and plays, then begins setting up the front-end portion of the site by resetting certain global variables in the event a code has already been processed, such as `playersClone` (a deep copy of `players`, which is 2D array containing all the players' hands that is to be edited), `playersStart` (a 2D array containing all the players' starting hands) and `playersEnd` (a 2D array containing al the players' ending hands).

`simulate()` fully simulates the entire game before loading any HTML elements.

**Bid Parsing:**

`simulate()` first parses the bid portion of the code, by:

* Storing the player that starts the bid - this is denoted by the first numeric character of the code;
* Iterating through the rest of the code, creating a new `Bid` object by calling `charToBid(char)` on each character, then storing it in the `bids` array;
* Changing the `player` property of each bid based on the player that starts the bid;
* Storing the winning bid (the last entry in `bids`);
* Determining the bidder, trump suit, and number of tricks required to win.

**Play Parsing:**

`simulate()` then parses the play portion of the code, by:

* Parsing the partner card with `charToCard(char)` and storing it as `partnerC`;
* Parsing the number of tricks played (and therefore how many Trick objects are necessary) by extracting the its ASCII code with `charCodeAt()`;
* Creating the necessary amount of `Trick` objects by iterating through every hand and creating a `Card` object for each card with `charToCard(char)`, storing each set of i-th card as the i-th `Trick` in the `tricks` array;
* As the `Card` objects are created, each one is tested to ascertain if it is the partner card (by using a custom `equal()` method). Should it be the partner card, then the player who holds this card is stored as `partnerP`;
* Changing the `player` property of each `Card` in the Trick;
* Changing the `winner` property of each `Trick` based on the largest card, taking into account the trump suit from the winning bid;
* Determining the play order of each trick based on whoever won the bid (for the first trick) and whoever won the previous trick (for subsequent tricks).

In this stage, the final possible error is caught - if the player who holds the partner card is the same as the bidder, an error similar to the aforementioned ones is printed instead.

**Front-End Interactions:**

In `index.html`, notable elements are marked by an `id` and a `class`. The jQuery snippets in `replay.js` access these elements with selectors as follows:

* `$("#[id]")` will select an element with the associated `id`
* `$(".[class]")` will select **all** elements with the associated `class`

Selectors are then succeeded by a method call (such as `.show()` or `.on('click', function () {...})`). The internal code segments in the method calls should be understandable by any readers with a background in coding (in any language).

Should `simulate()` be successfully completed, the HTML elements that would display the replay is loaded. The hands belonging to the players are displayed respective to their cardinal directions, and the central as well as right-most areas are occupied by the replay viewer and the history table respectively. Both are toggleable between the bids and the plays, with both bids and plays having their own replay viewer and history table. The toggles are managed by `.on('click', function () {...})`, that calls `.show()` and `.hide()` on respective elements.

The navigation bar (above South’s hands) allows for interactive display of the sequence of bids and plays. The current state of the replay is managed by `currBid` and `currPlay` variables that represent the states of the bids and plays respectively. The initial load of the website shows the bid replay viewer and history table. Every button sends a request with `.on('click', function () {...})` that changes these variables (for instance, a click of "Next Play" increments `currPlay` by 1). These variables serve as an indicator for which square in the replay viewer to modify, as well as which cell (and row and column, if applicable) in the history table to modify.

Modifications are done by `.html("...")` that change the contents of the element, `.addClass(...)` and `.removeClass(...)` for background color changes and `.css('visibility', ...)` for hiding elements.

~~The website is unfortunately currently optimized for 13’’ screens, and so some elements may be displaced when viewing with smaller screen sizes.~~ This has since been fixed.
