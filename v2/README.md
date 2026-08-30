# Ethical Tech CoLab Book Reader V2

This directory contains the new semantic-first reader. It is intentionally
separate from the pinned legacy fallback documented in
[legacy/README.md](../legacy/README.md).

The current implementation is the first vertical slice, not the complete R1
release described in [SPECIFICATION.md](../SPECIFICATION.md).

## What the slice proves

- A publication can be authored in Markdown and metadata.
- The CLI assigns deterministic semantic anchors.
- It emits directly readable chapter HTML, a source map, and a validated
  versioned manifest.
- Edition output is immutable: an identical rebuild is a no-op and conflicting
  content cannot overwrite the existing edition.
- A headless session returns synchronously, loads the manifest, coordinates
  cancellable navigation, and enters `ready` only after renderer presentation.
- The semantic renderer adopts existing HTML rather than replacing text with a
  canvas.
- The generated chapter is readable without JavaScript and enhanced when
  JavaScript is available.
- The old viewer remains untouched and independently recoverable.
- A metadata-driven bookshelf renders all production bindings without loading
  page images, then lazy-loads the selected publication for reading.
- Book mode renders validated inner-cover metadata, a title page, thesis,
  imprint/notes, and a linkable multi-page table of contents.
- Book text can be adjusted from 80% through 130%; presentation pages
  repaginate around the same canonical source location.
- The CSS page turn uses a two-phase clipped fold so readable semantic
  front/back faces stay attached to the gutter.
- The selected geometry-port path has a DOM-free, attributed fold kernel under
  test before it is allowed to replace the working CSS turn. See the
  [geometry port plan](../SEMANTIC-PAGE-TURN-GEOMETRY-PLAN.md).
- `/v3/` is an isolated visual prototype that applies the kernel to real
  semantic publication pages; it does not alter the V2 `/book/` route.

## Workspace

```text
packages/
  publication-model/      manifest, location, selector, and validation types
  reader-core/            headless state machine and renderer lifecycle
  reader-ui/              framework-neutral shell, bookshelf, and book mode
  renderer-semantic/      semantic HTML adoption and chapter loading
  theme/                  framework-neutral reader CSS
tools/
  publication-cli/        Markdown publication compiler
apps/
  fixtures/demo/          source publication fixture
  demo/                   static multi-page reference app
tests/browser/            progressive-enhancement browser checks
```

## Selected ecosystem

- npm workspaces.
- TypeScript 7 with strict and exact-optional checks.
- Unified, Remark, and Rehype for Markdown/HTML processing.
- YAML for publication metadata.
- Vitest for unit/integration tests.
- Vite for the static multi-page reference build.
- Playwright for real-browser validation.

PDF.js, a page-flip engine, React, and annotation storage are not dependencies
of this slice.

## Requirements

- Node.js 22.13 or newer.
- Node.js 24 LTS is preferred.

## Commands

Run from this directory:

```powershell
npm install
npm run typecheck
npm run test:unit
npm run build
npm run test:browser
```

Refresh the pinned multi-book semantic sources with explicit maintenance
commands:

```powershell
npm run sync:production-fixture
npm run sync:lab-publications
npm run sync:plurality
npm run build:fixture
```

Ordinary builds use the committed fixtures and do not fetch upstream content.

Preview the built demo:

```powershell
npm run preview:demo
```

Then open:

```text
http://127.0.0.1:4174/
```

The landing page links to:

- The pinned legacy fixed-page viewer.
- The V2 semantic reader.
- The V3 geometry reader for every shelf publication.
- A side-by-side iframe comparison.
- A responsive 22-volume library shelf with selectable bindings: 21 Ethical
  Tech CoLab publications plus the CC0 Plurality community book.
- A functionality and payload dashboard.

Published routes:

- <https://yorkerhodes3.github.io/pageturn-book/>
- <https://yorkerhodes3.github.io/pageturn-book/shelf/>
- <https://yorkerhodes3.github.io/pageturn-book/dashboard/>
- <https://yorkerhodes3.github.io/pageturn-book/v3/>
- <https://yorkerhodes3.github.io/pageturn-book/v3/?book=plurality>

The direct semantic chapter is:

```text
http://127.0.0.1:4174/book/what-is-ethical-ai/2026-07/chapters/executive-summary/
```

The comparison uses the actual Ethical Tech CoLab report. Refresh the pinned
generated source after an approved website revision change with:

```powershell
npm run sync:production-fixture
```

The small `demo-book` fixture remains available only for fast mechanics tests.

## Publication source

The demo source is under `apps/fixtures/demo/`.

`book.yml` defines publication identity and ordered chapters:

```yaml
bookId: demo-book
editionId: 2026-08
title: Demo Book
authors:
  - name: Ethical Tech CoLab
language: en
chapters:
  - id: introduction
    title: Introduction
    source: chapters/01-introduction.md
```

Cover and binding appearance is shared by the shelf and reader:

```yaml
appearance:
  cover:
    background: "#3d211d"
    foreground: "#f2dfb0"
    accent: "#b9914f"
    subtitle: Field notes for humane and accountable technology
  binding:
    material: leather
    color: "#301713"
    accent: "#b9914f"
    depth: thick
    hubs: 5
    shelfLabel: ETHICAL TECHNOLOGY
```

