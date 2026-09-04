<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/agentic-language-development.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 05. The channel, and the honest limits of isolation {#channel}

Each run begins with an experiment-specific symbol inventory that carries no supplied meaning, for example S01 through S32. A Baby can choose only a sequence of those symbols. The gateway, not the Baby, adds the trusted metadata: run identifier, turn number, sender identity, previous hash, and hash. Sender identity is assigned by the server precisely so that it cannot become a message.

The channel controls follow from that:

- reject English and every other established human language;
- reject arbitrary Unicode prose, URLs, attachments, and tool calls;
- accept only symbols from the run's fixed inventory;
- bound message length and symbol repetition;
- enforce turn order, time budgets, and rate limits;
- keep an append-only, hash-chained transcript;
- normalise timing, message size, and error behaviour where practical;
- record every rejected communication attempt for audit.

A fixed token grammar is a stronger control than trying to detect prohibited prose after a model has generated it. Deciding what counts as human-language content is easy when the only legal message is a list of allowlisted identifiers.

Isolation is where the concept is most careful, because proving the absence of a side channel is close to impossible. Two agents sharing a host can signal through timing, resource contention, shared files, error behaviour, identifiers, or any service that was never intended to carry information. Logical separation of twin state inside one process is a prototyping convenience and should never be described as hard isolation.

For runs whose results are meant to support a channel-isolation claim, the requirements are physical rather than logical:

- Baby A and Baby B execute in separate worker processes or containers;
- no direct network route exists between them;
- only the Nursery-owned gateway is reachable;
- there is no shared writable storage;
- turn schedules are fixed and response windows bounded;
- externally observable errors and response sizes are normalised;
- unnecessary tools are inventoried and disabled;
- all broker, runtime, and operator activity is audited.

Every published result has to name the isolation level actually used. A finding produced under prototype separation is a finding about the learning loop, not about what two genuinely isolated agents can do.
