<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/ercf.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 04. How ERCF Works: The Seven Dimensions {#seven-dimensions}

The whole tool rests on seven scores. Each is a number from 1 to 5 that the planner sets by moving a slider. The dimensions were chosen, according to the concept document, to capture the factors that field coordinators consistently cite when assessing whether an evacuation is feasible, and deliberately to require no real-time data feed or classified intelligence. A planner with a situation report and professional judgment can set all seven.

**D1, Kinetic Threat.** How much direct violence the civilian population is exposed to. A score of 5 means active, sustained attack. This is the dimension that drives almost everything downstream: it determines whether movement is physically survivable at all.

**D2, Mobility Constraints.** Also called Vulnerability. How much of the population cannot move unaided. A high score means many people who are elderly, very young, disabled, chronically ill or otherwise dependent on assisted transport. This dimension is what forces the operation to allocate medical buses and ambulances rather than ordinary buses.

**D3, Authorization.** Whether the armed parties have consented to civilian movement. The scale runs the same direction as the others: a high D3 score means authorization is a serious problem, that is, that consent is absent or unreliable. Without consent, an evacuation is both unlawful and practically blocked.

**D4, Logistics.** The state of roads, bridges, vehicles, fuel supply and the supporting infrastructure. The project's documentation observes that logistics collapse, not danger as such, has empirically been the leading cause of delayed evacuations, citing Mosul in 2016 and Aleppo in 2016.

**D5, Destination.** Whether the place people would be moved to is genuinely safe and able to receive them. The reason this dimension exists at all is Srebrenica in 1995, cited in the code as the canonical case in which evacuation to a nominally safe area became the site of a massacre. Moving civilians into danger is a distinct harm, not a lesser version of leaving them where they are.

**D6, Urgency.** How fast the window for organised movement is closing.

**D7, Information.** How poor the information environment is. A high score means communications failure, rumour, and an inability to coordinate.

The seven scores are combined into a single number by multiplying each by a weight and adding the results. The weights add up to 1.00, so the resulting score stays on the same 1 to 5 scale as the inputs.

| Dimension | Factor | Weight |
| --- | --- | --- |
| D1 | Kinetic Threat | 0.25 |
| D2 | Mobility Constraints | 0.15 |
| D3 | Authorization | 0.15 |
| D4 | Logistics | 0.15 |
| D5 | Destination | 0.15 |
| D6 | Urgency | 0.10 |
| D7 | Information | 0.05 |

```text

ERCF = (D1 x 0.25) + (D2 x 0.15) + (D3 x 0.15) + (D4 x 0.15) + (D5 x 0.15) + (D6 x 0.10) + (D7 x 0.05)

```

The seven weights sum to 1.00.

D1 carries the largest weight, one quarter of the total, because direct physical threat is treated as the primary driver of evacuation necessity, and because it is the dimension that alone determines whether movement is safe. It is tied to the precautionary obligations in Articles 57 and 58 of Additional Protocol I.

D2, D3, D4 and D5 each carry fifteen per cent and form an equal group. The argument is that mobility, consent, logistics and destination safety are each individually capable of making an evacuation impossible, so none should dominate the others. D3 is explicitly capped at fifteen per cent rather than being set higher, because the most extreme authorization failures are already captured elsewhere in the tool by a hard trigger.

D6 carries ten per cent, deliberately below the equal group. The reasoning is that urgency is largely absorbed by D1 in the most extreme situations, and that the tool captures urgency more sharply through the hard trigger and through a separate extraction-probability floor than a linear weight would. D7 carries five per cent, the lowest. Poor information raises coordination cost and panic risk, but on its own it does not determine whether an evacuation is necessary or possible.

An important caveat is stated by the author in the code itself and reproduced in the interface as a red marker beside every weight: all seven weights are modelled estimates. No published framework in International Humanitarian Law or humanitarian operations specifies numerical weights for these factors, so there was nothing to copy. The author's own backlog lists expert-panel validation of these weights as outstanding research work. A reader should treat the weights as a reasoned starting proposal, not as an established standard.
