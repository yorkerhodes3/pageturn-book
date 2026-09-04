<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/war-games.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 08. Cost, Control, and Where Inference Should Run {#cost-and-control}

The whole metered portion of the evaluation, thirty seven real games against hosted models, cost approximately twenty three cents. Per game the cheapest hosted model cost about nine hundredths of a cent, and the frontier model about seventeen times that for no measurable quality difference on this task. Hosting is free, because the artefact is a static site.

The interesting number is the one that is zero. Once Live AI routes to the owned GPU node there is no per token cost and no rate limit, which is the exact inverse of the metered tier, and it is the reason on box inference is attractive even where raw reliability is lower. Here it was not lower. The on box instruct model matched cloud grade reliability and beat every cloud model on latency.

The architectural point is that this is a single switch. One proxy, one endpoint, and a model identifier decides whether a request is served by a commercial provider or by hardware the institution owns. Nothing in the application changes. For research groups whose questions involve sensitive material, or whose budgets do not tolerate metered inference, that boundary is worth more than any individual model choice.

On the build side the artefact took four calendar days across two working sessions, fifty two agent turns and twenty six commits, producing roughly ten and a half thousand tracked lines across two repositories. The construction was itself agent assisted, and the measured record of it is kept alongside the code.