Optional semantic front matter supplies the physical opening leaves:

```yaml
frontMatter:
  kicker: Ethical Tech CoLab · Research paper
  credits: Research team and institutional attribution
  thesis: The publication's opening thesis text.
  disclaimer: Standing publication disclaimer.
  canonicalUrl: https://example.org/publication/
  notesStatus: Complete Works Cited; mapped endnotes require source note data.
```

`canonicalUrl` must be absolute HTTP(S). Publication language must be a valid
BCP-47 tag.

`@ethical-tech/book-reader-ui` exports
`publicationAppearanceVariables()` and `applyPublicationAppearance()`. Reader
and shelf components should use the resulting `--book-cover-*`,
`--book-binding-*`, and `data-book-binding-*` contracts instead of translating
publication metadata independently.

Heading IDs can be explicit:

```markdown
# Introduction {#introduction}
```

An addressable paragraph can use a trailing marker:

```markdown
This paragraph needs a durable author-assigned anchor.
{#durable-paragraph}
```

Other supported blocks receive deterministic generated IDs. Explicit IDs are
recommended for externally cited sections and passages.

## CLI

Validate a source:

```powershell
node tools\publication-cli\dist\cli.js validate apps\fixtures\demo
```

Build an immutable edition:

```powershell
node tools\publication-cli\dist\cli.js build apps\fixtures\demo `
  --out apps\demo\book `
  --theme /src/demo.css `
  --enhance-script /src/chapter.ts
```

The output path is:

```text
{outputRoot}/{bookId}/{editionId}/
```

If source content changes, assign a new `editionId`. The CLI will not overwrite
different content under an existing edition.

## Current boundaries

Implemented now:

- Publication identity, manifest, location, and selector model.
- Runtime manifest validation and path-preserving URL resolution.
- Markdown parsing, sanitization, deterministic anchors, source maps, semantic
  HTML, manifest generation, hashing, and atomic immutable publication.
- Headless session lifecycle, cancellation, state transitions, typed failures,
  semantic next/previous navigation, and renderer coordination.
- Semantic renderer adoption/loading and host-aware resize observation.
- Framework-neutral shell with table of contents, chapter progress,
  previous/next controls, canonical URLs, and browser Back restoration.
- Switchable semantic book mode with a dark full-screen stage, desktop
  two-page spreads, mobile single-page sheets, semantic text, screen-page
  navigation, reduced motion, and focus restoration.
- Publication-driven front cover and reusable binding metadata with leather,
  cloth, or paper material, thickness, colors, spine hubs, and shelf label.
- CSS 180-degree turning leaves with distinct outgoing/incoming faces, fold
  lighting, moving shadows, corner-turn affordance, and pointer swipes.
- Physical recto/verso sequencing: cover, blank inside front board, page 1 on
  the right, then paired verso/recto spreads.
- Destination pages rendered beneath the moving leaf, plus live pointer-driven
  peeling with commit, reverse, and cancellation behavior.
- Rounded gutter shoulders and page swell with shorter visible leaves and
  seven fanned fore-edge layers per side.
- Static theme and two-chapter demo.

Still intentionally pending:

- Preferences and resume storage.
- Bookmarks.
- Highlights, notes, re-anchoring, and export.
- Legacy viewer adapter.
- React adapter.
- Full browser and assistive-technology matrix.
- New bounded facsimile renderer and production hardening of semantic paged
  mode.

See [BACKLOG.md](../BACKLOG.md) for dependency-ordered delivery work.

## Physical book model

The visual model follows the hardcover anatomy described by Princeton Public
Library's [Book Anatomy](https://princetonlibrary.org/book-anatomy/): rigid
boards, a flexible joint/hinge, endpapers and flyleaf, a sewn text block,
raised spine bands, and distinct recto/verso leaf faces.

The browser model is still CSS and semantic HTML, not a physics engine. It uses
bounded visible DOM:

- One destination spread.
- One temporary turning leaf with separate front and back content.
- Seven inexpensive decorative fan edges per visible side.
- One binding structure shared by closed and open states.

Automatic turns and live drags lay down the destination spread first, then move
the outgoing leaf over it. This keeps the page behind visible throughout the
peel and avoids the mirrored-screenshot approach used by many page effects.

## GitHub Pages comparison

The repository workflow
[`pages.yml`](../.github/workflows/pages.yml) validates and deploys the
comparison site on pushes to `main` and manual dispatches.

The workflow:

1. Installs from the lockfile.
2. Runs strict type checks and unit tests.
3. Builds and browser-tests the root-path artifact.
4. Rebuilds with `/{repository-name}/` as the Pages base.
5. Verifies every emitted absolute asset URL.
6. Re-runs all comparison browser tests at the project subpath.
7. Uploads and deploys `apps/demo/dist`.

The legacy demo declares an HTTPS dependency pinned to revision `d1d1ec6`.
Because npm canonicalizes GitHub dependencies to an SSH-form lockfile URL, CI
rewrites that transport to public HTTPS before `npm ci`. The legacy page-flip
bundle remains outside the V2 chapter path.
