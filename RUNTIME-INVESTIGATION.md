# Real-content and Microsoft Edge investigation

| Field | Value |
|---|---|
| Date | 2026-08-28 |
| Production website revision | `b456e8e137a0b6ce9a51799b71c6091f5241b5d7` |
| Production reader | `Ethical-Tech-CoLab/website` `ReportBook.tsx` |
| Edge runtime | Microsoft Edge 151.0.4129.107 |
| V2 test publication | What Is Ethical AI? |

## Production corpus

The comparison no longer uses invented book content.

### What Is Ethical AI?

- Production source:
  `src/content/publications/what-is-ethical-ai.ts`
- Structured semantic content:
  - 16 sections.
  - 61 paragraphs/content blocks.
  - 41 plain paragraphs.
  - 18 lead/text blocks.
  - 2 intro/list blocks.
  - 122 Works Cited entries.
  - 1 standing disclaimer.
- Designed PDF rendition:
  - 46 fixed pages.
  - 1224 x 1584 pixels per rendered page.
  - 0.7727 page aspect.
  - 9,073,542 encoded WebP bytes in the production page set.
- Production page manifest:
  <https://ethical-tech-colab.github.io/website/publications/what-is-ethical-ai/pages/manifest.json>

### After the Corridor

- Designed PDF rendition:
  - 22 fixed pages.
  - 1224 x 1584 pixels per rendered page.
  - 0.7727 page aspect.
  - 4,794,644 encoded WebP bytes in the production page set.
- Production page manifest:
  <https://ethical-tech-colab.github.io/website/publications/after-the-corridor/pages/manifest.json>

These two books establish that physical thickness cannot be a constant. V2
accepts the production page count as binding metadata and derives a bounded
visible fan:

```text
fan layers per side = clamp(5, round(sqrt(pageCount) * 1.6), 14)
```

Examples:

| Page count | Rendered fan layers per side |
|---:|---:|
| 7 | 5 |
| 22 | 8 |
| 46 | 11 |
| 400 | 14 |

The underlying `pageCount` remains available to a shelf view even though the
reader bounds decorative DOM layers.

## Production-content integration

The pinned content sync script:

```text
v2/scripts/sync-production-fixture.mjs
```

downloads the structured source at the pinned website revision and generates
17 Markdown chapters: 16 body sections plus the complete Works Cited and
disclaimer back matter. Generated files contain their source URL and must not
be edited manually.

The deployed comparison uses:

- V1: the actual 46 production WebP pages and production PDF URL.
- V2: the actual 16-section semantic publication with its complete back matter.
- V2 book presentation: 99 desktop screen sheets or 221 phone screen sheets,
  split at semantic block and sentence/word boundaries; these responsive
  presentation sheets are not citation locations.
- The small invented fixture only for deterministic interaction regression
  tests.

## Microsoft Edge diagnostics

Diagnostics used the installed Edge executable directly through Playwright and
the Chrome DevTools Protocol:

- `Log.entryAdded`
- `Network.responseReceived` for HTTP 4xx/5xx
- `Network.loadingFailed`
- page console errors
- uncaught page errors

### Initial comparison findings

| Route | Finding |
|---|---|
| Comparison landing | No runtime errors |
| V2 reader | No runtime errors |
| Side-by-side comparison | No runtime errors |
| Legacy demo | One missing `https://yorkerhodes3.github.io/favicon.ico` 404 |

The missing favicon was the only reproducible application error and is fixed
with explicit embedded icons in every entry document, including generated
chapters.

### Production website findings

The production publication emitted no uncaught reader exception or HTTP 4xx.
Edge recorded several `net::ERR_ABORTED` requests for site routes such as
`/newsletter/`, `/media/`, `/portfolio/`, and `/team/`.

These are canceled Next.js speculative route-prefetch requests. They are:

- Initiated by the production website, not this comparison repository.
- Marked canceled/aborted rather than failed HTTP responses.
- Not reader initialization or page-image failures.
- Expected to appear as noise when DevTools preserves all network activity.

