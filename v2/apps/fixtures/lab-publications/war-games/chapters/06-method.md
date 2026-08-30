<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/war-games.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 06. Evaluating the Machine {#method}

Because the machine's side of the conversation is a model, the artefact could be evaluated the way a component is evaluated rather than the way a story is reviewed. A headless harness replays the game's real parsing and engine path without a browser, so every run exercises the same code the player does. Four tracks were run against a fixed seed, and every individual run is kept as a line of JSON so that any figure in this report can be recomputed.

**The four evaluation tracks. Offline tracks are deterministic under the fixed seed; real model runs are not.**

| Track | What it runs | Runs |
| --- | --- | --- |
| A, scripted | Randomised playthroughs of the hand authored graph, for content balance and coverage | 500 |
| B, synthetic | Calibrated emulations of five model classes, to push volume through the handling code cheaply | 2,500 |
| C, cloud | Real games against hosted models, turn cap of twelve to conserve rate limit | 37 |
| D, on box | Real games against four models on the CoLab's own GPU node, through the shipped proxy | 20 |

The tracks are ranked. Where the synthetic track and the real tracks disagree, the real tracks are taken as correct, and the disagreements are reported rather than reconciled quietly.
