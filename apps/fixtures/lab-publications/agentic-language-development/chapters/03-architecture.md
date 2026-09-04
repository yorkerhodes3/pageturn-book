<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/agentic-language-development.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 03. The nursery: three twins and one gateway {#architecture}

The environment uses three DTSF digital twins and one piece of deterministic software that is not a twin at all.

**Baby A and Baby B** Each has private observations permitted by the current exercise, a private memory and learning policy, a private chronological language ledger, the ability to emit only permitted channel symbols, and no access whatsoever to the other's state, observations, ledger, tools, or endpoints. In comparative runs the two may use different agent types, but symmetric pairings are the baseline.

**The BabySitter** The supervising twin. It creates the channel, selects the shared exercises, delivers each Baby only its permitted observation, reads everything, records conditions and outcomes, detects violations, can pause or terminate a run, snapshots state, and compares the two ledgers for convergence without exposing either to the other Baby. During an active run it provides no translations and no semantic hints.

**The Symbol Gateway** A deterministic service, not an agent. It owns channel validation and message delivery. This separation is the load-bearing part of the design: the BabySitter is not the security boundary, because prompt compliance is not isolation. An observing model can make supervisory judgements, but ordinary code has to validate and broker every message.

**The human researcher** Configures experiments, inspects transcripts and ledgers, reviews alerts, and runs interventions. Human access is itself recorded, so that intervening in a run is always distinguishable from watching one.

A prototype may run all of this inside one runtime with logically separated twin state. That is enough to explore the learning loop and it is not enough to support an isolation claim, a distinction Section 05 takes seriously.
