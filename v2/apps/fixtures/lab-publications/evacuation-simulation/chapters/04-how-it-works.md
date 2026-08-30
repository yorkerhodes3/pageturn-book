<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/evacuation-simulation.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 04. How the Simulation Works {#how-it-works}

**The community.** The simulation places six households on a rectangular map, given the family names Rivera, Kim, Okafor, Hassan, Novak, and Tanaka. Each household has one member designated as its hub, drawn at the centre of the cluster, with the remaining members arranged around it. The hub represents the household as a coordinating unit. It does not depart until the slowest person in the household is ready, which is how the model implements Drabek's finding that families move together.

Households are linked to one another in a social network. Each family is connected to the family on either side of it in a ring, and also to the family two positions away. The result is that every household can see four of the other five. Only these linked households can influence one another.

Every individual passes through five stages in order:

1. Unaware. The person has not yet heard anything.
2. Seeking. The person has heard an alert and is now looking for corroboration.
3. Milling. The person believes the alert and is preparing to leave: gathering family members, packing, securing the house.
4. Evacuating. The person is physically moving toward an exit.
5. Evacuated. The person has reached safety and is out of the simulation.

Each transition is probabilistic, meaning it is decided by a weighted chance each time the clock advances rather than by a fixed rule. Two people in identical circumstances will not necessarily move at the same moment.

**The clock.** Time in the simulation is measured in ticks. A tick is a deliberately abstract unit. When the simulation is running at normal speed one tick elapses every 200 milliseconds of real time, roughly five ticks per second, but a tick is not claimed to correspond to any particular number of real-world minutes. The documentation states the reason plainly: the timing values were chosen to produce realistic relative behaviour, not calibrated against measured durations, and labelling ticks as minutes would imply a precision the model does not have. This is an unusually candid design choice and it should be respected when interpreting any result.

A person in the Seeking stage accumulates confirmations, and the model records which source supplied the final one that tipped the person into Milling. Confirmations arrive through four channels.

- The official broadcast. A single information node at the centre of the map, representing a government or military announcement, with its reliability set directly by the information clarity setting.
- The humanitarian actor. A separate node in the upper left of the map, representing an aid organisation such as the ICRC. Its reliability is fixed at 0.75, higher than a government broadcast at typical clarity settings, but it reaches only a fraction of households, determined by the humanitarian access setting. This encodes the operational reality that a neutral organisation is more trusted but must negotiate for physical access.
- Neighbours. If any linked household has a member who is already milling or evacuating, a person in the Seeking stage may take that as a confirmation. This is social contagion, and it is the mechanism by which an evacuation cascades through a community.
- Misinformation. A hostile channel that supplies confirmations which count toward the threshold exactly as genuine ones do, but which then send the person to the wrong exit.
