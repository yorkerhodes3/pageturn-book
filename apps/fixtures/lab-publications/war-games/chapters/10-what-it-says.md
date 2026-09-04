<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/war-games.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 10. What This Says About Agents {#what-it-says}

The research question this sits under asks whether AI can help practitioners rehearse high stakes situations. This artefact answers a narrower version of it, and the answer is more useful for being narrow.

A language model can play a persistent, literal, goal directed character convincingly enough to carry a ten minute dramatic arc, and can do so at a cost of fractions of a cent, or at no cost at all on owned hardware. That much is settled. What the evaluation adds is a set of observations about the surrounding system that generalise well beyond a game.

**The model will not drive the situation.** Left to itself it is polite, conservative and reluctant to escalate, which reads as a safety property and behaves as a design failure. Any system that needs pace, pressure or resolution has to own those things itself and cannot delegate them to the model's judgement.

**The contract is the safety mechanism.** Because the model returns a constrained object rather than free text with authority, every one of its proposals passes through validation before it touches state. This is what makes the difference between a model that plays a character and a model that runs a system, and it is the difference the film is about.

**Capability and fitness are different axes.** The largest model available was the worst performer in this study, comprehensively, on every measure. A team choosing a model by capability ranking rather than by task fit would have picked it.

**Synthetic evaluation will not find the behavioural problems.** The one finding that changed the design appeared only when real models were run through the real code path. Emulated profiles test the handling of outputs. They do not test disposition.

The film's line is that the only winning move is not to play. The engineering translation is narrower and less quotable. A model that cannot distinguish rehearsal from command is not made safe by being told the difference. It is made safe by a system built so that the distinction is not the model's to make.
