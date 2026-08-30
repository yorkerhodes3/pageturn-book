<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/ercf.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 09. Estimating Deaths: The Mortality Model {#mortality-model}

Separately from cost, the tool estimates how many people would die and be injured if the population stayed. The author's framing is that this provides scale context for a planning decision, and both the README and the concept document state that the mortality model is indicative rather than predictive and that the financial estimates are substantially more reliable.

Each risk level has a baseline death rate expressed per 10,000 people per day. The current values are 0.777 at Level 0, 0.964 at Level 1, 3.625 at Level 2, 1.805 at Level 3 and 1.000 at Level 4. A reader will immediately notice that these are not in ascending order, which looks wrong and requires explanation. The explanation given in the code is that these are not standalone death rates but base rates that get multiplied by three further factors, and that Level 3 in the historical corpus is dominated by urban sieges and city fighting where a high proportion of the population is directly exposed, while Level 4 is dominated by large-enclave operations across much bigger populations where per-capita exposure is lower. The ordering was produced by the fitting procedure rather than assumed, and the author flags it explicitly as empirically validated but counterintuitive.

The confinement multiplier captures whether people are trapped. It is calculated as 5 minus D3, multiplied by D4, divided by 5. In plain words: when consent for movement is absent and logistics have collapsed at the same time, people cannot get out, and mortality rises sharply. The resulting score is converted into a multiplier in steps: half at the lowest, then 1, then 2, then 4, then 8 at the highest. An eightfold difference from a single factor is a very large lever, and its stepwise rather than smooth form is listed by the author as a known limitation. The anchors given are Aleppo and Kosovo at a multiplier of 2, Mosul at 1, and the Kherson evacuation, which had an open corridor, at 0.5.

```text

confinement score = ((5 - D3) x D4) / 5

```

The score is then mapped to a multiplier in steps: 0.5, 1, 2, 4, 8.

The displacement protection factor applies where part of the population has already left, since the remaining exposure is lower. The tool reduces the death rate by 60 per cent of the share that has departed. The 60 per cent coefficient, rather than 100, reflects that displaced people still face risk on the road, at checkpoints and from exposure. There is then an important refinement: in a siege, defined as a D3 of 2 or below combined with a D1 of 4 or above and a population of 500,000 or fewer, the coefficient is halved to 30 per cent. The reasoning is that in an encircled city, movement itself is lethal, because civilians pass checkpoints under fire and buses have been attacked. Displacement is still safer than staying, but only half as much safer as in an open corridor.

The geographic exposure factor recognises that not everyone in a conflict area is under fire at the same time. Four conflict shapes are recognised, with the fraction of the population treated as simultaneously exposed given in brackets: urban siege such as Mariupol or Aleppo (0.85), enclave such as Gaza (0.65), city conflict where a front line moves through a city, such as Mosul or Kherson (0.40), and regional dispersed conflict such as Sudan, the Central African Republic or the eastern Democratic Republic of the Congo (0.12). When the planner has not specified a shape, the tool infers one from D1 and the population size, on the logic that higher kinetic threat means more direct fire while a larger population means more dispersion. The population term uses a logarithm raised to the power 1.4, a refinement introduced specifically because the earlier formula did not fall away fast enough for continental-scale conflicts and overestimated Sudan by a wide margin.

Cumulative deaths accumulate linearly for the first 90 days and then decelerate along a square-root curve, on the reasoning that populations adapt and survivors relocate. This also marks the outer edge of the model's intended planning window. Injuries are set at four times deaths, following the ICRC planning ratio. The code notes that a peer-reviewed systematic review implies a ratio closer to 3.3 to 1, and that frontline-specific figures from Ukraine run far higher, and retains 4 to 1 as a mid-range planning estimate.

The infrastructure-denial multiplier applies only where there is primary source documentation that survival infrastructure was deliberately destroyed. It is calculated as 1 plus 0.4251 times D1 minus 3, times D4 minus 3, and only when D1 is at least 4.5 and D4 at least 4.0. It is switched on for four documented cases: Mariupol, Aleppo, Vukovar and Huambo, giving effective multipliers between roughly 1.6 and 2.3. The supporting documentation cited is a 2024 report on starvation as a method of warfare in Mariupol, the UN Commission of Inquiry on Syria for hospital bombing in Aleppo, ICTY proceedings for Vukovar, and Human Rights Watch and Amnesty reporting on Angola for Huambo. Critically, this multiplier is switched off by default for live scenarios. The code records why: an earlier version activated it automatically whenever the dimension thresholds were met, and calibration accuracy collapsed from 80 per cent to 20 per cent. It is a finding about deliberate atrocity, not a threshold that can be inferred from slider positions.

```text

infrastructure-denial multiplier = 1 + (0.4251 x (D1 - 3) x (D4 - 3))

```

Applied only where D1 is at least 4.5 and D4 at least 4.0, and only with primary source documentation. Off by default for live scenarios.
