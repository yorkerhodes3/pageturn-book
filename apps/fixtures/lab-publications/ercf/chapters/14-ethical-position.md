<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/ercf.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 14. The Ethical Position {#ethical-position}

A tool that computes the cost of evacuating people and the cost of not evacuating them invites an obvious objection. The repository addresses it in a notice displayed in the interface itself and repeated in the concept document: the tool estimates the operational cost of humanitarian evacuation logistics, in order to support planning and resource mobilisation, and does not place a monetary value on human life.

The structural safeguards behind that claim are worth naming, because they are design decisions rather than assertions. Cost and mortality are computed by separate functions and never combined into a single index; there is no cost-per-life-saved figure anywhere in the codebase. The mortality output is described in the documentation as contextual support only, not a target, threshold or measure of acceptable loss. The break-even calculation compares one logistics operation against another logistics operation, never against a count of deaths. And the concept document states explicitly that the tool is not intended to determine whether an evacuation is worth it or to rank the value of civilian lives.

The residual risk remains, and it is the risk that attaches to any costing tool in this domain: a figure produced for a funding appeal can be repurposed in an argument about whether to act. The separation in the software is real, but it depends on the people using the output to maintain the same separation.
