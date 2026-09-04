<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/agentic-behavior-observatory.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 04. What the corpus turned out to model {#findings}

Across all 22 repositories the analyzer found 33 distinct demographic dimensions in code and prose. They are not evenly distributed, and the shape of the imbalance is the most substantive finding in this report.

**Repositories mentioning each demographic dimension, out of 22. Visible bodily and household attributes dominate; economic position is close to absent.**

**Dimension prevalence across the 22-repository corpus, August 2026.**

| Dimension | Repositories |
| --- | --- |
| Children | 19 |
| Age | 15 |
| Disability | 15 |
| Region | 12 |
| Gender | 8 |
| Migration | 7 |
| Education | 6 |
| Race | 6 |
| Income | 3 |
| Religion | 1 |
| Employment | 1 |
| Literacy | 1 |

**Populations with bodies but no economics.** Nineteen of 22 repositories model children and 15 model disability, both of which change how a person moves in an evacuation. Three model income, one models employment, and one models literacy. In a body of work substantially about who gets out of a disaster and who does not, the attributes that determine whether a household has a car, can afford to leave early, or can read the warning are the ones least often represented. The instrument cannot say whether that is an oversight or a defensible modeling choice. It can say the choice is being made silently in most of these repositories.

**Eight repositories name no model.** The analyzer extracts every model identifier it finds. Across the corpus it found 42 distinct versions, led by gpt-4o-mini in 7 repositories. Eight repositories doing model-driven behavioral work name no version anywhere the analyzer could read. Behavioral findings drift between model versions, so a result whose model is unrecorded cannot be reproduced later even by the people who produced it.

**The corpus is better at isolating contexts than at modelling economies.** Context isolation was added to the taxonomy after the findings above, to ask whether a repository has any vocabulary for keeping information where it belongs: one agent out of another's private brief, one run out of the next, the model's own training out of the persona it was given, the test item out of the prompt meant to test it. Median across the corpus is 40. The clearest case is the Diplomatic Simulator at 73, its highest axis by a wide margin and not an accident of vocabulary: every delegation holds private instructions, a BATNA and red lines, and the table carries explicit rules for what crosses between parties. Its own paper states the principle outright. At the other end the Stanford generative agents repository scores 0, which is worth sitting with, because the memory stream is the architecture and nothing in it names a boundary between one agent's stream and another's.

**Evaluation is strongest where the subject is weakest.** Median evaluation across the corpus is 48, higher than any subject axis: the medians for agent-based simulation, synthetic data generation, and model-based behavioral modeling are 11.5, 7 and 17. AgentTorch scores 84 on evaluation against 29 relevance. The pattern is partly an artifact of the taxonomy, since test files and CI configuration are easy vocabulary to detect, and partly real: it is easier to add a test suite than to model an economy.

**The landmark exception.** The Stanford generative agents repository, the most cited artifact in this literature, scores 0 on evaluation. It is research code released to accompany a paper rather than a maintained framework, and the paper carried the validation. The score is accurate and would be misread as a verdict by anyone who took it for one, which is the clearest illustration in the corpus of why coverage is not merit.
