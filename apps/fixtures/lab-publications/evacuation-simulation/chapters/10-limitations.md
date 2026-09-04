<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/evacuation-simulation.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 10. Limitations and Caveats {#limitations}

**Nobody is harmed.** The model has no concept of injury or death. Being trapped is the worst outcome available, and being trapped is recorded as a status rather than as a consequence. Corridor violations, attacks on convoys, and secondary threats during transit are all identified in the repository's own planning documents as desirable additions and none are implemented.

**The timings are not calibrated.** This bears repeating because it constrains every quantitative statement the tool makes. The preparation ranges, movement speeds, and confirmation thresholds are plausible relative values chosen by the author. They are not derived from evacuation data.

**The population is tiny and the results are noisy.** With six households, a single unlucky random draw can change a headline figure substantially. No number from a single run should be quoted.

**The vulnerability categories cannot overlap.** Because a person is tested for each category in a fixed order and assigned to the first that matches, the model cannot represent a pregnant woman with a disability, an elderly person who is also chronically ill, or a child who is both under five and unaccompanied. Compounding vulnerability, which is exactly what determines outcomes in real displacement, is outside the model.

**Several important categories are absent.** The wounded and sick, persons with disabilities, and people lacking identity documents are all discussed at length in the repository's extensions document and none are implemented. The first of these is the most significant omission, since the wounded and sick hold the strongest claim to priority evacuation in the entire legal framework.

**The threat is spatially uniform.** Everyone on the map faces the same threat level regardless of where they stand. There is no front line, no direction from which danger approaches, and no reason why a household near the fighting should be alerted before one further away. The repository identifies directional threat as an important missing feature and it remains missing.

**Coercion is rare in practice.** Because of the very small coefficient in the formula, even the maximum coercion setting produces a low per-tick probability. Users who set the slider to a high value and observe few coercion events are not misreading the display.

**Misinformation has no effect when only one gate is open.** The mechanic works by misrouting people to a non-nearest gate, so it requires at least two open gates to do anything at all beyond arriving faster. In a single-corridor scenario, misinformation makes the population move sooner and no worse.

**There is no test suite.** The repository contains no automated tests, so the behaviour of the model rests on visual inspection.

**Above all, this is a teaching model.** It is designed to make a small number of relationships vivid, not to forecast what a real population will do. Its outputs should never inform an operational decision.
