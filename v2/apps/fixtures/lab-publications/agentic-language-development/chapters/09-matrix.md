<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/agentic-language-development.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 09. The experimental matrix {#matrix}

The concept's main methodological commitment is that its ideas are separable. Affect, blank canvases, intrinsic motivation, negotiation, and learned encodings are interesting individually and uninterpretable if combined in one run. The matrix exists so that conditions are declared rather than accumulated.

**Runs vary one major axis at a time before any factorial combination is attempted.**

| Axis | Candidate conditions |
| --- | --- |
| Agent type | Pretrained LLM, memory learner, adapter-trained agent, initially ungrounded trainable agent |
| Learning mechanism | Frozen LLM with memory, extrinsic-reward MARL, intrinsic-motivation MARL, self-supervised learner, no-learning control |
| Sign carrier | Fixed random tokens, unfamiliar fixed glyphs, blank sketch canvas, gesture, tone |
| Affect | None, six-display allowlist, permuted mapping, six opaque tokens, derived affect, emergent affect display |
| Learning signal | External task reward, intrinsic social influence, curiosity, self-supervision, memory only |
| Interaction | Cooperative signaling, asymmetric information, semi-cooperative negotiation |
| Protection | Plain channel, ephemeral convention, standard per-message keys, adversarial learned encoding |
| BabySitter | Monitor-only baseline; any safety intervention recorded as a protocol exception |

Task difficulty moves through ten stages, from naming four distinct objects with one-symbol messages, through attributes, spatial relations, actions, multi-symbol composition, order-sensitive grammar, and repair under ambiguity, to held-out generalisation with learning disabled, long-run drift, and cross-architecture comparison. Vocabulary size, turn count, reward structure, and exposure history are controlled at each stage so that runs remain comparable.

The learning-mechanism axis carries a question the transcript cannot answer on its own. Convergence can be driven by reinforcement, by pretrained linguistic priors, by persistent memory, by intrinsic motivation, or by self-supervised prediction, and all five can look alike in a log. Running the same exercise suite under a no-learning control, a frozen-weights memory baseline, extrinsic-reward learning, intrinsic-motivation learning, and reward-free self-supervision is what makes the mechanism itself measurable. The aim is not only to observe that a language emerged, but to say which process caused it.

Strict isolation constrains how that reinforcement learning may be implemented. Centralised training, backpropagation through both agents, shared replay buffers, and shared gradients all move information outside the permitted channel. The research-grade baseline updates each policy independently, and any centralised variant is reported as a separate, weaker-isolation condition.
