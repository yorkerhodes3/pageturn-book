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
{outputRoot}/{bookId}/{editionId}/media/{figureId}.{extension}
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
    defaultDisplay: "pop-out",
    defaultStyle: "book-toned",
    figures: [
      {
        id: "system-map",
        chapterId: "introduction",
        afterAnchor: "why-this-matters",
        src: "/books/my-book/media/system-map.webp",
        integrity:
          "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        originalSrc: "https://example.org/original-system-map.png",
        width: 1600,
        height: 900,
        alt: "System map showing the publication's primary relationships.",
        caption: "Figure 1. System map.",
        visualKind: "diagram",
        colorSemantics: "essential",
        transformPermitted: true,
        exportPermitted: false,
        rights: {
          license: "CC BY 4.0",
          attribution: "Example Research Group",
        },
        source: "Example archive",
        provenance: "Reviewed source record",
        reviewedAt: "2026-09-06",
      },
    ],
  },
  libraryUrl: "/library/",
  // Embedded hosts supply their own durable URL builder.
  locationUrl: ({ chapterId, anchor }) =>
    `/reader/${chapterId}/#${encodeURIComponent(anchor)}`,
  appearanceControls: true,
  appearancePreset: "modern-lab",
  selectionActions: true,
  shareComposer: true,
  sharePolicy: {
    location: "public",
    quote: { permitted: true, maximumCharacters: 800 },
    visual: {
      permitted: true,
      maximumContextCharacters: 240,
      sourceImages: "none",
    },
  },
  // Required for image downloads when the reader is embedded. The host must
  // also grant any applicable iframe sandbox/CSP download permission.
  allowShareImageDownload: true,
  annotationAppearance: {
    fontFamily: '"Segoe Print", "Bradley Hand", cursive',
    fontScale: 1,
    inkColor: "#59401d",
    showMarginalia: true,
  },
});
```

Validated publication manifests are the preferred media source. Explicit
`PageTurnBookOptions.media` remains a host override. Display (`off`, `on-page`,
`pop-out`) and runtime style (`original`, `book-toned`, `monochrome`,
`duotone`) are independent; legacy `off`, `on`, `popout`,
`defaultTreatment`, and `mediaTreatment` inputs normalize explicitly.
Non-original styles require both `transformPermitted: true` and complete rights
metadata. Color-essential figures remain Original unless the user explicitly
previews a style, and pop-outs always show Original. Styling uses the one
semantic `<img>` and active paper/ink/accent variables; it creates no
style-specific raster asset. The reader provides caption, attribution, license,
provenance, and a safe **View original** action. Source-image export is not
exposed by the SDK. `exportPermitted` records data policy only: it does not add
an export/download control and does not put source-image URLs or bytes into
share payloads or visual quote rendering, even when a host share policy says
`sourceImages: "same-origin-approved"`.

Manifest media records require explicit dimensions, alternative text, captions,
placement, `sha256:<64 lowercase hex>` integrity, rights, source, provenance,
and review date. Local publication builds verify and stage the declared bytes
inside the edition. Remote figure URLs must be immutable commit URLs. Legacy
host-option media may omit governance fields, but then transformation remains
fail-closed and export remains unavailable. Manifest-relative media resolves
from the manifest URL; explicit host-option media resolves from the document
base captured when the reader attaches. A dedicated PageTurn route can set
`urlMode: "managed"` instead of `locationUrl` when PageTurn owns its
book/chapter/hash browser history. It can also set
`keyboardScope: "document"` for full-page arrow-key navigation; embedded
readers leave keyboard events outside their root untouched.

### Reviewed source cards

External links remain ordinary authored navigation by default. A host can pass
reviewed records to the SDK's deterministic helper and opt into local,
no-fetch cards:

```ts
import {
  createPageTurnSourceResolver,
  type PageTurnSourceRecord,
} from "@ethical-tech/pageturn-book";

