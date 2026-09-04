<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/provenance-search.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 07. The Data Sources in Plain Terms {#data-sources}

**Tavily.** A commercial web-search service designed to be used by software rather than by a person browsing. In this project it is the primary research engine, and it is restricted to a fixed list of thirteen websites so that it cannot return results from the open web. The query sent is the title and artist followed by the words provenance, ownership, history, looting, theft, and restitution.

The thirteen permitted domains are:

- metmuseum.org
- getty.edu
- interpol.int
- unesco.org
- artloss.com
- lostart.de
- lootedart.com
- christies.com
- sothebys.com
- artnet.com
- fbi.gov
- ifar.org
- wikipedia.org

For a reader not familiar with the field: INTERPOL maintains the only global database of police-certified records of stolen cultural objects, publicly searchable since 2021 through its free ID-Art application. The FBI's National Stolen Art File, established in 1997, is a publicly searchable United States register of stolen art and cultural property, populated only by law-enforcement agencies. The German Lost Art Foundation's Lost Art Database records cultural assets seized between 1933 and 1945 as a result of persecution, and objects whose history cannot exclude such a seizure; it is free and public. lootedart.com is the Central Registry of Information on Looted Cultural Property 1933 to 1945, established in 2001 by the Commission for Looted Art in Europe, and holds both a documentary database and an object database.

The Art Loss Register is a private London-based commercial company operating what it describes as the largest private database of stolen art; its data is not publicly accessible and searches are a paid service. The Getty Research Institute's Provenance Index is a large free scholarly resource built from transcribed sale catalogues, dealer stock books, and household inventories, weighted towards Western European art from the sixteenth to the early twentieth century. IFAR, the International Foundation for Art Research, was a New York non-profit founded in 1969 whose provenance guide has long been a standard plain-language reference; it announced in 2024 that it was winding down operations. Christie's, Sotheby's, and Artnet are commercial auction and art-market sources whose catalogue entries frequently include provenance statements.

**The Metropolitan Museum of Art.** The Met publishes an open interface to its collection catalogue requiring no key. The tool retrieves up to three matching objects and reads their title, artist, date, medium, credit line, and public web address. The credit line is useful because it often names the donor or bequest through which the museum acquired the work.

**The Art Institute of Chicago.** Also an open collection catalogue requiring no key. This is the only museum source in the set that returns a dedicated provenance text field, and it is therefore the most directly valuable of the three museum sources for the tool's purpose.

**The Museum of Modern Art.** MoMA publishes no live search facility, and its website blocks automated access, so the project takes a different approach. MoMA's collection is published as an open static dataset on a public code-sharing site. The repository includes a script that downloads that dataset, keeps six fields for each work, and compresses it into a single file of roughly four megabytes covering about 159,000 works. That file is loaded into the server's memory when it starts, so a MoMA search happens instantly and involves no network request at all. The matching rule is simple: every word of the title must appear in the record and at least one word of the artist name longer than two characters must also appear.

**Wikipedia and Wikidata.** The English-language encyclopedia's search facility is used for general background, returning up to three article summaries. Wikidata, a companion project holding structured facts rather than prose, is searched for the artwork, picks the best-matching entry by looking for the artist's surname in the entry description, and then asks for five specific categories of fact: when the work was made, where it is now, which collections have held it and between which dates, who has owned it and between which dates, and any significant events recorded against it. This is the most precisely targeted of the supplementary sources, because those categories map directly onto the shape of a provenance timeline.

**Europeana.** A European Union cultural-heritage aggregator that brings together records from thousands of European galleries, libraries, archives, and museums. It requires a free key, and the tool skips it if none is configured.

**Gemini.** Google's family of large language models, capable of reading images as well as text. It is used for the photograph identification and for the assembly of the timeline. It is not used for the score.
