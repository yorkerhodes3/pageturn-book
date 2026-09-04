<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/provenance-search.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 04. How the Tool Works {#how-it-works}

The system has four stages. A user's request passes through all of them in a single operation that takes a few seconds.

**Stage one, describing the object.** The user supplies what they know through one of three routes.

- A text form with fields for title, artist, period or date, medium, and an optional last known sale price.
- An uploaded photograph of the object.
- A photograph taken there and then with the device camera, which is the mode intended for use in a museum or a saleroom.

If a photograph is supplied, it is sent to Gemini's image-reading capability, which returns its best guess at title, artist, period, and medium, together with its own self-reported certainty about that identification and a short note. Those values are written into the form, and the search then runs automatically. Only the title and the artist are strictly required to proceed. Large photographs are reduced in size before they are sent, so that a high-resolution telephone image does not exceed the limits of the free service.

**Stage two, querying the sources.** The title and artist are combined into a search phrase and sent to seven sources at the same time. Each source returns one of three verdicts about the object: a hit was found and it raises no alarm; a hit was found on a registry of lost or stolen property; or nothing matching was found.

**Stage three, assembling the timeline.** Everything the seven sources returned is gathered into a single block of text and passed to Gemini with a set of written instructions. The model is told that the restricted web search is the primary basis for the timeline and that the museum and reference sources are supplementary corroboration. It is told to use only facts present in the material supplied. It is told that where the sources leave a period of ownership unaccounted for, it must insert an entry marked as a gap with a note explaining what is missing, on the stated principle that a gap is itself a fact worth reporting.

The model is also given one narrow permission to go beyond the retrieved material. For works it recognises as very well documented, where the live sources returned little or nothing, it may fill in widely known ownership history from its own training. Every such entry must be labelled as general knowledge, must be marked unverified, must carry no source link, and may never contradict what a live source actually said. Whenever this permission is used, the software itself adds a medium-severity flag to the result, so the reader sees that part of the timeline rests on the model's memory rather than on a citation.

**Stage four, scoring and signing.** The assembled timeline and flag list are then handed back to the server's own code, which does three things without any further involvement from the artificial-intelligence model. It adds a high-severity flag for every hit on a registry domain, independently of whether the model noticed it. It computes the confidence score by fixed arithmetic. And it attaches a signature block recording the time of the check and a digital fingerprint, a short string of characters derived mathematically from the title, the artist, and the timestamp, which allows a later reader to detect whether those details have been altered.
