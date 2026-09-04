<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/erus.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 12. Limitations and Caveats {#limitations}

**Nothing is calibrated.** No parameter in the tool has been fitted to or tested against empirical field data. The forty per cent success threshold, the 0.85 perturbation ceiling, the 0.30 score for Unknown, the twenty per cent gatekeeper cap, the doubling of gatekeeper weights, and the four composite weights are all modelling assumptions. The project describes them as open to challenge and says so repeatedly.

**Factors are treated as independent.** In reality security and authority consent plausibly move together, since a deteriorating security situation often accompanies a withdrawal of consent. The model assumes no such relationship, which will tend to understate how badly things fail together. The project identifies adding factor correlation as the highest-value next step for realism.

**There is no time.** The model is a single snapshot. Nothing deteriorates or improves over the course of an evacuation, and no journey takes any time to complete.

**Routes are represented by one number.** Distance stands in for the entire operational burden of a journey. Road condition, checkpoints, fuel availability, seasonal access, and the presence of mines are not modelled at all. A reader should not take the proximity term as a statement about whether a route is passable.

**The assignment is greedy, not optimal.** Groups are placed one at a time in urgency order, each taking the best remaining site. This is realistic in that urgent cases are handled first, but it means an early group can take a site that would have been a much better match for a later one. The tool does not search for the best overall allocation.

**Mis-assessment is gentle.** A factor can only be wrong by one level. Real reporting failures can be larger, and the documentation says so.

**The population model is coarse.** Eight archetypes with fixed vulnerability values, of which only three distinct values are used, and a single binary check against medical capacity. Group composition, disability other than mobility, language, and legal status are not represented. The specific fix for the mobility case, a dedicated accessibility factor scored the way medical capacity is scored today, is a proposed but not yet made change, since it would shift the balance between gatekeeper and standard factors.

**The outputs mean nothing about the real world.** This follows from the fact that the inputs are invented. The tool demonstrates a relationship between information quality and decision quality. It does not predict, and cannot predict, the outcome of any actual evacuation.

**The tool's own statement of its status.** It is unambiguous and should be respected: a conceptual demonstration tool for thesis research, not an operational decision-support system, whose outputs require empirical calibration before any real-world use.
