## Executive estimate

For a production-quality implementation that preserves native semantic text, links, selection, accessibility, responsive pagination, font controls, browser history, touch/mouse dragging, and the legacy-quality fold:

| Approach | Prototype | Production effort | Recommended use |
|---|---:|---:|---|
| **Port StPageFlip geometry/render loop** | 2–3 person-weeks | **12–18 person-weeks** | Best long-term architecture and control |
| **Adopt StPageFlip with semantic HTML faces** | 1–2 person-weeks | **7–12 person-weeks** | Fastest route to near-legacy fidelity |
| **Mesh/canvas/WebGL hybrid** | 3–5 person-weeks | **18–30 person-weeks** | Highest visual ceiling, highest cost/risk |

With one senior rendering-focused engineer, those are roughly 3–4.5 months, 2–3 months, and 5–8 months respectively. Two engineers—rendering plus accessibility/test—could reduce calendar time to about 7–11, 5–8, and 12–20 weeks.

Assumptions: LTR physical-book mode first, current 99/221 responsive pagination, Chrome/Edge/Firefox/Safari plus mobile QA, reduced motion, and automated turn-phase tests. Full mirrored RTL mechanics would add roughly **20–30%**.

## Measured baseline

Measurements are from the current repository and Edge 152:

- Current [book-mode.ts](./v2/packages/reader-ui/src/book-mode.ts): **2,604 lines**.
- Current [theme.css](./v2/packages/theme/theme.css): **2,942 lines** across all reader/shelf presentation.
- Installed StPageFlip 2.0.7 complete TypeScript source: **3,312 lines / 118 KB**.
- StPageFlip flip/render/page/collection subsystem: approximately **2,300 lines**.
- Shipped StPageFlip module: **43.4 KB raw / 10.2 KB gzip**.
- Current V2 reader runtime: approximately **32.7 KB gzip**.
- All 17 semantic chapters: **46.4 KB gzip**.
- Manifest: **4.1 KB gzip**.
- Actual complete reading transfer, excluding the unused source map: about **83 KB gzip-equivalent**.
- Initial V2 chapter load: approximately **39–40 KB** before the remaining chapters are requested for book mode.
- Legacy complete book: approximately **9.1 MB**, principally the 9.07 MB WebP page set.

Live browser document/runtime baseline:

| Measurement | V2 scroll | V2 book open | Legacy open |
|---|---:|---:|---:|
| DOM nodes, including detached parsed documents | 209 | 2,647 | 142 |
| Attached elements | 125 | 200 | 40 |
| Event listeners | 56 | 71 | 86 |
| JS heap after GC | 1.37 MB | 1.62 MB | 2.06 MB |
| Loaded resources | 5 | 21 | 53 |

The legacy heap number excludes canvas backing storage and decoded image memory. Forty-six 1224×1584 pages would occupy about **340 MiB as raw RGBA** if all stayed decoded simultaneously; browsers may evict or re-decode some images, so actual residency varies.

## 1. Porting StPageFlip geometry/render loop

### Effective scope

