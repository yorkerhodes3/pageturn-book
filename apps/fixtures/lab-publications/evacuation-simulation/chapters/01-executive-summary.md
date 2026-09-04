<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/evacuation-simulation.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 01. Executive Summary {#executive-summary}

EvacSim is an interactive simulation, a piece of software that plays out an imagined situation on screen so that a user can watch it unfold and change the conditions. It models a community of six households receiving an evacuation warning during an armed conflict, and it shows who leaves, who is delayed, and who does not get out at all.

The tool is built on a simple idea drawn from disaster sociology: people do not act on a single warning. Each simulated person needs a certain number of independent confirmations before they will start preparing to leave. Everything else in the model follows from how quickly those confirmations arrive and how long preparation and travel then take.

Confirmations can arrive through four channels: an official broadcast, a humanitarian aid organisation, neighbours who can be seen already moving, and a hostile misinformation channel that supplies confirmations which are convincing but false. Which channel actually drove each household to move is recorded and reported at the end of every run.

The model treats vulnerability as a matter of timing rather than a score. Elders, children under five, pregnant women, and unaccompanied minors are each given specific delays in preparation, movement speed, and the number of confirmations required. The consequences are then allowed to play out. When a corridor closes on a schedule, it is these categories that are most often left behind, and the tool shows exactly that.

Escape is routed through corridors: four named gates on the edges of the map that can be opened, closed, or timed to open and close mid-run. This models a negotiated humanitarian passage with a fixed validity window. When all gates are shut, people who are ready to move are marked as trapped, which is the simulation's representation of siege.

The prototype is delivered as a web page that runs in an ordinary browser and is published as a public demonstration. It carries an extensive built-in guide explaining its own mechanics and their legal grounding.

The tool is honest, in its own documentation, that its timings are qualitative approximations rather than measured real-world durations. This report endorses that caution and adds one further caveat: several of the International Humanitarian Law citations in the repository are inaccurate and should be corrected before the tool is used in teaching. Section 09 sets out which ones and what the correct provisions are.
