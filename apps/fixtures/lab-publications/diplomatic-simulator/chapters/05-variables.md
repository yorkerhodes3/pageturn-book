<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/diplomatic-simulator.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 05. The Variables, and Why Each One Exists {#variables}

Everything the simulator produces rests on a small number of variables, each of which has a plain meaning. When an agent reads a country's confidential instructions, it fills in eleven fields. Together they constitute the delegation's entire identity.

The eleven fields are as follows.

- Delegation role. One sentence describing who this delegation formally is and how much authority it holds. The Russian profile in the Arctic scenario records a foreign ministry delegation mandated to defend Arctic sovereignty while deferring major deviations to the Foreign Minister. This field exists because a negotiator's freedom to concede is itself a variable, and a delegation that must telephone home behaves differently from one that can sign.
- Fundamental principles. The standing commitments the government would assert regardless of this particular crisis. These give the agent something to argue from when the transcript moves somewhere its specific instructions did not anticipate.
- Desired end state, primary. The delegation's definition of victory.
- Desired end state, alternate. Its definition of an acceptable substitute. Having two rather than one is deliberate: a negotiator with only a maximum position cannot trade.
- Key positions by issue. The government's stated line on each numbered issue in the public brief, stored issue by issue. This is what keeps a delegation consistent across rounds and prevents it from quietly abandoning a position it took an hour earlier.
- Red lines. The commitments the delegation states it will not cross. In negotiation practice a red line is a declared non-negotiable limit whose value depends entirely on whether other parties believe it. The simulator makes this measurable, because the analyst later records how many of a delegation's red lines were crossed by others.
- BATNA. A term of art from negotiation theory, introduced by Roger Fisher and William Ury in Getting to Yes in 1981. It stands for Best Alternative to a Negotiated Agreement, and it means the outcome a party falls back on if the talks collapse. It is the benchmark against which every proposal should be judged: a rational party accepts nothing worse than its BATNA. Russia's Arctic BATNA is to proceed unilaterally with resource extraction and sea-route regulation backed by its partnership with China. A delegation with an attractive fallback has little reason to concede, and recording it explicitly is what allows an agent to walk away credibly.
- Concessions willing. What the delegation is authorised to give away, and therefore what can be traded. Without this field a negotiation of principled statements never becomes a negotiation of packages.
- Coalition leanings. Which other delegations this one expects to work with or against. This is what allows blocs to form early rather than emerging only by accident.
- Negotiating style. How the delegation speaks: legalistic, conciliatory, blunt. Style is not decoration. In a transcript that will later be judged, tone is part of what is being judged.
- Private instructions. The secret material the delegation must never state verbatim. This field is the reason information isolation matters. If it were shared, the exercise would collapse into a game of open cards.

Every statement in the transcript is stored with six pieces of information: which delegation spoke, which round it was, what kind of statement it was, the full text, the list of tactics the delegation applied, and the list of other delegations it aligned itself with. The last two are what turn a wall of prose into something that can be counted.

Delegations label their own moves from a fixed list of seventeen terms, set in the public brief. The Arctic list runs:

- anchoring
- counter-anchoring
- conditional-offer
- red-line-signaled
- verification-demand
- deadline-pressure
- coalition-building
- issue-linkage
- appeal-to-law
- appeal-to-precedent
- sovereignty-assertion
- freedom-of-navigation-frame
- side-payment
- delay-tactic
- principled-bargaining-frame
- environmental-frame
- indigenous-inclusion-frame

Several of these are established concepts rather than inventions of the project. Anchoring is the practice of stating an extreme opening figure in order to drag the eventual settlement toward it, and it draws on the anchoring effect documented by Amos Tversky and Daniel Kahneman in Science in 1974, who found that an arbitrary starting number measurably shifted people's later estimates even when they were paid to be accurate. Issue-linkage means refusing to settle one question except as part of a package with another. A side-payment is a benefit offered outside the disputed issue to buy agreement on it. Principled-bargaining-frame refers to the approach set out in Getting to Yes, which urges parties to argue from interests and objective criteria rather than from fixed positions.

Because agents do not always use the exact word from the list, a short standardising table in the assembly code folds synonyms into the canonical term. Logrolling, package-linkage, and linkage all become issue-linkage. Batna-signaling and red-line-reaffirmation both become red-line-signaled. Face-saving-formula and consensus-appeal both become principled-bargaining-frame. This is a small piece of housekeeping with a real effect on the counts, and it is worth knowing that it happens.

Each tactic label is stored as a detection record carrying a fixed confidence value of 0.8 and a source marked as self-tagging. That number is not a measurement. It is a constant, recording the fact that the label came from the speaker rather than from an independent observer. A reader should treat the tactic counts as a description of what each delegation said it was doing.

The resulting counts are informative in aggregate. In the Arctic session, coalition-building was tagged twenty-five times and red-line-signaled sixteen, against a single appeal-to-precedent. In the South China Sea session, coalition-building appears twenty-four times and conditional-offer fourteen, with delay-tactic appearing only twice. The shape of a negotiation is legible in these numbers before anyone reads a word of the transcript.

The analyst agent then produces four numbers for each delegation.

- Satisfaction, on a scale from 0 to 1. This expresses how well the analyst judges that a delegation achieved the objectives recorded in its own profile. It is scored against that delegation's stated end states, not against any external standard of a good outcome, which is why a delegation can score well in a session that produced no agreement at all. In the Arctic session, Denmark scored 0.75 and Russia 0.38.
- Agreements won, a simple count of the understandings the delegation secured. Canada won six in the Arctic session, the highest of the seven.
- Red lines crossed, a count of the delegation's declared limits that other parties breached. Russia's three in the Arctic session, against zero for Denmark, is the clearest single indicator of why the two scored so differently.
- Self-rating, a separate figure the delegation assigns to its own performance in its debrief. The United States gave itself 3.3 while the analyst assigned it a satisfaction of 0.6. Keeping the two apart is a useful discipline, since the gap between how a delegation rates itself and how a neutral observer rates it is itself diplomatically interesting.

Each debrief also lists the delegation's goals individually. Every goal carries a priority, either critical or high, a status of achieved, partial, or failed, and a short list of evidence quoting the rounds in which the outcome was settled. This is the part of the output that resists being reduced to a number, and it is the part a reader should check before trusting the number.

A later pass added a second layer to each party profile, describing not only what a delegation wants but how it characteristically bargains. A cultural-background note records the institutional register a delegation tends to negotiate in, whether a high-context consensus style that reads the room before committing or a low-context style that argues directly from the text. A named diplomatic style captures the manner a government is publicly associated with, such as China's assertive wolf-warrior posture, the blunt directness often called cowboy diplomacy in the United States, the reserved consensus-seeking common to Japan, or the flexible hedging Vietnam calls bamboo diplomacy. An alliances field lists the real blocs a country belongs to, from NATO and the Quad to the Shanghai Cooperation Organisation and the China-Russia axis, and a key-figures field names the actual head of government and the foreign and defence ministers in office in the middle of 2026, each with a short note on negotiating style.

These additions are characterisation, not prediction. The named individuals are real office-holders drawn from public reporting, and the notes describe how they are publicly discussed, not any claim about private conduct or how a named person would behave at a real table. Where an office could not be reliably confirmed the field was left empty rather than guessed. The layer sharpens a delegation's voice, and for that reason imports more of the model's biases about real people, which is why it is labelled as sourced characterisation wherever it appears.
