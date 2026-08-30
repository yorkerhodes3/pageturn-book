<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/evacuation-simulation.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 06. Corridors: How People Actually Get Out {#corridors}

In the pedestrian and car scenarios, escape is not in all directions. Four gates are placed at the midpoints of the four edges of the map and named North, South, East, and West. When a person finishes preparing, they identify the nearest gate that is currently open and move toward it. The train scenario has no gates.

Each gate has three settings.

- It can be open or closed at the start.
- It can be given a closing tick, at which it shuts.
- It can be given an opening tick, at which it opens, in which case it begins the run closed.

Combining an opening tick with a closing tick produces a humanitarian window: a gate that opens at tick 15 and closes at tick 35 gives the population a twenty-tick passage. This is the mechanic that makes every preparation delay described above consequential rather than merely descriptive. An eight-tick elder delay is invisible in a run with no time limit and decisive in a run with a twenty-tick window.

When a gate closes mid-run, anyone already travelling toward it recalculates and heads for the nearest remaining open gate, and the reroute is logged individually. Rerouting costs time, and the cost is much higher on foot than by car, which is the asymmetry the documentation identifies as a research finding in its own right. The same closure that mildly inconveniences a household with a vehicle can leave a household on foot unable to reach any alternative.

If no gate is open when a person is ready to move, they are marked as trapped. Trapped individuals stop, are logged by name, and are counted in the final summary. A run ends when every person is either evacuated or trapped. This is the simulation's representation of encirclement and siege, and it is the condition the tool is most clearly designed to make visible: the visual and numerical gap between the households that got out and the households that were still preparing when the gate shut.