const records: readonly PageTurnSourceRecord[] = [{
  id: "approved-reading",
  canonicalUrl: "https://example.org/book",
  title: "Reviewed book",
  sourceType: "book",
  reviewedAt: "2026-09-01",
  rights: { status: "approved", license: "CC BY 4.0" },
  localReading: {
    kind: "full-edition",
    bookId: "reviewed-book",
    editionId: "2026-09",
    rights: {
      status: "approved",
      scope: "full-edition",
      basis: "Publisher grant",
      reviewedAt: "2026-09-01",
      expiresAt: "2027-09-01",
    },
  },
}];

createPageTurnBook({
  root,
  bookId: "course",
  manifestUrl: "/books/course/2026-09/manifest.json",
  sourceResolver: createPageTurnSourceResolver(records),
  sourceLinkMode: "card",
  courseReadingIds: ["course-week-1"],
  locationUrl: ({ bookId, editionId, chapterId, anchor }) =>
    `/reader/?book=${bookId}&edition=${editionId}&chapter=${chapterId}#${anchor}`,
});
```

`PageTurnSourceResolver` receives the authored `URL`, exact book/edition/
chapter/anchor course context, and an `AbortSignal`. Results distinguish local
publication, external card, ambiguity, and direct external navigation. The
helper matches only pinned URL/repository revisions, normalized reviewed URLs
and aliases, DOI, checksum-valid 978/979 ISBN, and explicit course IDs, in that order.
It never performs fuzzy matching or network metadata lookup.

In `"card"` mode every resolver result, including `direct-external`, remains a
no-fetch card. Differing reviewed or resolver destinations are shown alongside
the authored source, and Copy link retains the authored URL.

`"card"` requires a resolver. `"direct-local"` is an explicit host opt-in and
navigates only for a validated approved local target; otherwise it retains the
authored external destination. Local full editions require approved
`full-edition` source and local rights, excerpts require approved source plus
`excerpt`/`full-edition` local rights, and independently authored source guides
require `source-guide` local rights. Invalid or mismatched rights fail closed.
The SDK contains no demo catalog; applications own records and immutable local
URL construction.

### Allowlisted external previews

Source cards remain no-fetch by default. A host may opt a reviewed URL space into
an explicit preview button with `externalPreviewProviders`. The SDK validates the
whole list during setup and rejects duplicate/unsafe IDs, wildcard or non-origin
URLs, non-normalized path prefixes, unknown or dangerous sandbox/Permissions
Policy tokens, and timeouts outside **250–15,000 ms**.

```ts
import type { PageTurnExternalPreviewProvider } from "@ethical-tech/pageturn-book";

const providers: readonly PageTurnExternalPreviewProvider[] = [{
  id: "publisher-preview",
  origins: ["https://preview.publisher.example"],
  pathPrefixes: ["/embed/books"],
  sandbox: ["allow-scripts", "allow-same-origin"],
  permissions: ["fullscreen"],
  readiness: {
    kind: "message",
    origin: "https://preview.publisher.example",
    messageType: "pageturn-preview-ready",
    timeoutMs: 5_000,
  },
}];

