# Ethical Tech CoLab Book Reader V2 - Architecture Review

| Field | Value |
|---|---|
| Status | Reviewed - recommended architecture accepted for specification |
| Review date | 2026-08-27 |
| Upstream project | [Ethical-Tech-CoLab/read-as-book](https://github.com/Ethical-Tech-CoLab/read-as-book) |
| Reviewed revision | [`d1d1ec6`](https://github.com/Ethical-Tech-CoLab/read-as-book/commit/d1d1ec6193867c13637636fc03e538c27d95261c) |
| Concept source | [CONCEPT-IDEA.md](./CONCEPT-IDEA.md) |
| Next documents | `SPECIFICATION.md` and `BACKLOG.md` after this review is approved |

## 1. Executive decision

The Book Reader V2 should use a **semantic-first hybrid architecture**.

Markdown-derived semantic HTML will be the canonical reading experience.
Fixed-layout PDF or image pages will remain available as an optional
**facsimile rendition** for publications where exact visual fidelity matters.
Both renditions will use the same headless reader state, location model,
bookmarks, annotations, preferences, and UI contracts.

The existing `read-as-book` package should not be expanded into the complete V2
reader. It should be treated as:

1. A useful prototype of the facsimile interaction.
2. A source of reusable API and CSS ideas.
3. A migration input whose current page-flip engine must be replaced or
   isolated before it is used with long publications.

The selected direction is:

```text
Markdown
  -> normalized content model
  -> deterministic semantic HTML and content manifest
  -> semantic reader (default)
  -> optional paged presentation
  -> optional PDF/image facsimile

                    shared reader core
         location | progress | annotations | preferences
```

This preserves the emotional and visual qualities of reading a book without
making page curl, canvas, or responsive page numbers the foundation of
scholarship.

## 2. Why this decision is necessary

The existing package and the V2 concept solve different primary problems.

The package displays a PDF as a visually convincing sequence of raster images.
The concept describes a scholarly reading system whose core capabilities
depend on meaningful text and stable document structure:

- Text selection and copying.
- Precise, durable citations.
- Deep links to sections, passages, and annotations.
- Search and assistive technology access.
- Highlights and margin notes.
- Annotation export.
- Responsive reading across phones, tablets, and desktops.
- Future collaboration and AI features grounded in source text.

A raster canvas can reproduce the appearance of a document, but it cannot
provide those semantics by itself. Adding more controls around the canvas does
not resolve this mismatch.

The architecture must therefore separate:

- **Document meaning**, represented by semantic content and stable identifiers.
- **Reading state**, represented independently of a rendering technology.
- **Visual rendition**, selected according to the reader's goal and the
  publication's available assets.

## 3. Review scope and evidence

### 3.1 Reviewed implementation surfaces

The review covered:

- Framework-neutral flipbook logic in
  [`src/flipbook.ts`](https://github.com/Ethical-Tech-CoLab/read-as-book/blob/d1d1ec6193867c13637636fc03e538c27d95261c/src/flipbook.ts).
- Full-screen viewer lifecycle in
  [`src/viewer.ts`](https://github.com/Ethical-Tech-CoLab/read-as-book/blob/d1d1ec6193867c13637636fc03e538c27d95261c/src/viewer.ts).
- React integration in
  [`src/react.tsx`](https://github.com/Ethical-Tech-CoLab/read-as-book/blob/d1d1ec6193867c13637636fc03e538c27d95261c/src/react.tsx).
- Manifest loading in
  [`src/index.ts`](https://github.com/Ethical-Tech-CoLab/read-as-book/blob/d1d1ec6193867c13637636fc03e538c27d95261c/src/index.ts).
- PDF conversion in
  [`bin/render-pages.mjs`](https://github.com/Ethical-Tech-CoLab/read-as-book/blob/d1d1ec6193867c13637636fc03e538c27d95261c/bin/render-pages.mjs).
- Default styles in
  [`styles.css`](https://github.com/Ethical-Tech-CoLab/read-as-book/blob/d1d1ec6193867c13637636fc03e538c27d95261c/styles.css).
- Packaging, compiler settings, README instructions, and the vanilla example.
- The StPageFlip 2.0.7 dependency and its image-loading behavior.
- The proposal in [CONCEPT-IDEA.md](./CONCEPT-IDEA.md).

### 3.2 Validation performed

The review used both static inspection and executable validation:

| Validation | Result |
|---|---|
| `npm install` | Passed; reported one high-severity audit finding |
| `npm run build` | Passed |
| `npm run typecheck` | Passed |
| `npm pack --dry-run` | Passed; 17.1 kB packed and 52.5 kB unpacked |
| CLI help | Passed |
| Real PDF to WebP conversion | Passed |
| Manifest and TypeScript module generation | Passed |
| Documented vanilla example | Failed with `PageFlip is not a constructor` |
| Browser test using StPageFlip's ESM build | Viewer opened and eventually turned pages |
| Focus behavior | Focus remained behind the modal |
| CLI prefix robustness | `--prefix "["` caused an invalid regular expression error |

The browser test also showed that the UI reports readiness before visible page
images are actually ready to navigate.

### 3.3 Repository maturity

At the review date, the upstream repository had:

- One initial extraction commit.
- Package version `0.1.0`.
- No tags or releases.
- No test suite.
- No GitHub Actions workflows.
- No tracked issues.
- No published npm package visible through the configured public registry.

This is an early prototype baseline, not a production release baseline.

## 4. Existing implementation assessment

### 4.1 Current architecture

```text
PDF
  -> Node CLI using PDF.js, canvas, and Sharp
  -> one raster image per page plus manifest

Browser
  -> manifest or page URL array
  -> dynamic import of StPageFlip
  -> all page images registered with a canvas page-flip instance
  -> optional full-screen viewer
  -> optional React trigger
```

### 4.2 Strengths worth retaining

| Strength | Why it matters | V2 disposition |
|---|---|---|
| Small framework-neutral core | Avoids coupling the reader to React | Retain as an architectural principle |
| Dynamic loading of visual effects | Keeps nonessential code off the initial path | Retain for optional renditions and features |
| Build-time PDF conversion | Supports static hosting and CDN caching | Retain for facsimile generation |
| CSS custom properties | Allows host-site theming | Retain and expand into design tokens |
| Explicit `destroy()` lifecycle | Necessary for embeddable UI | Retain, strengthen with cancellation |
| React as an adapter | Keeps framework concerns outside the core | Retain |
| Simple manifest handoff | Creates a clean build/runtime boundary | Retain, redesign the manifest schema |
| Static-host compatibility | Fits Ethical Tech CoLab publication delivery | Retain as a primary deployment constraint |

### 4.3 Capability score against the V2 goals

Scores describe the current implementation, not the proposed architecture.

| Capability | Score | Assessment |
|---|---:|---|
| Short fixed-layout visual fidelity | 5/5 | The primary strength |
| Static hosting | 5/5 | Images and ESM work without a server application |
| Small public API | 4/5 | Easy to understand, but lifecycle semantics are incomplete |
| Long-document performance | 1/5 | Every image is registered and loaded |
| Semantic accessibility | 1/5 | Dialog labels exist, document content does not |
| Stable citation | 1/5 | Only raster page indices are available |
| Text selection and search | 0/5 | No text layer |
| Annotation durability | 0/5 | No semantic anchors or annotation model |
| Mobile reading ergonomics | 2/5 | Portrait mode exists; gesture and scroll arbitration are weak |
| Framework integration | 3/5 | React wrapper exists but has async lifecycle risks |
| Operational maturity | 1/5 | No automated tests, CI, releases, or compatibility matrix |

## 5. Detailed findings

### F-01 - High: the documented vanilla integration is broken

The example import map points `page-flip` to
`page-flip.browser.js`, which is a UMD bundle. The library dynamically imports
`page-flip` and expects a named ESM `PageFlip` export.

Evidence:

- Import map:
  [`example/index.html#L11-L14`](https://github.com/Ethical-Tech-CoLab/read-as-book/blob/d1d1ec6193867c13637636fc03e538c27d95261c/example/index.html#L11-L14).
- Named export expectation:
  [`src/flipbook.ts#L131-L132`](https://github.com/Ethical-Tech-CoLab/read-as-book/blob/d1d1ec6193867c13637636fc03e538c27d95261c/src/flipbook.ts#L131-L132).

Observed failure:

```text
TypeError: PageFlip is not a constructor
```

The viewer opened when the request was substituted with StPageFlip's ESM
bundle, confirming the mismatch.

**Disposition:** fix in any maintenance release of the current package. Do not
use successful compilation as evidence that browser delivery works; a real
browser smoke test is required.

### F-02 - High: all-page image loading prevents scale

The current wrapper calls `loadFromImages()` with the complete page URL array.
StPageFlip creates an `HTMLImageElement` and assigns its `src` for every entry.

Evidence:

- Complete array passed to StPageFlip:
  [`src/flipbook.ts#L165`](https://github.com/Ethical-Tech-CoLab/read-as-book/blob/d1d1ec6193867c13637636fc03e538c27d95261c/src/flipbook.ts#L165).
- StPageFlip image collection:
  [`ImagePageCollection.ts`](https://github.com/Nodlik/StPageFlip/blob/ab30ecc1d9f6d98de1a99b8e296469382f41c120/src/Collection/ImagePageCollection.ts).
- StPageFlip image source assignment:
  [`ImagePage.ts`](https://github.com/Nodlik/StPageFlip/blob/ab30ecc1d9f6d98de1a99b8e296469382f41c120/src/Page/ImagePage.ts).

The validation PDF produced a 1190 x 1684 page. An uncompressed RGBA copy of
that page is approximately:

```text
1190 * 1684 * 4 bytes = 8,015,840 bytes, about 7.6 MiB
```

Approximate decoded memory before browser-specific overhead:

| Pages | Decoded pixel memory |
|---:|---:|
| 10 | 76 MiB |
| 50 | 382 MiB |
| 100 | 764 MiB |
| 200 | 1.49 GiB |

The encoded WebP transfer size may be small, but canvas and image decoding work
on pixel data. Transfer size is not an adequate memory model.

Resize also destroys and recreates the page-flip instance, causing renewed
allocation and decode pressure.

**Disposition:** the V2 facsimile renderer must own a bounded page window. The
current StPageFlip collection should not be used for long documents.

### F-03 - High: raster canvas is incompatible with canonical scholarship

The current renderer has no document tree, text nodes, headings, source
locations, or stable range representation. As a result, it cannot directly
support:

- Screen-reader navigation through the publication.
- Browser text selection.
- Passage-level citations.
- Reliable highlight restoration.
- Search.
- Semantic copying.
- Reflow at high zoom.
- User styles for reading accessibility.

An invisible text layer could improve a PDF rendition, but it would still not
make responsive page numbers stable and would add text-to-image alignment
complexity.

**Disposition:** semantic HTML is the canonical rendition. Canvas/image
facsimiles are optional and must link back to semantic locations where a source
mapping exists.

### F-04 - High: modal and motion accessibility are incomplete

The viewer correctly declares a modal dialog, labels controls, and supports
Escape. It does not implement the rest of the modal interaction contract:

- Initial focus is not moved into the dialog.
- Focus is not contained.
- Background content is not made inert.
- Focus restoration is incidental rather than explicit.
- Page changes are not announced through a live status region.
- Image content has no equivalent semantic reading route in the viewer.
- `prefers-reduced-motion` removes control transitions but does not disable the
  700 ms page curl.

Evidence:

- Dialog attributes:
  [`src/viewer.ts#L58-L61`](https://github.com/Ethical-Tech-CoLab/read-as-book/blob/d1d1ec6193867c13637636fc03e538c27d95261c/src/viewer.ts#L58-L61).
- Current reduced-motion CSS:
  [`styles.css`](https://github.com/Ethical-Tech-CoLab/read-as-book/blob/d1d1ec6193867c13637636fc03e538c27d95261c/styles.css).
- Expected modal interaction:
  [WAI-ARIA Modal Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
- Motion requirement:
  [WCAG 2.2 - Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html).

**Disposition:** accessibility behavior belongs in the core acceptance gates,
not a later styling pass. Reduced motion must replace the curl with an instant
change or short fade.

### F-05 - High: the PDF toolchain has a known security issue

The locked `pdfjs-dist` 6.1.200 version was reported by `npm audit` under
[GHSA-hq66-cqwq-w95j](https://github.com/advisories/GHSA-hq66-cqwq-w95j):
arbitrary JavaScript execution when opening a malicious PDF. The issue affects
the build-time conversion CLI rather than the browser viewer. PDF.js 6.2.108
contains the fix.

There is also a runtime policy mismatch:

- The package declares Node 18 or newer.
- The installed PDF.js 6.x package declares Node 22.13 or newer, or Node 24.

**Disposition:**

- Upgrade and pin the conversion dependencies.
- Give the CLI its own supported Node range.
- Treat contributor-supplied PDFs as untrusted.
- Run conversion with CPU, memory, file-size, and time limits.
- Prevent network access from the conversion environment unless explicitly
  required.
- Publish generated artifacts only after the conversion completes successfully.

### F-06 - Medium-high: asynchronous React lifecycle can overlap

The React effect starts `openBookViewer()` and receives the close handle only
after the promise resolves. Effect cleanup cannot directly cancel the
in-progress open. React Strict Mode and rapidly changing props can therefore
overlap viewer creation.

Evidence:

- Asynchronous effect and delayed handle:
  [`src/react.tsx#L68-L103`](https://github.com/Ethical-Tech-CoLab/read-as-book/blob/d1d1ec6193867c13637636fc03e538c27d95261c/src/react.tsx#L68-L103).
- Global body overflow restoration:
  [`src/viewer.ts#L111-L122`](https://github.com/Ethical-Tech-CoLab/read-as-book/blob/d1d1ec6193867c13637636fc03e538c27d95261c/src/viewer.ts#L111-L122).

Related risks:

- A newly allocated `pages` array rebuilds an open viewer and loses position.
- A deliberately excluded effect dependency can leave callbacks stale.
- Two overlays can restore global body state in the wrong order.
- Global arrow handlers can respond while a user is typing in another control.

**Disposition:** core mount operations need immediate cancellation ownership.
Adapters should consume a synchronous session handle whose asynchronous
preparation can be aborted.

### F-07 - Medium: readiness does not represent usable readiness

`onReady` is called immediately after StPageFlip receives image URLs. It does
not wait for the visible page images to decode.

Evidence:

- Load and ready sequence:
  [`src/flipbook.ts#L165-L178`](https://github.com/Ethical-Tech-CoLab/read-as-book/blob/d1d1ec6193867c13637636fc03e538c27d95261c/src/flipbook.ts#L165-L178).

In browser validation, the loading label disappeared before the first page turn
could complete.

**Disposition:** V2 requires an explicit state model:

```text
idle
  -> loading-manifest
  -> loading-location
  -> ready
  -> navigating
  -> ready

Any active state
  -> error
  -> disposed
```

Controls should reflect state and invalid transitions should produce observable
errors rather than silent no-ops.

### F-08 - Medium: CLI publication is not atomic

The CLI deletes existing pages and `manifest.json` before the new conversion is
known to succeed.

Evidence:

- Destructive cleanup before render:
  [`bin/render-pages.mjs#L147-L150`](https://github.com/Ethical-Tech-CoLab/read-as-book/blob/d1d1ec6193867c13637636fc03e538c27d95261c/bin/render-pages.mjs#L147-L150).

An invalid or damaged page halfway through conversion can leave a partially
updated publication with no last-known-good manifest.

**Disposition:** generate into a staging directory, validate every output, then
move the completed edition into place atomically where the platform permits.
Content-addressed edition directories are preferable to in-place replacement.

### F-09 - Medium: the manifest is too weak for V2

The current manifest stores:

- Source filename.
- Page count.
- Aspect ratio from page one.
- Flat page URL list.

It discards dimensions already calculated by the CLI and cannot describe:

- Mixed page sizes.
- Responsive variants.
- Byte size or integrity.
- Semantic content.
- Editions.
- Table of contents.
- Source mapping.
- Accessibility metadata.
- Rendition availability.

`loadBookManifest()` also reduces every page path to its final filename before
resolving it, which can discard meaningful nested paths.

Evidence:

- Current manifest type and URL resolution:
  [`src/index.ts#L17-L45`](https://github.com/Ethical-Tech-CoLab/read-as-book/blob/d1d1ec6193867c13637636fc03e538c27d95261c/src/index.ts#L17-L45).

**Disposition:** replace the manifest with a versioned publication manifest,
while providing a compatibility loader for the 0.1 format if migration demand
justifies it.

### F-10 - Medium: CLI input validation is incomplete

The page filename prefix is interpolated into a regular expression without
escaping. `--prefix "["` produced:

```text
SyntaxError: Invalid regular expression
```

The generated export name is also inserted into source without verifying that
it is a valid JavaScript identifier.

**Disposition:** validate names at argument parsing time and produce concise,
actionable CLI errors. Do not allow naming options to become executable source
fragments.

### F-11 - Medium: viewport sizing is not truly embeddable

The API accepts a container, but sizing is calculated from `window.innerWidth`
and `window.innerHeight`, and resize behavior is attached to the global window.

Evidence:

- Global viewport sizing:
  [`src/flipbook.ts#L144-L148`](https://github.com/Ethical-Tech-CoLab/read-as-book/blob/d1d1ec6193867c13637636fc03e538c27d95261c/src/flipbook.ts#L144-L148).
- Global resize listener:
  [`src/flipbook.ts#L207-L209`](https://github.com/Ethical-Tech-CoLab/read-as-book/blob/d1d1ec6193867c13637636fc03e538c27d95261c/src/flipbook.ts#L207-L209).

**Disposition:** renderers should size from their host element through
`ResizeObserver`. Full-screen mode is one host configuration, not a global
assumption.

### F-12 - Medium: quality cannot be protected without automation

TypeScript compilation passes, but the defects found are behavioral:

- Module delivery mismatch.
- Image readiness.
- Modal focus.
- Long-document loading.
- Invalid CLI input.

None would be prevented by the current build.

**Disposition:** a supported release requires unit, browser, accessibility,
visual, packaging, and CLI integration tests in CI.

## 6. Review of the concept proposal

### 6.1 Concepts accepted as written

- Markdown remains the authoring source of truth.
- Semantic HTML is the canonical browser representation.
- CSS provides typography, spacing, paper character, themes, and most
  responsive presentation.
- JavaScript is reserved for stateful enhancement and interactions that cannot
  be represented declaratively.
- Bookmarks, highlights, notes, deep links, and export are first-class reading
  capabilities.
- The default experience must work on static hosting.

### 6.2 Concepts accepted with architectural changes

#### Logical pages

Responsive screen pages are not stable scholarly identifiers. Their boundaries
change with:

- Viewport dimensions.
- Font family and font loading.
- Browser text metrics.
- Zoom.
- User font size and line-height.
- Language and bidirectional content.
- Content corrections.

V2 should use two distinct location types:

1. **Semantic location** - edition, document anchor, and optional text selector.
   This is canonical for sharing, citation, and annotation.
2. **Facsimile location** - edition and fixed page index or printed page label.
   This is canonical only within a fixed-layout edition.

Responsive UI may display a progress number or temporary screen number, but it
must not present that value as a durable citation.

#### Page-turn animation

Page turn is a presentation transition, not the content engine. It should run
over a small number of already-prepared layers and use compositor-friendly
`transform` and `opacity`.

The initial implementation should not attempt a physically exact paper
simulation. The priority order is:

1. Correct content and navigation.
2. Accessibility and reduced motion.
3. Reliable mobile gestures.
4. Consistent frame pacing.
5. Decorative realism.

#### Corner grab

Corner grab should be an optional pointer affordance. It cannot be the only way
to navigate because:

- Touch devices have no hover.
- Dragging can conflict with browser scrolling.
- Motor and vision needs require explicit controls.
- Reduced-motion users may disable the effect.

Use Pointer Events, pointer capture, intentional distance and velocity
thresholds, and `touch-action: pan-y` where vertical scrolling must remain
native.

#### Local persistence

Use storage by data type:

| Data | Default storage |
|---|---|
| Theme, font, motion preference | `localStorage` |
| Last semantic location | `localStorage` |
| Local bookmarks and annotations | IndexedDB |
| Collaborative annotations | Authenticated remote service plus local cache |

Stored records must include `bookId`, `editionId`, and a schema version so
content updates do not silently attach annotations to the wrong text.

#### Deep-linked quotes

A random highlight ID alone is not enough to restore a passage after content is
rebuilt. Use a durable target containing:

- Edition identifier.
- Stable semantic block anchor.
- `TextQuoteSelector` with exact text and prefix/suffix context.
- `TextPositionSelector` where available.

This follows the
[Web Annotation Data Model](https://www.w3.org/TR/annotation-model/) and allows
re-anchoring when offsets move but the quoted text remains.

### 6.3 Concepts deferred from the core architecture

The following are valuable, but they introduce separate product and trust
boundaries:

- Collaborative annotations.
- Reader analytics.
- AI chapter assistants and highlight summaries.
- Community reading circles.

They should consume stable reader APIs later. They should not determine the
core renderer design.

Before implementation, each requires decisions about:

- Consent.
- Data minimization and retention.
- Authentication and identity.
- Moderation.
- Attribution and provenance.
- Export and deletion.
- Accessibility.
- Model/provider disclosure for AI features.

## 7. Recommended target architecture

### 7.1 Architectural principles

1. **Semantic source over visual output.** Meaning is preserved independently
   of a rendition.
2. **Stable identity over responsive page number.** Citations survive layout
   changes.
3. **Progressive enhancement.** A chapter remains readable when enhancement
   JavaScript fails.
4. **Headless state over framework ownership.** React and other integrations
   adapt the same reader session.
5. **Bounded resources.** Page windows, caches, workers, and object URLs have
   explicit limits and disposal.
6. **Optional fidelity.** Facsimile mode is available without penalizing the
   default semantic path.
7. **Accessibility by contract.** Keyboard, focus, semantic structure, zoom,
   contrast, and reduced motion are release gates.
8. **Versioned publication artifacts.** Content, manifests, annotations, and
   caches are edition-aware.
9. **Observable failure.** Loading, conversion, and navigation errors have
   typed states and visible recovery paths.
10. **Static-first delivery.** Server features enhance collaboration but are not
    required for basic reading.

### 7.2 Logical layers

```text
+---------------------------------------------------------------+
| Host application                                              |
| Routes, site navigation, identity, analytics consent          |
+---------------------------------------------------------------+
| UI adapters                                                   |
| Web/imperative API | React | optional custom element           |
+---------------------------------------------------------------+
| Reader UI                                                     |
| Toolbar | TOC | search | notes | rendition switcher            |
+---------------------------------------------------------------+
| Headless reader core                                          |
| Session | location | history | progress | commands | events    |
+---------------------------------------------------------------+
| Feature services                                              |
| Annotations | bookmarks | persistence | sharing | export       |
+---------------------------------------------------------------+
| Renderer contract                                             |
| Semantic scroll | semantic paged | facsimile                  |
+---------------------------------------------------------------+
| Publication model                                             |
| Manifest | semantic blocks | source map | rendition metadata   |
+---------------------------------------------------------------+
| Build pipeline                                                |
| Markdown/AST | HTML | PDF | image variants | validation        |
+---------------------------------------------------------------+
```

Dependencies point downward. Renderers must not own canonical bookmarks,
annotations, or URL state.

### 7.3 Content pipeline

Recommended stages:

```text
Markdown and publication metadata
  -> parse to a normalized AST
  -> validate structure and required metadata
  -> assign deterministic section and block IDs
  -> produce chapter-level semantic HTML
  -> produce a publication manifest
  -> optionally produce print PDF
  -> optionally produce responsive facsimile images
  -> validate links, IDs, source maps, sizes, and integrity
  -> publish under a versioned edition path
```

Deterministic IDs should derive from explicit author IDs where provided.
Generated fallbacks must remain stable when unrelated preceding content
changes. A hash of the complete ordinal position alone is too fragile.

The build should fail on:

- Duplicate IDs.
- Broken internal links.
- Missing required metadata.
- Invalid heading hierarchy where policy requires it.
- Unsupported or unsafe embedded HTML.
- Missing alternative text where required.
- Manifest and artifact mismatches.
- Facsimile page count or source-map inconsistencies.

### 7.4 Publication manifest responsibilities

The later specification should define a versioned schema. At architecture
level, the manifest needs to represent:

```text
schemaVersion
bookId
editionId
contentHash
title
authors
language
direction
publicationDate
tableOfContents[]
semanticRendition
facsimileRendition?
sourceMap?
capabilities
```

Semantic rendition entries need chapter URLs, stable anchors, and optional
source provenance. Facsimile page entries need:

- Page index.
- Printed page label where known.
- Intrinsic width and height.
- Byte size.
- MIME type.
- Responsive format/width variants.
- Integrity or content hash.
- Optional semantic anchor range.

URLs should be resolved according to standard URL semantics. A loader must not
discard path segments.

### 7.5 Headless reader core

The core owns a `ReaderSession` independent of the DOM renderer.

Responsibilities:

- Current publication and edition.
- Current semantic or facsimile location.
- Back/forward location history.
- Reading progress.
- Active rendition and reading preferences.
- Commands such as next, previous, go to location, and switch rendition.
- Typed lifecycle state and errors.
- Subscription to state changes.
- Serialization to and restoration from a URL.
- Cancellation and disposal.

The core does not:

- Draw pages.
- Control global body overflow.
- Assume a full-screen viewport.
- Persist user data directly.
- Require React.
- Run analytics without host consent and configuration.

Renderer changes should preserve location through a source map. Where mapping
is ambiguous, the switcher should present the nearest mapped location and make
that approximation clear.

### 7.6 Renderer contract

Each renderer should support a common lifecycle:

```text
mount(host, session, options) -> renderer handle
prepare(location, signal) -> ready result
present(location, transition)
measure() -> renderer metrics
focusContent()
destroy()
```

The exact API belongs in the specification, but these properties are required:

- Mount returns cancellation ownership immediately.
- Preparation accepts an `AbortSignal`.
- A renderer reports when visible content is decoded and painted, not merely
  requested.
- A renderer does not mutate canonical reader state without a command/event.
- Teardown releases observers, workers, canvases, image bitmaps, object URLs,
  listeners, and pending work.
- Renderer errors are typed and surfaced to the session.

### 7.7 Semantic scroll renderer - default

This is the baseline reading experience.

Characteristics:

- Native semantic HTML.
- Native selection, find, copy, and assistive technology support.
- Chapter-level lazy loading for very long books.
- Stable element anchors.
- Scroll restoration based on semantic location plus local offset.
- CSS book theme without hiding document semantics.
- Optional sticky reading controls that do not cover content.
- Responsive single-column layout by default.

This renderer should remain useful with JavaScript disabled after the host has
delivered the chapter HTML.

### 7.8 Semantic paged renderer - optional enhancement

This renderer provides an open-book or slide-like reading mode without
redefining citations as responsive screen pages.

Recommended initial approach:

- Use explicit content segments at stable semantic boundaries.
- Fill a bounded current/adjacent view window.
- Transition prepared layers with transforms and opacity.
- Show progress and chapter context rather than claiming a stable print page.
- Fall back to semantic scroll mode for content that cannot be represented
  safely, such as certain large tables or interactive embeds.

CSS multi-column pagination may be evaluated in a prototype, but it should not
be assumed reliable until tested across supported browsers, zoom levels, fonts,
tables, footnotes, and bidirectional content.

### 7.9 Facsimile renderer - optional compatibility mode

The facsimile renderer preserves a publication's fixed visual edition.

Required differences from the existing implementation:

- Load only the current spread, adjacent spread or spreads, and one
  directional prefetch candidate.
- Bound decoded memory with an LRU pixel or byte budget.
- Abort stale fetch and decode work on navigation or rendition change.
- Use responsive AVIF/WebP assets where support and content justify them.
- Retain a fallback format.
- Reserve intrinsic aspect ratio before load to avoid layout shift.
- Use the host element size through `ResizeObserver`.
- Keep navigation usable before decorative curl code loads.
- Offer a direct accessible route to the semantic rendition.

A reasonable starting window is 3 to 5 pages or spreads, followed by
measurement on representative low-memory mobile devices.

### 7.10 PDF.js runtime adapter - optional, not default

Runtime PDF.js is appropriate when the product must accept arbitrary PDFs or
provide PDF-native search and selectable text without a build step.

If added:

- Load it only for the PDF rendition.
- Use a same-version PDF.js worker.
- Preserve HTTP range requests.
- Cancel stale `RenderTask` instances.
- Clean up pages and documents after active rendering ends.
- Feature-detect Wasm and OffscreenCanvas capabilities.
- Cap render DPR.
- Keep worker and asset versioning explicit.

PDF.js should not be loaded by semantic-first publications that already have
generated assets.

### 7.11 Animation and input

Animation should:

- Change only compositor-friendly properties during the active frame loop.
- Precompute geometry before a gesture or transition.
- Avoid layout reads after writes in the frame loop.
- Avoid permanent `will-change`.
- Avoid live blur and complex shadow recalculation during a turn.
- Use lower-resolution layers during a drag if measurement proves necessary.
- Replace curl with instant navigation or a short fade under reduced motion.

Input should:

- Use Pointer Events for mouse, touch, and pen.
- Capture only the active pointer.
- Apply distance and velocity thresholds before committing.
- Allow cancellation before `pointerup`.
- Preserve vertical browser scrolling where intended.
- Provide visible previous and next buttons.
- Support keyboard commands only while the reader owns focus.

### 7.12 Persistence and annotation model

Bookmarks and annotations should target semantic locations first.

Suggested local annotation shape at architecture level:

```text
annotationId
bookId
editionId
createdAt
updatedAt
motivation
target:
  anchor
  textQuoteSelector?
  textPositionSelector?
body
style?
```

Facsimile-only annotations may target a fixed page and normalized geometry, but
they should map to semantic text where a source map exists.

Export should include enough provenance to interpret a note outside the
application:

- Book and edition.
- Chapter or printed page.
- Canonical URL.
- Selected quote.
- Note body.
- Creation/update timestamps.

### 7.13 URL and citation model

Recommended URL roles:

```text
/book/{bookId}/{editionId}/{chapterSlug}#{stableAnchor}
/book/{bookId}/{editionId}/{chapterSlug}?select={encodedSelector}#{stableAnchor}
/book/{bookId}/{editionId}/facsimile?page={fixedPage}
```

The final encoding must balance length, privacy, and portability. Private note
content should not be placed in URLs.

The visible citation can include a printed page label when a fixed edition
defines one, while the link still carries the semantic anchor.

### 7.14 Packaging boundaries

The exact package names remain a specification decision. The architecture
should preserve these boundaries:

| Boundary | Purpose |
|---|---|
| Publication model | Manifest types, locations, selectors, validation |
| Reader core | Session, commands, state, events, URL serialization |
| Semantic renderer | Scroll and optional paged semantic presentation |
| Facsimile renderer | Bounded fixed-page presentation |
| Annotation service | Local records, re-anchoring, import/export |
| React adapter | Hooks and components over the core |
| Build CLI | Markdown, HTML, PDF, image, and manifest generation |
| Theme CSS | Design tokens and default accessible presentation |

Consumers should not need React, PDF.js, or facsimile code to use the semantic
core.

## 8. Performance and resource model

### 8.1 Performance priorities

1. Semantic content is readable as early as possible.
2. Opening an enhanced rendition does not fetch the whole book.
3. Navigation remains responsive while prefetch work is active.
4. Resize does not rebuild or decode unrelated content.
5. Memory usage stays bounded over long sessions.

### 8.2 Recommended measurements

Track separately by rendition and device class:

- Route navigation to readable chapter.
- Viewer open to first visible spread.
- Navigation command to next content painted.
- Input delay during page gesture.
- Long task count and duration.
- Encoded bytes fetched.
- Estimated decoded pixel bytes.
- Cache hit rate.
- Aborted render count.
- Render and decode failures.
- Memory-budget evictions.

Web experience should at minimum support the general field targets:

- LCP at or below 2.5 seconds at p75.
- INP at or below 200 milliseconds at p75.
- No avoidable content layout shift from page assets.

Viewer-specific budgets should be established from representative Ethical Tech
CoLab books during specification, not selected from a synthetic demo alone.

### 8.3 Cache strategy

- Fingerprint edition assets.
- Cache the application shell and publication manifest.
- Preload only the cover or current location when intent is strong.
- Runtime-cache nearby facsimile pages with explicit entry and byte limits.
- Do not precache an entire book by default.
- Version cache names by schema and edition.
- Prompt for service-worker updates rather than forcing a mixed-version session.
- Delete old edition caches according to a documented retention policy.

## 9. Accessibility, privacy, and security gates

### 9.1 Accessibility gates

A supported release must verify:

- Logical headings and landmarks.
- Native text selection and reflow.
- Keyboard-only reading and annotation.
- Visible focus.
- Correct modal focus entry, containment, Escape, and restoration.
- Live announcement of relevant location changes without excessive verbosity.
- Reduced-motion behavior that removes page curl.
- High zoom and user font settings.
- Contrast in every built-in theme.
- Touch targets meeting WCAG 2.2 minimum size.
- Screen-reader access to an equivalent rendition for every facsimile book.
- Language and text direction metadata.

### 9.2 Privacy gates

- Local reading does not require identity.
- Analytics are disabled unless configured by the host under its consent model.
- Selection and annotation content are not sent to a service implicitly.
- Share-card generation makes data transmission visible.
- Collaborative features document retention, visibility, export, and deletion.
- AI features require an explicit action and identify what content is sent.

### 9.3 Security gates

- Sanitize or strictly compile embedded Markdown HTML.
- Validate publication manifests before use.
- Apply a content security policy compatible with static assets and workers.
- Treat PDFs and uploaded publication archives as untrusted.
- Run converters with limited resources and no inherited credentials.
- Pin converter dependencies and automate vulnerability scanning.
- Avoid evaluating generated JavaScript where JSON or static module data is
  sufficient.
- Validate remote URLs and cross-origin policy for optional runtime PDFs.

## 10. Alternatives considered

| Alternative | Decision | Reason |
|---|---|---|
| Extend the existing canvas flipbook into V2 | Reject | Cannot provide canonical semantic reading or bounded long-book loading |
| Semantic scroll-first plus optional transitions | Accept | Best default for accessibility, selection, links, and mobile |
| Hybrid semantic reader plus facsimile | Accept | Preserves exact editions without compromising canonical semantics |
| Custom bounded page compositor | Prototype for facsimile/paged mode | More ownership, but provides required resource control |
| Keep StPageFlip behind an adapter | Temporary only | Useful for migration or short books; all-page collection remains a blocker |
| Runtime PDF.js for every book | Reject as default | Adds client cost and lifecycle complexity when generated semantic content exists |
| Runtime PDF.js as an optional adapter | Accept conditionally | Useful for arbitrary PDFs, text layers, and PDF-native features |
| CSS multi-column as the core pagination engine | Prototype only | Cross-browser fragmentation and unstable page boundaries require evidence |
| Paged.js or Vivliostyle for default interactive reading | Reject as default | Better suited to print/export and complex paged layout than lightweight mobile reading |
| Paged.js or Vivliostyle for print generation | Review further | May solve footnotes and print pagination without burdening the default reader |
| WebGPU page curl as a core dependency | Reject | Adds rendering and device complexity without solving semantic or loading problems |
| Optional custom element adapter | Review later | Framework-neutral distribution is useful, but Shadow DOM can complicate theming and overlays |

## 11. Migration from `read-as-book`

### 11.1 Reuse

- Public imperative mount/destroy pattern.
- Optional React adapter concept.
- CSS custom-property theming.
- Dynamic loading of optional rendition code.
- Build-time generation of fixed-layout assets.
- Static-host deployment model.
- Viewer controls and broad interaction vocabulary.

### 11.2 Replace

- StPageFlip as the unbounded page owner for long documents.
- Flat URL array as the publication model.
- Window-global sizing.
- Document-global keyboard ownership.
- Promise-only mount lifecycle without immediate cancellation.
- Page index as the only location.
- Body-overflow mutation without shared overlay management.
- Readiness that precedes visible asset decode.
- In-place destructive publication generation.

### 11.3 Compatibility strategy

If existing consumers must be supported:

1. Fix the browser module mapping and security dependency immediately.
2. Define a limited support envelope for the 0.1 viewer, such as short
   facsimile documents only.
3. Add a legacy manifest adapter.
4. Expose a deprecation path toward the new facsimile renderer.
5. Avoid adding V2 scholarly features to the old canvas model.

This prevents maintenance fixes from becoming accidental architecture.

## 12. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Semantic and facsimile locations drift | Medium | High | Versioned source map, validation, explicit nearest-location behavior |
| Annotation anchors break after edits | Medium | High | Edition IDs plus quote, position, and block selectors |
| Paged semantic layout is inconsistent | High | Medium | Keep scroll mode canonical; prototype against a hard corpus |
| Custom compositor grows too complex | Medium | Medium | Limit visual realism; use a small renderer contract and performance budget |
| Build pipeline becomes slow | Medium | Medium | Incremental content hashing, bounded conversion concurrency, cached artifacts |
| Image variants increase storage | High | Low-medium | Generate measured variants only; retention by edition |
| Feature scope overwhelms core quality | High | High | Defer collaboration, analytics, and AI behind stable APIs |
| Static hosting conflicts with collaboration | Certain | Medium | Keep local-first core; add remote services as optional adapters |
| Accessibility regresses in decorative modes | Medium | High | Automated and manual gates per renderer; semantic escape route |
| Old consumers depend on current API quirks | Unknown | Medium | Usage discovery, compatibility adapter, documented deprecation |

## 13. Required prototypes before committing the specification

The architecture is accepted, but these implementation choices should be
validated with narrow prototypes:

### Prototype A - deterministic semantic pipeline

Prove:

- Markdown to semantic chapter HTML.
- Stable explicit and generated IDs.
- Manifest and table of contents.
- Deep link restoration after an unrelated content edit.
- Source location mapping adequate for author diagnostics.

### Prototype B - annotation anchoring

Prove:

- Create a highlight from a native text selection.
- Persist it using block, quote, and position selectors.
- Restore it after nearby text moves.
- Report an unresolved annotation honestly when the quote is removed.
- Export it to readable Markdown with provenance.

### Prototype C - bounded facsimile renderer

Prove with a representative long book:

- Only the configured window is fetched and decoded.
- Rapid navigation aborts stale work.
- Memory returns toward the budget after eviction.
- Resize does not reload the full document.
- Keyboard, touch, reduced motion, and focus behavior work.
- Semantic/facsimile switching retains an equivalent location.

### Prototype D - semantic paged presentation

Evaluate:

- Chapters, headings, figures, code, tables, footnotes, and long links.
- Supported desktop and mobile browsers.
- Zoom and user font overrides.
- Left-to-right and right-to-left text if required by publication scope.
- Whether CSS columns are sufficient or explicit segment composition is safer.

The prototype may conclude that scroll mode plus visual chapter transitions is
preferable to arbitrary responsive pagination. That remains compatible with
the accepted architecture.

## 14. Quality gates for the eventual implementation

### Code and package

- Strict types and public declaration tests.
- Side-effect-free core ESM.
- Optional dependencies isolated by export path.
- Browser smoke tests against packed artifacts.
- Supported Node and browser matrix documented.
- Reproducible builds and locked converter dependencies.

### Functional

- URL restoration for semantic and facsimile locations.
- Rendition switch with location preservation.
- Resume, bookmarks, highlights, notes, and Markdown export.
- Explicit loading, ready, navigation, error, and disposal behavior.
- Recovery from failed page or chapter assets.

### Browser and accessibility

- Keyboard, focus, screen reader, zoom, reduced motion, and touch suites.
- Mobile viewport and orientation changes.
- Browser history behavior.
- No global key interception outside the active reader.
- Visual regression for core themes and major layout modes.

### Performance

- Long-book network request count remains bounded around the active location.
- Decoded-page memory remains within a defined budget.
- Navigation remains responsive during prefetch.
- No full-document rebuild on container resize.
- Bundle and asset-size budgets enforced in CI.

### CLI and content

- Atomic generation.
- Invalid input coverage.
- Duplicate ID and broken-link detection.
- Mixed page-size support.
- Manifest schema validation.
- Security scan and untrusted-input isolation.

## 15. Decisions to carry into `SPECIFICATION.md`

The specification should treat these as decided:

1. Markdown-derived semantic HTML is canonical.
2. Semantic scroll reading is the default renderer.
3. Facsimile is an optional rendition over shared reader state.
4. Stable semantic locations, not responsive screen pages, anchor scholarship.
5. Annotations use edition-aware selectors.
6. Framework adapters do not own reader logic.
7. Long-document rendering uses bounded windows and cancellable work.
8. Reduced motion removes curl.
9. Static reading works without an application backend.
10. Collaboration, analytics, and AI are optional later services.

The specification still needs to resolve:

- Supported browsers and devices.
- Initial publication corpus and maximum tested document sizes.
- Package/repository layout.
- Exact manifest schema.
- Exact location and URL encoding.
- Deterministic ID rules.
- Whether semantic paged mode ships initially or follows scroll mode.
- Facsimile format and variant matrix.
- Local annotation database schema and migration policy.
- Required compatibility with the 0.1 package.
- Deployment and content publishing workflow.
- Quantitative viewer-specific performance budgets.

## 16. Recommended implementation order

This is sequencing guidance for the later backlog, not the backlog itself.

1. Publication model, deterministic IDs, and semantic build pipeline.
2. Headless session and location model.
3. Semantic scroll renderer and accessible reader shell.
4. URL restoration, progress, preferences, and bookmarks.
5. Annotation selectors, local persistence, and export.
6. Bounded facsimile renderer and source mapping.
7. Optional semantic paged presentation after prototype evidence.
8. Sharing surfaces.
9. Remote collaboration, consented analytics, and AI integrations only after
   the core quality gates are met.

## 17. Review conclusion

The original concept is directionally strong. Its most important insight is
that the product should become a scholarly reading environment rather than a
more elaborate PDF viewer.

The necessary refinement is to make that distinction explicit in the
architecture:

- Markdown and semantic HTML define the publication.
- The headless reader core defines reading state.
- Renderers define how a location looks and moves.
- Facsimile pages preserve visual editions without becoming the only source of
  meaning.
- Page turn is an optional emotional affordance, not the data model.

This approach should be used as the basis for the subsequent
`SPECIFICATION.md` and `BACKLOG.md`.

