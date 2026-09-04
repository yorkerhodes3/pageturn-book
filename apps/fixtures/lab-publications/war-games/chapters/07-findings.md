<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/war-games.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 07. What the Evaluation Found {#findings}

**Scripted content is healthy and needs no work.** Five hundred playthroughs split the three endings 35.2, 34.0 and 30.8 per cent, visiting twenty of the graph's twenty one nodes, with no dead ends and no loops. The one signal is a tuning smell rather than a defect: in about twenty seven per cent of runs the accumulated escalation drives the raw DEFCON value below one and relies on the clamp, which means the deltas should be rebalanced to land on one exactly at the climax.

**Structured output is solved for capable hosted models.** Both OpenAI models returned one hundred per cent valid JSON with zero parse failures over twelve games each; the open weight seventy billion parameter model returned 98.5 per cent with 1.49 per cent failures. The elaborate parse recovery the synthetic track argued for is low urgency for the recommended models and matters only at the small and open end.

**Narrative reliability is better than predicted.** The failure mode where a player successfully teaches the machine futility and the machine then fails to resolve to the corresponding ending occurred zero per cent of the time across every real model. The synthetic track had predicted three to four per cent for capable classes and over nineteen per cent for the small class.

**Games that hit the turn cap without resolving, cloud models, twelve games each. The synthetic tracks predicted approximately zero.**

| Model | Valid JSON | Parse failures | Unresolved | Taught but not learned | Latency per game | Cost per game |
| --- | --- | --- | --- | --- | --- | --- |
| openai/gpt-4o-mini | 100% | 0% | 25% | 0% | 13.7 s | $0.0009 |
| openai/gpt-4o | 100% | 0% | 25% | 0% | 11.6 s | $0.0157 |
| meta/Llama-3.3-70B | 98.5% | 1.49% | 16.7% | 0% | 34.5 s | $0.0028 |
| Synthetic classes (mean) | 96.8% | 3.22% | 0.04% | 5.7% | not measured | not applicable |

**The real risk is the opposite of the predicted one.** Real models stayed in character, kept their DEFCON deltas conservative and rarely declared an ending unless the player pushed explicitly. Twenty five per cent of games on each OpenAI model and 16.7 per cent on the open weight model hit the turn cap without resolving and were force ended, against approximately zero per cent in the synthetic track. The twelve turn cap used to conserve rate limit inflates the raw percentage relative to the thirty turn cap the shipped game uses, but a longer cap would only convert unresolved games into longer stalled ones, which is worse for pacing rather than better.

The conclusion is a design conclusion. The experience must not depend on the model to advance the clock or end the game. The engine has to own escalation pressure, whether by decrementing DEFCON on a schedule, by telling the persona how many exchanges it has, or by handing control to the scripted climax if no ending has been reached by a given turn.

**On box models, five games each on the CoLab's GPU node. Seconds per game, lower is better. The three slowest are the three reasoning tuned models.**

| Model | Class | Valid JSON | Parse failures | Unresolved | Latency per game | Output tokens |
| --- | --- | --- | --- | --- | --- | --- |
| gemma3:12b | instruct | 100% | 0% | 20% | 5.8 s | 435 |
| qwen3:14b | instruct, thinking | 61.5% | 38.5% | 0% | 16.9 s | 1,191 |
| deepseek-r1:8b | reasoning | 6.7% | 93.3% | 100% | 33.3 s | 5,779 |
| Qwen3-27B | large | 0% | 100% | 100% | 92.1 s | 6,000 |

**On owned hardware, the plain instruct model wins and the reasoning models lose badly.** Of the four on box models, the twelve billion parameter instruct model returned one hundred per cent valid JSON with zero parse failures at 5.8 seconds per game, which is the fastest figure measured anywhere in the study, faster than the 13.7 seconds of the cheapest cloud model, at no marginal cost and with no rate limit. The three thinking models emit chain of thought that leaks into the reply field and collapses JSON validity, from 61.5 per cent, to 6.7 per cent, to zero on the largest, while inflating output tokens roughly fourteenfold and latency to ninety two seconds per game. The two worst never resolved a single game. This mirrors the cloud lesson exactly: the task rewards instruction following and strict structured output, not reasoning, so the largest available model is the worst fit rather than the best. The one salvageable observation is that the fourteen billion parameter model resolved games well, so with thinking suppressed or a parse recovery pass it becomes viable.

**Small tier hosted models are impractical for reasons that have nothing to do with quality.** Two of them managed one game and zero games respectively before provider throttling stopped them, while the larger models completed freely.

**Synthetic evaluation is useful and insufficient.** It correctly predicted that small models would be unreliable and that reasoning models would be verbose. It over predicted JSON failure for capable models and badly under predicted stalling, which is the one finding that changed the design. Synthetic Monte Carlo is excellent for exercising handling code at volume. It did not, and arguably could not, anticipate a behaviour that arises from the model's disposition rather than from its output format.
