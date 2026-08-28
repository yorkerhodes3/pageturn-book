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

## Workspace

```text
packages/
  publication-model/      manifest, location, selector, and validation types
  reader-core/            headless state machine and renderer lifecycle
  reader-ui/              framework-neutral shell, TOC, and browser history
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
- A side-by-side iframe comparison.

The direct semantic chapter is:

```text
http://127.0.0.1:4174/book/demo-book/2026-08/chapters/introduction/
```

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
