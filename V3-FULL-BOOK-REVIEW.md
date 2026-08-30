# V3 full-book review

| Field | Value |
|---|---|
| Publication | *What Is Ethical AI?* |
| Source | Complete 17-chapter semantic edition |
| Source revision | `b456e8e137a0b6ce9a51799b71c6091f5241b5d7` |
| Designed edition | 46 fixed PDF/WebP pages |
| Review date | 2026-08-29 |
| V3 status | Isolated comparison prototype |

## 1. Scope tested

The first V3 prototype loaded only three representative chapters. This review
uses the complete edition:

- 16 report sections;
- 122 Works Cited entries;
- standing disclaimer;
- generated semantic front matter;
- every desktop V3 page from first leaf to final leaf;
- single-page phone pagination;
- forward and backward geometry;
- top and bottom corner inputs;
- shelf departure followed by V3 cover opening.

V1 and V2 remain separate. The existing V2 chapter bundle is unchanged at
61.80 kB raw / 19.11 kB gzip.

## 2. Controlled reader comparison

Measurements below came from fresh Chromium contexts at 1440 x 1000 against the
same local production build. DOM counters and heap were collected after an
explicit garbage collection.

| Measurement | V3 full semantic geometry | V2 semantic book | Legacy fixed pages |
|---|---:|---:|---:|
| Responses through usable state | 22 | 22 | 54 |
| Response bodies, local uncompressed transfer | 177,489 B | 250,003 B | 9,198,289 B |
| Publication image bytes | 0 | 0 | 9,073,542 B |
| Modeled complete gzip-equivalent path | about 68.6 kB | about 83 kB | about 9.10 MB |
| DOM nodes after GC, including detached parsed documents | 2,586 | 2,603 | 139 |
| Attached elements | 110 | 164 | 40 |
| Parsed documents | 18 | 17 | 1 |
| Event listeners | 26 | 71 | 73 |
| JavaScript heap after GC | 1.56 MB | 1.64 MB | 1.51 MB |
| Measured time to tested usable state | 2.14 s | 0.88 s | 2.71 s |
| Internal page overflow | 0 | 0 | n/a |

Important qualifications:

- The V3 timing includes its 1.05-second cover-opening sequence.
- The V2 timing stops at its front-cover state, before opening the cover.
- The legacy heap value excludes decoded image and canvas backing memory.
- Local response-body bytes are uncompressed body sizes. The gzip-equivalent
  figures use built artifact sizes and measured compressed semantic content.
- V3 intentionally fetches all 17 chapters for this full-book experiment.

## 3. V3 transfer composition

Built gzip sizes:

| Resource | Size |
|---|---:|
| V3 HTML | 1.70 kB |
| V3 CSS | 4.16 kB |
| V3 JavaScript, including geometry and full-book composer | 9.25 kB |
| Catalog metadata | 2.33 kB |
| Module-preload support | 0.39 kB |
| Publication manifest | 4.14 kB |
| All 17 semantic chapters | 46.59 kB |
| **Complete V3 reading path** | **about 68.6 kB** |

That is approximately:

- 18% smaller than the measured complete V2 path;
- 99.3% smaller than the 9.10 MB legacy path;
- about 133 times smaller than the legacy book.

The V3 reduction versus V2 comes from the prototype's smaller shell. It does
not yet include V2's session, sharing, front-matter depth, TOC navigation,
typography preferences, or canonical history behavior, so this is not a
feature-equivalent win.

## 4. Pagination results

| Presentation | Semantic pages | Result |
|---|---:|---|
| 1440 x 1000 embedded reference | 46 pages / 23 spreads | All traversed; no overflow |
| 1440 x 1000 standalone review | 46 pages / 23 spreads | All traversed; no overflow |
| 390 x 844 phone | 62 single pages | No overflow |
| 320 x 844 phone | 86 single pages | No overflow |
| Designed facsimile | 46 fixed pages | Non-responsive reference |

The V3 count changes with available width and height, as expected for semantic
content. These values are presentation progress, not citation pages.

V3 is materially denser than V2's current 99 desktop and 221 phone screen-page
baselines. That reduces turns but also exposes the primary visual/readability
question for review: V3's default type and margins are smaller than V2's. Font
controls and a shared target reading size must be applied before comparing page
counts as a quality metric.

Every manifest chapter now starts on a fresh page. Chapter identity comes from
the semantic chapter resource and its first `h1`, not from parsing the displayed
number. Chapter-opening pages carry an explicit class, increased title scale,
top rule, and opening label. The complete traversal asserts all 17 chapter
headings are the first content node on their pages.

## 5. Visual comparison

### 5.1 Improvements visible in V3

- The fold follows the actual pointer coordinate rather than a progress-only
  CSS keyframe.
- Top and bottom corners create distinct geometry.
- Forward and backward turns use the same solver.
- The current page remains visible outside the fold, the destination appears
  through a solved reveal polygon, and the reverse-side semantic content is
  correctly oriented.
- The moving face remains attached to the binding constraint.
- No mirrored text or duplicate IDs appeared in inspected turns.
- Early front matter, a middle Responsible AI/Humanitarian History spread, and
  the final Works Cited/disclaimer spread all fit without page scrollbars.
- Numbered chapter headings no longer appear after preceding chapter prose;
  each begins a newly composed leaf with a distinct opening treatment.
- Decimal text such as `34.7 percent`, `0.8 percent`, and `7.0 earthquake`
  remains intact after semantic segmentation.

### 5.2 Remaining gaps versus the designed/legacy book

- The page surface is still a clipped plane. The fold line is mathematically
  continuous, but there is no deformable mesh producing a shallow paper arch
  across the full page.
- Inner and outer shadows are functional but not yet tuned to the designed
  legacy fold at several reference angles.
- V3 front matter is intentionally smaller than V2's full title, thesis,
  contents, and imprint sequence.
- Default typography is denser than both V2 and the designed PDF. It needs the
  existing V2 font controls and a shared readability baseline.
- The shelf flight and V3 cover open are two coordinated animations separated
  by navigation, not one cross-document shared-element transition.
- V3 has no TOC jump, canonical history integration, sharing, or resume state.
- Page fans and static gutter arch are simpler than the V2 leather-book
  treatment.

## 6. Full-edition correctness

Automated traversal checks every stationary page in the 1440 x 1000 edition and
confirms:

- the next action reaches its disabled final state;
- every displayed content region fits its page;
- all 17 chapters were loaded;
- Works Cited is reachable;
- the disclaimer is reachable;
- source decimals were not split;
- no designed-page image was requested.

Additional tests cover:

- shelf selection with V2, V3, and designed-page actions;
- shelf flight into V3;
- V3 cover opening;
- forward and backward moving/revealed content;
- ID removal from decorative clones;
- desktop-to-320-pixel repagination;
- the V1/V2/V3 comparison iframe.
- manifest chapter labels, title separation, and desktop drop caps.
- chapter-picker and internal-note navigation.

## 7. Recommended next visual pass

1. Apply V2's font-size controls and agree one common physical type-size
   baseline before comparing V2/V3 page counts.
2. Add direct page/chapter navigation for visual review.
3. Record reference frames at 15%, 35%, 55%, and 80% progress against the same
   legacy pages.
4. Tune fold-edge, inner, and outer shadows from those frames.
5. Add the shallow stationary-page arch independently from moving geometry.
6. Integrate V2's canonical location/history only after visual geometry is
   accepted.

The complete source-ingest inventory and all-book effort are in
[PUBLICATION-INGEST-PIPELINE.md](./PUBLICATION-INGEST-PIPELINE.md).
