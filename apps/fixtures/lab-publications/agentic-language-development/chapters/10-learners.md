<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/agentic-language-development.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 10. Building learners rather than personas {#learners}

For a pretrained model, the operating instructions are a contract, not a character. The learner is told that this is not role-play, that unfamiliar marks are semantically unknown until run evidence supports a hypothesis, that observation must be distinguished from inference, that contradictory evidence is preserved, that prior history is never rewritten, and that no prose, label, explanation, code, URL, or tool-like text may cross the public channel. It is told never to address its partner in a human language, never to expose its ledger, never to construct another route, and never to use timing, errors, identifiers, formatting, or affect as an alternative alphabet.

The contract must contain no semantic examples. A single illustrative line saying that some symbol means red would seed the very language the experiment exists to observe.

Interaction is tool-only. There is no general chat surface, just narrowly typed operations: emit a mark, emit a canvas, select an object, perform an action, submit an affect display, append a private ledger entry. The runtime forwards only the permitted public artifact. In strict runs the gateway rejects ordinary model text even when it appears alongside a valid tool call. Tool schemas are an interface boundary; deterministic validation still enforces carrier size, allowlists, windows, and turn order.

Isolation extends to everything the models touch, not just to messages:

- separate system prompts and context windows;
- separate memory stores and vector indexes;
- no shared cache, replay buffer, scratchpad, or retrieval collection;
- no cross-run memory unless persistence is the independent variable;
- structurally equivalent prompts that share no examples, ordering conventions, or default vocabulary;
- deterministic reset and snapshot behaviour.

Model choice follows the claim being made. The scientific baseline is small policies trained from scratch, recurrent actor-critic agents with a discrete communication head, which have no hidden English competence, permit full training control, run many seeds cheaply, and support causal ablation. A small locally deployable instruction model is appropriate for validating orchestration, ledgers, channel enforcement, and interface, and not for supporting claims about language-naive development. Vision-language encoders whose representations were explicitly aligned to human language are avoided entirely in the strongest ungrounded condition.

Developmental progression is defined by demonstrated competence rather than by simulated age: sensorimotor familiarisation, joint attention, imitation and turn-taking, intentional reference, repair, combination, generalisation. A staged curriculum is itself a form of guidance, so it is run as a separate experimental condition rather than folded into the baseline.

The governing principle, stated in the concept as a single line, is not to ask a model to perform infancy but to construct an environment in which limited, grounded, auditable learning is the only path to a successful interaction.
