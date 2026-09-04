<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/digital-provenance-passport.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 13. Limitations and Caveats {#limitations}

The repository and the paper both state these limits plainly. They are reproduced here because they are the most important part of the document for any reader considering what weight to give the tool.

**It cannot read an archive.** The overwhelming majority of provenance evidence is in physical archives, in dealer records, in correspondence, in auction catalogues that were never digitised, and on the back of the object itself. None of this is reachable by a web search. The prototype gathers what institutions have chosen to publish online, which for most objects is a small and unrepresentative fraction of what exists.

**The keyword rules are crude.** The system decides that a provenance gap exists by looking for particular words in the gathered text. A museum page stating that an object has no gaps in its record contains the word gap and will trigger the flag. A page discussing the successful repatriation of a different object will trigger the looting flag. These rules find the right signal often enough to be useful as a prompt for human attention, and they will produce false positives regularly. They should be read as a list of things to check, never as findings.

**The source-country list is hand-written and incomplete.** Fourteen countries are named. Many states with active restitution claims are not among them, and membership of the list is not a legal category. It is a useful shorthand and nothing more.

**The thresholds are not empirically derived.** Twenty-five points for a gap, fifteen for source-country origin, three times market value for a pricing anomaly, ninety as the point at which further checking is pointless: none of these figures comes from a study or an expert panel. They are the developer's judgment, plausibly calibrated and entirely unvalidated. This is a normal starting position for a prototype and it should not be mistaken for anything more.

**There are two different scoring systems in the repository.** The web interface and the command-line agent compute confidence in materially different ways and will not agree on the same object. Anyone building on this work should reconcile them before doing anything else.

**The interface mislabels its own headline number.** A card reading risk 12 out of 100 describes a severely compromised object, which is the opposite of what the phrasing suggests.

**Most of what is impressive is simulated.** In the default configuration there is no search, no payment, and no database query. The commercial stolen-art check is a stand-in with stored answers. The transaction screening returns a fixed clean verdict. The catalogue of five objects is written by hand from published cases rather than produced by the system. A reader evaluating a demonstration should establish which mode it is running in before drawing conclusions about capability.

**The risk of plausible falsehood remains.** This is the most serious caveat in the report. The prototype's sourcing rule is a genuine and unusually well-implemented safeguard, and it does not eliminate the problem. It guarantees that every recorded claim has a source address attached. It does not guarantee that the source says what the record claims it says, that the source is about the same object, that the extracted sentence has not lost the qualification that made it accurate, or that a page found on an authoritative domain is itself authoritative. A false provenance claim, expressed in institutional language, carrying a real link to a real museum, and sealed inside a document described as verifiable, is more dangerous than an obvious error, because every visible signal invites trust. This is a foreseeable failure mode of the design, not a hypothetical one. Every claim in a Passport must be read at its source before it is relied on, and the fact that the document is sealed and formally verifiable does nothing to change that.

**It does not distinguish thin evidence from absent evidence.** An object with no online record and an object with a clean record but no online presence look identical to this system. For the majority of the world's cultural objects, which are not held by major Western museums with published collection databases, this limitation is severe.

**It is a prototype.** It has no test suite, no validation against expert assessments, and a commit history spanning a few days of work. It should be read as a demonstration of a method and an argument about how such a tool ought to be built, not as a service.
