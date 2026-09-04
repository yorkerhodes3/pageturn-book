<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/ai-models-research.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 09. Research gaps and outlook {#gaps}

**Gaps that the current evidence base cannot close, and why each matters.**

| Gap | Why it matters |
| --- | --- |
| Comparable energy disclosure | Named commercial models rarely publish measured joules per token under a standardised workload. |
| Agent reliability | Benchmarks do not capture multi-day workflows, changing environments, permissions, and recovery. |
| Evaluation contamination | Public benchmarks become training targets and lose diagnostic value. |
| Effective long context | Better tests are needed for dispersed reasoning, long outputs, memory, and context compaction. |
| Multilingual equity | Tokenization, cost, accuracy, and safety remain uneven across languages and scripts. |
| Model updates | Endpoint behaviour changes without a new public model name, defeating reproducibility. |
| Human baselines | Human scores are measured under different time, tool, and incentive conditions than model scores. |
| Environmental systems accounting | Embodied carbon, water, grid constraints, and rebound effects remain underreported. |

The likely near-term direction is adaptive systems that vary model size, reasoning budget, context, and tool use by task difficulty. That improves quality per unit of cost and energy while creating a new evaluation problem: the object being evaluated becomes a dynamic policy rather than a single model. Future benchmarks should report the complete resource budget, including hidden reasoning, retries, verification, and tool calls.

Open-weight models will continue to narrow capability gaps while supporting sovereign and specialised deployments. Their advantage will depend less on raw benchmark parity than on the ability to optimise the full stack, including quantization, retrieval, domain fine-tuning, caching, and hardware. Hosted frontier models will retain advantages in integrated tools, rapid updates, and breadth, and buyers should demand stronger transparency and version stability in exchange.

**Conclusion.** AI model selection should be treated as empirical engineering and governance, not brand preference. The right system is the least resource-intensive configuration that reliably meets the task contract and the risk threshold. This requires local evaluation, explicit evidence standards, controlled reasoning budgets, token and energy measurement, and continuous monitoring. Frontier capability is valuable, but unverified capability is not reliability.
