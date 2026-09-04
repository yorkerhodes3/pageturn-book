<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/provenance-search.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 09. Design Choices {#design-choices}

**Why the score is not produced by the model.** A language model asked to rate its own confidence will produce a number that sounds reasonable and cannot be reproduced or checked. The project instead computes the score in ordinary code from countable facts: how many gaps, how many sources responded, how many high-severity flags, whether the valuation was anomalous. The result is that two runs producing the same findings produce the same score, and a reader who disagrees with the score can identify exactly which term they disagree with. This is the strongest design decision in the project.

**Why the primary search is restricted.** An unrestricted web search for the words looting and theft alongside a famous artist's name would return a great deal of journalism, speculation, and commercial content. Restricting the search to thirteen named institutional and market domains means that the material the model reasons over comes from sources with an identifiable custodian, at the cost of missing anything held elsewhere.

**Why gaps are recorded rather than smoothed over.** The instruction given to the model states that a gap is itself a fact worth reporting, and the interface displays gaps prominently in red. A system that quietly produced an unbroken chain wherever it lacked data would be worse than useless in this domain, because the incomplete chain is the finding.

**Why the general-knowledge fallback exists and why it is fenced.** Without it, the tool would return an almost empty result for the most famous works in the world, since the free sources it uses may hold little ownership detail even for a painting whose history is taught in schools. The fallback lets the model fill those blanks, but it is constrained on four sides: every such entry is labelled in the data, tagged in the display, never marked verified, and never allowed to override a live source, and its use triggers an automatic medium-severity flag. The constraint is well designed. It remains the part of the system where an error is hardest for a non-specialist reader to detect.

**Why the MoMA data is bundled rather than queried.** Because MoMA offers no live search and blocks automated access, the only lawful and reliable route to its collection is its own published open dataset. Bundling a compressed copy makes the search instant and removes a point of failure, at the cost that the copy is only as current as the last time it was rebuilt.

**Why everything runs on the server.** The user's browser never contacts any external service directly. It speaks only to this project's own server, which holds the access keys. This keeps the keys out of the browser, where they would be readable by anyone.
