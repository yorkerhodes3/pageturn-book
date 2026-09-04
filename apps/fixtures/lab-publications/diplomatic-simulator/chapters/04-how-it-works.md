<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/diplomatic-simulator.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 04. How the Simulator Works {#how-it-works}

The tool runs each scenario through six stages. The first five use the same reusable toolchain, held in the repository under the folder named sim; only the source documents change from scenario to scenario. Three of the six stages are ordinary computer code with no artificial intelligence involved at all.

**Stage one, reading the source documents.** Each scenario arrives as a set of documents: one public scenario brief describing the crisis, plus one confidential instruction file for each country. These are converted from page images into plain text. No judgement is exercised at this stage.

**Stage two, building a party profile.** One agent is assigned to each country. It reads that country's confidential instructions and nothing else, and distils them into a structured profile. This is the single most important step in the whole pipeline, because the profile is the entirety of what that delegation will know about itself for the rest of the negotiation.

**Stage three, writing the public brief.** A separate agent reads the shared scenario document and writes the neutral briefing that every delegation will see. It states the situation, lists the issues formally on the table, sets out the procedure, and fixes the vocabulary of negotiating tactics that delegations will use to label their own moves.

**Stage four, the negotiation.** The delegations negotiate in plenary rounds. In each round, every delegation writes exactly one statement. It is given its own profile, the public brief, and the running public transcript. It is instructed to stay in role, to ground its claims in its brief, to protect its secret bottom lines, and to label the tactics it has just used. The flagship Arctic scenario runs four rounds: an opening plenary, a positioning round, a bargaining and coalitions round, and a closing plenary. The other three scenarios run three rounds, dropping the separate positioning stage. Seven delegations across four rounds produce twenty-eight statements in the Arctic; nine delegations across three rounds produce twenty-seven in the South China Sea.

**Stage five, the analysis.** A single analyst agent, cast as a neutral control group, then reads the entire transcript together with every delegation's confidential profile. It is the only agent in the system that sees both sides of the information barrier. It produces the scoreboard, the per-delegation debriefs, and the convener report.

**Stage six, assembly and publication.** Plain computer code stitches the outputs together, standardises the tactic labels, and renders the interactive pages. No model is involved. This matters for auditing: the numbers a reader sees on the published pages are arithmetic performed on agent outputs, not a second layer of interpretation.
