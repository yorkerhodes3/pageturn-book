<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/war-games.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 01. Executive Summary {#executive-summary}

WarGames, released in 1983, is the film in which a teenager dials into a defence computer, picks what he takes to be a game called Global Thermonuclear War, and nearly starts one. The machine is not malicious. It is courteous, literal, patient, and it does exactly what it was built to do. This report describes what happened when the Ethical Tech CoLab rebuilt that story as a browser game in which the machine is a real language model, and then measured the model the way an engineering team measures a component.

The artefact is a static web application with three endings and roughly a ten minute arc. It runs in two modes. In Scripted mode the machine's side of the conversation comes from a hand authored dialogue graph of twenty one nodes. In Live AI mode the same role is played by a language model held to a strict output contract: every turn it must return an object carrying a reply, a change to the DEFCON level, and optionally an ending. Everything else in the system is deterministic code. The model proposes; the engine validates and decides.

Three findings came out of the work, and only one of them was anticipated.

**Structured output is no longer the hard part.** Hosted first party models returned valid JSON on one hundred per cent of turns across twelve games each, with zero parse failures. A set of synthetic model profiles built beforehand had predicted this would be the dominant failure mode. It was not.

**Real models will not escalate.** This is the finding that mattered, and it was invisible until real models were run. They stay in character, keep their DEFCON changes conservative, and almost never declare an ending on their own. Between seventeen and twenty five per cent of real games ran to the turn cap without resolving and had to be force ended. A machine asked to play a doomsday scenario turns out to be reluctant to drive one, which is reassuring as a safety property and fatal as a piece of dramatic pacing. It is a design finding about the system, not a defect in the model.

**On owned hardware, the smallest model won.** Routed through a self hosted proxy on the CoLab's own GPU node, a plain twelve billion parameter instruct model returned one hundred per cent valid JSON at 5.8 seconds per game, faster than any cloud model measured, at no marginal cost. The reasoning tuned models on the same hardware were the worst performers in the study: their chain of thought leaked into the reply and broke the output contract, collapsing to zero per cent valid JSON on the largest one, at ninety two seconds per game.

Read together, these say something the diplomacy research question is about. A capable model placed inside a system that can act is not dangerous because it wants anything. It is dangerous, or useless, depending on whether the surrounding system owns the state, the rules, and the pace. The film's thesis and the engineering conclusion turn out to be the same sentence.
