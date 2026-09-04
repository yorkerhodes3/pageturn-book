<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/agentic-behavior-observatory.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 02. How the reading is done {#method}

The analyzer fetches a repository's metadata and file tree from the GitHub API, then reads up to 120 file bodies from the raw content host, chosen by a heuristic that favors manifests, prose, and modeling-core filenames. Text source in roughly 25 extensions counts, including the single-file HTML applications much of the CoLab's work ships as. Generated bundles and lockfiles are skipped. Nothing is cloned and nothing is executed.

Each file is matched against 62 signals grouped into six axes. A signal is a dependency declaration, a file path, or a pattern in source and prose, and it carries a weight and a human-readable label. An axis score is the share of that axis's weighted signal set the repository covers, expressed on a 0 to 100 scale.

**The six axes and the signals behind each. Counts are of distinct signals, not of matches.**

| Axis | Signals | What it detects |
| --- | --- | --- |
| Agent-based simulation | 16 | Mesa, AgentPy, PettingZoo, NetLogo, Repast, SimPy; agent classes, schedulers, step loops, spatial environments |
| Synthetic data generation | 10 | SDV, CTGAN, synthcity, Faker, Gretel; population synthesis and IPF, census seeds, differential privacy, generation at scale |
| Model-based behavioral modeling | 10 | Anthropic and OpenAI SDKs, LangGraph, AutoGen, CrewAI, DSPy, local runtimes; personas, memory streams, generative-agent architectures, silicon sampling |
| Reinforcement learning | 8 | Gymnasium, Stable-Baselines3, RLlib, TorchRL; named algorithms, reward machinery, RLHF and DPO, the reset and step contract |
| Evaluation and validation | 8 | Tests, fidelity metrics such as KS, Wasserstein and TSTR, sensitivity analysis and ablations, seeded runs, experiment tracking, bias and representativeness audits |
| Context isolation | 10 | Private and privileged instructions, BATNAs and red lines; visibility and disclosure rules; per-agent scoped context; fresh sessions and state resets; independent replications; staying in character and knowledge-cutoff handling; contamination and leakage checks; blind evaluation |

The headline relevance score uses only the three subject axes, because the other three describe how work is done rather than what it is about.

```text

relevance = 0.6 x max(subject axes) + 0.4 x mean(subject axes)

```

Subject axes are agent-based simulation, synthetic data generation, and model-based behavioral modeling. The max term keeps a repository that does one of them thoroughly in scope; the mean term rewards work that spans them.

**One taxonomy, two runtimes.** The scoring logic exists once, in signals.py, and is exported to the browser as JSON. The command-line analyzer that writes the committed corpus and the in-browser analyzer that scores a repository you paste therefore score identically. A visitor can reproduce any published number without installing anything.
