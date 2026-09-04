# 11. AI & Emerging Tech {#ai-emerging-tech}

## Machine learning {#term-11-1}

*ML*

Systems that derive rules from data rather than being programmed with them. The behaviour reflects the training data, including its errors and bias.

## Large language model {#term-11-2}

*LLM*

A model trained on vast text to predict likely continuations. Fluent by construction, and fluency is not the same as being correct.

## Training data {#term-11-3}



The corpus a model learns from. Its provenance, licensing, and bias become properties of the finished system.

## Inference {#term-11-4}



Running a trained model to get an output. Where cost, latency, and most data-exposure questions actually live.

## Prompt {#term-11-5}



The instruction and context given to a model. In most current systems it is also, unhelpfully, the security boundary.

## System prompt {#term-11-6}



Standing instructions set by the developer ahead of user input. Treat it as configuration, never as a secret — it leaks.

## Context window {#term-11-7}



How much text a model can consider at once. Anything beyond it is dropped or summarised, which quietly changes behaviour.

## Token {#term-11-8}



The chunk of text a model processes, roughly a word fragment. The unit of both pricing and context limits.

## Hallucination {#term-11-9}

*Confabulation*

A confident, fluent, wrong output. Not a bug to be patched out but a property of prediction, which is why verification has to be designed in.

## Prompt injection {#term-11-10}



Hostile instructions hidden in content a model reads, hijacking its behaviour. The defining security problem of LLM applications.

## Indirect prompt injection {#term-11-11}



Injection delivered through a document, web page, or email the model retrieves, so the attacker never talks to the system directly.

## Jailbreak {#term-11-12}



Framing that persuades a model past its safety training. Distinct from prompt injection, which targets the application's instructions.

## Data poisoning {#term-11-13}



Corrupting training or retrieval data so the model learns something the attacker chose. Very hard to detect after the fact.

## Model inversion / membership inference {#term-11-14}



Extracting training data, or proving a specific record was in the training set, by probing the model. A privacy problem for models trained on personal data.

## Model extraction {#term-11-15}

*Model stealing*

Reconstructing a proprietary model by querying it enough times to train a copy of its behaviour.

## Adversarial example {#term-11-16}



Input perturbed slightly so a model misclassifies it while a person sees nothing unusual. The classic attack on vision systems.

## RAG {#term-11-17}

*Retrieval-Augmented Generation*

Fetching relevant documents and giving them to a model as context. It grounds answers — and makes every retrievable document an injection surface.

## Vector database {#term-11-18}

*Embedding store*

Storage for numeric representations of text so similar meaning can be found by proximity. The retrieval half of RAG, and it inherits the source's access rules only if you make it.

## Embedding {#term-11-19}



A numeric representation capturing meaning, so similar things sit close together. Not anonymised — original text can often be approximately recovered.

## Fine-tuning {#term-11-20}



Further training a base model on specific data to specialise it. Anything in that data is baked into the weights and cannot be selectively deleted.

## Guardrails {#term-11-21}



Filters and policies around a model's inputs and outputs. Necessary, probabilistic, and not a substitute for real authorisation checks.

## Human in the loop {#term-11-22}

*HITL*

Requiring a person to approve consequential AI-driven actions. Only meaningful if the reviewer has the time and information to genuinely disagree.

## Agentic AI {#term-11-23}

*AI agent*

A model given tools and the autonomy to take multi-step actions. It converts a text-generation risk into a systems-and-permissions risk.

## Tool use / function calling {#term-11-24}



Letting a model invoke external functions or APIs. Whatever the tool can do, a successful prompt injection can do.

## MCP {#term-11-25}

*Model Context Protocol*

An open standard for connecting models to tools and data sources. Each connected server is a new trust relationship to review.

## Model card {#term-11-26}



Documentation of a model's intended use, training data, evaluation, and limitations. The AI equivalent of a datasheet.

## AI red teaming {#term-11-27}



Deliberately probing a model or AI system for harmful, biased, or unsafe behaviour before users find it.

## Explainability {#term-11-28}

*XAI*

Being able to say why a model produced a given output. Increasingly a legal requirement for decisions affecting people.

## Algorithmic bias {#term-11-29}



Systematic unfairness in outputs, usually inherited from data or objectives. A safety and legal problem, not only an accuracy one.

## EU AI Act {#term-11-30}



The EU's risk-tiered regulation of AI systems, with outright bans at the top and obligations scaling with risk. Extraterritorial, like GDPR.

## Deepfake {#term-11-31}

*Synthetic media*

AI-generated audio, image, or video imitating a real person. Already routine in payment fraud and executive impersonation.

## Content provenance {#term-11-32}

*C2PA*

Cryptographically signed metadata recording how a piece of media was made and edited. An attempt to make authenticity checkable rather than assumed.

## Watermarking {#term-11-33}



Embedding a detectable signal in AI-generated output. Helpful at scale, and generally removable by anyone who wants to remove it.

## Shadow AI {#term-11-34}



Staff using AI tools without approval, often pasting confidential data into them. The current form of shadow IT, moving faster.

## Blockchain {#term-11-35}

*Distributed ledger*

An append-only ledger replicated across many parties. Strong integrity guarantees; no confidentiality, and no help if the data entered was wrong.

## Smart contract {#term-11-36}



Code executing automatically on a blockchain. Immutable once deployed, which means bugs are permanent and expensive.

## Quantum computing {#term-11-37}



Computation using quantum states, able in principle to break RSA and elliptic-curve cryptography. The reason post-quantum migration is starting now.

## Confidential computing {#term-11-38}

*TEE / enclave*

Processing data inside a hardware-protected enclave so even the host operating system cannot read it. Closes the in-use gap left by encryption at rest and in transit.
