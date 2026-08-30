<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/war-games.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 05. The Futility Proof {#futility-proof}

The film's thesis is that some games cannot be won. An early build asserted this in four lines of narration, which is the weakest possible way to make the point. It is now proved on screen, because a conclusion the player watches a machine derive is worth considerably more than one the machine states.

Reached both from the scripted teaching node and from the Live AI understanding ending, the sequence runs in five steps. The machine plays tic tac toe against itself, visibly, at readable speed, three times, and every game is a draw. It accelerates through six more games too fast to follow, and the draw column is the only one moving. It then walks the entire game tree, all 255,168 games, in roughly three hundred milliseconds, and reads back the counts. Every one of those numbers is computed at runtime rather than authored, so changing the code changes the numbers.

**The complete tic tac toe game tree, enumerated in the browser at the moment the scene runs.**

| Outcome | Games |
| --- | --- |
| First player wins | 131,184 |
| Second player wins | 77,904 |
| Draws | 46,080 |
| Total games | 255,168 |

The machine then generalises the same question to ten military doctrines, from a local engagement to a total strategic exchange, each returning no winner, and states the conclusion.

Two details make this work as design rather than as a flourish. The tic tac toe panel is playable standalone from the status bar, where the machine plays perfectly and can never be beaten, so a player who tried to win earlier has already felt the conclusion before the machine articulates it. And the chess panel enforces threefold repetition, so a player who repeats a position three times ends with no winner, reaching the same lesson by a different route on a different board. Two independent proofs of one idea are a theme. One is a line of dialogue.
