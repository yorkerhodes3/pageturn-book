<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/agentic-language-development.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 07. Anchoring the evidence {#integrity}

A ledger that could have been edited after the fact proves nothing about what an agent believed at turn eight. The integrity design therefore makes each ledger cryptographically append-only.

The construction, in order:

- every entry receives a strictly increasing sequence number;
- every entry includes the previous entry's hash;
- canonical entry content is hashed and signed by an isolated ledger-writer service;
- ordered entry hashes are committed to a Merkle tree;
- signed checkpoints commit Baby A's root, Baby B's root, and the channel transcript root together;
- checkpoint hashes are anchored periodically to Base;
- final public study batches may additionally anchor an aggregate root to Ethereum L1.

Committing all three roots in one checkpoint is what binds the two private accounts to the public conversation. A receiver's later interpretation references the exact delivered channel-event hash, so a claim about what a symbol meant is tied to the specific message that carried it.

The concept states the limits of this in the same breath as the claim. After anchoring, an auditor can detect modification, deletion, insertion, or reordering within the committed prefix, and can prove that later checkpoints extend earlier ones. That is strong tamper evidence. It is not proof that an entry was truthful, and it is not proof that nothing was omitted before commitment. Anchoring establishes the continuity of disclosed evidence and nothing beyond it.

Privacy follows the same line. Only hashes and minimal routing metadata are anchored publicly. Private ledgers, messages, prompts, identities, and secrets stay off-chain, and the public record is a commitment to evidence rather than a copy of it.
