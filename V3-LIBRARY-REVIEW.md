# V3 multi-book library review

| Field | Value |
|---|---|
| V3 shelf publications | 22 |
| Ethical Tech CoLab publications | 21 |
| External open-source publications | 1 - Plurality |
| Semantic manifests | 22 shelf + 1 internal demo |
| Shelf publication chapters | 322 |
| Plurality source revision | `86158859464aee75633acd854c656928121a7fd8` |
| Lab source revision | `b456e8e137a0b6ce9a51799b71c6091f5241b5d7` |
| Status | Broad V3 beta; editorial and lazy-loading hardening remain |

## 1. What is available

Every binding on the library shelf now has a V3 geometry action.

The shelf contains:

- 20 publications generated from the Ethical Tech CoLab `PrintableReport`
  registry, including the tailored *What Is Ethical AI?* edition;
- the complete 542-term Cyber Dictionary and its 105-source library;
- *Plurality: The Future of Collaborative Technology and Democracy* by E. Glen
  Weyl, Audrey Tang, and the Plurality Community.

Plurality is sourced from 30 canonical English Markdown chapters at a pinned
commit. The repository dedicates the work to the public domain under CC0 1.0.
The V3 edition retains a voluntary author/community citation.

## 2. Shelf and book behavior

Selecting a binding exposes only the editions available for that source:

- *What Is Ethical AI?*: V2 semantic, V3 geometry, and designed pages;
- other Ethical Tech CoLab publications: V3 geometry and designed pages;
- Plurality: V3 geometry and the original plurality.net flat reader.

The existing shelf flight runs before navigation. V3 then opens a
publication-colored cover over the semantic spread. The fixed-page legacy
viewer and V2 reader remain separate.

Each V3 publication uses:

- its manifest title, subtitle, credits, and cover palette;
- fresh pages at semantic chapter boundaries;
- chapter labels derived from manifest chapter identity;
- titles without duplicated numeric prefixes;
- desktop drop caps on the first prose paragraph;
- the same top/bottom, forward/backward fold solver.

## 3. Ingest coverage

The lab importer preserves:

- prose and lead paragraphs;
- ordered and unordered lists;
- tables;
- formulas as semantic preformatted blocks;
- chart data as accessible tables;
- Works Cited and disclaimers;
- AI Research Assistant comparison, red-team, prompt, and rubric appendices;
- Cyber Dictionary term/domain structure and source library.

The Plurality importer preserves:

- all 30 current English chapter files in canonical order;
- stable numeric chapter IDs such as `5-7`;
- 586 linked chapter-note references and 607 preserved note definitions in the
  built snapshot;
- thematic breaks, blockquotes, lists, and ordinary Markdown structure;
- figure captions and immutable figure links without eagerly loading the
  roughly 30 MB image library (37 figure links in the built snapshot);
- CC0 source and voluntary attribution metadata.

## 4. Controlled special-case measurements

Fresh Chromium contexts at 1440 x 1000 were measured after garbage collection.
Body bytes are complete built uncompressed path sizes, including the shared V3
shell.

Built gzip-equivalent complete paths, including the shared 17.4 kB V3 shell:

- *What Is Ethical AI?*: about 68.6 kB;
- Plurality: about 513.9 kB;
- Cyber Dictionary: about 127.4 kB;
- AI Models Research: about 45.8 kB.

| Publication | Usable time | Responses | Body bytes | Semantic pages | DOM nodes | Attached elements | Heap | Images loaded |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Plurality | 5.04 s | 36 | 1,518,161 | 520 | 31,850 | 122 | 2.00 MB | 0 B |
| Cyber Dictionary | 3.56 s | 20 | 499,349 | 126 | 12,517 | 99 | 1.69 MB | 0 B |
| AI Models Research | 2.08 s | 17 | 119,842 | 26 | 3,128 | 95 | 1.51 MB | 0 B |

The attached document stays bounded. Timings vary with filesystem cache; the
same Plurality path measured between about 5 and 10 seconds during this review.
The high Plurality/Cyber node counts are
detached parsed chapter documents and source nodes retained for repagination.
They demonstrate why production work should add chapter-level loading and
release inactive source DOM rather than interpreting "bounded attached faces"
as sufficient by itself.

## 5. Build and validation evidence

- 23 fixtures build through the same publication CLI.
- 324 static semantic chapter routes are emitted.
- The Pages artifact contains 410 files totaling 6.06 MB raw / 1.67 MB gzip.
- The Vite multi-page build processes 330 HTML entries in roughly 5-30 seconds
  on the development machine, depending on filesystem cache and contention.
- One automated browser scenario initializes every one of the 22 shelf
  publications in V3.
- Representative checks confirm table-rich, formula, glossary, and Plurality
  note structures survive ingest. All 28 Plurality H4-H6 case-study headings
  are retained.
- The complete Ethical AI traversal confirms all 17 chapter openings, all 122
  references, and the disclaimer.
- V1 and V2 continue to use their original bundles and routes.
- Source regeneration is deterministic: a complete lab/Plurality refresh
  produced the same whole-tree SHA-256 digest before and after regeneration.

## 6. Remaining work before production

### 6.1 Runtime

- Load the current chapter first, then adjacent chapters.
- Replace detached source DOM retention with serializable semantic blocks or
  release parsed documents after pagination.
- Add incremental page-window construction for very long books.
- Add progress feedback for Plurality and dictionary pagination.

### 6.2 Content fidelity

- Compare every generated lab chapter with its hand-composed report page.
- Complete table splitting and responsive table presentation.
- Review formula typography and chart-table labels.
- Decide which Plurality figures should become bounded lazy images instead of
  pinned links.
- Verify all Plurality internal cross-chapter links and note back-links.
- Finish the AI Research Assistant appendix comparison against its bespoke page.

### 6.3 Reader features

- Add hierarchical contents navigation and search for long books.
- Apply the mature V2 typography controls and canonical history model.
- Persist reading position per publication.
- Measure turn frames on representative low-end mobile hardware.

V3 now includes a manifest-driven chapter picker and `?chapter=` start option,
which provide chapter navigation for review. A hierarchical contents view and
search remain future work.

The remaining production-quality estimate is 25-40 person-days, with
chapter-level loading and editorial QA now the dominant work rather than basic
book enablement.
