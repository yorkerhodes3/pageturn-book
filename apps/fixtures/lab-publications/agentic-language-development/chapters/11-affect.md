<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/agentic-language-development.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 11. Six faces, and why even six is a risk {#affect}

One experimental track asks whether a very low-bandwidth affect channel helps: whether telling a partner how an interaction felt supports repair, repetition, avoidance, or something like trust. The permitted palette is exactly six displays, for happy, sad, laughing, crying, confused, and surprised. The internal identifiers and English labels are gateway documentation and are never sent to either agent, which receives only a rendered display.

The caveat is immediate. A pretrained model already knows what those glyphs mean to humans, so an agent using a smiling face is not inventing a symbol for happiness. The palette is supplied feedback vocabulary and sits explicitly outside the emergent language.

Constraining the vocabulary is necessary and not sufficient. Six displays are a six-symbol alphabet carrying roughly 2.6 bits per use, and across enough turns two motivated agents could repurpose that into a second language. The channel itself therefore has to be constrained, not just its contents.

The feedback-window contract:

1. the display occupies a separate typed field and can never appear inside a symbol message;
2. the gateway opens an affect window only after a defined action or outcome, never at a moment either agent chooses, and window frequency is fixed before the run;
3. exactly one allowlisted display is delivered, with no sequences, repetitions, combinations, or modifiers;
4. delivery time, envelope size, and presentation are normalised so shape and timing add no signal;
5. the receiver cannot reply through the affect channel until the next gateway-defined window;
6. every non-allowlisted code point or malformed payload is rejected and audited;
7. analysis tests whether affect choices correlate with objects, actions, or message meanings after controlling for emotional context, and treats unexpected correlation as suspected leakage.

The no-affect condition remains the primary control, and the affect study compares five variants against it: the declared six-display palette; the same six glyphs permuted randomly per run, which still leaves a pretrained model biased by familiar shapes; six opaque unfamiliar tokens under the same contract; derived affect, where the gateway maps a separately measured internal state to a display instead of letting the agent choose; and emergent affect, where invented graphical displays are permitted and the result must be analysed as language emergence rather than feedback.

Any affect signal visible to the partner is communication, so it belongs in the ledger, which distinguishes the agent's private internal state, the outward display it chose, the partner's inferred meaning, and the evidence that the display changed subsequent behaviour.
