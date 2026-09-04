<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/ai-models-research.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 05. Speed is not generation rate {#speed}

Speed must be decomposed into queueing time, prefill, time to first token, time per output token, tool latency, and total task completion time. A model that streams at a high token rate can still be slow if it emits excessive reasoning tokens or requires repeated attempts. Conversely, a slower frontier model can finish sooner if it needs fewer steps, fewer tool calls, and less rework.

Published throughput figures illustrate the problem rather than solving it. Google reports 363 output tokens per second for Gemini 3.1 Flash-Lite in its own evaluation. xAI reports 80 tokens per second for Grok 4.5 on its launch page. These come from different test environments and different model classes, are both provider-reported, and are not a controlled head-to-head comparison. They show that fast tiers exist and are positioned for interactive and high-volume use. They do not measure how long a task takes.

**Configurable reasoning moves the frontier rather than sitting on it.** Low or disabled reasoning suits extraction, rewriting, classification, and deterministic tool routing. High reasoning effort earns its cost on mathematics, scientific analysis, difficult coding, and planning, where an incorrect result costs more than the additional compute. Research on test-time compute identifies diminishing returns and overthinking, in which longer chains introduce new errors, lose the objective, or exhaust the context budget. The correct stopping rule is quality-conditioned rather than a fixed token allowance.

Operational reporting requirements follow from this:

- Report p50, p90, and p95 time to first token, never a mean alone.
- Report p50 and p95 end-to-end completion time, including tools and retries.
- Separate cold starts from warm requests, and cache hits from cache misses.
- Compare models at the same latency and cost budget, not at their own defaults.
- Track output tokens, tool calls, failed steps, and retries per accepted task.
- Test at the concurrency you expect, because batching raises throughput while raising individual latency.
