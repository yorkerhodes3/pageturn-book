<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/evacuation-simulation.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 08. Methodological Choices {#methodology}

**Why time is abstract.** The decision to measure time in ticks rather than minutes is the most defensible choice in the project. The preparation and travel figures were selected to produce plausible relative behaviour, and there is no empirical calibration behind them. Converting them to minutes would manufacture a precision that does not exist. The documentation says so directly and points readers toward calibrated evacuation timing studies for anyone who needs real durations.

**Why vulnerability is expressed as delay rather than as a risk score.** The model never assigns anyone a number representing how much danger they are in. Instead it gives them extra ticks. This is a meaningful choice. It means vulnerability only produces a bad outcome when it interacts with a constraint, such as a closing corridor or a degrading information environment. In a run with no time pressure, a household full of elders arrives late and arrives safely. That is a more honest representation of how vulnerability actually operates than a standing risk score would be.

**Why the household waits.** The hub takes the maximum preparation and travel time of anyone in the household, so the whole family moves at the pace of its slowest member. This directly implements Drabek's finding and it is the mechanism by which one unaccompanied minor or one elder slows an entire household rather than only themselves.

**Why everything is probabilistic.** Almost every transition in the model is decided by a random draw. Two runs with identical settings will produce different results. This is deliberate and correct, since it reflects genuine uncertainty in warning response, but it has a consequence for how the tool should be used. Conclusions should never be drawn from a single run.

**Why the population is small.** Six households and typically fifteen to twenty individuals is a very small population. This keeps every individual visible and traceable on screen, which serves the teaching purpose, but it means the results are statistically noisy and no percentage produced by a single run should be treated as an estimate of anything.
