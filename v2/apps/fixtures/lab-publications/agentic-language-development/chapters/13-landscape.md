<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/agentic-language-development.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 13. Where the field already stands {#landscape}

The literature scan behind this section was run on 24 August 2026 using the Tavily search and extract interfaces, covering emergent multi-agent communication, referential games, compositionality, causal evaluation, intrinsic motivation, symbol invention, negotiation, and learned cryptography. Primary papers and authoritative specifications were preferred over summaries. It is a scoped review for concept development and not a systematic one; publication-quality work would need a verified bibliography, additional scholarly indexes, and documented inclusion criteria.

The short version is that agents can invent protocols, and that task success is weak evidence they invented anything worth calling a language.

**Selected prior work and what each one constrains in this design.**

| Related work | Relevant finding | Implication for the Nursery Lab |
| --- | --- | --- |
| Lazaridou, Peysakhovich, and Baroni (2017) | A sender and receiver develop a grounded protocol in a referential game without being given a target language. | The naming stage has strong precedent, though a fixed vocabulary remains a significant inductive constraint. |
| Mordatch and Abbeel (2018) | Multi-agent goals in a grounded environment produce multi-symbol communication with partial compositional structure. | Shared objects, actions, and goals are a stronger basis for emergence than an ungrounded transcript. |
| Kottur, Moura, Lee, and Batra (2017) | Agents solve tasks with degenerate, non-compositional codes; structural constraints decide what emerges. | Bandwidth, memory, turn structure, and task design are experimental variables, not implementation defaults. |
| Chaabouni and colleagues (2020) | Generalisation to novel combinations and measured compositionality can come apart. | Held-out behaviour must be tested directly; no single compositionality score is proof of understanding. |
| Lowe and colleagues (2019) | Positive signaling and positive listening are different things, and reward does not distinguish them. | Causal intervention is mandatory rather than optional. |
| Dessi, Kharitonov, and Baroni (2021) | Symbol ablation and substitution yield interpretable evidence about what a receiver uses. | Direct precedent for the intervention tests that validate ledger claims. |
| Mihai and Hare (2021) | Neural agents communicate through learned drawings rather than a supplied discrete vocabulary. | A blank canvas is a credible carrier for runs with no symbol library. |
| Baronchelli and colleagues (2005) | Naming Game agents converge on shared vocabulary through local interaction with no central teacher. | Convergence time, failed conventions, and memory update rules are first-class evidence. |
| Jaques and colleagues (2019) | Rewarding causal influence over a partner improves coordination without assigning a vocabulary. | An endogenous social signal is a plausible substitute for task reward, and still a designed bias. |
| Cao and colleagues (2018) | In semi-cooperative negotiation, self-interest and reward structure decide whether communication stays informative. | Negotiation is an advanced condition, not a description of the cooperative baseline. |
| Abadi and Andersen (2016) | Neural agents learn to protect messages from an adversary given a shared key. | Learned protective encodings are real and are not a substitute for formal security analysis. |

This body of work also sharpens the infant-like caveat from the other direction. Most experiments in the field give their agents substantial structure: a fixed channel, an objective, a bounded vocabulary, joint training, or a reward. No dictionary does not mean no inductive bias, and no teacher does not mean no learning signal.

The CoLab's own Diplomacy Table is direct project prior art. It already models independent delegation seats, a convener that advances rounds, operator-wide visibility alongside seat-specific perspectives, transcripts and ticks and redaction boundaries, and recorded replay with debrief. Those map cleanly onto two Babies, controlled turns, private observations, and replayable evidence. Caucuses, coalition rooms, and direct delegation links do not map safely and are disabled.

What the review implies for the specification:

1. the project sits inside a mature field, and its distinctive combination is independent ledgers, supervisory audit, mixed agent types, and affect;
2. grounding, bandwidth, memory, and learning pressure strongly shape what language appears;
3. successful coordination coexists happily with a brittle lookup code or with a receiver that ignores messages;
4. causal interventions and held-out generalisation are mandatory;
5. a visual carrier removes the need for a symbol library but not the need for a carrier;
6. intrinsic social influence can replace task reward and remains a designed learning bias;
7. negotiation is a valid advanced condition, not the right description of the baseline;
8. ephemeral conventions, learned cryptography, one-time pads, per-message keys, nonces, and salts are distinct mechanisms and must not be conflated.
