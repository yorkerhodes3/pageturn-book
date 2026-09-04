<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/vango.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 10. Limitations and Caveats {#limitations}

The prototype has real and visible limits, and a reader deciding whether to build on it should know them.

**The code cannot prove presence.** Anyone holding the code can collect the stamp from anywhere in the world. There is no location check, no time window, and no single-use mechanism. For a souvenir this matters little. For anything that conferred a benefit, such as a discount or a prize, the scheme would be trivially defeated.

**The published demonstration cannot sign anyone in.** The address of the account server is written into the application as a local address on the developer's own machine, so sign-in and registration fail on the public web.

**The passport number is not the one the server issues.** The passport number and membership date shown to the visitor are derived from the stamp collection rather than read from the server, so both are decorative rather than authoritative.

**The catalogue cannot be extended without editing the software.** There is no interface through which a gallery could register a work. Seven works is a demonstration, not a deployment.

**Most of the catalogue is fictional.** Five of the seven entries are invented. The application has, so far as the repository shows, never been placed in a real exhibition or tested with real visitors.

**Each illustration must be drawn by hand in code.** This is what makes the stamps attractive and it is also what prevents the catalogue from growing quickly. A catalogue of hundreds of works would need either a different approach to imagery or a great deal of labour.

**QR scanning is not universally available.** It depends on a barcode-reading capability that not every mobile browser provides. The application detects this and directs the visitor to type the code instead, which is a sound fallback but a less pleasant one.

**Profile pictures are stored inefficiently.** They are uploaded and stored in a form that makes them substantially larger than the original file, and are held in the same database as the account records. This is workable at demonstration scale and would not be the right approach at any real volume.

**Three versions of the application coexist.** The repository contains the current source, a superseded starting page, and a single large self-contained file of roughly two-thirds of a megabyte. Which of these is authoritative is not documented, though the build configuration makes clear that the current source is what is published.

**No automated tests exist.** The repository contains none.
