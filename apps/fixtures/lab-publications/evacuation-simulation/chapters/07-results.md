<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/evacuation-simulation.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 07. Reading the Results {#results}

While a run is in progress the map is the primary output. Individuals change colour as they pass through the five stages, from grey when unaware, through blue when seeking, amber when milling, red when evacuating, to green when evacuated. Each population category has its own shape, so an elder, a child, a pregnant woman, and an unaccompanied minor can be distinguished at a glance. Lines drawn between the information nodes and individuals show confirmations arriving, colour-coded by which channel supplied them, with the hostile misinformation channel drawn in red.

Below the map, three rows of figures update every tick: how many people are in each of the five stages, how many belong to each vulnerability category, and a single prominent percentage showing how much of the population has completed evacuation.

An event log records everything in plain sentences as it happens: who received an alert, how many confirmations they now hold, who was held at a checkpoint and for how long, which corridor closed and who is rerouting, who was coerced, and who was trapped. The log is capped at the most recent eighty entries. It is the most useful output for teaching, because it converts the statistical outcome back into individual stories.

When a run ends, a summary panel reports the total number of ticks, the average time the population spent in each of the seeking, milling, and evacuating stages, which household finished last, and what the model believes caused that household to be slowest, expressed as its composition. It also reports the channel split, along with counts of those coerced, those held at checkpoints, and those trapped.

The channel split is the analytically richest output. It answers a question that matters operationally: was this evacuation driven by the authorities or by the community? A run in which social confirmation dominates is a run in which official communication failed and the population compensated for it. A run in which the humanitarian channel dominates is a run in which access mattered more than broadcasting. A run in which misinformation dominates is a run in which the population moved decisively in the wrong direction.

The last five runs are retained, and one can be pinned for direct comparison. This is the intended way to use the tool. A single run tells the user very little, because so much is decided by random draws. The signal appears in the difference between two runs that were identical except for the one thing the user changed.
