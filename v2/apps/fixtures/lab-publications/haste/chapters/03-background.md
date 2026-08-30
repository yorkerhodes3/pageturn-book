<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/haste.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 02. Background and Rationale {#background}

**The problem.** Rapid damage assessment is a timing problem before it is a technical one. Imagery of a disaster zone often becomes available within a day. An interpretation of that imagery detailed enough to direct a response team to a particular neighbourhood usually does not. The interval between the two is where humanitarian decisions are made with the least information and the greatest consequences.

**The gap.** Established products have real strengths and known constraints. Copernicus Emergency Management Service Rapid Mapping, the European Union's free on-demand crisis mapping service, delivers standardised map products within hours to days of an activation, but must be formally activated by an authorised user and covers only large-scale emergencies. Manual aerial surveys are accurate but limited in geographic reach and slow to process. Neither easily absorbs the specific situational context that a particular responding organisation cares about, such as one parish, one road corridor, or one category of structure.

The nearer comparator is the automated damage classification literature that grew out of the xView2 challenge, on whose xBD dataset HASTE is itself benchmarked. Against that work the claim is not that nothing existed. It is that existing machine learning approaches assume a globally pretrained model applied to a new disaster, and HASTE trades that for a disposable per event model an analyst fits by hand, in a browser, without writing code.

**The response.** The proposition HASTE was built around, carried over from earlier in-browser damage-assessment research at the same laboratory, is that human oversight should be structural rather than advisory: the operator is not reviewing a machine's conclusion after the fact, the operator is the source of everything the machine knows about this event.

The design also reflects a practical constraint on who does this work. The people who understand what damage looks like in a given country are rarely the people who can write machine-learning code. HASTE is presented as a no-code platform so that the person supplying the expert judgment and the person operating the model can be the same person.
