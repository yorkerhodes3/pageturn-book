<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/ai-models-research.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 01. How to read the evidence {#evidence}

This review distinguishes three classes of evidence throughout, and every cross-model comparison should be read with the class in mind. Ranking claims are strongest when the same evaluator, prompt set, tool access, reasoning budget, and scoring method are held constant. They are weakest, and frequently meaningless, when they are not.

**The three evidence grades used throughout the review and in the underlying research repository.**

| Grade | Evidence class | Interpretation |
| --- | --- | --- |
| A | Independent or peer-reviewed | Peer-reviewed papers, reproducible benchmarks, standardised institutional evaluations, and public datasets. |
| B | Institutional primary research | University or research-lab reports, model cards, benchmark methodology pages, and public technical reports. |
| C | Provider-reported | Vendor launch benchmarks, self-reported latency, and product documentation. Useful, but not independently reproduced by default. |

The distinction matters because the three are routinely printed in the same table, to the same number of decimal places, as though they were the same kind of fact. A provider launch table is produced by the party that benefits from the result, under conditions the provider chose and usually did not disclose. A benchmark maintainer's evaluation is produced under a published protocol by a party with no stake in which model wins.

**Interpretation rule.** Treat vendor benchmark numbers as hypotheses for local testing. They are useful for narrowing a candidate set and are not sufficient for procurement.
