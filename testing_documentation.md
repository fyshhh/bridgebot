# Testing Documentation

Below is a documentation of the different testing methodologies employed to ensure the website is working properly. Because the website can be tested easily by a single person,
all the testing done was by me.

## Internal Testing
To understand how testing is done, we must first understand how the website operates.

The website is split into two major parts - the front-end and the back-end. We will also look at how these parts interact with each other.

#### Front-End Testing

The front-end of the website is written entirely in HTML and CSS, with Bootstrap and Flexbox libraries used to simplify the process.

Relatively little in-depth testing was required for this part as any errors in the code were visually obvious. It sufficed to change the code and refresh the page, or to resize
the page to ensure that elements maintained their positions.

#### Back-End Testing

The back-end of the website is written entirely in Javascript, with the jQuery library used.

The back-end involves the parsing of the code (in which the in-depth process is viewable on README.md) given, and the storage of relevant and necessary information to be
displayed to the site. Testing was done concurrently with the writing of the code, which began with the smaller components, which were the individual Objects and Constructors.
In Javascript, the Constructor of an Object also holds all methods that the Object has access to. Thus, it was necessary to test each method via console and custom inputs to
ensure that the methods were returning the desired value. Of note were `charToX()` methods, which involved converting a character (from the input code) to a `Bid` or a `Card`
object. These were simple to test as well, by running a `for` loop to verify that the Objects created from the methods were indeed correct.

The next portion written were the interactions between each Object; for instance, how a `Card` should interact with a `Trick`, since a `Trick` comprises 4 `Cards`. These were
also done through console, since it was not possible to view the return values any other way, bar directly displaying it on the website.

Finally, the methods to verify the given input code was written - `validate()`, which ensures the input code is correct (again, the in-depth processes are viewable on README.md).
`validate()` was tested by manually and repeatedly using codes that were incorrect to ensure that `validate()` properly caught any invalid codes.

#### Front-to-Back Interaction Testing

The interactions between the front- and back-end were the most tedious to complete. 

The first relevant method is `simulate()`, in which the relevant HTML elements were displayed should the code be validated. This was simple to test, as it simply involved
refreshing the page and visually ensuring that all necessary elements had been displayed.

The navigation buttons were the next to be coded. Each button has an associated jQuery method that is sensitive to when these buttons are clicked on, which would then execute
code to change the relevant elements. Although there were a total of 14 buttons, most of them were abstracted from basic methods (for instance, the 'Next Trick' button was
simply the 'Next Play' button, but executed to a maximum of 5 times depending on how many players had played), and thus testing was simply conducted on the buttons that had
been the root of the design ('Previous/Next Bid', 'Previous/Next Trick', 'Show Bids/Plays'). These buttons were tested by, again, changing the code and ensuring that the
correct information was shown.
