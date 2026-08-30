<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/ai-models-research.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 07. Energy and environmental performance {#energy}

Training energy is a large, episodic expenditure. Inference energy is distributed across every production request. Neither is interpretable without a stated system boundary covering direct accelerator energy, host and network energy, facility overhead, embodied impacts, and water and grid effects. Two correctly computed figures for the same workload can differ by a large factor because they draw that boundary differently.

Fernandez and colleagues evaluated inference across workloads, hardware, serving frameworks, batching, decoding strategies, and parallelism. They report that estimates derived from floating-point operation counts understate real energy use, and that appropriate combinations of optimisations reduced energy by as much as 73 percent against an unoptimised baseline. That is the strongest argument against attaching a single energy number to a model name: the same weights on the same hardware under two serving configurations are two different energy propositions.

Oviedo and colleagues developed a bottom-up estimate for frontier-scale inference. Under stated H100 utilisation and power usage effectiveness assumptions, the median estimate was 0.34 watt-hours per representative query, with an interquartile range of 0.18 to 0.67 watt-hours. Raising token use by a factor of 15 for test-time scaling raised the median to 4.32 watt-hours, about 13 times higher. Combined model, serving, and hardware improvements were estimated to offer an 8 to 20 times efficiency opportunity. These are analytical estimates, not measurements of a named commercial service.

**Estimated inference energy for one representative frontier-scale query, and for the same query under test-time scaling. Oviedo and colleagues, bottom-up analytical estimate under stated H100 utilisation and power usage effectiveness assumptions. Grade B. The band is the interquartile range of the estimate, not a measurement interval, and the scaled condition is a single reported median. Nothing here is a measurement of a named commercial service.**

| Condition | Median estimate | Interquartile range |
| --- | --- | --- |
| Representative query | 0.34 Wh | 0.18 to 0.67 Wh |
| Same query at fifteen times the token use | 4.32 Wh | Not reported |

**Do not divide sector totals by a presumed query count.** The International Energy Agency projects global data-centre electricity consumption reaching about 945 terawatt-hours in 2030 in its base case, roughly double the 2024 level, and reports that data-centre electricity demand grew 17 percent in 2025 with AI-focused facilities growing faster. That aggregate covers every data-centre workload, not AI queries alone, and utilisation patterns differ across them.

A credible energy disclosure identifies all of the following. A figure missing any of them is not comparable to another figure:

- Model version and hardware
- Numerical precision
- Prompt and output length distributions
- Batch size and utilisation
- Serving software stack
- Power usage effectiveness
- Measurement or estimation method, and the measurement interval
- The quality threshold at which the work counts as useful

The central environmental variable is therefore not model size. It is the energy required to produce an accepted, useful result at the required service level. Energy spent on an output that fails a quality check is energy spent for nothing.
