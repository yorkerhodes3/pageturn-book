<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/provenance-search.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 10. Limitations and Caveats {#limitations}

The report states twelve limitations. They are reproduced here because they are the most important part of the document for any reader considering what weight to give the tool.

**It does not search the restricted databases.** This is the most important limitation and the one most likely to be misread. The interface names INTERPOL, the Art Loss Register, Lost Art, and the FBI among the sources it searches. What it actually searches is the public web pages of those organisations, by way of a general web-search service. The Art Loss Register's database is a paid commercial service with no public access at all. A negative result from this tool is therefore not a clearance against the Art Loss Register, and must never be presented as one. INTERPOL and the FBI files are publicly searchable through their own interfaces, but the tool does not query those interfaces directly either.

**An absence of findings is not a clean history.** Every not-found verdict in the panel means only that the source returned nothing for the phrase that was searched. It carries no information about the object.

**The score conflates two different situations.** A well-documented history containing a wartime seizure and an obscure object with no history at all can both produce a very low score. The number alone does not distinguish them.

**The weights are the developer's judgment.** Thirty points for a gap, twenty-five for thin corroboration, ten per high-severity flag, ten for a valuation anomaly, three sources as the corroboration threshold: none of these figures is derived from a study, an expert panel, or a validation exercise against known cases. They are reasonable choices that produce sensible orderings, and they should be described as such rather than as a measurement.

**The timeline depends on a language model.** The model is instructed to use only retrieved facts, and its temperature setting is kept very low to make its output as consistent as possible, but it is still a language model reading messy source material. It can misread a date, attach a record to the wrong object, or mistake a similarly titled work for the one being searched. Nothing in the system checks its assembly against the retrieved material after the fact.

**Identification from a photograph is a guess.** The image step returns a best-effort identification with a self-reported certainty figure. That figure is the model's own estimate, it is not carried into the confidence score, and an incorrect identification will produce a fully formed passport for the wrong object.

**The searches are simple text matches.** The query is the title and artist as typed. There is no handling of alternative titles, transliterations, works known by different names in different languages, or the many objects for which no single agreed title exists. This weighs most heavily against exactly the categories of object where provenance questions are most acute, including antiquities and non-Western material, which frequently have no title and no named artist at all.

**The source list is Western-weighted.** Two of the three museum sources are American, the aggregator is European, and the market sources are the two large London and New York auction houses. Objects from collections and markets outside that orbit will be under-represented, and this limitation compounds the previous one.

**The sources change beneath the tool.** The domain list is fixed in the software. One of the thirteen domains, ifar.org, belongs to an organisation that announced in 2024 that it was winding down. Domain lists of this kind require periodic review, and nothing in the repository schedules one.

**Dependencies and degradation.** If the web-search key is absent, the tool runs on the supplementary sources alone and the watchlist rule cannot fire at all, which removes its single most consequential signal without any visible change in the shape of the output. If the Europeana key is absent, that source is silently skipped and counts as not found, which can push the corroboration count below the threshold and cost 25 points for a reason unrelated to the artwork.

**The written rationale is not the arithmetic.** The plain-language explanation shown beside the score is composed by the language model and describes the substance of the case. It does not narrate the calculation, and a reader should not assume the two are saying the same thing.

**Status.** This is a research prototype by a single developer, deployed as a public demonstration. It is not an accredited due-diligence service, it carries no professional indemnity, and its passport is not a certificate. Its own attestation says so.
