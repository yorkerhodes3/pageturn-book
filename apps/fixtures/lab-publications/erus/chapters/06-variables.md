<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/erus.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 05. The Variables Explained {#variables}

This section is the substance of the report. Every number the tool uses is listed below in plain terms: what it represents, why it was set where it was set, and how it reaches the result.

**The seven factors by which each destination is described. The three gatekeepers are marked as such in the code.**

| Factor | What it asks | Role |
| --- | --- | --- |
| Security | Whether the site is under threat | Gatekeeper |
| Authority consent | Whether the relevant host authority has agreed to the movement | Gatekeeper |
| Willingness | Whether the host community itself is prepared to receive people | Gatekeeper |
| Capacity | Whether there is room | Standard |
| Shelter | Whether there is somewhere to sleep | Standard |
| Food and water | Whether basic provisions exist | Standard |
| Medical capacity | Whether there is clinical care | Standard |

The three gatekeepers were chosen because each represents a condition that cannot be compensated for by anything else. The project's concept note states the reasoning plainly for Security: a site under active threat cannot be made viable by good food supply. Willingness was originally an ordinary factor and was promoted to gatekeeper status during development, precisely because as an ordinary factor it allowed strong shelter, food, and medical scores to arithmetically outweigh an outright refusal.

**Every factor, at every destination, holds one of four statuses, which convert to numbers as follows.**

| Status | Score | Meaning |
| --- | --- | --- |
| Operational | 1.0 | The factor is in good order |
| Partial | 0.5 | The factor is degraded but functioning |
| Blocked | 0.0 | The factor has failed |
| Unknown | 0.30 before any adjustment | The factor has not been assessed |

The choice of 0.30 for Unknown is the model's stance on ignorance. It is deliberately below Partial. An unassessed factor is not treated as probably fine. It is treated as more likely to be a problem than not, which the documentation calls epistemic conservatism, meaning caution about what one does not know.

**Confidence, and why it is applied twice.** Each factor also carries a base confidence, a number between zero and one describing how well that particular thing was assessed. The generator assigns it by status. The logic is that a field team reporting a functioning clinic has usually seen it, whereas a team reporting that they do not know has by definition seen less.

**Base confidence assigned by status.**

| Status | Base confidence |
| --- | --- |
| Unknown | 0.05 to 0.50 |
| Blocked | 0.40 to 0.75 |
| Operational or Partial | 0.60 to 0.95 |

Separately, the Field Uncertainty slider produces a single confidence multiplier applied to every factor at once. If the slider reads thirty per cent uncertainty, the multiplier is 0.70, and every factor's confidence is reduced to seventy per cent of what it was. This is the whole-environment term: how degraded is the information picture right now, across the board. The two multiply together to give an effective confidence for each factor. This is the pairing the concept note calls uncertainty twice over.

**How a factor score is actually computed.** A factor's contribution is its status value scaled by a confidence adjustment. The adjustment is not the raw confidence but 0.5 plus half of the effective confidence. In plain terms, a factor never loses more than half its value to uncertainty. A destination reported as Operational with perfect confidence contributes its full 1.0. The same destination reported as Operational with no confidence at all contributes 0.5, the same as a confidently-reported Partial. Blocked is the exception. It scores zero regardless of confidence, on the reasoning that a reported blockage should not be discounted merely because the report is shaky. That does not make a Blocked factor's confidence value dead weight: it still feeds the perturbation probability described further down, where a lower confidence makes a trial more likely to flip that factor to a different status.

**The weights and the gatekeeper cap.** Gatekeeper factors carry a weight of 2. Standard factors carry a weight of 1. Readiness is the weighted average of the seven factor scores, so the three gatekeepers between them account for six of the ten weight units, which is to say sixty per cent of the ordinary score.

On top of that average sits the hard rule. If any gatekeeper is Blocked, readiness is capped at twenty per cent no matter what the average said. This is what makes the gatekeepers non-substitutable. The weighting alone would still have permitted a very strong performance elsewhere to lift a site with a blocked gatekeeper above a mediocre but unblocked one. The cap forbids it.

**Destination capacity and distance.** Capacity is generated between 200 and 5,000 places. It is not drawn evenly across that range but from an exponential distribution, which produces many small values and few large ones. The stated reason is that this matches the real shape of humanitarian site provision: many small sites and a few large camps. Distance is generated between 20 and 400 kilometres. The documentation is explicit that distance is a stand-in for operational burden, and that real routing constraints such as road condition, checkpoints, and fuel are not modelled. It is the only route variable in the tool.

**The evacuee groups.** Groups are drawn from eight fixed population types, described in the methodology as grounded in field taxonomy and in the categories of persons afforded specific protection under international humanitarian law. Only the size of a group is randomised, between 50 and 2,000 people. Each type carries three fixed properties.

**The eight evacuee archetypes and their fixed properties.**

| Group | Vulnerability | Special need | Urgency |
| --- | --- | --- | --- |
| Elderly and mobility-impaired | 5 | Mobility | Immediate |
| Wounded and medical cases | 5 | Medical | Immediate |
| Unaccompanied minors | 5 | Medical | Immediate |
| Families with children | 4 | None | Urgent |
| Pregnant women | 4 | Medical | Urgent |
| Journalists and aid workers | 2 | None | Urgent |
| Unaccompanied adults | 2 | None | Can wait |
| Mixed general population | 2 | None | Can wait |

Vulnerability runs on a five-point scale. Urgency determines the order in which groups are assigned, which matters because assignment is sequential and capacity runs out. The special-needs marker determines whether a destination's medical provision is treated as decisive for that group.

**The composite score, and its four weights.** Readiness alone does not decide where a group goes. The tool ranks destinations for each group using a composite score built from four parts.

| Component | Weight | What it measures |
| --- | --- | --- |
| Readiness | 0.40 | The quality of protection at the site |
| Capacity fit | 0.30 | The site's capacity divided by the group's size, capped at 1.0, since a site twice the size of the group scores the same as one ten times its size and surplus beyond sufficiency adds nothing |
| Proximity | 0.20 | One minus the distance divided by the 400 kilometre maximum, so a nearby site scores near 1.0 and the furthest scores near zero |
| Vulnerability match | 0.10 | A binary: 1.0 if the group has a special need and the site's medical capacity is Operational, and 0.5 in every other case |

The in-app methodology states the ordering these weights encode: protection quality first, physical fit second, operational burden third, population needs fourth.

One observation worth recording. Because vulnerability match is checked only against medical capacity, a group whose stated need is mobility rather than medical is rewarded by the presence of a clinic. The mobility need has no separate representation anywhere in the scoring. The obvious remedy is a second, independent accessibility factor, generated and scored the same way as the existing seven and checked against a mobility need the way medical capacity is checked against a medical one. That has not been built yet, since it would change the balance between gatekeeper and standard factors and the shape of every generated destination, which is a modelling decision rather than a small fix.

**Three terms this report uses that are easy to conflate, since all three describe how good something is at a different point in the pipeline.**

| Term | What it measures |
| --- | --- |
| Readiness | A single destination's own quality, independent of any particular group |
| Composite score | How well a destination fits one specific group, blending readiness with capacity fit, proximity, and vulnerability match |
| Success rate | The predicted outcome of assigning one group to one destination, the share of five hundred trials that clear the readiness, capacity, and gatekeeper conditions at once |

A destination can rank first by composite score for a group and still have a low success rate, because composite score blends readiness with logistics terms that a hard gatekeeper cap does not touch. The worked example below shows this happening.

Three numbers govern the simulation of uncertainty itself:

- Runs, set to 500 per group and destination pair. This is how many times each pairing is tested. More runs give a tighter estimate at the cost of speed. The information-value panel originally used a cheaper 100 runs, but that count produced estimates too noisy to trust, so it now uses the same 500 runs as everywhere else in the tool.
- Maximum perturbation probability, set to 0.85. This is the ceiling on how likely a factor's assessment is to be wrong in a given trial, so that at an effective confidence of zero a factor still has a fifteen per cent chance of being reported correctly. The tool never assumes information is entirely worthless.
- The perturbation step, fixed at one level. When a factor is judged to be misreported it moves exactly one place better or worse along the sequence, with an even chance of each direction. The documentation acknowledges this as a simplification, noting that a real mis-assessment could jump multiple levels, such as an Operational site being reported as Blocked.

Factors already recorded as Unknown are never perturbed. Uncertainty about an unknown is already expressed in its low score and low confidence.

**The success threshold.** A single trial counts as a success only if three conditions hold together: readiness reaches at least forty per cent, the destination's capacity is at least the group's size, and no gatekeeper is blocked in that trial. An earlier version of the tool's own source table attributed the forty per cent floor to the UNHCR Handbook for Emergencies. That attribution has since been withdrawn as incorrect: readiness is a construct internal to this tool, a weighted average of seven invented factor scores, so no external handbook can define a minimum readiness threshold for it. The floor is now labelled what it actually is, an unsourced modelling assumption, uncalibrated and chosen by the authors. By contrast the two Sphere figures cited later, fifteen litres of water per person per day and 3.5 square metres of covered space, are accurate and are correctly described as informing which factors exist rather than validating any weight.

Note that a destination whose gatekeeper is blocked is capped at twenty per cent readiness, which is below the forty per cent floor. The cap and the threshold are therefore consistent by construction: a blocked gatekeeper cannot produce a successful trial.
