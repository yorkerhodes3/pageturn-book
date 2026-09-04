<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/erus.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 06. Reading the Results {#reading-results}

**Destination cards.** Each site shows its readiness percentage and its seven factor statuses. Where a gatekeeper is blocked, the card names which one rather than showing a general warning, so that three distinct failure modes are never collapsed into a single badge.

**The assignment matrix.** A grid of every group against every destination, showing the composite scores that produced the ranking.

**Outcomes.** For each group, the assigned destination, the alternative if one exists, the predicted success rate from the five hundred trials, and the standard deviation. A high success rate with a high standard deviation should be read differently from the same rate with a low one: the first is a fragile prediction, the second a stable one.

**The riskiest factor.** For each assignment the tool identifies the single lowest-scoring factor at the assigned destination, which is the thing most worth checking before moving anyone.

**The uncertainty sensitivity chart.** For each group, predicted success rate is plotted at eleven uncertainty levels from zero to one hundred per cent. This is the tool's core demonstration in a single picture: the underlying scenario is identical at every point on the line, and only the information quality differs.

**The Factor Information Value panel.** For each of the seven factors, the tool asks a counterfactual question: if every Unknown instance of this factor were resolved to Operational, how much would the average success rate improve? It answers by genuinely re-running the assignment and the simulation with that change applied, not by estimating. The factors are then ranked by improvement. In practical terms this tells an assessment team which single question is worth the trip.

**Alerts.** Warnings surface unassigned groups and destinations excluded by a named gatekeeper.

**A worked example.** Everything above describes what the tool computes. This report also ran it, at the exact citation the reproducibility section recommends: seed 42, eight destinations, three groups, thirty per cent uncertainty. Anyone can regenerate the same scenario at that address on the live site. Of the eight generated destinations, five carry a blocked gatekeeper and are capped at twenty per cent readiness, matching what the project's backlog reports for this seed. The three evacuee groups drawn are Unaccompanied minors, 632 people, immediate; Elderly and mobility-impaired, 378 people, immediate; and Mixed general population, 483 people, can wait.

**The assignment this scenario actually produces.**

| Group | Assigned destination | Composite score | Readiness | Predicted success | Riskiest factor |
| --- | --- | --- | --- | --- | --- |
| Unaccompanied minors | Zone Golf | 66.7% | 20.0%, gatekeeper capped | 20.2% | Willingness, Unwilling |
| Elderly and mobility-impaired | Station Hotel | 72.4% | 47.1% | 48.0% | Capacity, Unknown |
| Mixed general population | Zone Golf | 61.7% | 20.0%, gatekeeper capped | 17.8% | Willingness, Unwilling |

Two of the three groups were sent to Zone Golf, the one destination in the pool whose Willingness gatekeeper is blocked. This is what the weighting in the composite score does when a capped but close and roomy site outranks a viable but farther one. Zone Golf sits 26 kilometres away with ample spare capacity, so its capacity fit and proximity terms offset its capped readiness in the blended score. The alternative available to the minors group scored lower on the composite, 63.3% against Zone Golf's 66.7%, but carried a predicted success rate of 49%, more than double. The alternative available to the mixed population group scored 57.4% but carried a success rate of 73.2%, roughly four times higher.

This is the answer this report can now give to the first of the project's three research questions. Multi-factor readiness does not translate into a probable outcome by simple ranking. The composite score the tool actually assigns on blends readiness with logistics terms that can outweigh a hard readiness cap, so the top ranked destination and the destination most likely to succeed are not always the same place, and in this scenario were not the same place for two of the three groups.

**The same scenario at higher uncertainty.** Re-running the identical destinations and groups, nothing regenerated, at eighty per cent uncertainty instead of thirty gives a clean test of the second research question.

**Predicted success for the same three groups at two uncertainty levels.**

| Group | Assigned destination | Success at 30% uncertainty | Success at 80% uncertainty | Fall |
| --- | --- | --- | --- | --- |
| Unaccompanied minors | Zone Golf, unchanged | 20.2% | 12.6% | 38% relative |
| Elderly and mobility-impaired | Station Hotel, unchanged | 48.0% | 14.8% | 69% relative |
| Mixed general population | Zone Golf, unchanged | 17.8% | 13.8% | 22% relative |

The assigned destination for every group is identical at both uncertainty levels. Nothing about the scenario moved. Yet predicted success fell for all three, by very different amounts. Elderly and mobility-impaired lost more than two thirds of its predicted success, Mixed general population lost about a fifth. The unevenness, not just the direction, is the finding the project's earlier peer review said the report was missing.

**The sensitivity chart, corrected.** The chart plots predicted success against uncertainty from zero to one hundred per cent by re-selecting whichever destination currently scores highest at each of eleven levels, rather than holding one destination fixed. An earlier pass through this exact scenario found that this re-selection step could pick a destination whose capacity was too small for the group, which forced a flat, misleading zero per cent success rate at low uncertainty for one group before the chart jumped once a viable destination became the top scorer. That has since been fixed: the chart now applies the same capacity check the actual assignment step already used. The corrected curve for that group is noisier than a clean decline, wobbling within the range ordinary Monte Carlo variance produces at 500 runs, but the systematic jump is gone.

**The Factor Information Value ranking, corrected.** For each factor, the panel asks what would happen to mean predicted success if every Unknown instance of that factor were resolved to Operational. Run at its original 100 trial count against this exact scenario, three of the seven factors showed a negative estimated gain, as large as almost seven percentage points, which is not possible in the underlying model, since resolving a factor toward Operational can only raise or hold its score, never lower it. The panel's trial count has since been raised to match the tool's main 500 run engine, and every delta in this scenario is now within about a percentage point of zero. The corrected finding is smaller but more honest: in this particular scenario, none of the seven factors' unresolved instances would move predicted success by more than about a point, and the panel can now say so with reasonable confidence instead of implying an effect that was sampling noise.

**Answering the three research questions.** Read together, the worked example above does what the project's earlier peer review said the report needed to do. It answers, rather than restates, all three questions the project sets itself. How does multi-factor readiness translate into a probable outcome. Not by simple ranking, since the composite score can send a group to a hard-capped destination over a viable alternative with several times its predicted success. How does degraded field intelligence propagate through an evacuation decision. Unevenly, with the same fixed scenario losing between a fifth and two thirds of its predicted success across three different groups, depending on which factor was driving that group's score. Where would real-time assessment help most. At this scenario's default run count, the honest answer is that the difference is not resolvable from noise, which is itself a finding about how much assessment volume the tool's own panel needs before its ranking should be acted on.
