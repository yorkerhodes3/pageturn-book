<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/provenance-search.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 05. The Variables Explained {#variables}

This section is the heart of the report. It sets out every input the tool takes, every rule it applies, and how each one reaches the final result.

**Title and artist.** These are the only required fields. They are combined into the phrase sent to every source, so they determine everything that follows. A misspelled artist name or a title in the wrong language will quietly produce a thin result rather than an error, which is a real practical caution for users.

**Period or date, and medium.** These are optional and are not used to filter the searches. They are passed to the model as descriptive context, helping it distinguish between different works that share a title and helping it judge whether a returned record is really the same object.

**Last known sale price.** This optional figure exists to support a single check. If the user supplies a price, the model is asked whether that price is clearly out of line with a comparable figure actually present in the retrieved sources. If, and only if, such a comparable exists and the supplied price is inconsistent with it, the valuation is marked anomalous. The instruction is deliberately conservative: with no price supplied, or no comparable found, the answer is always no. A price far above or below the plausible market level is a recognised signal in art-market due diligence, since valuation is one of the few numbers that has to be stated openly and is therefore one of the few that can be checked against the record.

Each of the seven sources returns one of three verdicts.

- Clear means the source found at least one matching record and nothing alarming.
- Flagged means the restricted web search returned a result hosted on one of the loss and stolen-property registries.
- Not found means the source returned nothing, or was skipped because no access key was configured, or failed.

Only the primary web search can return the flagged verdict. The museum and reference sources can only ever say clear or not found, because they hold collection catalogues rather than loss reports.

**The watchlist. If any result returned by the primary web search is hosted on one of these five domains, the software adds a risk flag of type watchlist match at high severity, records which domain it came from, and links to the page.**

| Domain | Institution behind it |
| --- | --- |
| interpol.int | INTERPOL's stolen works of art database |
| artloss.com | The Art Loss Register |
| lostart.de | The German Lost Art Foundation's database |
| lootedart.com | The Central Registry of Information on Looted Cultural Property |
| fbi.gov | The FBI's stolen art file |

This rule is deterministic. It runs in the server's own code after the model has finished, it compares the address of each returned page against the list of five, and it does not ask the model's opinion. That is a deliberate safeguard: the single most consequential signal the tool can produce is the one signal that a language model is not permitted to suppress or to invent. It is also the one signal that disappears entirely if the web-search service is not configured, a dependency the repository documents plainly.

**The confidence score begins at 100 per cent, is reduced by these four penalties, and is then held within the range of 0 to 100. The result is divided by 100 and reported as a proportion, which the interface displays as a percentage.**

| Penalty | Deduction | When it applies |
| --- | --- | --- |
| Custody gap | 30 points each | Any timeline entry the model marked as a period of unaccounted-for ownership |
| Thin corroboration | 25 points | Fewer than three of the seven sources returned anything at all |
| High-severity risk flag | 10 points each | Automatic watchlist matches, and any high-severity flag the model raised from the retrieved material, such as a documented forced transfer or an unresolved legal claim |
| Anomalous valuation | 10 points | The supplied sale price was marked anomalous against a comparable figure found in the sources |

The custody-gap penalty is the heaviest in the calculation, and the weighting reflects the professional convention that in provenance work an unexplained break in the chain is the primary warning sign, not a minor blemish. Its severity also means the score falls very fast. Two gaps alone remove 60 points. Three take the score to zero on their own.

The corroboration term measures corroboration rather than content. A finding supported by one source is a lead; a finding that four independent sources recognise is an established record. The threshold of three out of seven is a judgment call by the developer rather than a derived figure. Note also that the test counts any verdict other than not found, so a flagged result counts towards corroboration in the same way a clear result does, on the reasoning that a registry hit still demonstrates that the object is known to the record.

Two properties of this calculation deserve to be stated clearly, because they shape how the number should be interpreted. First, the score measures how well documented the ownership history is, not how likely it is that the object is legitimate. A famous work with a complete and well-known history that includes a documented wartime confiscation will score very low, because that confiscation registers as a break in title and attracts high-severity flags. An obscure object about which almost nothing is known may also score low, because too few sources returned anything. The two cases are very different in substance and can look similar in the number. The written rationale that accompanies the score is intended to distinguish them, and a reader should always read it.

Second, because the penalties are subtractive and large, the score reaches zero easily and then stops. Once it is at zero, further findings do not change it. Zero therefore means at least this bad rather than a measured floor. The repository's own worked example, a demonstration record for Egon Schiele's Portrait of Wally, scores zero for exactly this reason, with several custody gaps and several high-severity flags in combination.

**The display bands. These are presentational thresholds only. Nothing in the software behaves differently according to which band a score falls into, and the bands carry no legal or institutional meaning.**

| Score | Colour |
| --- | --- |
| Below 40 per cent | Red |
| 40 to 70 per cent | Amber |
| 70 per cent or above | Green |
