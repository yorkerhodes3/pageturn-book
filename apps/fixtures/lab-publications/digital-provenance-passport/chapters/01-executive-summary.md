<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/digital-provenance-passport.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 01. Executive Summary {#executive-summary}

The Digital Provenance Passport is an experimental piece of software that takes the name of an artwork or cultural object, searches a controlled list of authoritative sources for its ownership history, flags signals associated with looting, restitution claims, documentation gaps, and suspicious pricing, and then issues a sealed digital record of everything it found and everything it did.

The system is deliberately built so that it cannot state a fact about an object unless it can point to the source that asserted it. Any claim that arrives without a source address attached is discarded before it reaches the record. This is the prototype's central safeguard against the well-documented tendency of language models to produce fluent, confident, and entirely fictional history.

The prototype scores each object on a provenance confidence scale running from 0 to 100, where a high number means the ownership history appears well-documented and a low number means it does not. The score begins at a starting value and is reduced by named, itemised deductions, each of which is displayed alongside the evidence that triggered it. There is no hidden statistical model. The rules are a short, readable list.

The system is built as an agent, meaning that it carries out a sequence of steps on its own initiative rather than waiting for a person to click through each one. Among those steps is an unusual one: it can decide for itself whether a paid commercial due-diligence search is worth buying, and if so, pay for it. The prototype uses a small automated payment standard called x402 and a test currency on a test network, so that no real money is ever at stake.

The final output is called a Passport. It is a structured record containing the object's identity, the ownership events that were found, the source behind each one, the confidence score, the red flags, any paid checks that were run, and a cryptographic seal. If a single character of that record is later altered, the seal fails and the alteration becomes visible to anyone who checks. The prototype ships with a deliberate tamper test that demonstrates this.

The prototype is not a determination of title, a legal opinion, or a substitute for a qualified provenance researcher. It runs by default in a fully offline demonstration mode using stored example data, and several of its most eye-catching features, including the commercial stolen-art database search, are simulated stand-ins rather than connections to the real service.

The work was produced as part of masters research at the New York University Center for Global Affairs, under the Ethical Tech CoLab, and was built for a hackathon on autonomous software that transacts on its own behalf. Its ambitions should be read accordingly: it is a demonstration of a method, not a deployed service.
