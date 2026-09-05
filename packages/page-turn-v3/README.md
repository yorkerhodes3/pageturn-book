# `@ethical-tech/pageturn-book` V3

PageTurn Book V3 is the supported semantic book and library SDK in this
repository. It keeps publication text as native HTML, loads a bounded chapter
window, and projects the verified page-turn geometry onto semantic page faces.

**Use this package for new integrations.** The packages under `compat/v2/` and
the separately pinned legacy viewer exist only for rollback and comparison.

## Version

Current SDK version: **3.0.0**

The package boundary and tarball are ready for authorized cross-project use.
Public registry publication remains blocked until the project license is
approved. Until that release, authorized projects can build and install its
tarball:

```powershell
git clone https://github.com/yorkerhodes3/pageturn-book.git
Set-Location .\pageturn-book
npm install
npm run build:packages
npm run pack:sdk
```

Then install the emitted `ethical-tech-pageturn-book-3.0.0.tgz` in the consuming
project. Registry installation will be:

```powershell
npm install @ethical-tech/pageturn-book@^3
```

## Vanilla integration

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
  libraryUrl: "/library/",
  locationUrl: ({ chapterId, anchor }) =>
    `/reader/${chapterId}/#${encodeURIComponent(anchor)}`,
});

await reader.ready;

// On application teardown:
reader.destroy();
```

`createPageTurnBook()` creates the accessible reader shell inside `root`.
`destroy()` is idempotent and releases the SDK's observers, listeners, search
requests, timers, and animation frames.

When `libraryUrl` is omitted, PageTurn hides the Library control rather than
guessing a host route. In unmanaged mode, PageTurn also hides sharing and
disables annotation export unless `locationUrl` supplies a durable host-owned
passage URL.

## React integration

The SDK is framework-neutral. Mount it from an effect and destroy it during
cleanup:

```tsx
import { useEffect, useRef } from "react";
import { createPageTurnBook } from "@ethical-tech/pageturn-book";
import "@ethical-tech/pageturn-book/styles.css";

export function Book() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!root.current) {
      return;
    }
    const reader = createPageTurnBook({
      root: root.current,
      bookId: "my-book",
      manifestUrl: "/books/my-book/2026-09/manifest.json",
    });
    void reader.ready.catch((error: unknown) => {
      console.error("PageTurn could not initialize", error);
    });
    return () => reader.destroy();
  }, []);

  return <div ref={root} />;
}
```

No React runtime is included in the SDK bundle.

## Publication input

`manifestUrl` must resolve to a PageTurn semantic publication manifest. Each
chapter entry points to directly readable HTML containing a
`[data-reader-content]` element and stable semantic anchors.

Build a publication from Markdown with the repository compiler:

```powershell
node tools\publication-cli\dist\cli.js build path\to\publication `
  --out path\to\public\books
```

The output is immutable and follows:

```text
{outputRoot}/{bookId}/{editionId}/manifest.json
{outputRoot}/{bookId}/{editionId}/chapters/{chapterId}/index.html
```

Serve the manifest, chapters, SDK JavaScript, and SDK CSS from the same origin
unless the publication host explicitly permits cross-origin requests.

## Optional configuration

