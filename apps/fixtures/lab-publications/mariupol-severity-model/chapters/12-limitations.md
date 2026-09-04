<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/mariupol-severity-model.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 11. Limitations and Caveats {#limitations}

The repository sets out seven limitations of its own. They are real limitations, not token ones, and the summary below preserves them while adding four observations that emerged from reviewing the code and recomputing the series.

**The evidence degrades exactly when it is needed most.** Event reporting from inside a besieged city collapses at the point of greatest severity, because the people who would report have left, died, or lost communications. Every count of attacks in this model is a count of reported attacks. ACLED itself advises that fatality figures are the most biased and least accurate component of conflict reporting and recommends using measures other than fatalities to assess intensity, which is a direct caution about the lethality sub-indicator.

**The model is retrospective.** It was built knowing how the siege ended. A real-time deployment would face uncertainty this prototype does not.

**It has never been validated against behaviour.** Modelled severity has not been compared to observed departure flows, or to any other record of what people actually did. There is no test in this repository of whether a high score corresponds to anything.

**Judgement is embedded in the numbers.** The normalisation ceilings, the exponent of 6, the values on the consent ladder, the 0.3 vulnerability increments, and the five phase thresholds are all conventions chosen by the author. Each is defensible and each is adjustable, and the repository says they should be re-estimated as distribution percentiles before publication.

**It is one axis of three.** Severity measures how dangerous it was to stay. It says nothing about whether an evacuation was operationally possible, or whether the place people would be moved to was safe. Those two axes, feasibility and destination viability, are described in the repository but not implemented. A reader must not treat a high severity score as a recommendation to move people.

**The tool is dual use.** The repository raises this itself, and it is the most serious ethical point in the document. The same fusion of event data, population data and route information that helps prioritise an evacuation could support targeting or screening. Movement data about civilians under siege is protection-sensitive by nature.

**Infrastructure damage is a lower bound.** And the per-building display is illustrative until the real UNOSAT geodata is supplied.

To these the following are added from this review.

**The daily resolution is nominal.** The violence inputs change on three occasions across 77 days. This is the caveat most likely to be missed by a non-technical reader looking at a smooth daily curve.

**A single saturated component pins the result.** Because any one component at 1.0 forces the composite to approximately 0.742, and the Critical threshold is 0.70, the deprivation clock alone holds the model in its top phase for the last three weeks of the window regardless of anything else. The model is making a defensible substantive claim there, that fifty-odd days of encirclement without relief is by itself a critical condition. But the reader should understand that after 1 May the number is reporting the passage of time and nothing more, and that the choice of a 60-day ceiling is what makes this happen when it happens.

**The ceilings determine which component wins.** Intensity is divided by 10 against an observed maximum of 4.8, so it can never exceed 0.48. The deprivation clock is divided by 60 in a siege lasting longer than 60 days, so it necessarily saturates. Under a weakest-link rule, the component with the most generous ceiling relative to its observed range will dominate almost by construction. That the violence components never lead is therefore partly a substantive finding and partly a consequence of the scaling, and the two should not be conflated.

**The vulnerability weight carries no information within this case.** As a single constant applied to all 77 days, it rescales the output without changing any comparison. It would begin to do work only in the cross-case framework the repository has not yet built.

**The relief credit is never exercised.** Because no convoy reached the city, the three-day credit in the deprivation clock never operates. It is therefore an untested part of the design.

Above all, the repository is explicit and repeated on the central point: this is a research prototype, its outputs are indicative, and it is not operational guidance. Nothing in this report should be read as suggesting otherwise.
