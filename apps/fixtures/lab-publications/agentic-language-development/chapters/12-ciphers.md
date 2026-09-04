<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/agentic-language-development.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 12. Ephemeral encodings: novelty is not security {#ciphers}

A tempting question is whether two agents can build a one-run or one-message encoding that resists an attacker holding the history of every earlier convention. The concept splits that into three experiments precisely because the tempting version conflates them.

1. Ephemeral convention: the agents invent a temporary codebook for synthetic messages. This tests novelty, coordination, and resistance to a history-trained classifier. It establishes nothing about cryptographic security.
2. Standard cryptographic control: the same messages are protected by a reviewed algorithm with a fresh per-message key, providing the baseline any learned encoding must be compared against.
3. Adversarial neural cryptography: the pair learns an encoding while an adversary attempts recovery, with success measured against multiple unseen adversary architectures rather than the one used in training.

An experiment instance can be given a reproducible identity, so that a registry can confirm it has not appeared before:

```text

instanceId = SHA-256(runId || babyANonce || babyBNonce || publicSalt || canonicalProtocolArtifact)

```

Both agents commit to their nonce contributions before revealing them, so neither party alone controls the resulting identity.

That identifier proves the recorded inputs are new. It does not prove:

- that the effective algorithm behaves any differently from an earlier one;
- that the algorithm has no structural weakness;
- that the key is unpredictable;
- that the scheme provides confidentiality, integrity, authenticity, forward secrecy, or resistance to a stronger adversary.

Established practice points the other way. Secure messaging keeps the algorithm stable and changes the key material: Signal's double ratchet derives a unique key per message and deletes it after use, addressing key reuse without inventing a new cipher every time. A salt, in NIST's definition, is normally public diversification data, and a nonce is a value used once in a specified context. Neither makes anything secure on its own.

There is also an unresolved conflict inside the design. The BabySitter sees the whole channel and both ledgers, and a mandatory ledger documents how meaning evolved. If the ledger explains decryption, the cipher is not confidential from the auditor. The specification has to choose a threat model rather than leave the tension implicit: resist only an external observer of prior runs, resist an adversary during the run while releasing keys afterwards, keep the supervisor able to pause traffic but unable to read it until a post-run audit ceremony, or study novelty and stop calling the result encryption. All such runs use synthetic, non-sensitive messages, and no agent-generated encoding is to be represented as production cryptography without independent expert analysis and formal security work.
