<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/agentic-behavior-observatory.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 05. Limits worth stating {#limits}

The instrument is a vocabulary detector. Reading it as anything more would reproduce exactly the error it was built to expose.

- Regular expressions match vocabulary, not meaning. A repository that discusses differential privacy without implementing it fires that signal. Every signal therefore links to its evidence, and the evidence, not the score, is the finding.
- The word party is counted as a demographic dimension in 17 repositories, which is the corpus's clearest false positive: in a negotiation simulator a party is a side at the table, not a political affiliation. It is left in rather than special-cased, because the general problem it illustrates does not go away by patching one term.
- The demographic vocabulary is a fixed English list of 39 terms, so it under-reports populations described in other words or other languages. That limit is itself a finding about who the tooling was built by.
- Up to 120 files are read per repository. Large repositories are sampled, not read whole, and every report carries files_read, files_eligible and files_total so the sampling is never silent.
- The observatory scores itself 60, first in the corpus, and rose from 54 when the context-isolation signals were added to the very file it analyses. A repository whose contents are the taxonomy will match the taxonomy, so this number is close to tautological and should not be read as the tool validating itself. It is the sharpest available demonstration of the limit above it.
- Twenty-two repositories is a small corpus, and 15 of them come from one organization. The dimension counts above describe this corpus. They are a prompt to check your own, not a measurement of the field.
