<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/ai-models-research.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 04. Accuracy, factuality, and hallucination {#accuracy}

Accuracy cannot be represented by one score. A model may excel at scientific multiple choice and still fabricate citations, invent software packages, omit constraints in a long document, or select the wrong tool in an agent loop. These are four different failure modes with four different measurements.

**Four distinct accuracy problems, each requiring its own evaluation.**

| Type | Question | How it is evaluated |
| --- | --- | --- |
| Parametric factuality | Is the answer correct from internal model knowledge? | Closed-book factual question answering |
| Groundedness | Does every material claim follow from the supplied sources? | Claim-level entailment against provided evidence |
| Procedural correctness | Did the model follow the required method and constraints? | Schema validation, unit tests, workflow checks |
| Epistemic behaviour | Does the model recognise when evidence is insufficient? | Calibration, selective accuracy, abstention |

HalluHard evaluates 950 difficult multi-turn conversations in legal, research, medical, and coding settings, and checks whether cited material actually supports the generated claims. The strongest web-enabled configuration tested still hallucinated on about 30 percent of conversations, and rates without web access were substantially higher. The same work reports that early errors cascade as a conversation lengthens, which makes multi-turn reliability a property of the system rather than of a single answer.

Software generation carries a distinct and concrete risk. Research at NYU's OSIRIS Lab on package hallucination, in which a model recommends dependencies that do not exist, found invented package names in roughly 4.6 to 6.1 percent of tested package suggestions across frontier systems, with some fabricated names recurring across models. That is a supply-chain exposure rather than a quality nuisance: a name that several models hallucinate can be registered by an attacker and then installed by automation.

**Fluency is not calibration.** Confidence can be expressed through verbal hedging, an explicit probability, token log-probabilities, agreement across samples, or a separate verifier, and these signals do not always agree with one another. Uncertainty estimators can correlate weakly with actual hallucination depending on the error type and the model, so a production system should validate its uncertainty signal against its own domain rather than assume a confident model is right.

Reliability is a property of the system, not of the model choice. The controls that matter more than selection are:

- Retrieval with provenance: retrieve a small evidence set, preserve source identifiers, and require claim-level citation.
- Constrained generation: schemas, grammars, enumerated values, and deterministic validators wherever possible.
- Verification: run the calculation, the code, the query, or the citation check against the first output.
- Selective escalation: route low-confidence, high-risk, or contradictory cases to a stronger model or a human reviewer.
- Abstention policy: define when the system must say the evidence is insufficient, and what would resolve it.
- Version control: pin model snapshots and rerun regression evaluations before an upgrade.
- Adversarial evaluation: test prompt injection, conflicting documents, missing evidence, and long-context distractors.
