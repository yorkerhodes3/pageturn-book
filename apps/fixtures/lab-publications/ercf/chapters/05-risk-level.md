<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/ercf.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 05. From Seven Scores to a Risk Level {#risk-level}

The weighted score is placed into one of five bands, each with a label and a NATO-doctrine equivalent used in military planning.

| Level | Label | Weighted score | NATO equivalent |
| --- | --- | --- | --- |
| Level 0 | Baseline and Monitoring | 1.5 or below | permissive and stable |
| Level 1 | Low Risk and Advisory | above 1.5 up to 2.5 | permissive but degrading |
| Level 2 | Moderate Risk and Watchful | above 2.5 up to 3.5 | uncertain |
| Level 3 | High Risk and Contested | above 3.5 up to 4.2 | hostile, partial |
| Level 4 | Critical and Emergency | above 4.2 | hostile, imminent |

There is one override. If D1 and D6 are both at 4.5 or above, that is, if violence is extreme and the window is closing at the same time, the score is floored at 4.21, which forces Level 4 regardless of how favourable the other five dimensions look. This exists because the linear weighted average would otherwise allow good logistics and a safe destination to pull an imminent massacre down into Level 3.

The level is not merely a label. It selects the numerical rates used everywhere downstream: the security escort ratio, the daily cost of assistance per person, the access multiplier, the supply loss rate, the injury rate, the mortality base rate, and the probability of emergency extraction. Almost every figure the tool produces changes when the level changes. This is a design choice worth noticing, because it means the five-band classification carries a great deal of weight and the boundaries between bands, at 1.5, 2.5, 3.5 and 4.2, are themselves modelled judgments rather than empirical findings.

Alongside the composite score, the tool computes three sub-indexes that keep distinct questions apart. This was added on the recommendation of the project's academic reviewers. Risk Severity asks how dangerous the situation is for civilians, and is built from D1, D2 and D6 only, rescaled back onto a 1 to 5 range. Feasibility asks whether people can realistically move, and is built from D3, D4 and D5, but inverted: because a high D3, D4 or D5 score means bad conditions, each is subtracted from 6 before being used, so that a high feasibility number means a genuinely open corridor. Information Quality is simply 6 minus D7, so that a high number means good situational awareness.

Keeping severity and feasibility apart matters. A situation can be extremely dangerous and simultaneously impossible to evacuate. Blending the two into one score would make that case look moderate, which is precisely the case that should escalate most urgently. The tool instead places the scenario in a four-cell matrix. High severity with high feasibility returns evacuate immediately. High severity with low feasibility returns shelter in place and negotiate a corridor urgently, with the reasoning that forced movement without a safe corridor risks greater harm than staying, and with a note that the precautionary obligations under Articles 57 and 58 of Additional Protocol I apply while negotiation continues. Low severity with high feasibility returns facilitate voluntary departure, and explicitly says do not mandate evacuation. Low severity with low feasibility returns monitor and reassess daily.
