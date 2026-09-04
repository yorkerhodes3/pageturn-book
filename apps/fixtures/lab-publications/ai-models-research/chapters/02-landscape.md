<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/ai-models-research.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 02. The 2026 landscape {#landscape}

The frontier shifted from a single scale race toward a multi-dimensional competition among reasoning quality, agentic execution, token efficiency, multimodality, long-context handling, and operational efficiency. By mid-2026, leading proprietary systems commonly offer configurable reasoning, tool use, image input, context windows near one million tokens, and output limits above 100,000 tokens.

Open-weight systems increasingly use mixture-of-experts architectures, sparse attention, quantization, and smaller active parameter counts to approach frontier performance with lower serving requirements. The market now contains three overlapping classes: frontier hosted models optimising broad capability and tool integration, efficient hosted models optimising latency and price, and open-weight models optimising control and deployment flexibility.

**Parameter count is an incomplete proxy for inference cost.** A mixture-of-experts model stores many parameters but activates a smaller subset for each token. That reduces compute per token relative to a dense model of the same stored size, but it does not eliminate memory, routing, communication, or serving overhead. Active parameter count should be reported alongside total parameters, precision, hardware, batch size, and measured throughput.

**Share of stored parameters activated per token, from disclosed architectures. Provider architecture disclosures, Grade B. The dense model activates everything it stores; the mixture-of-experts models activate a twentieth or less, which is why stored size alone predicts neither compute nor cost.**

| Model | Total stored | Active per token | Share |
| --- | --- | --- | --- |
| Mistral Medium 3.5 | 128B, dense | 128B | 100 percent |
| Mistral Small 4 | 119B | 6B | about 5 percent |
| DeepSeek V4 Flash | 284B | 13B | about 5 percent |
| Llama 4 Maverick | 400B | 17B | about 4 percent |
| DeepSeek V4 Pro | 1.6T | 49B | about 3 percent |
