<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/forced-labor-structural-risk-index.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 12. What Is Published, and How It Can Be Checked {#what-is-published}

The deliverable is an interactive website that runs in an ordinary browser and can be served from any static host. It carries a world map, a sortable ranking of all 184 scored countries with the unscored cases shown openly, individual country profiles with a phase and domain breakdown, the full indicator and source list, a limitations page, and a simulation page.

The simulation page lets a reader change the balance between the two phases, switch the combining rule from a geometric mean to a plain average, and move a country's domain scores, watching the map and rankings recompute. Its own description is careful: this shows how sensitive the index is to the choices made in building it, and is not a forecast of anything, nor a prediction of what any intervention would achieve.

Every figure shown on the site is read from the published build output rather than entered by hand, and the whole build can be regenerated with a single command from the inputs stored in the repository. The rebuild verifies its own output against the published baseline and stops if anything has drifted unexpectedly. Roughly two-thirds of the data sources can be re-pulled automatically from public interfaces; the remainder require a human to obtain a registration-gated or licence-gated file first, and each of these is listed with its provider, its address, and its licence terms.

The per-indicator source, vintage, coverage, licence, and required citation are recorded for every signal. The codebook that documents which indicators sit in which domain is generated from the code itself, so it cannot drift away from the pipeline it describes. These are small pieces of discipline, and they are the reason the rest of this report could be written from the repository alone.
