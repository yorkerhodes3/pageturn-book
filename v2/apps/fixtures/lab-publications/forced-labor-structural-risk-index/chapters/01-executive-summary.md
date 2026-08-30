<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/forced-labor-structural-risk-index.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 01. Executive Summary {#executive-summary}

FLSRI is a research prototype: a country-level index that scores the structural conditions under which forced labour becomes more likely. It scores 184 of roughly 195 countries on a scale running from 0 to 1, where 0 is the lowest modelled structural risk and 1 the highest. The remaining countries are reported as not scored rather than being given an invented value.

The index is deliberately not a prevalence estimate. It does not say how many people are exploited. A high score means the enabling conditions hold together strongly; a low score does not certify a country as free of forced labour. This distinction is stated repeatedly in the project's own documentation and it governs every legitimate use of the results.

The framework rests on a simple structural claim borrowed from criminology: exploitation becomes likely when a population exposed to coercive recruitment coincides with an environment in which exploiting that population goes unchecked. The index therefore has two scored halves. Recruitment, written as R, asks who is structurally exposed, through poverty, debt, blocked mobility, exclusion, weak legal identity, gendered labour structures, childhood exposure, and shocks such as conflict and disaster. Exploitation, written as E, asks whether exploiting them can run without consequence, through blocked exit, demand in high-risk sectors, and the state's own production of unfreedom.

The two halves are combined by a geometric mean, that is, the square root of R multiplied by E. This is a deliberate methodological choice. It means a country can only score high when both halves are high. A very exposed population in a country with strong labour enforcement, or a permissive enforcement environment in a country with little structural vulnerability, is pulled down rather than averaged out.

A third phase, Monetization, covering the financial conditions under which the proceeds of forced labour can be moved, hidden, and kept, is computed and published but deliberately excluded from the headline score. It answers a different question, namely where intervention against the money would bite, and it scores high for wealthy financially opaque economies in a way that would distort a structural risk reading.

Eleven domains and forty-three standardised indicators feed the published score, each drawn from an established cross-national dataset such as the World Bank World Development Indicators, ILOSTAT, the V-Dem democracy dataset, the UNHCR population statistics, the UCDP conflict event dataset, and the EM-DAT disaster database.

The project is unusually disciplined about two failure modes that afflict composite indices of this kind. The first is circularity, that is, predicting forced labour using a measure of forced labour. The second is the risk that the index becomes a governance ranking wearing a new label. Both are addressed explicitly, tested, and reported rather than concealed.

Every scored country carries a published uncertainty band derived from 10,000 simulated re-scorings, and the documentation insists that the results be read in broad tiers rather than as an exact league table. The middle of the table is openly described as unstable. The index is delivered as an interactive public website together with the complete pipeline that produces it, so that any figure shown can be traced back to the data and the code that generated it.
