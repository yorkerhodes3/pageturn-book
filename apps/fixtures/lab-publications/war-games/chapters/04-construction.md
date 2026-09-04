<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/war-games.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 04. How the Game Is Built {#construction}

The application is a static site of vanilla JavaScript modules with no build step and no server, hosted on GitHub Pages. That constraint drove most of the interesting architecture.

**The scripted spine.** The hand authored mode is a directed graph of twenty one nodes with typed effects on the game state. Static validation of the graph is part of the test harness rather than an afterthought: every batch checks that all nodes are reachable, that no choice or transition points at a node that does not exist, that all three endings remain reachable, and that no substitution token is left unresolved in any of the four name sets. The most recent batch reported twenty one of twenty one nodes reachable, zero dangling links, zero unresolved tokens and all three endings reachable.

**The state machine.** DEFCON is the master tension gauge and the only piece of game state the narrative turns on. It runs from five, meaning peace, to one, meaning launch, and it is always visible. Both modes drive the same ladder, which is what allows the scripted and model driven paths to share every downstream system.

**The output contract.** In Live AI mode the model is given the persona, the public state and the conversation so far, and must reply with a single object containing a reply, a numeric DEFCON delta, and optionally an ending. The engine applies the delta, clamps it, renders the reply, and only ends the game if the declared ending is one of the three that exist. A garbled reply triggers exactly one retry asking for clean JSON; if that also fails, the game falls back to the scripted graph mid conversation rather than showing the player raw text. A player whose network is down, or who has no key, plays the whole game and never learns that the model was unavailable.

**The proxy.** A static page cannot hold a secret, and the model provider blocks direct browser calls, so Live AI talks to a small self hosted proxy running on the CoLab's own GPU node. The proxy injects the provider token server side, enforces an origin allow list so that only CoLab sites may call it, and routes each request to either a cloud model or an on box model purely on the basis of the model identifier in the request. The site discovers the proxy's current address from a small JSON file at startup rather than from a hardcoded URL. The origin allow list is a working control and was exercised as such during evaluation: requests without an allowed origin are rejected.

Where the model is, and is not, is the teaching point of the whole build. It drives the Live AI persona, an optional chess opponent and optional chess commentary. It never touches the chess rule book, which is a validated implementation of the rules of the game. It never touches tic tac toe. It never owns DEFCON, the ending, the transcript or any other piece of state.

**Where a model is used, and what happens when it is unreachable.**

| Surface | Model used | If the model is unreachable |
| --- | --- | --- |
| Scripted story mode | No, a hand authored graph | Not applicable |
| Live AI story mode | Yes, persona under a strict JSON contract | Falls back to Scripted mid conversation |
| Chess rules and legality | Never, a validated rule book | Not applicable |
| Chess opponent | Optional, picks from an explicit legal move list | A local search substitutes, and the panel says so |
| Chess commentary | Optional | A canned line bank substitutes |
| Tic tac toe and the futility proof | Never, exhaustive enumeration | Not applicable |
| Board, telemetry, transcript | No | Not applicable |

The model proposes, and deterministic code validates and decides. That is the only reason it is safe to seat a language model at a chess board at all: an invented move simply fails validation and the local search plays instead, and the interface says so.
