<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/ercf.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 15. Notable Inconsistencies Found in Review {#inconsistencies}

A plain-language review is of limited value if it only reports what the documentation claims. The following discrepancies were found by reading the code against the documentation. None is fatal, and several are the ordinary residue of a fast-moving research project, but a reader relying on the repository should know about them.

**The acronym is used inconsistently.** The README and both design documents give ERCF as the Evacuation Risk and Cost Framework. The prompt used for generating country briefings expands it as the Evacuation Risk Classification Framework. This report follows the README.

**Comments have fallen out of step with the code.** The explanation attached to the in-zone assistance calculation still lists access multipliers of 1.0, 1.5, 3.0, 5.0 and 8.0, while the values actually used are 1.0, 1.5, 2.0, 3.6 and 4.0. The same explanation gives a treatment cost of 1,200 US dollars per injury, while the code applies 800. In both cases the values in force are the more conservative and better-evidenced ones, so the effect is that the documentation overstates the model's outputs rather than understating them. A summary string displayed with the evacuation results still reports the Sphere emergency minimum of 15 litres of water per person per day although the calculation uses 20.

**The stated date range of the corpus is wrong.** The README describes the historical corpus as covering 1991 to 2024. The earliest case in the data file is the battle of Manila in 1945, and the corpus also includes Hue in 1968 and West Beirut in 1982. The correct range is 1945 to 2024.

**One calibration script is not portable.** It contains a file path pointing at a directory on the original author's own computer, which means it will not run on a fresh copy of the repository without editing that line. The main calibration script runs correctly. A comment in that script still refers to twenty in-scope cases, although it counts them dynamically and in practice uses sixteen.

**One country code is wrong.** The demographic dataset contains a country code entry for Mali that does not match that country's actual three-letter code, so a lookup by code would fail for Mali while a lookup by name succeeds.