Port the useful portions of
[FlipCalculation.ts](https://github.com/Nodlik/StPageFlip/blob/v2.0.7/src/Flip/FlipCalculation.ts),
[Flip.ts](https://github.com/Nodlik/StPageFlip/blob/v2.0.7/src/Flip/Flip.ts),
shadow geometry, and HTML clipping into V2's existing virtualized page-state
model. Keep V2 ownership of semantic pagination, canonical anchors, front
matter, history, and accessibility.

### Size estimate

- New production code: **3,000–5,000 lines** TypeScript/CSS.
- Net increase after replacing current curl code: approximately **1,500–3,000 lines**.
- New/rewritten tests: **2,000–3,000 lines**.
- Design/maintenance documentation: **300–600 lines**.
- Added deployed code: roughly **35–80 KB raw / 10–20 KB gzip**.
- Complete V2 book transfer: approximately **93–103 KB gzip-equivalent**.

### Browser document/runtime estimate

- Keep only current spread, destination underlay, and moving front/back faces mounted: **4–6 active faces**.
- Expected total DOM count: roughly **3,000–4,000 nodes**, close to current V2.
- Additional JS/DOM heap: about **1–3 MB**.
- No page texture or large GPU memory requirement.
- Expected turn-frame work: roughly **3–10 ms/frame**, depending on device and shadow/clip complexity.

### Effort breakdown

- Geometry extraction and licensing/attribution: 1–2 weeks.
- Virtualized semantic-face adapter: 2–3 weeks.
- Fold, crop, inner/outer shadow fidelity: 2–3 weeks.
- Pointer, automatic, cancel, history, resize, font behavior: 2–3 weeks.
- Accessibility and cross-browser hardening: 2–3 weeks.
- Real-book visual tuning/regression frames: 3–4 weeks.

### Assessment

**Best production option.** It gives legacy-style mathematics while retaining V2’s smaller document, virtualized DOM, and semantic ownership. The cost is maintaining a forked rendering subsystem. StPageFlip is MIT, but copied/derived code must retain its license notice.

## 2. Adopting StPageFlip for semantic faces

StPageFlip already supports `loadFromHTML()`. This is not a one-line swap, however: it expects all page elements, mutates inline page styles, creates temporary clones, and owns resize/page state.

### Size estimate

- V2 integration code: **1,000–2,000 lines**.
- Third-party source under dependency management: **3,312 lines**.
- New tests/adapters: **2,000–3,000 lines**.
- Documentation: **200–400 lines**.
- StPageFlip bundle: **10.2 KB gzip**.
- Integration/glue: approximately **3–8 KB gzip**.
- Complete V2 book transfer: approximately **96–101 KB gzip-equivalent**.

### Browser document/runtime estimate

StPageFlip HTML mode materializes the page elements supplied to it. For this publication that means 99 desktop or 221 phone pages, plus a temporary cloned turning page.

- Likely total DOM: **4,000–8,000 nodes**.
- Likely active layout objects: **1,500–4,000**, rather than V2’s current 291 measured layout objects.
- Additional JS/DOM heap: approximately **5–20 MB**.
- Resize/font repagination rebuild: approximately **100–800 ms**, depending on page count and device.
- Turn-frame work: roughly **4–14 ms/frame**; lower-end phones may exceed the 16.7 ms frame budget.

### Hidden implementation work

- Remove or rewrite duplicate IDs in StPageFlip temporary page clones.
- Mark every nonvisible page inert/hidden from assistive technology.
- Preserve links, selection, forms, exact anchor focus, and browser history.
- Rebuild all page elements after font-size or breakpoint changes.
- Reconcile StPageFlip’s page index with V2 canonical semantic locations.
- Protect V2 from StPageFlip’s direct `style.cssText` mutations.

### Assessment

**Fastest credible near-term option.** The serving increase is negligible, and visual fidelity should closely match legacy. The trade-off is a significantly larger live document and coupling to an older page lifecycle. I would require a performance/accessibility spike before committing to it.

## 3. Mesh/canvas/WebGL page surface

For semantic content, this must be a hybrid:

1. Keep accessible DOM pages when stationary.
2. Rasterize the visible semantic front/back pages into textures when a turn begins.
3. Deform those textures over a mesh or draw clipped canvas regions.
4. Swap back to native DOM after the turn.

A canvas or WebGL surface cannot preserve native text selection, links, or accessibility by itself.

### Size estimate

**Custom minimal Canvas/WebGL implementation:**

- Production code and shaders: **5,000–9,000 lines**.
- Tests/tooling: **3,000–5,000 lines**.
- Added deployment: approximately **35–80 KB gzip**.
- Complete book transfer: approximately **118–163 KB gzip-equivalent**.

**Three.js plus DOM-rasterization dependency:**

- V2 adapter code: **3,000–6,000 lines**.
- Added third-party transfer: roughly **180–260 KB gzip**, depending on imports/rasterizer.
- Complete book transfer: approximately **263–343 KB gzip-equivalent**.

If page textures are pre-rendered and served rather than generated in the browser, the payload returns toward the legacy **9 MB+** range and loses the principal V2 advantage.

### Runtime estimate

At the current approximate 556×720 CSS-pixel page size, four RGBA page textures require:

- **6.1 MiB** at DPR 1.
- **24.4 MiB** at DPR 2.
- **55 MiB** at DPR 3.

Framebuffers, double buffering, antialiasing, depth, and CPU-side canvases can put total graphics memory around **25–110 MB**.

- DOM-to-texture generation: about **15–100 ms per page**, depending on content/fonts/device.
- Mesh rendering after textures exist: usually **1–6 ms/frame** desktop, **4–12 ms/frame** mobile.
- Every font, viewport, media, or content change invalidates textures.
- Cross-origin fonts/images and complex semantic elements require additional rasterization handling.

### Assessment

**Highest theoretical fidelity, lowest architectural fit.** It is justified only if cinematic page deformation is itself a flagship product feature. It increases memory, QA, browser-specific rendering risk, and accessibility complexity substantially.

## Recommendation

### Near-term decision spike

Run a **2-week StPageFlip semantic-HTML spike** using the real 99-page desktop/221-page phone V2 publication. Do not integrate it immediately; test it against explicit gates:

- Added transfer ≤20 KB gzip.
- Desktop ≥55 FPS and representative mobile ≥45 FPS while dragging.
- Resize/font rebuild under 250 ms desktop and 500 ms mobile.
- No mirrored text across quarter/half/three-quarter frames.
- Binding edge deviates by no more than 2 px.
- Offscreen pages are inert and absent from the accessibility tree.
- No duplicate IDs from temporary clones.
- Canonical anchor/history tests continue passing.
- Preferably fewer than 5,000 total DOM nodes.

### Production direction

If the StPageFlip HTML spike meets those gates, **Option 2** is the quickest effective delivery. If it fails the DOM, accessibility, or rebuild budgets, use the spike to validate the math and proceed with **Option 1: port only the geometry and shadow model into V2’s virtualized renderer**.

I would not choose the mesh/WebGL option now. Its visual ceiling is higher, but it costs roughly twice the engineering effort and can consume one to two orders of magnitude more graphics memory without improving semantic reading, sharing, citations, TOC, annotations, or accessibility.

## Decision update - 2026-08-29

Option 1, the geometry/render-loop port, is the selected direction. The
semantic-HTML spike recommendation above is retained as the original estimate
context, but it is no longer the planned implementation path.

The selected scope, architecture boundary, delivery phases, and promotion gates
are defined in
[SEMANTIC-PAGE-TURN-GEOMETRY-PLAN.md](./SEMANTIC-PAGE-TURN-GEOMETRY-PLAN.md).
An isolated visual comparison is available at the published `/v3/` route; it
does not replace or modify the V2 `/book/` reader.