If the website team wants a completely quiet Network panel, it can selectively
disable link prefetching on noncritical navigation. That is a website-level
performance trade-off and is not required for reader correctness.

### Post-fix Edge result

The following real-content routes produce zero console errors, uncaught page
errors, non-canceled request failures, or HTTP 4xx/5xx responses in Edge:

- Comparison landing.
- Legacy real 46-page reader.
- V2 real semantic publication.
- Side-by-side comparison.

## Physical state findings

The principal page-turn timing defect was not animation duration. It was the
underlay model.

For a forward turn:

```text
stable:       current left + current right
turn underlay: current left + destination right
moving leaf:  current right front + destination left reverse
committed:    destination left + destination right
```

For a backward turn:

```text
stable:       current left + current right
turn underlay: destination left + current right
moving leaf:  current left front + destination right reverse
committed:    destination left + destination right
```

This prevents incoming left-page content from appearing before the physical
leaf crosses the gutter.

Cover opening uses a separate state sequence:

```text
closed volume
-> closed volume translated right
-> page 1 staged only in the right half
-> cover rotates with a blank inside face
-> blank inside front board + page 1 committed
```

Cover boards are not routed through the draggable paper-leaf path.

## Curvature and edge stack

Static page curvature uses:

- Mirrored gutter rotations.
- A broad surface highlight/shadow gradient.
- A shallow curved top and bottom silhouette.
- Shorter visible leaf width.
- Page-count-driven fanned layers at both fore-edges.

Turning-page curvature uses one continuous front/back semantic surface. The
outer edge bends and shortens with a variable-radius silhouette, lift, skew,
sheen, fold, and shadow during automatic and pointer-driven turns. Removing
the previous sliced surface eliminates inter-segment seams and reduces the
moving leaf from eighteen duplicated page faces to two.

This remains a CSS visual approximation. It intentionally avoids canvas,
WebGL, and a full paper finite-element simulation.

## Responsive findings

The real title and subtitle exposed a mobile defect hidden by the small
fixture: the cover retained desktop half-spread width. On narrow screens:

- The cover now fills the single-page book width.
- Desktop rightward translation is disabled.
- Cover type scales from the book container using container query units.
- Subtitle size scales independently.
- Cover content is tested to remain inside the board.
- Semantic book pages use responsive pagination profiles and never scroll
  internally; exhaustive Edge/Chromium checks cover all 99 desktop and 221
  phone sheets.
- Empty cover folios are not rendered, eliminating intrinsic vertical
  overflow rather than only hiding a scrollbar.

## Final payload and capability findings

The built production comparison measures:

| Approach | Runtime gzip | Complete publication payload |
|---|---:|---:|
| V2 semantic | 32,710 bytes | 79,130 bytes |
| Legacy fixed pages | 27,044 bytes | 9,100,586 bytes |

V2 runtime code is about 5.7 KB gzip larger, but the complete semantic book is
99.13% smaller, approximately 115 times lighter. The saving comes from
replacing 9.07 MB of already-compressed WebP page images with 46,593 bytes gzip
of semantic chapter HTML; SVG is not involved in the legacy page payload.

Current-location sharing is implemented with Web Share and clipboard fallback.
Local annotations, comments, bookmarks, search, offline caching, and
collaborative comments remain specification/backlog work and are identified as
planned or future on the published functionality dashboard.

## Front matter and source-note fidelity

The designed edition begins with:

1. A title/imprint page.
2. A thesis and disclaimer page.
3. A contents page.

V2 now represents that information semantically as an inner cover, title page,
responsive thesis leaves, bounded linkable contents leaves, and
imprint/notes leaves before body screen page 1. Compact viewports split long
front matter rather than clipping it.

The designed PDF also contains page footnotes. The canonical `REPORT.md` and
website publication object contain no footnote markers, definitions, or
footnote-to-source mapping, despite the report build including a footnote
plugin. V2 therefore links the complete Works Cited and states the limitation
instead of inventing endnotes.
