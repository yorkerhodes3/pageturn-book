<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/digital-provenance-passport.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 03. What Agent Means in This Context {#what-agent-means}

The word agent has a specific meaning in software, and it is not the meaning it carries in law or in the art trade. Here it does not mean a person acting for a principal, and it does not mean a dealer's representative.

An agent, in this sense, is a program that is given a goal rather than a list of instructions, and that then chooses its own sequence of actions to reach that goal. A conventional program is a recipe: do this, then this, then stop. An agent is closer to an instruction to a research assistant: find out what you can about this object, use whatever reference tools you judge appropriate, and report back with your sources.

The practical difference is that an agent can decide, mid-task, to take an action nobody explicitly told it to take on this occasion. In this prototype the clearest example is the paid check. Having assessed the object once, the system looks at its own confidence figure, looks at the price of a commercial database search, looks at the spending limit it has been given, and decides whether buying that search is worth doing. If it decides yes, it pays and incorporates the result. If it decides no, it records why not and continues.

Two things follow from this that matter to a non-technical reader. First, an agent's autonomy is only ever as safe as the limits placed around it, which is why the spending caps are a substantive part of the design rather than a technical footnote. Second, an agent that can write is an agent that can write something untrue, which is why the sourcing rule is placed before every other consideration in the pipeline.
