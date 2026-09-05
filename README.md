# PageTurn Book V3

> **Current supported version: 3.0.0**
>
> Use PageTurn V3 for every new book, library, and cross-project integration.
> V2 and the original fixed-page viewer are compatibility paths only.

PageTurn is a framework-neutral semantic book reader and publication library.
It keeps text as native HTML, loads only a bounded chapter window, and projects
verified page-turn geometry onto accessible semantic page faces.

## Use V3 from another project

The supported package is [`@ethical-tech/pageturn-book`](./packages/page-turn-v3/).
Import the SDK and its explicit stylesheet:

```ts
import { createPageTurnBook } from "@ethical-tech/pageturn-book";
import "@ethical-tech/pageturn-book/styles.css";

const root = document.querySelector<HTMLElement>("#book");
if (!root) {
  throw new Error("Missing #book");
}

const reader = createPageTurnBook({
  root,
  bookId: "my-book",
  manifestUrl: "/books/my-book/2026-09/manifest.json",
  chaptersStartOnRight: true,
});

await reader.ready;

// Release listeners, observers, requests, timers, and animation frames.
reader.destroy();
```

`createPageTurnBook()` creates the complete reader shell. Applications that
already render the shell can use `attachPageTurnBook()` instead.

SDK mounts ignore the host page's query parameters and do not rewrite browser
history by default. Set `urlMode: "managed"` only when PageTurn owns the
book/chapter/hash URL, as it does in the hosted reference reader.

In unmanaged mode, provide `libraryUrl` to show the Library control and
`locationUrl` to enable durable sharing and annotation-export links. Controls
that cannot be correct for the host application remain hidden or disabled.

The package boundary and tarball are ready for authorized cross-project use,
but public registry publication is blocked until the project license is
approved. Build and install a tarball for authorized use until that release:

```powershell
git clone https://github.com/yorkerhodes3/pageturn-book.git
Set-Location .\pageturn-book
npm install
npm run build:packages
npm run pack:sdk
```

Install the emitted `ethical-tech-pageturn-book-3.0.0.tgz` in the consuming
project. The eventual registry command will be:

```powershell
npm install @ethical-tech/pageturn-book@^3
```

See the [V3 SDK guide](./packages/page-turn-v3/README.md) for Vanilla, React,
media, appearance presets, geometry-only, publication-hosting, and lifecycle
examples.

## V3 experience

- Native semantic HTML rather than rasterized publication text.
- Bounded current/adjacent chapter loading.
- Desktop spreads and responsive single-page reading.
- StPageFlip-derived geometry with semantic moving and revealed faces.
- Opaque paper occlusion, physical binding, page fans, and four corner gestures.
- Right-hand chapter openings by default, with publication-level override.
- Durable book, edition, chapter, and source-anchor locations.
- Hierarchical contents and demand-loaded search.
- Local bookmarks, resume restart, selected-text sharing, annotations, and
  Markdown export.
- Deferred Off, On-page, and Pop-out publication media treatments.
- Typed material, paper, typography, binding, and curvature configuration with
  live appearance presets from the Style gear.
- A metadata-driven library shelf with upright bindings, horizontal stacks,
  and an antique open display volume.

## Build a publication

Publications are compiled from metadata and Markdown into immutable manifests
and directly readable chapter HTML:

```powershell
npm install
npm run build:packages
node tools\publication-cli\dist\cli.js build path\to\publication `
  --out path\to\public\books
```

The generated layout is:

```text
{outputRoot}/{bookId}/{editionId}/manifest.json
{outputRoot}/{bookId}/{editionId}/chapters/{chapterId}/index.html
```

Explicit Markdown IDs are recommended for externally cited passages:

```markdown
# Introduction {#introduction}

This passage needs a durable source location.
{#durable-passage}
```

## Repository layout

```text
apps/
  demo/                       V3 reference app and preserved comparison routes
packages/
  page-turn-v3/               supported @ethical-tech/pageturn-book SDK
  publication-model/          shared manifest and location contract
tools/
  publication-cli/            Markdown-to-publication compiler
scripts/                      pinned ingest and validation utilities
tests/                        V3, SDK, library, and compatibility browser tests
compat/
  v2/                         historical V2-only packages and documentation
legacy/
  README.md                   pinned V1 read-as-book rollback record
```

The repository root is the active V3 workspace. Do not `cd v2`; that former
incubation boundary has been retired.

## Version paths

| Version | Status | Intended use |
|---|---|---|
| **V3 / PageTurn 3.0.0** | Supported path | All new SDK, book, and library integrations |
| V2 semantic reader | Compatibility only | Existing generated chapter and `?view=book` routes during migration |
| V1 `read-as-book` | Pinned rollback | Designed fixed-page comparison or explicit fallback |

V3 does not import the V2 session, semantic renderer, or modal book mode. The
V2-only packages are retained under [`compat/v2/`](./compat/v2/) so existing
routes remain testable while consumers migrate.

## Local development

Run all commands from the repository root:

```powershell
npm install
npm run typecheck
npm run test:unit
npm run test:sdk-consumer
npm run build
npm run test:browser
```

Preview the built reference app:

```powershell
npm run preview:demo
```

Then open <http://127.0.0.1:4174/>.

## Published review routes

- [PageTurn overview](https://yorkerhodes3.github.io/pageturn-book/)
- [V3 publication library](https://yorkerhodes3.github.io/pageturn-book/shelf/)
- [V3 reader](https://yorkerhodes3.github.io/pageturn-book/v3/)
- [V3 clean SDK example](https://yorkerhodes3.github.io/pageturn-book/sdk/)
- [V3 functionality dashboard](https://yorkerhodes3.github.io/pageturn-book/dashboard/)
- [Compatibility comparison](https://yorkerhodes3.github.io/pageturn-book/compare/)

The `/v3/` URL is the hosted reference route. The reusable integration is the
`@ethical-tech/pageturn-book` package; external projects should not copy the
demo controller or depend on the repository's built-in catalog.

## Project records

- [Concept](./CONCEPT-IDEA.md)
- [Architecture review](./ARCHITECTURE-REVIEW.md)
- [Specification and migration record](./SPECIFICATION.md)
- [Implementation backlog](./BACKLOG.md)
- [Publication ingest pipeline](./PUBLICATION-INGEST-PIPELINE.md)
- [Semantic page-turn geometry plan](./SEMANTIC-PAGE-TURN-GEOMETRY-PLAN.md)
- [V3 library review](./V3-LIBRARY-REVIEW.md)
- [V3 mobile performance](./V3-MOBILE-PERFORMANCE.md)
- [V3 local-data privacy review](./V3-LOCAL-DATA-PRIVACY-REVIEW.md)
- [Plurality source record](./apps/fixtures/plurality/SOURCE.md)
- [Human Choice source record](./apps/fixtures/human-choice-source-guide/SOURCE.md)
- [V2 compatibility record](./compat/v2/README.md)
- [Legacy rollback record](./legacy/README.md)
