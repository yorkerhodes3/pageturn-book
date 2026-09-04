<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/provenance-search.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 01. Executive Summary {#executive-summary}

Provenance Search is a small web application that takes a description of an artwork and returns a structured summary of that artwork's documented ownership history, together with a numerical confidence score and a list of risk flags. It is published as a live public demonstration and is intended for academic and demonstration purposes.

The tool queries seven free public information sources. One of them, a commercial web-search service called Tavily, is treated as the primary research engine and is deliberately restricted to a fixed list of authoritative websites, including INTERPOL, UNESCO, the Getty, the German Lost Art Database, the Central Registry of Information on Looted Cultural Property, the United States Federal Bureau of Investigation, and major auction houses. The remaining six sources, drawn from museum collections and encyclopedic and structured reference data, are used to corroborate and to supply exact dates.

A general-purpose artificial-intelligence model, Google's Gemini, performs two jobs: it can identify an artwork from a photograph, and it arranges the retrieved facts into a chronological ownership timeline. It is instructed to use only facts present in the retrieved material, and to mark any period of ownership that the sources do not account for as an explicit gap.

The most important design decision in the project is that the confidence score is not produced by the artificial-intelligence model. It is calculated by a short, fixed, published arithmetic rule written into the server software. The same set of findings will always produce the same score, and any reader can check the arithmetic.

The tool is candid in its own output about the limits of what it has done. The digital signature attached to each passport states that the record attests to process, not to underlying truth. That framing is accurate and is the right way for a policy reader to understand the entire system.

Provenance Search does not query the restricted law-enforcement and commercial databases that professional due diligence relies on. It reads the public web pages of some of the organisations that maintain those databases. The distinction is central to interpreting its output.
