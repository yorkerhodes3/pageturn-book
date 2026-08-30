<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/agentic-behavior-observatory.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 01. The question the instrument exists to answer {#question}

When a system generates or evaluates a synthetic population at scale, it is making a claim about who that population contains. The claim is rarely written down. It is implied by which attributes the code carries, which behaviors the agents are allowed to have, and which differences between people the model treats as differences at all. A population dimension nobody models is a population nobody simulates, and an unmodeled dimension is an implicit assertion that it does not matter to the outcome.

That claim is legible in the source. The Agentic Behavior Observatory reads it. Paste a GitHub repository URL and it returns an evidence-linked account of how that repository models agentic behavior, scored on six axes, with the demographic dimensions and the model versions it rests on pulled out. Every point of every score links to the file and the line where its signal fired.

**What a score is not.** A score is signal coverage, not a quality judgment. A small, sharp repository can and should score lower than a sprawling framework, and the tool says so on its own front page. The number answers one question only: how much of the taxonomy's vocabulary does this repository exhibit. Whether the work is good is a question for a reader, not a regular expression.
