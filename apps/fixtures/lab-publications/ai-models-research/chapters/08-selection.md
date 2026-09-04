<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/ai-models-research.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 08. A selection framework {#selection}

Selection starts from failure cost, not from capability. What a wrong answer costs sets the control posture, and the control posture constrains the candidate set before any benchmark is consulted.

**Risk tiers and the minimum control posture each requires.**

| Risk tier | Examples | Minimum control posture |
| --- | --- | --- |
| Low | Drafting, brainstorming, rewriting | Fast low-cost model, light validation |
| Moderate | Internal summarisation, extraction, analytics assistance | Schema validation, citations, sampled human review |
| High | Public research, financial analysis, legal support, code deployment | Strong model, source verification, tests, approvals |
| Critical | Clinical decisions, autonomous transactions, safety systems | Narrow validated system, expert oversight, formal governance |

The right system is frequently not a single model. Six architecture patterns recur:

- Cascade: a small model handles easy cases and a frontier model handles escalations, for high-volume mixed-difficulty workloads.
- Router: a classifier selects model, tools, and reasoning budget, for multiple task types under a cost constraint.
- Generator and verifier: one model produces and another checks claims or execution, where error cost is high and outputs are verifiable.
- Retrieval-grounded: the model answers only from a controlled evidence set, for research, policy, legal, and enterprise knowledge.
- Human in the loop: a person approves uncertain or consequential actions, for high-stakes decisions and transactions.
- Local plus cloud: a private local model handles sensitive data and a cloud model handles de-identified hard tasks, under sovereignty and privacy constraints.

**No model is selected on a published benchmark.** The benchmark narrows the candidate set; a local evaluation selects. Define the task contract, build a representative evaluation set including adversarial and multilingual cases, hold prompts and tool access constant, measure end-to-end outcomes rather than single answers, inspect variance rather than the mean, and pin versions before every upgrade.
