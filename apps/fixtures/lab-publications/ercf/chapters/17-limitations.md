<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/ercf.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 17. Limitations and Caveats {#limitations}

Beyond the specific issues already described, the following limitations apply to the framework as a whole.

**The weights are unvalidated.** All seven are the author's modelled estimates. No expert panel has reviewed them.

**The dimension scores are a snapshot.** There is no modelling of escalation. A conflict that will look completely different in three weeks is scored as it looks today.

**The planning window is 90 days.** Beyond that, mortality accumulation is subject to a saturation adjustment and the model is outside the range of its own calibration data.

**The mortality model fits scale, not individual cases.** Fewer than half the fitted cases fall within a factor of two of their recorded death tolls. The model is useful for indicating whether a situation is in the hundreds, the thousands or the tens of thousands, and should not be used for anything finer.

**The model has documented blind spots.** It does not capture deliberate massacre or genocide, where death occurs in days rather than accumulating through attrition. It does not capture famine or the collapse of healthcare under blockade, which the code identifies as a major driver of mortality in Gaza that the seven dimensions do not represent. It underestimates open-corridor forced displacement, because it assumes a population trapped under fire rather than one compelled to move.

**The most consequential cost multipliers are the least evidenced.** The access multiplier that governs the entire in-zone assistance calculation is unconfirmed at its highest level, and the loss rates at Levels 2, 3 and 4, which reach fifty per cent, have no published equivalent that the author could locate.

**Population figures are pre-conflict.** City populations retrieved automatically do not account for displacement that has already taken place, and must be adjusted by hand.

**The tool models one corridor.** Real evacuation planning compares routes.

**The historical corpus is small.** Sixteen fitted cases is enough to sanity-check a framework, not enough to support statistical generalisation, and two known-difficult cases were held out of the fit.

**Above all, this is a research prototype.** It was produced by one researcher with academic supervision. Its own README states that it does not constitute operational advice and that all estimates require validation against country-specific intelligence and field assessment before any operational application.
