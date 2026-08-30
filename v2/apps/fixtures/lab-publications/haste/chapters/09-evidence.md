<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/haste.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 08. Evidence of Performance {#evidence}

**Everything in this section is the developer's own account.** The benchmark results, the deployment record, and the field precision and recall figures all originate from the Microsoft paper and repository. None of them has been independently reproduced or externally validated, here or elsewhere, so they should be read as what the team that built the platform reports about it rather than as third-party verification. That is not an accusation of overstatement. It is the provenance of the evidence, and it is the first thing a sceptical reader is entitled to know.

**Validated accuracy.** The research paper published alongside the platform, HASTE: A Platform for Rapid Post-Disaster Building Damage Assessment (arXiv:2607.11838), reports experiments on xBD, a public benchmark dataset of paired pre-event and post-event satellite imagery with expert damage annotations. The team collapsed the benchmark's minor, major, and destroyed categories into a single damaged category and measured how well each embedding method performed as the number of labels was varied.

The discrimination score in Table 1 is the area under the receiver operating characteristic curve, usually shortened to AUROC. In plain terms it is the probability that the model ranks a randomly chosen damaged building above a randomly chosen intact one. It runs from 0 to 1, a coin flip scores 0.5, and 1.0 would mean the model never gets a pair the wrong way round. The measure says nothing about where the threshold should sit: a model can rank buildings well and still mislabel a great many of them once a cutoff is applied.

**Table 1. Reported performance on the xBD benchmark as the number of labels was varied.**

| Approach | Labels used | Discrimination score |
| --- | --- | --- |
| Strongest embedding | 1 per cent | 0.84 |
| Strongest embedding | 10 per cent | 0.91 |
| Fully supervised ResNet-50 | All labels | 0.88 |

The practical claim is that a handful of labels plus a good general-purpose image description gets close to a conventionally trained model. The headline figure is a modest deficit rather than a match: at one per cent of labels the score is 0.84 against the fully supervised 0.88, and it is at ten per cent, where it reaches 0.91, that the fast route actually overtakes the baseline. What one per cent buys is not equal accuracy but most of the accuracy, hours sooner and without a machine-learning engineer, which is a real trade and a different claim.

The table does not say which of the two embedding methods produced these scores, and this report cannot resolve it from the published material. Since the lightweight option is the default an analyst would run, and the heavier one is the more capable, that gap matters to anyone reading the figures as a prediction of what they will get.

**Deployment record.** The figures that follow are evidence of adoption rather than of correctness, and only the Rolling Fork assessment carries an accuracy measurement against field ground truth.

The same paper reports thirty-one field deployments since early 2023, including four cities assessed within three days of the February 2023 Türkiye earthquakes, a tornado assessment in Rolling Fork delivered in under two hours at 0.86 precision and 0.80 recall against field ground truth, and the August 2023 Maui wildfire, where imagery available at nine in the morning yielded an assessment by one in the afternoon identifying roughly 1,700 damaged buildings.

For Hurricane Melissa in Jamaica in late 2025, four areas covering about 2,300 square kilometres were assessed. In Black River, some 110,000 building outlines were examined, of which around 65,000 were obscured by cloud.

**Table 2. Two of the areas assessed during the Hurricane Melissa response.**

| Area | Recall | Precision | Estimated damaged |
| --- | --- | --- | --- |
| Black River | 96 per cent | 82 per cent | 31,000 buildings |
| Montego Bay | 86 per cent | 71 per cent | Not reported |

The variation between Black River and Montego Bay, on the same event with the same team days apart, is substantial, and the very large share of cloud-obscured buildings in Black River is a reminder that a headline damage estimate can rest on a minority of the buildings actually present.
