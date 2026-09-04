<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/ercf.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 07. The Cost of Staying {#cost-of-staying}

The second calculation estimates what it costs an organisation to keep a population alive where it is. It has three parts.

The first is supply delivery. The starting point is 3.50 US dollars per person per day, a multi-sector figure covering food, water, health, shelter and coordination. The World Food Programme's own global average for food and cash assistance alone was 42 US cents per beneficiary per day in 2023, and the code explains the difference between the two figures at some length: at the full Sphere water standard, water alone dominates supply weight, and applying the World Food Programme's per-tonne Sudan delivery cost to that weight gives 3.28 US dollars per person per day, within six per cent of the model's figure. That is a genuinely careful piece of reasoning.

The baseline is then multiplied by an access multiplier that represents how much more expensive delivery becomes as conflict intensifies. The second part of the calculation, supplies that never arrive, is then added as a loss rate representing goods destroyed, looted or simply undelivered. Both ladders are selected by the risk level.

| Risk level | Access multiplier | Supply loss rate |
| --- | --- | --- |
| Level 0 | 1.0 | 5 per cent |
| Level 1 | 1.5 | 5 per cent |
| Level 2 | 2.0 | 15 per cent |
| Level 3 | 3.6 | 30 per cent |
| Level 4 | 4.0 | 50 per cent |

The access multipliers were revised downward during development, from earlier values of 3.0, 5.0 and 8.0 for the top three levels, after the author's research established that documented sources support only about 2.5 to 3.6 times at Level 3 and nothing above about 4 times at Level 4. Level 4 remains marked as directionally plausible but unconfirmed, and the project's backlog lists it as the outstanding unvalidated cost parameter. A further penalty is applied from D4, and the terrain and seasonal multipliers apply here too, because bad roads make delivery expensive whether people are leaving or staying.

Only the lowest of the loss rates has any published anchor: OCHA monitoring of Gaza during the ceasefire period in late 2025 recorded under two per cent of cargo looted or intercepted under active monitoring, and the model uses 5 per cent as a planning buffer including spoilage. The three higher figures are internal planning estimates with no published equivalent that the author could find. A low D3, meaning consent is absent, adds further to the loss rate, and a low D7, meaning poor information, adds a coordination overhead.

The third part is emergency extraction. The model assumes that some proportion of the population will have to be pulled out in an emergency at some point, and prices that in advance. The probability of this happening rises over time along a saturating curve: it starts near zero and approaches a ceiling. The daily rate driving that curve was fitted against historical cases and is 0.021 for Level 4, 0.010 for Level 3, 0.005 for Level 2 and 0.002 for Level 1. The Level 4 figure comes from averaging Mariupol in 2022 and Aleppo in 2016; the Level 3 figure from Mosul, Goma and the Central African Republic. The Level 2 and Level 1 figures have no historical anchor at all and are described as structurally plausible interpolations that require validation.

The curve is capped at 95 per cent for Level 4, 80 for Level 3, 60 for Level 2 and 30 for Level 1. Two modifiers then apply: a blocked corridor, meaning a low D3, raises the probability, and high urgency imposes a floor, 85 per cent when D6 is 5 and 60 per cent when D6 is 4. The floor exists because of Srebrenica, where the crisis unfolded over three days and no duration-based curve would have registered it.

The cost of extraction is anchored to the United Nations Humanitarian Air Service, which is the World Food Programme's air service flying humanitarian staff and light cargo into places commercial aviation does not serve. Its published operating cost was 2.08 US dollars per passenger kilometre in 2023. Ground extraction is priced at 30 per cent of that rate, which the code describes as an internal heuristic with no published source. Air medical evacuation is priced at three times the rate, on the reasoning that a medical flight carries far fewer passengers. At Level 4 the whole extraction cost is multiplied by 2.5 for a helicopter premium, which the author records as unconfirmed, since UNHAS does not publish separate helicopter and fixed-wing rates.

Field medical treatment is costed separately. Injuries are estimated from a per-thousand daily rate that rises with the risk level: zero at Level 0, 0.1 at Level 1, 0.5 at Level 2, 2.0 at Level 3 and 8.0 at Level 4. The code states plainly that no public source reports in-field civilian injury rates as a daily incidence per thousand, so these are unvalidated. Each injury is costed at 800 US dollars, modified upward when the destination has poor medical capacity. The 800 figure sits within a documented peer-reviewed range: 211 US dollars per surgical case at a conflict-affected mission hospital in South Sudan in 2022, and roughly 500 to 650 dollars per case at two MSF surgical trauma centres around 2009, which inflate to roughly 780 and 1,010 dollars by 2026.
