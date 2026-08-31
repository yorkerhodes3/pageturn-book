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
| Status | Broad V3 beta with bounded chapter loading, durable locations, typography, and sharing |

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
- right-hand chapter openings by default, with an explicit continuous-flow
  override for compact publications;
- chapter labels derived from manifest chapter identity;
- titles without duplicated numeric prefixes;
- desktop drop caps on the first narrative paragraph, excluding Works Cited;
- the same top/bottom, forward/backward fold solver.

The catalog setting `chaptersStartOnRight` defaults to on. A 1440 x 1000
pagination audit disabled it for the four publications where at least half of
the chapters fit one semantic page: CERAI (73%), Agentic Behavior Observatory
(71%), VANGO (60%), and AI Research Assistant (50%). VANGO consequently shows
short adjacent chapters on the same spread rather than inserting a blank verso.

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

## 4. Controlled chapter-window measurements

V3 now loads the current chapter first and maintains a stable active chapter
plus one chapter on either side. Inactive source blocks and paginated pages are
released. A boundary turn may transiently retain up to four chapter runs so the
source and destination spreads remain available together; it contracts to the
three-chapter window immediately after commit.

Default-layout books use parity-stable two-leaf placeholders and add a blank
verso only when required to start the next chapter on the right. Continuous-flow
books keep their natural page count, remember each measured chapter's parity
after release, and load every chapter needed by the destination spread before a
turn. This avoids both forced blanks and placeholder-based chapter skipping.

Fresh Chromium contexts at 1440 x 1000 were measured against the local
production build after adjacent prefetch and garbage collection. Body bytes are
uncompressed local HTTP response bodies. Usable time is a warm local-preview
measurement and should be treated as comparative rather than a network promise.

| Publication | Usable | Responses | Chapter responses | Body bytes | Loaded chapters/pages | Retained source elements | DOM nodes | Heap | Images |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| What Is Ethical AI? | 196 ms | 9 | 2 | 99,268 | 2 / 4 | 20 | 621 | 1.33 MB | 0 |
| Plurality | 449 ms | 12 | 2 | 408,572 | 2 / 46 | 623 | 3,885 | 1.39 MB | 0 |
| Cyber Dictionary | 304 ms | 9 | 2 | 289,372 | 2 / 14 | 250 | 1,640 | 1.31 MB | 0 |
| AI Models Research | 306 ms | 9 | 2 | 85,409 | 2 / 4 | 66 | 944 | 1.29 MB | 0 |

The earlier eager Plurality baseline was 5.04 seconds, 36 responses, 1,518,161
body bytes, 31,850 DOM nodes, and 2.00 MB heap. The bounded implementation's
local comparison reduces those figures to 449 ms, 12 responses, 408,572 bytes,
3,885 nodes, and 1.39 MB heap. A direct Plurality jump from chapter `1` to
chapter `6-4` loaded and paginated the new `6-3,6-4,6-5` window in about 240 ms
on the same profile, then released the old window.

Lazy loading changes serving and runtime size, not static hosting size. Every
chapter remains an independently addressable file in the Pages artifact.

| Publication | Initial gzip path after adjacent prefetch | Complete static gzip path | Initial reduction |
|---|---:|---:|---:|
| What Is Ethical AI? | 31.2 kB | 73.1 kB | 57% |
| Plurality | 75.9 kB | 517.9 kB | 85% |
| Cyber Dictionary | 44.9 kB | 131.1 kB | 66% |
| AI Models Research | 28.5 kB | 50.2 kB | 43% |

These gzip paths include the 22.1 kB shared V3 route (20,087-byte assets plus
2.0 kB route HTML), the publication manifest, and either the first two chapters
or the complete semantic corpus.

## 5. Build and validation evidence

- 23 fixtures build through the same publication CLI.
- 324 static semantic chapter routes are emitted.
- The Pages artifact contains 411 files totaling 6.11 MB raw / 1.67 MB gzip.
- The Vite multi-page build processes 330 HTML entries in roughly 5-30 seconds
  on the development machine, depending on filesystem cache and contention.
- One automated browser scenario initializes every one of the 22 shelf
  publications in V3.
- Representative checks confirm table-rich, formula, glossary, and Plurality
  note structures survive ingest. All 28 Plurality H4-H6 case-study headings
  are retained.
- The complete Ethical AI traversal confirms all 17 chapter openings, all 122
  references, and the disclaimer.
- All 38 unit tests and 62 browser scenarios pass against both root and GitHub
  Pages base paths. The browser matrix includes lazy-window release, load
  failure/retry, turn/rebuild races, superseded navigation, resume/history,
  deep-anchor typography, configurable chapter flow, bidirectional VANGO
  traversal, reference styling, and sharing.
- V1 and V2 continue to use their original bundles and routes.
- Source regeneration is deterministic: a complete lab/Plurality refresh
  produced the same whole-tree SHA-256 digest before and after regeneration.

## 6. Remaining work before production

### 6.1 Runtime

- Move adjacent prefetch to an explicit idle scheduler and add abort signals for
  obsolete chapter requests.
- Add incremental page construction within unusually long individual chapters.
- Evaluate a serializable block representation if three-chapter source-node
  retention remains material on low-memory phones.
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
- Add bookmarks and a visible "start from beginning" action for resumed books.
- Extend sharing to selected text and exported annotations.
- Measure turn frames on representative low-end mobile hardware.

V3 now includes a manifest-driven chapter picker, canonical
`?book=<id>&chapter=<id>#<source-anchor>` locations, browser history, per-edition
resume, per-publication 80%-130% typography, and Web Share/clipboard links. A
hierarchical contents view and search remain future work.

The remaining production-quality estimate is 25-40 person-days, with
chapter-level loading and editorial QA now the dominant work rather than basic
book enablement.