```ts
const reader = createPageTurnBook({
  root,
  bookId: "my-book",
  manifestUrl: "/books/my-book/2026-09/manifest.json",
  chapterId: "introduction",
  chaptersStartOnRight: true,
  appearance: {
    cover: {
      background: "#17233d",
      foreground: "#f1ead8",
      accent: "#66c5b8",
    },
  },
  media: {
    defaultTreatment: "popout",
    figures: [
      {
        id: "system-map",
        chapterId: "introduction",
        afterAnchor: "why-this-matters",
        src: "/books/my-book/media/system-map.webp",
        width: 1600,
        height: 900,
        alt: "System map showing the publication's primary relationships.",
        caption: "Figure 1. System map. CC BY 4.0.",
      },
    ],
  },
  libraryUrl: "/library/",
  // Embedded hosts supply their own durable URL builder.
  locationUrl: ({ chapterId, anchor }) =>
    `/reader/${chapterId}/#${encodeURIComponent(anchor)}`,
  appearanceControls: true,
  appearancePreset: "modern-lab",
});
```

Media records require explicit dimensions, alternative text, captions, and
project-reviewed rights. The available treatments are `off`, `on`, and
`popout`. A dedicated PageTurn route can set `urlMode: "managed"` instead of
`locationUrl` when PageTurn owns its book/chapter/hash browser history. It can
also set `keyboardScope: "document"` for full-page arrow-key navigation;
embedded readers leave keyboard events outside their root untouched.

### Appearance configuration

The same typed appearance object drives the open reader and shelf. It separates
four concerns:

- `cover` — cover colors and subtitle.
- `binding` — leather/cloth/paper, thickness, hubs, page count, board
  thickness, and flat/raised/exposed-stitch spine.
- `paper` — stock, highlight, edge and ink colors, age, fiber texture,
  plain/lined/grid background, rule color, and spacing.
- `fan` — plain, gold, red, or marbled page-block edges and their stripe colors.
- `typography` — body/heading/UI families, line height, base scale, and drop
  caps.
- `geometry` — gutter lift, floating bottom/fore-edge lift, corner roundness,
  turning fold radius, fold shadow, and cover-board overhang.

```ts
reader.setAppearance("antique-greek");

reader.setAppearance({
  paper: {
    color: "#fffdf4",
    pattern: "grid",
    ruleColor: "#b8d0cc",
  },
  typography: {
    bodyFamily: '"Segoe Print", "Bradley Hand", cursive',
    lineHeight: 1.62,
  },
  geometry: {
    gutterLift: 0.8,
    bottomLift: 0.6,
    foldRadius: 0.9,
  },
});

const activeAppearance = reader.getAppearance();
```

Available presets are:

- `default`
- `antique-greek`
- `historical-tome`
- `modern-lab`
- `lined-journal`
- `grid-lab`
- `handwritten-notebook`

`appearanceControls: true` exposes the same fields through the compact Style
gear and session-only overlay. Typeface and line-height changes repaginate
around the current source anchor; paint-only changes apply immediately.

The appearance object also drives `mountBookshelf()`. A shelf volume can choose
an optional pose without changing its interaction or action model:

```ts
const volumes = [
  {
    ...book,
    placement: { pose: "stacked", stackId: "lab-notebooks", order: 0 },
  },
  {
    ...antiqueBook,
    placement: { pose: "open-on-stand", standStyle: "lectern" },
  },
];
```

Supported poses are `upright`, `stacked`, and `open-on-stand`. Stack members
remain separate keyboard-reachable books. The open display and stand are
rendered with CSS and do not require decorative raster assets.

## Lower-level integration

Applications that already render the required shell can call
`attachPageTurnBook()` instead. `mountPageTurnBookShell()` is also exported for
custom composition. Most applications should use `createPageTurnBook()`.

The geometry-only exports are available from:

```ts
import { solvePageTurn } from "@ethical-tech/pageturn-book/geometry";
import { projectPageTurn } from "@ethical-tech/pageturn-book/projection";
```

## Runtime behavior

- Semantic HTML remains canonical and selectable.
- Only the active chapter and a bounded adjacent window are retained.
- Desktop uses a two-page spread; narrow screens use one semantic page.
- Durable locations use book, edition, chapter, and source anchor—not
  responsive screen-page numbers.
- Embedded SDK mounts ignore host query parameters and do not rewrite host
  history by default. Set `urlMode: "managed"` only when PageTurn owns the URL.
- Embedded mounts do not change the host document title by default. Managed
  routes can set `updateDocumentTitle: true`; the original title is restored on
  teardown.

## License status

The original PageTurn package is currently unlicensed for public distribution;
authorized internal evaluation is governed by [LICENSE](./LICENSE).
StPageFlip-derived geometry remains under its MIT terms recorded in
[THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md). Approve a project license
before publishing version 3.0.0 to a public package registry.
- Bookmarks and annotations remain local to the browser profile.
- Search fetches chapter text only after the reader requests a search.
- Optional publication media is deferred until its selected treatment needs it.
