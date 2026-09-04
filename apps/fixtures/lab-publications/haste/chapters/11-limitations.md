<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/haste.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 10. Limitations and Caveats {#limitations}

The repository documents its own weaknesses at length. The most consequential are these.

**Every performance figure in this report is developer-supplied.** This one is not in the repository's own list, and it is the limitation a sceptical reader should weigh first. As section 08 sets out, none of the reported results has been independently reproduced. The rest of this report reads the source code and reports what it finds, which is first-hand; the performance evidence does not have that standing, and the two should not be given the same weight.

**The output depends heavily on who did the labelling.** Two competent analysts working the same event from the same imagery can produce materially different results. The documentation gives a concrete example from the Hurricane Melissa response, where an initial set of 153 labels produced predictions that described buildings as around 20 per cent damaged when they were in fact totally destroyed; the error was caught by visual inspection and corrected by adding a further 107 labels and retraining.

**Imagery quality governs everything.** Cloud, haze, low light, and imagery captured at an angle rather than from directly overhead all degrade performance, sometimes severely. Planet imagery in particular sits below the roughly 30 centimetre resolution that building-detection models generally prefer, which is part of why the platform leans on external building outlines rather than trying to find buildings itself.

**Building-outline coverage is uneven in a way that matters.** OpenStreetMap and Microsoft Building Footprints are weakest in the Global South, in informal settlements, in conflict-affected areas, and where construction has been rapid and recent. These are precisely the populations most exposed to disaster. A building with no outline is invisible to HASTE regardless of how badly it was damaged, and the 50 square metre minimum area removes further small structures from the headline figure.

**The model does not generalise, by design.** A model fitted to one event is not expected to transfer to another, which also means HASTE cannot be operated as a standing monitoring system.

**False positives and false negatives have distinct causes.** False positives arise from shadows, ordinary construction and demolition unrelated to the disaster, atmospheric artefacts, and vegetation change. False negatives arise from subtle structural damage visible only from an angle, damage hidden by cloud or shadow, and damage at a scale finer than the imagery can resolve.

**No contextual data is incorporated.** There is no ground truth, no weather, no sensors, no population data. Flood extent is intersected with buildings but water depth is never estimated, so HASTE can say a building is in water and not how deep.

**The confidence interval understates real uncertainty.** It quantifies the error introduced by sampling and nothing else, as section 05 explains.

Some findings from reading the source code should be added to the project's own list, since they bear on how much weight an output can carry.

**There is no genuinely held-out validation data in the trained-model route.** The measure used to decide which version of the model to keep is computed on random cut-outs of the same imagery the model was trained on. It is therefore a measure of fit rather than of generalisation. The independent check in HASTE comes later, from the human validation sample, which is the number a reader should rely on.

**The meaning of each class is fixed by its position in a list.** Damaged Building is understood downstream as the third class and Cloud as the fourth. An analyst who reorders the classes when setting up a project will get damage figures computed from the wrong category, without any error being raised.

**Several defaults disagree between the worked example, the web form, and the server.** This is most visible for the number of training passes. Two analysts following the documentation by different routes may not be running the same configuration.

**Predictions are matched to buildings by position in a file rather than by an identifier.** This is fast, and it means that anything which reorders or filters the building list between steps would silently misattribute damage. The developers are evidently aware of the risk, since the code goes to some trouble to preserve row positions even for buildings it cannot assess.

**The platform is not validated for production or autonomous use.** It has not been designed, tested, or validated for production deployment or autonomous decision-making, and its outputs are not authoritative damage assessments. The documentation states plainly that users should not rely solely on HASTE outputs for decisions affecting safety, property, or human life, and should not use them to trigger public alerts or resource deployments without independent verification.
