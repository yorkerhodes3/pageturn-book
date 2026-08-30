<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/agentic-language-development.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 06. Two ledgers that never meet {#ledgers}

Each Baby keeps its own language ledger. It is mandatory, private from the other Baby, readable by the BabySitter and authorised human auditors, and ordered by when each term or construction was first encountered. It is not a shared dictionary and the two are never reconciled by the agents themselves.

The preferred form is three columns, and the point of the third is that meanings are allowed to be wrong on the way to being right.

**One term's evolution in Baby B's ledger. Nothing is overwritten; every revision is appended with the evidence that forced it.**

| Sequence and term | Current definition or hypothesis | Evidence and evolution |
| --- | --- | --- |
| 1 · S13 | red circle; confidence 0.45 | First received while the red circle was the target; selection succeeded |
| 8 · S13 | red; confidence 0.78 | A red square was selected successfully; revised from object identity to colour |
| 22 · S13 | red; confidence 0.94 | Prediction held across circles, squares, and triangles |

The rules that make the ledger evidence rather than commentary:

1. first emission or receipt of an unfamiliar term requires a first-use entry;
2. definitions are provisional hypotheses, never facts asserted retroactively;
3. every meaning change appends a revision and previous interpretations survive;
4. entries may describe symbols, sequences, ordering, grammar, or repair signals;
5. entries record confidence, supporting evidence, contradictory evidence, and abandoned meanings;
6. a Baby records its intended meaning when speaking and its inferred meaning when receiving;
7. a channel message and its required private ledger mutation commit atomically;
8. entries carry enough run and turn references to trace them to observable evidence;
9. neither Baby can query, receive, summarise, or infer from the other's ledger through any system-provided interface.

Rule seven is doing quiet work. If a message could be sent and the corresponding hypothesis written afterwards, the ledger becomes a place to record what the agent wishes it had meant. Committing both together makes the record contemporaneous.

An agent that cannot write English needs a different arrangement, and the concept provides two layers. The agent-native ledger holds what the learner actually uses: association weights, probability distributions, embeddings, confidence, episode references, prediction errors, revision history. The human audit ledger is a deterministic or BabySitter-generated interpretation of that state, clearly labelled as external analysis and never fed back to either Baby. Confusing the second for the first would mean presenting the researchers' reconstruction as the agent's own definition.