createPageTurnBook({
  root,
  bookId: "course",
  manifestUrl: "/books/course/2026-09/manifest.json",
  sourceResolver,
  sourceLinkMode: "card",
  externalPreviewProviders: providers,
});
```

Exactly one provider must match the action URL's exact origin and a pathname
boundary. The iframe and optional runtime chunk do not exist before **Load
external preview** is activated. Each message-mode activation adds a fresh
128-bit base64url `pageturn_nonce` and the exact `pageturn_parent_origin`.
Message readiness requires `allow-scripts` plus `allow-same-origin`, so those
providers must run on a dedicated origin different from the embedding reader.
Readiness is accepted only from the configured origin and iframe window with
exactly `{ type, version: 1, nonce }`. Timeout mode never reports positive
readiness. Close, source/book navigation, history navigation, replacement, and
`destroy()` remove the frame, listener, nonce, and timer; retry is explicit and
uses a fresh nonce. The direct source link remains available throughout.

The embedding application must permit every configured provider in its response
headers; the SDK cannot relax them. For example:

```http
Content-Security-Policy: frame-src 'self' https://preview.publisher.example
Permissions-Policy: fullscreen=(self "https://preview.publisher.example")
```

Grant only features listed in that provider's `permissions`; omit the header
entry and provider token when no feature is needed. The provider must also allow
framing and, for message readiness, read the two protocol parameters and call
`parent.postMessage({ type: "pageturn-preview-ready", version: 1, nonce },
parentOrigin)`. Do not configure arbitrary user-authored origins or broad paths.

### Contextual selection actions

These interaction capabilities remain beta/host-opt-in. The 2026-09-07 review
tranche now measures marginalia through an actual mounted 20-annotation reader
and proves the cold share renderer has zero resource entries before activation
and exactly one new entry afterward. A clean detached `c1cf0f8` baseline passed
provenance validation; 14 of 15 numeric gates pass, including the 4x selection
gate at 61.1 ms p95. Broad promotion remains withheld because the initial V3
route is 34,010 B gzip over baseline against a 5 KiB budget, and native/embedder
cleanup, clean low-end turn evidence, cross-browser, and manual
assistive-technology gates remain incomplete. Repository consumers can
reproduce the numeric profile with
`npm run measure:v3-interactions`; see the root
`V3-READER-INTERACTION-PROMOTION.md`.

Set `selectionActions: true` to enable the accessible Copy, Share, Highlight,
and Annotate toolbar. The hosted reader enables it; SDK consumers opt in.
Share appears only when `urlMode: "managed"` or `locationUrl` provides durable
links, and Annotate appears after local IndexedDB storage is available. Share is
contextual to selected text; there is no separate header Share button.
Highlights store a resolved `PageTurnAnnotationV2` locally and render the exact
range.

Annotate opens a compact editor in the selected range's physical outer margin.
Saved commenting records remain exact-target `PageTurnAnnotationV2` values in
IndexedDB. Wide stationary pages show collision-managed 2–4 line handwritten
previews in the left outer margin of left pages and right outer margin of right
pages. Narrow pages use a marker and bottom sheet without reducing body width.
The full note is always available to keyboard and assistive technology users,
with edit, delete, and Explore integration. Page-turn copies are visual-only,
inert, and `aria-hidden`.

Pointer and touch selection retain the browser's native selection. Keyboard
selection is announced, and `Alt+Shift+A` (`Option+Shift+A` on macOS) moves
focus into the toolbar. Override the command with
`selectionActionShortcut: { key, altKey, ctrlKey, metaKey, shiftKey }`, or set
it to `false`. The reader emits `pageturn:share-selection` and
`pageturn:annotate-selection`. Annotation detail is a
`PageTurnSelectionActionDetail` containing normalized text, the exact
`PageTurnTextTargetV1`, and its edition-scoped location. Share detail is a
`PageTurnShareSelectionActionDetail` discriminated by `kind`: `"quote"`
contains only the policy-bounded text and target, while `"location"` contains
only the edition-scoped public location.

### Share policy and composer

Excerpt and visual sharing are host opt-ins. Set both `shareComposer: true` and
an explicit `PageTurnSharePolicy` to show the pre-share preview for selected
text. The preview shows the exact public quote, book/authors/chapter/immutable
edition, citation, URL, disclosure, and—only when permitted—a deterministic
locally generated book-style PNG.

`maximumCharacters` must be 2–2,000 when quotes are permitted.
`maximumContextCharacters` must be 0–240; 240 is the recommended default.
`visual.permitted: true` is invalid when quote sharing is false. Invalid policy
disables sharing. When policy is omitted, PageTurn allows only a host-provided
public anchor location: it does not emit selected text, an exact selector, Text
Fragment, shared highlight, or image. The hosted catalog uses 800 quote
characters, 240 visual context characters, and `sourceImages: "none"`.

The renderer is imported only after Share activation. It receives public
semantic text and resolved appearance values rather than inspecting or
screenshotting the reader DOM. It does not upload, sample cross-origin pixels,
or accept source-image URLs/bytes—even if the policy value is
`same-origin-approved`. `exportPermitted` does not change that boundary. It
does not include toolbars, annotations, private highlights, or notes. PNG output is
bounded to a 1,600 px longest edge, 2.1 MP, 4 MB encoded, and 32 MB estimated
canvas memory. It waits briefly for all configured font families, caches that
decision for repeatable rendering, and uses stable generic fallbacks when they
are unavailable. Quotes adapt down to a readable minimum; if complete text
cannot fit without distortion, visual generation declines while quote/link
sharing remains available.

The final **Share…** action checks `navigator.canShare()` with the exact File
payload. Unsupported file targets receive equivalent quote/citation text and
the URL without an image claim. Copy-image is enabled only with
`ClipboardItem` plus `clipboard.write`; download and new-tab save fallbacks are
capability-labeled. Embedded hosts must allow `web-share` and clipboard access
through Permissions Policy. Top-level image downloads are enabled by default.
Embedded image downloads require `allowShareImageDownload: true` plus the
applicable iframe sandbox and CSP permissions; PageTurn otherwise fails closed.

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
gear and session-only overlay. The overlay also contains the publication's
Graphic handling display/style controls when figures are configured; those
controls are intentionally absent from the reading toolbar. Typeface and
line-height changes repaginate around the current source anchor; paint-only
changes apply immediately.

During a turn, the stationary semantic page remains the current front until the
fold uncovers it. The moving clipped surface renders the landing page on the
leaf's back, and a separate bounded clip progressively reveals the other
destination page; a zero-drag grab does not replace the current page.

`annotationAppearance` independently configures marginalia. The zero-download
handwriting fallback is `"Segoe Print", "Bradley Hand", cursive`; Explore also
provides a persistent readable standard-font preference and **Show marginalia**
toggle. Hosts can update this surface through
`reader.setAnnotationAppearance()` and inspect it with
`reader.getAnnotationAppearance()`.

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

### Exact text targets

V3 also exports its versioned exact-range foundation for hosts that need stable
quote links or annotation targets:

```ts
import {
  capturePageTurnTextTarget,
  createPageTurnTextTarget,
  decodePageTurnTextTarget,
  encodePageTurnTextTarget,
  pageTurnTextTargetRanges,
  pageTurnTextTargetUrl,
  resolvePageTurnTextTarget,
  resolvePageTurnTextTargetToken,
} from "@ethical-tech/pageturn-book";
```

Targets bind Unicode-normalized source-block offsets and quote context to a
book, immutable edition, chapter content hash, and deterministic checksum. The
compact URL token is capped at 512 bytes. V3 selected-text sharing now adds the
edition, token, source-anchor fallback, and standard Text Fragment to its
outgoing URL; opening that URL restores a temporary exact highlight after the
chapter loads.

See
[`READER-INTERACTION-FEATURE-PLAN.md`](../../READER-INTERACTION-FEATURE-PLAN.md)
for the selector contract and the dependent contextual-action, marginalia, and
visual-sharing work packages.

### Personal data

The reader stores versioned bookmarks and annotation records in native
IndexedDB. Resume and typography settings remain separate in `localStorage`.
Marginalia visibility and readable-font preferences also use `localStorage`;
they contain no note text.
Explore provides Markdown export, version 2 JSON backup/import, and
current-edition or all-edition research-data deletion.

Hosts can use `openPageTurnPersonalStore()`,
`createPageTurnAnnotationBackup()`, `parsePageTurnAnnotationBackup()`, and
`previewPageTurnAnnotationImport()` directly. JSON backup uses
`application/vnd.ethical-tech.pageturn-annotations+json;version=2`; annotation
data is limited to 16 MiB per book/edition and imports to 20 MiB.

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
