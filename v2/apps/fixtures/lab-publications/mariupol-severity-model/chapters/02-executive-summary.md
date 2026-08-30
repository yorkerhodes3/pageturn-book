<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/mariupol-severity-model.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 01. Executive Summary {#executive-summary}

This repository contains a research prototype: an experimental piece of software that calculates, for every single day of the siege of Mariupol from 5 March to 20 May 2022, a number between 0 and 1 describing how dangerous it was for civilians to remain in the city. The repository calls this number the composite severity, written as S.

The severity number is built from six ingredients, which the repository calls components. Three of them describe violence: how many attacks happened each day, how close the fighting was to where people lived, and how much of that violence was aimed at civilians or broke promises of safe passage. Three of them describe the slower forms of harm that a siege produces: the cold in a city whose heating has been destroyed, the accumulating time under encirclement with no aid arriving, and the progressive destruction of the buildings people shelter in.

The six ingredients are deliberately not averaged in the ordinary way. The model uses a method of combination that pulls the answer close to whichever ingredient is worst. The reasoning is stated plainly in the repository's methodology: a population that is safe from shelling but freezing without water is not in medium danger. A plain average would have made the lull in shelling after mid-March look like recovery. It was not.

The resulting daily number is sorted into one of five phases, from Minimal to Critical, each carrying an indicated posture ranging from routine monitoring to immediate protective action. The presentation deliberately follows the five-category convention used by the INFORM Severity Index and by the Integrated Food Security Phase Classification, so that humanitarian readers recognise the shape of the output.

The severity number is then multiplied by a vulnerability weight of 1.114, derived from the share of the pre-siege population who were children, elderly, or living with a disability, to produce what the repository calls a priority index.

The repository's central claim is a claim about timing. It argues that publicly available information was sufficient to establish, well before the end of March, that the factual conditions triggering obligations under International Humanitarian Law were met, and that the negotiated evacuation mechanism did not arrive until 30 April. The repository states its conclusion in one sentence: the binding constraint was not information but consent.

The tool is a single web page that runs in an ordinary browser. Its author describes it as retrospective, not validated against how people actually behaved, and explicitly not operational guidance. It is the first of three intended axes of a fuller decision framework; the other two, feasibility and destination viability, are not built.

This report finds the model's reasoning clear and unusually well documented, and its candour about its own weaknesses genuine. It also identifies several points where a reviewer should verify a citation or a data figure before the work is published or relied upon.
