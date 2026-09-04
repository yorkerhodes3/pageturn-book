<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/erus.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 04. How the Simulator Works {#how-it-works}

The tool runs the same sequence of six steps every time a scenario is generated or the uncertainty slider is moved.

**Step one, the seeded number generator.** Every random value in the tool comes from a single arithmetic recipe that produces a stream of numbers which look random but are entirely determined by a starting number, called the seed. The recipe used is the Park and Miller generator, a well-documented method published in 1988. The practical consequence is that the same seed always produces the same scenario, on any computer, at any time. The tool never uses the browser's own randomness, which would not be repeatable.

**Step two, inventing the scenario.** The generator builds a chosen number of destinations, each with seven factor assessments, a capacity, and a distance, and a chosen number of evacuee groups drawn from eight fixed population types. This happens once, when a scenario is created. It does not re-run when the uncertainty slider moves, which is what allows the tool to prove that a falling success rate is caused by information quality alone and not by a changed scenario.

**Step three, scoring readiness.** Each destination is reduced to a single readiness figure between zero and one hundred per cent, using the weighted formula set out in the following section.

**Step four, the Monte Carlo engine.** For each possible pairing of a group with a destination, the tool runs five hundred trials. In each trial it independently considers every factor, asks whether an assessment that unreliable might be wrong, and if so shifts it one step better or worse. It then re-scores readiness. The output is a success rate and a standard deviation, which is a measure of how widely the five hundred results were spread.

**Step five, assignment.** Groups are sorted by urgency, with immediate cases first, then urgent, then those who can wait. Each group in turn is given the highest-scoring destination that still has enough spare capacity for it. Capacity is decremented as groups are placed, so later groups genuinely compete for what earlier groups did not take. If no site with room remains, the group is marked unassigned rather than being quietly given a place that does not exist.

**Step six, display.** The results are drawn as destination cards, an assignment matrix, an outcome table, an alerts panel, a sensitivity chart, and the information-value panel.
