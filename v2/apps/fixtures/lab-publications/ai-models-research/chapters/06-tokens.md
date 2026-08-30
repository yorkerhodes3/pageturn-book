<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/ai-models-research.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 06. Context windows and token economics {#tokens}

One-million-token windows are now common in leading hosted families, but nominal capacity exceeds reliable capacity. Stanford's long-context evaluation states that support for long inputs does not imply strong long-context capability. LongCodeBench finds degradation on real code tasks as context scales toward one million tokens. LongProc finds that models accept long inputs yet lose coherence when they must integrate dispersed information and produce structured output over thousands of tokens.

**Long-context failure modes. A retrieval probe measures whether a single fact can be located; it does not measure whether dispersed facts can be reasoned over.**

| Failure mode | Description |
| --- | --- |
| Lost evidence | Relevant information is overlooked among distractors. |
| Position bias | Material at the start and end is used more reliably than material in the middle. |
| Aggregation failure | Individual facts are extracted correctly but combined incorrectly. |
| Instruction decay | Constraints stated early are forgotten during long generation. |
| Context pollution | Stale tool results, abandoned plans, and irrelevant documents interfere with current decisions. |
| Cost explosion | Large prompts raise prefill latency, memory use, and input charges. |

Nominal per-token price is not total cost. Output tokens are frequently priced three to six times above input tokens, and reasoning workflows can generate large hidden or visible outputs. Tokenizer changes move cost without moving price: Anthropic notes that Claude Sonnet 5 uses a tokenizer that can produce about 30 percent more tokens for the same text than its predecessor, so an unchanged per-token rate still raises the cost of an equivalent request.

**Nominal cost of one identical document-analysis request: 100,000 uncached input tokens and 5,000 output tokens. Computed from public prices on 22 July 2026, provider-reported. Excludes tools, long-context surcharges, caching, batch discounts, and tax. Quality is not held constant, so the bars compare price for an identical request, not price for an identical result.**

| Model | Input cost | Output cost | Nominal total |
| --- | --- | --- | --- |
| Claude Fable 5 | 1.00 USD | 0.25 USD | 1.25 USD |
| GPT-5.6 Sol | 0.50 USD | 0.15 USD | 0.65 USD |
| Claude Opus 4.8 | 0.50 USD | 0.125 USD | 0.625 USD |
| Claude Sonnet 5 | 0.30 USD | 0.075 USD | 0.375 USD |
| GPT-5.6 Terra | 0.25 USD | 0.075 USD | 0.325 USD |
| Grok 4.5 | 0.20 USD | 0.03 USD | 0.23 USD |
| GPT-5.6 Luna | 0.10 USD | 0.03 USD | 0.13 USD |
| DeepSeek V4 Pro | 0.0435 USD | 0.00435 USD | 0.04785 USD |

**The decision-relevant quantity is cost per accepted task.** A cheap model becomes expensive when it requires repeated prompts, long outputs, human correction, or escalation. A high-priced model can be economical when it succeeds on the first attempt and uses fewer tools and fewer tokens. An accepted task is one that passes a domain-specific quality check without manual correction beyond a defined tolerance, and the acceptance criterion must be stated wherever the figure is used.
