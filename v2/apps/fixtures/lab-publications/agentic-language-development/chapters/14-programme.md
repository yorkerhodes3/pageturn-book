<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/agentic-language-development.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 14. The programme, and its current status {#programme}

The experiment notebook is ordered, and the order is the argument. Nothing about language is measured until the instrument has been shown to work.

**The experiment index, as pre-registered. Every entry currently reads not started, and the results column is empty by design.**

| ID | Experiment | Depends on |
| --- | --- | --- |
| E00 | Ledger integrity and Base anchoring | None |
| E01 | Channel isolation and side-channel red team | E00 |
| E02 | Observation and metadata leakage audit | E00 |
| E03 | Chance, no-communication, and random-message controls | E01, E02 |
| E10 | Frozen pretrained-LLM protocol baseline | E03 |
| E11 | From-scratch RL Naming Game | E03 |
| E12 | Self-supervised ungrounded baseline | E11 infrastructure |
| E13 | No predefined symbol library | E11 or E12 |
| E14 | Turn-taking, role reversal, and repair | E13 |
| E15 | Composition and held-out generalisation | E14 |
| E16 | Causal listening and ledger validity | E15 |
| E20 | Constrained affect-channel study | E16 |
| E21 | RL versus non-RL learning comparison | E16 |
| E22 | Developmental plasticity and curriculum | E16 |
| E30 | Partner replacement and zero-shot transfer | E20 to E22 |
| E31 | Longitudinal drift and stability | E30 |
| E32 | Cooperative signaling versus negotiation | E31 |
| E40 | Ephemeral encoding and adversarial cryptography | E32 |
| E50 | Multi-seed replication and study closeout | E40 |

The first four experiments are about the apparatus. E00 qualifies the ledger: it must be possible to detect a modified, deleted, inserted, or reordered entry, and to prove that later checkpoints extend earlier ones. E01 is a red team against the channel. E02 hunts human language in observations and metadata. E03 establishes chance, no-communication, and random-message baselines, without which a success rate means nothing. Only then does E10 put agents in the room.

Unless an experiment explicitly varies one of them, the notebook holds these constant:

- the two learners run in separate processes or containers with no direct route between them;
- the deterministic gateway is the only communication path;
- the supervisor has complete read-only access and sends no guidance or reward;
- private observations contain no human-language labels or text;
- public output uses only the pre-registered carrier;
- the affect channel is disabled unless it is the subject of study;
- schedules and seeds are fixed before the run;
- held-out evaluation runs with learning disabled;
- no production secrets or personal data appear in any experiment.

Every run copies a standard record: run and experiment identifiers, dates, operator, both models and both training modes, scenario and prompt and gateway configuration hashes, random seed, policy initialisation hashes, the protocol and software commits, final ledger sizes and roots for both agents, the channel root, the final checkpoint hash, the Base anchor transaction, the verifier result, protocol deviations, and an explicit disposition of valid, invalid, or aborted. The notebook is the human workflow record; anchored run bundles remain the authoritative evidence.

The status is unambiguous and worth stating plainly: this is a concept and pre-specification phase. Nineteen experiments are written up and none has been run. The next milestone is a testable specification covering runtime architecture, channel contract, ledger schema, experiment matrix, evaluation criteria, isolation model, and evidence requirements.
