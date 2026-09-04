<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/ai-models-research.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 03. What performance actually means {#performance}

Performance is not a scalar property. The holistic evaluation framework argued for assessment across accuracy, calibration, robustness, fairness, bias, toxicity, and efficiency rather than a single number. That argument is stronger now that models use tools, accept several modalities, and vary their reasoning effort per request, because one score hides differences in reliability, cost, and behaviour that determine whether a system works in production.

Rankings disagree because evaluations change the computational and informational conditions under which a model operates:

- A model tested with web search and code execution is not comparable to a closed-book model.
- A model allowed maximum reasoning effort, or several samples, has a larger inference budget than a model tested once at default settings.
- Agent benchmarks are sensitive to the scaffolding that manages tools, context, retries, and termination, so the result belongs to a model-and-scaffold pair rather than to a model.
- Prompt formulation alters scores and can reorder models, especially on open-ended and instruction-following tasks.
- Contamination inflates performance when evaluation items or near variants appear in training data.
- Judging by another model introduces judge bias, positional effects, verbosity preference, and family favouritism.
- Pass-at-k and majority voting spend more compute than single-attempt evaluation and are not equivalent to it.
- Provider tables mix internal tasks with public benchmarks and may evaluate competitor models under the publishing provider's own harness.

Benchmark progress through 2026 is real but uneven. Models approach saturation on some mathematics and knowledge tests while remaining materially weaker on application construction, long-horizon agents, and open-world computer use.

**Best reported model results against human baselines on interactive benchmarks. Stanford HAI, AI Index Report 2026, Technical Performance chapter. Grade B. Snapshots, not permanent rankings. Human scores are frequently measured under different time, tool, and incentive conditions than model scores, so the distance between the two dots is indicative rather than exact.**

| Benchmark | Capability | Best reported | Human baseline |
| --- | --- | --- | --- |
| OSWorld | Computer use in realistic desktop environments | 66.3 percent | 72.35 percent |
| WebArena | Web navigation and task completion | 74.3 percent | 78.24 percent |
| Terminal-Bench 2.0 | Terminal-based coding and system tasks | 77.3 percent | Not reported |
| Vibe Code Bench | End-to-end application construction | About 57.6 percent | Not reported |

Two readings follow. Agents approach human performance on these benchmarks without consistently exceeding it. And building a functioning application remains materially harder than completing an isolated task, which is what a long-horizon workload actually requires. Human scores are frequently measured under different time, tool, and incentive conditions than model scores, so the gap is indicative rather than exact.
