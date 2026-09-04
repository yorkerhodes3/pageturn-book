<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/provenance-search.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 06. Reading the Results {#reading-the-results}

**The passport.** The output is a single structured record. It contains the artwork's details as searched, the confidence score, a short written rationale in plain language explaining what is and is not verified, the ownership timeline, the risk flags, the valuation assessment, the list of sources consulted with each one's verdict, and the signature block.

**The timeline.** Each entry gives a period, an owner, and where available a note, a source link, and the name of the source authority. Entries that represent gaps are shown with the owner field marked and tagged as a custody gap in the interface. Entries drawn from the model's own knowledge rather than a retrieved source are tagged as general knowledge. A reader can therefore see at a glance which parts of the chain are cited and which are not.

**The risk flags.** Each flag has a type, a severity of high, medium, or low, a plain-language detail sentence, and where applicable a link. Severity governs the colour of the flag in the interface and, for high-severity flags only, feeds the score.

**The sources consulted panel.** This lists all seven sources with their verdicts, so that a reader can see not only what was found but where nothing was found. This matters more than it might appear. A not-found verdict from a museum collection means only that the museum does not hold the object. It is not evidence of anything about the object's history.

**The signature.** Each passport records the identifier of the software version that produced it, the exact time, a digital fingerprint, and an attestation sentence. The attestation states that the passport records the results of automated queries to free public sources and attests to process, not to underlying truth. This is the single most important sentence in the output and should be read as governing everything above it.
