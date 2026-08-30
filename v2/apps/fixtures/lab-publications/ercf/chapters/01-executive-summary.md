<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/ercf.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 01. Executive Summary {#executive-summary}

ERCF is a research prototype: experimental software, not an operational system. It helps a humanitarian planner estimate two things side by side. The first is the one-time cost of organising an evacuation. The second is the daily cost of keeping people supplied if they stay. It then compares the two.

The planner describes the situation using seven factors, called dimensions and labelled D1 to D7. Each is scored from 1 to 5. They cover the intensity of fighting, the mobility of the population, whether the armed parties have authorised movement, the state of roads and logistics, the safety of the destination, how fast the window is closing, and how good the available information is. These seven scores drive everything else the tool produces.

The seven scores are combined into a single weighted number, which is placed in one of five risk levels from Level 0 to Level 4. That level then selects the cost rates, loss rates and mortality rates used in the rest of the calculation. A planner who moves one slider sees the entire cost estimate change.

The distinctive output is the break-even analysis. Evacuation is a large one-time expense. Assistance in place is a smaller expense repeated every day. Somewhere in the future, if the crisis persists, the cumulative daily cost overtakes the one-time cost. ERCF calculates the day on which that happens, which is a question funding appeals have to answer and rarely answer with arithmetic.

ERCF also produces an estimate of deaths and injuries among a population that does not leave. This estimate was fitted against sixteen documented historical conflicts. Its author is explicit that this part of the tool is indicative and that the financial estimates are considerably more reliable than the mortality ones.

The project takes an explicit ethical position, stated in its own documentation and repeated in the interface. It estimates the cost of logistics. It does not place a monetary value on human life, and it does not tell a user whether an evacuation is worth carrying out. The labels it produces are descriptive, not instructions.

The software is substantially built rather than aspirational. The repository contains roughly eleven thousand lines of working Python, a browser interface, a reproducible calibration pipeline, a database of thirty-one documented historical conflicts, and connections to four external data services. It runs as a live public demonstration. What remains incomplete is documented openly in the project's own backlog.
