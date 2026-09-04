# PageTurn Book V3 - Specification and historical V2 design record

> **Current product:** PageTurn Book V3, version 3.0.0.
>
> The repository-root [`@ethical-tech/pageturn-book`](./packages/page-turn-v3/)
> package is the supported SDK. The V2 requirements below document the
> semantic-first foundation that V3 superseded; they are retained for
> traceability and compatibility review, not as current integration guidance.

| Field | Value |
|---|---|
| Status | V3 accepted; historical V2 baseline retained |
| Version | 3.0.0 |
| Date | 2026-08-27 |
| Architecture basis | [ARCHITECTURE-REVIEW.md](./ARCHITECTURE-REVIEW.md) |
| Concept basis | [CONCEPT-IDEA.md](./CONCEPT-IDEA.md) |
| Delivery plan | [BACKLOG.md](./BACKLOG.md) |
| Page-turn plan | [SEMANTIC-PAGE-TURN-GEOMETRY-PLAN.md](./SEMANTIC-PAGE-TURN-GEOMETRY-PLAN.md) |

## 1. Decision summary

Book Reader V2 was the **semantic-first scholarly reader** built alongside,
not over, the existing `read-as-book` implementation. PageTurn V3 now carries
that semantic foundation into the supported book-first SDK.

The first releasable V2 milestone will contain:

- A Markdown-to-semantic-HTML publication pipeline.
- A versioned publication manifest.
- A framework-neutral headless reader core.
- An accessible semantic scroll renderer.
- A responsive reader shell and CSS book theme.
- Stable URL locations and reading progress.
- Local preferences and resume behavior.
- Local bookmarks.
- Local highlights and notes.
- Markdown annotation export.
- A separately loaded path to the existing fixed-layout viewer as a fallback.
- Automated quality, accessibility, packaging, and browser checks.

The first release will not require:

- A new page-curl renderer.
- Responsive semantic pagination.
- Runtime PDF.js.
- User accounts.
- Collaborative annotations.
- Reader analytics.
- AI features.
- An application backend for basic reading.

The new bounded facsimile renderer and semantic paged mode will proceed only
after their prototypes satisfy the gates in this specification.

## 2. Existing implementation preservation

### 2.1 Preservation rule

The existing
[Ethical-Tech-CoLab/read-as-book](https://github.com/Ethical-Tech-CoLab/read-as-book)
implementation at revision
[`d1d1ec6`](https://github.com/Ethical-Tech-CoLab/read-as-book/commit/d1d1ec6193867c13637636fc03e538c27d95261c)
is a fallback implementation and historical baseline.

V2 work must not overwrite, silently replace, or destructively refactor it.

### 2.2 Side-by-side development

During V2 incubation, before the V3 approach was accepted:

- V2 source lived under a distinct `v2/` boundary.
- Existing source, generated pages, manifests, package metadata, and public APIs
  remain unchanged.
- V2 packages will not import private modules from the legacy implementation.
- A compatibility adapter may call the legacy package through its published
  public API.
- Safety or browser-compatibility fixes to the legacy implementation must be
  isolated in the legacy project or a compatibility wrapper, not mixed into V2
  architecture.
- Content owners can select the legacy viewer independently for a publication.
- Removing the legacy implementation requires a separate decision after V2
  acceptance, migration verification, and rollback review.

### 2.3 Historical workspace boundary

The incubation implementation used a visibly separate tree:

```text
/
  CONCEPT-IDEA.md
  ARCHITECTURE-REVIEW.md
  SPECIFICATION.md
  BACKLOG.md
  legacy/
    README.md                 # pinned revision and fallback instructions
  v2/
    package.json
    packages/
    apps/
    tools/
```

If the old source remains in an independent upstream repository, `legacy/` may
contain only the pinned revision, integration instructions, and compatibility
metadata. It must not contain an untracked, mutable copy.

### 2.4 Decommission conditions

The legacy viewer may be considered for removal only when all of the following
are true:

1. V2 has completed an agreed pilot with representative books.
2. Semantic reading, local annotation, and fallback facsimile access meet their
   acceptance criteria.
3. Existing publications and entry points have a tested migration route.
4. Performance and accessibility gates pass on supported platforms.
5. A rollback package or version remains available.
6. Product and publication owners explicitly approve removal.

## 3. Goals and non-goals

### 3.1 Product goals

| ID | Goal |
|---|---|
| G-001 | Make Markdown-derived semantic content the canonical web reading experience. |
| G-002 | Preserve the visual and emotional character of a printed book through CSS and optional fixed-layout renditions. |
| G-003 | Provide stable links and citations that survive responsive reflow. |
| G-004 | Support local scholarly workflows: resume, bookmarks, highlights, notes, and export. |
| G-005 | Work on static hosting for unauthenticated reading. |
| G-006 | Keep the initial page readable without waiting for optional reader JavaScript. |
| G-007 | Bound network, decode, and memory work for long publications. |
| G-008 | Keep reader state independent of React or any one renderer. |
| G-009 | Meet accessibility requirements as release criteria. |
| G-010 | Preserve the existing viewer until V2 is reviewed and accepted. |

### 3.2 Engineering goals

| ID | Goal |
|---|---|
| EG-001 | Use strict TypeScript for public runtime packages. |
| EG-002 | Publish side-effect-free ESM for the headless core. |
| EG-003 | Isolate optional renderers and framework adapters by export or package boundary. |
| EG-004 | Make async work cancellable and every mount operation disposable. |
| EG-005 | Use versioned schemas for publications and local data. |
| EG-006 | Validate the packaged artifacts in real browsers, not only source compilation. |
| EG-007 | Make publication generation atomic and reproducible. |

### 3.3 Non-goals for the first release

| ID | Non-goal |
|---|---|
| NG-001 | Exact simulation of paper physics. |
| NG-002 | Durable citation by responsive screen page number. |
| NG-003 | Editing Markdown inside the reader. |
| NG-004 | Real-time collaboration. |
| NG-005 | User identity or cloud synchronization. |
| NG-006 | Behavioral analytics by default. |
| NG-007 | AI summarization or chat. |
| NG-008 | Replacing PDF authoring or professional print layout tools. |
| NG-009 | Supporting arbitrary unprocessed PDFs in the semantic renderer. |
| NG-010 | Modifying or deleting the legacy viewer. |

## 4. Users and primary journeys

### 4.1 Reader

A reader opens a publication, reads semantic text, follows deep links, adjusts
presentation, resumes later, creates bookmarks and notes, and exports local
research.

### 4.2 Student or researcher

A student links to an exact passage, records a quote and note, returns to it
after nearby content changes within the same edition, and exports notes with
source provenance.

### 4.3 Publication editor

An editor builds a book from Markdown, receives actionable validation errors,
previews the semantic rendition, optionally attaches a PDF facsimile, and
publishes immutable edition assets.

### 4.4 Host-site integrator

An integrator embeds or routes to the reader without coupling site code to the
renderer. The integrator can apply design tokens, select enabled capabilities,
and retain the old viewer as a fallback.

### 4.5 Keyboard and assistive technology reader

A reader navigates document structure and controls without pointer input,
changes typography, uses browser zoom and text reflow, and is never required to
interpret a canvas image to access the publication.

## 5. Release scope

### 5.1 Milestone R1 - semantic reader foundation

R1 is complete when:

- One representative Ethical Tech CoLab Markdown publication builds into
  validated semantic assets.
- Static hosting can serve the publication.
- A direct chapter URL is useful without enhancement JavaScript.
- The enhanced reader restores URLs, progress, preferences, and bookmarks.
- A reader can highlight semantic text, attach a note, restore it, and export
  it as Markdown.
- A publication can expose a link or switch to the legacy facsimile viewer
  without V2 modifying that viewer.
- Accessibility and performance gates pass for the supported matrix.

### 5.2 Milestone R1.1 - production hardening

R1.1 may add:

- More publication fixtures.
- Search over loaded or indexed semantic content.
- Import of previously exported local annotations.
- Additional themes and print styles.
- Improved mapping between semantic and legacy fixed pages.
- Packaging and integration refinements based on the pilot.

### 5.3 Prototype P-FAC - bounded facsimile renderer

P-FAC is not a release commitment. It must prove:

- Bounded page fetching and decoded memory.
- Abortable rapid navigation.
- Container-aware resize.
- Keyboard, touch, focus, and reduced-motion behavior.
- Location mapping to the semantic rendition.
- Measurable improvement over the legacy all-page engine.

### 5.4 Prototype P-PAGED - semantic paged mode

P-PAGED is not a release commitment. It must prove:

- Acceptable layout for the supported publication corpus.
- No loss of semantic reading or native selection.
- Reliable behavior for headings, figures, tables, code, footnotes, long links,
  zoom, and user font settings.
- Cross-browser consistency sufficient for an optional presentation.
- Honest progress language that does not treat responsive pages as citations.

## 6. Supported environments

### 6.1 Browser policy

R1 will target:

- Chrome and Edge: current and previous major versions.
- Firefox: current and previous major versions.
- Safari on macOS: current and previous major versions.
- Safari on iOS/iPadOS: current and previous major versions.

The exact version numbers will be frozen when implementation begins and updated
according to a documented support policy.

JavaScript-disabled reading must remain possible for generated semantic chapter
pages, although bookmarks, annotations, enhanced navigation, and local
preferences require JavaScript.

### 6.2 Assistive technology validation

Manual release validation will cover at least:

- NVDA with a supported Chromium browser.
- NVDA with Firefox.
- VoiceOver with Safari on macOS.
- VoiceOver with Safari on iOS.

Automated accessibility checks supplement but do not replace these tests.

### 6.3 Build environment

- Node.js 22.13 or newer is the minimum initial build target.
- Node.js 24 LTS is the preferred CI and contributor environment.
- Package manager and exact version will be pinned in the V2 workspace.
- Build output must be reproducible from the lockfile.
- Browser runtime packages must not require Node APIs.

### 6.4 Hosting

The baseline deployment target is an HTTPS static host or CDN supporting:

- Immutable fingerprinted assets.
- Correct content types.
- Compression.
- Cache-control headers.
- Byte range requests for optional runtime PDF use.
- A configurable Content Security Policy.

No server-rendered application runtime is required for R1.

## 7. Historical V2 workspace

The initial workspace was a TypeScript package workspace under `v2/`. Its
V2-only packages now live under `compat/v2/`; active V3 packages live at the
repository root.

```text
v2/
  package.json
  tsconfig.base.json
  packages/
    publication-model/
    reader-core/
    renderer-semantic/
    annotations/
    react/
    theme/
  tools/
    publication-cli/
  apps/
    demo/
    fixtures/
```

### 7.1 Package responsibilities

| Package | Responsibility |
|---|---|
| `publication-model` | Manifest, location, selector, validation, and error types |
| `reader-core` | Session state, commands, events, URL state, renderer coordination |
| `renderer-semantic` | Semantic scroll reading and location observation |
| `annotations` | Local persistence, anchoring, re-anchoring, import/export |
| `react` | React hooks and components over public core APIs |
| `theme` | CSS tokens and default book presentation |
| `publication-cli` | Markdown compilation, validation, manifests, optional rendition assets |
| `demo` | Integration reference and browser test host |
| `fixtures` | Representative publications and edge cases |

### 7.2 Dependency direction

Allowed:

```text
publication-model
  <- reader-core
  <- renderers and feature services
  <- React adapter and demo
```

Not allowed:

- `reader-core` importing React.
- `publication-model` importing DOM code.
- Semantic packages importing the legacy viewer.
- The legacy adapter importing private V2 state.
- Annotation storage owning navigation state.

## 8. Publication source and build pipeline

### 8.1 Source unit

A publication source directory contains:

```text
book/
  book.yml
  chapters/
    01-introduction.md
    02-governance.md
  assets/
    figures/
  facsimile/
    report.pdf                 # optional
```

The exact metadata serialization may be YAML or JSON. R1 will use one format
consistently; `book.yml` is the preferred author-facing format.

### 8.2 Required publication metadata

| Field | Required | Description |
|---|---:|---|
| `bookId` | Yes | Stable publication identifier |
| `editionId` | Yes | Immutable content edition identifier |
| `title` | Yes | Publication title |
| `authors` | Yes | One or more attributed authors or organizations |
| `language` | Yes | BCP 47 language tag |
| `direction` | No | `ltr` or `rtl`; inferred only when safe |
| `publicationDate` | No | Edition publication date |
| `description` | No | Human-readable summary |
| `license` | No | Content license metadata |
| `chapters` | Yes | Ordered chapter source list |
| `facsimile` | No | Optional fixed-layout source and mapping configuration |

### 8.3 Markdown policy

The compiler must support the subset defined for Ethical Tech CoLab
publications and reject ambiguous or unsafe content.

R1 must support:

- Headings.
- Paragraphs.
- Emphasis and strong text.
- Ordered and unordered lists.
- Links.
- Block quotes.
- Images with alternative text.
- Tables.
- Fenced code blocks.
- Footnotes or endnotes, using one documented syntax.
- Explicit stable IDs for sections and addressable blocks.

Raw HTML is disabled by default. If enabled for a controlled project, it must
pass an allowlist sanitizer and cannot inject scripts, event handlers,
untrusted frames, or unsafe URLs.

### 8.4 Stable ID rules

| ID | Requirement |
|---|---|
| PUB-ID-001 | Authors can assign explicit IDs to headings and addressable blocks. |
| PUB-ID-002 | Explicit IDs are unique within an edition. |
| PUB-ID-003 | Generated IDs are deterministic from stable local content, not full-document ordinal position alone. |
| PUB-ID-004 | Duplicate generated IDs receive deterministic disambiguation and a build warning or error according to policy. |
| PUB-ID-005 | Changing unrelated content in another chapter does not change an existing generated ID. |
| PUB-ID-006 | The build emits a source location for every generated addressable block. |
| PUB-ID-007 | An editor can promote a generated ID to an explicit ID without changing the visible content. |

Explicit author IDs are recommended for headings and passages expected to be
cited externally.

### 8.5 Build stages

```text
read metadata
  -> parse Markdown into AST
  -> validate structure and URLs
  -> normalize AST
  -> assign stable IDs
  -> generate semantic chapter HTML
  -> generate source map and table of contents
  -> optionally process a fixed-layout rendition
  -> construct publication manifest
  -> validate generated artifacts
  -> write a staging edition
  -> atomically publish the complete edition
```

### 8.6 Atomic generation

| ID | Requirement |
|---|---|
| PUB-BUILD-001 | Generation writes to a unique staging directory. |
| PUB-BUILD-002 | Existing published editions are not deleted before validation succeeds. |
| PUB-BUILD-003 | The build validates every referenced output before publication. |
| PUB-BUILD-004 | Failed generation leaves the last published edition intact. |
| PUB-BUILD-005 | Edition assets are content-addressed or otherwise immutable after publication. |
| PUB-BUILD-006 | The CLI returns a nonzero exit code on validation or generation failure. |
| PUB-BUILD-007 | Errors contain source file, location where available, rule ID, and remediation text. |

### 8.7 Build validation

The build fails for:

- Missing required metadata.
- Duplicate identifiers.
- Broken internal references.
- Unsafe URL schemes or raw content.
- Missing required image alternatives.
- Unreadable or missing chapter sources.
- Manifest schema violations.
- Generated artifact references that do not exist.
- Facsimile mapping outside the page or semantic location range.

Warnings may cover:

- Heading level jumps.
- Generated IDs on heavily cited structures.
- Large unoptimized assets.
- Tables that may be difficult on narrow screens.
- Missing optional provenance metadata.

## 9. Publication manifest

### 9.1 Schema policy

The manifest is JSON and has an explicit semantic version.

- Breaking schema changes increment the major version.
- Readers reject unsupported major versions with a typed error.
- Unknown additive fields are ignored unless marked required by capabilities.
- Manifest validation runs at build time and runtime.
- URLs resolve using standard URL rules relative to the manifest URL unless
  explicitly declared absolute.

### 9.2 Conceptual type

The exact TypeScript definitions will be implemented in
`publication-model`. This conceptual shape is normative for responsibilities:

```ts
type PublicationManifest = {
  schemaVersion: "1.0";
  bookId: string;
  editionId: string;
  contentHash: string;
  title: string;
  authors: Array<{
    name: string;
    url?: string;
  }>;
  language: string;
  direction: "ltr" | "rtl";
  publicationDate?: string;
  description?: string;
  license?: {
    name: string;
    url?: string;
  };
  appearance?: {
    cover: {
      background: string;
      foreground: string;
      accent: string;
      subtitle?: string;
    };
    binding: {
      material: "leather" | "cloth" | "paper";
      color: string;
      accent: string;
      depth: "slim" | "standard" | "thick";
      hubs: number;
      pageCount?: number;
      shelfLabel?: string;
    };
  };
  tableOfContents: TocEntry[];
  renditions: {
    semantic: SemanticRendition;
    facsimile?: FacsimileRendition;
    legacyFacsimile?: LegacyFacsimileRendition;
  };
  capabilities: PublicationCapabilities;
};
```

Cover and binding appearance is publication metadata rather than a
renderer-private theme. The reader and shelf view consume the same safe color,
material, depth, spine-hub, and shelf-label fields. Schema v1 accepts only
six-digit hexadecimal colors so values can become CSS custom properties
without allowing arbitrary CSS injection.

### 9.3 Semantic rendition

```ts
type SemanticRendition = {
  kind: "semantic-html";
  chapters: Array<{
    chapterId: string;
    title: string;
    href: string;
    firstAnchor: string;
    lastAnchor: string;
    contentHash: string;
  }>;
  sourceMap?: string;
  searchIndex?: string;
};
```

### 9.4 Facsimile rendition

```ts
type FacsimileRendition = {
  kind: "fixed-pages";
  pageCount: number;
  pages: Array<{
    index: number;
    label?: string;
    width: number;
    height: number;
    variants: Array<{
      href: string;
      mimeType: "image/avif" | "image/webp" | "image/jpeg" | "image/png";
      pixelWidth: number;
      byteSize: number;
      integrity?: string;
    }>;
    semanticRange?: {
      start: SemanticLocation;
      end: SemanticLocation;
    };
  }>;
};
```

### 9.5 Legacy fallback rendition

```ts
type LegacyFacsimileRendition = {
  kind: "legacy-read-as-book";
  revision: string;
  manifestHref?: string;
  pageUrls?: string[];
  aspect?: number;
  pdfHref?: string;
  pageMap?: Array<{
    pageIndex: number;
    anchor: string;
  }>;
};
```

The legacy record is configuration for an adapter. It does not make the legacy
manifest the canonical V2 publication model.

### 9.6 Manifest requirements

| ID | Requirement |
|---|---|
| MAN-001 | `bookId` is stable across editions of the same publication. |
| MAN-002 | `editionId` identifies immutable content. |
| MAN-003 | `contentHash` changes when canonical content or required rendition mapping changes. |
| MAN-004 | Every TOC link resolves to a semantic chapter and anchor. |
| MAN-005 | Every rendition declares its kind. |
| MAN-006 | Fixed pages include intrinsic dimensions and available variants. |
| MAN-007 | Fixed page indices are zero-based in APIs; human labels are separate. |
| MAN-008 | All relative URLs retain their full path during resolution. |
| MAN-009 | Capabilities state which optional reader features are valid for the publication. |
| MAN-010 | Unsupported required capabilities produce an actionable error. |

## 10. Location and citation model

### 10.1 Location types

```ts
type SemanticLocation = {
  kind: "semantic";
  bookId: string;
  editionId: string;
  chapterId: string;
  anchor: string;
  text?: TextSelector;
  blockProgress?: number;
};

type FacsimileLocation = {
  kind: "facsimile";
  bookId: string;
  editionId: string;
  pageIndex: number;
  pageLabel?: string;
  point?: {
    x: number;
    y: number;
  };
};

type ReaderLocation = SemanticLocation | FacsimileLocation;
```

`blockProgress` is a value from 0 through 1 used for resume approximation
inside a semantic block. It is not part of a public citation.

### 10.2 Text selectors

```ts
type TextSelector = {
  quote: {
    exact: string;
    prefix?: string;
    suffix?: string;
  };
  position?: {
    start: number;
    end: number;
  };
};
```

Text positions are relative to a normalized text representation defined by the
annotation package. Quote context is required for durable re-anchoring when
positions move.

### 10.3 URL forms

R1 will use human-readable semantic routes:

```text
/book/{bookId}/{editionId}/{chapterSlug}#{anchor}
/book/{bookId}/{editionId}/{chapterSlug}?selection={token}#{anchor}
/book/{bookId}/{editionId}/facsimile?page={pageIndex}
```

The host application may configure a base path. The reader core owns query and
fragment serialization below that base but does not own the site's route
framework.

### 10.4 URL requirements

| ID | Requirement |
|---|---|
| URL-001 | Loading a semantic URL restores the named chapter and anchor. |
| URL-002 | Reader navigation updates browser history according to the configured navigation policy. |
| URL-003 | Back and forward restore reader locations without rebuilding unrelated state. |
| URL-004 | Public URLs do not contain private note bodies. |
| URL-005 | A selection URL carries only the data required to identify the selected public passage. |
| URL-006 | Unsupported or invalid URL state falls back to the nearest valid semantic location and reports the correction. |
| URL-007 | Switching renditions replaces only rendition-specific URL state. |
| URL-008 | A fixed printed label is presentation metadata; APIs use the fixed page index. |

### 10.5 Citation requirements

| ID | Requirement |
|---|---|
| CIT-001 | Semantic anchor URLs are the default citation links. |
| CIT-002 | Responsive screen page numbers are never presented as durable citations. |
| CIT-003 | Fixed printed page labels can supplement a semantic citation when a source map exists. |
| CIT-004 | Citation copy includes title, author attribution, edition, location label, and canonical URL. |
| CIT-005 | Citation formatting remains separate from annotation storage. |

## 11. Headless reader core

### 11.1 Responsibilities

The reader core owns:

- Manifest loading and validated publication identity.
- Current location.
- Current rendition.
- Navigation history.
- Session lifecycle.
- Reading progress.
- Reader preferences.
- Command dispatch.
- Renderer coordination.
- URL serialization and restoration.
- Typed state, events, and errors.

It does not draw content, own annotation persistence, assume React, or mutate
the global document outside a configured adapter.

### 11.2 Session creation

Conceptual API:

```ts
type CreateReaderSessionOptions = {
  manifest: PublicationManifest | URL;
  initialLocation?: ReaderLocation;
  initialRendition?: "semantic" | "facsimile" | "legacy-facsimile";
  history?: ReaderHistoryAdapter;
  preferences?: ReaderPreferences;
  signal?: AbortSignal;
};

function createReaderSession(
  options: CreateReaderSessionOptions
): ReaderSession;
```

Creation returns the session synchronously. Asynchronous loading is represented
in session state and can be aborted immediately.

### 11.3 Session state

```ts
type ReaderStatus =
  | "idle"
  | "loading-manifest"
  | "loading-location"
  | "ready"
  | "navigating"
  | "error"
  | "disposed";

type ReaderSessionState = {
  status: ReaderStatus;
  publication?: PublicationManifest;
  rendition?: "semantic" | "facsimile" | "legacy-facsimile";
  location?: ReaderLocation;
  pendingLocation?: ReaderLocation;
  progress?: ReadingProgress;
  preferences: ReaderPreferences;
  error?: ReaderError;
};
```

### 11.4 Commands

```ts
type ReaderCommand =
  | { type: "open"; location?: ReaderLocation }
  | { type: "next" }
  | { type: "previous" }
  | { type: "go-to"; location: ReaderLocation }
  | { type: "switch-rendition"; rendition: RenditionKind }
  | { type: "update-preferences"; patch: Partial<ReaderPreferences> }
  | { type: "retry" }
  | { type: "close" };
```

### 11.5 Core requirements

| ID | Requirement |
|---|---|
| CORE-001 | A session handle is available synchronously. |
| CORE-002 | Session loading and navigation accept cancellation. |
| CORE-003 | The session has one authoritative state snapshot. |
| CORE-004 | State subscriptions return an unsubscribe function. |
| CORE-005 | Disposing a session aborts pending work and prevents new commands. |
| CORE-006 | Invalid commands produce a typed rejected result or error event, not a silent no-op. |
| CORE-007 | A renderer reports visible readiness before the session enters `ready`. |
| CORE-008 | Rapid navigation commits only the latest non-aborted location. |
| CORE-009 | Switching renditions preserves an equivalent location where mapping exists. |
| CORE-010 | Approximate location mapping is identified as approximate. |
| CORE-011 | A renderer failure can be retried or changed to an available fallback rendition. |
| CORE-012 | Multiple reader sessions do not corrupt shared document state. |
| CORE-013 | The core contains no React dependency. |
| CORE-014 | The core can run in a test environment without layout APIs through adapters. |

### 11.6 Error model

```ts
type ReaderErrorCode =
  | "MANIFEST_FETCH_FAILED"
  | "MANIFEST_INVALID"
  | "SCHEMA_UNSUPPORTED"
  | "RENDITION_UNAVAILABLE"
  | "LOCATION_INVALID"
  | "CONTENT_FETCH_FAILED"
  | "CONTENT_RENDER_FAILED"
  | "NAVIGATION_ABORTED"
  | "STORAGE_UNAVAILABLE"
  | "ANNOTATION_UNRESOLVED"
  | "LEGACY_VIEWER_FAILED";
```

Errors include:

- Stable code.
- User-safe message.
- Technical cause where available.
- Retryability.
- Publication and location context where safe.

Expected aborts are represented separately from unexpected failures and are not
shown as user errors.

## 12. Renderer contract

### 12.1 Conceptual API

```ts
type ReaderRenderer = {
  kind: RenditionKind;
  mount(host: HTMLElement, context: RendererContext): RendererHandle;
};

type RendererHandle = {
  prepare(location: ReaderLocation, signal: AbortSignal): Promise<PreparedView>;
  present(view: PreparedView, transition: ReaderTransition): Promise<void>;
  getVisibleLocation(): ReaderLocation | undefined;
  focusContent(): void;
  destroy(): void;
};
```

`mount()` is synchronous so the caller owns `destroy()` immediately.

### 12.2 Renderer requirements

| ID | Requirement |
|---|---|
| REN-001 | Renderers size from their host element, not the global viewport. |
| REN-002 | Resize uses `ResizeObserver` or an injected equivalent. |
| REN-003 | Async preparation accepts `AbortSignal`. |
| REN-004 | Destroy releases observers, listeners, workers, timers, object URLs, canvases, and pending work. |
| REN-005 | Prepared content is not declared visible before required assets decode and paint. |
| REN-006 | Renderer keyboard behavior is active only when reader focus is active. |
| REN-007 | Renderer DOM uses public class or part contracts where host styling is supported. |
| REN-008 | Renderer failures are surfaced through typed core errors. |
| REN-009 | A renderer does not write canonical URL or bookmark state directly. |
| REN-010 | Reduced-motion behavior is part of the renderer contract. |

## 13. Semantic scroll renderer

### 13.1 Baseline behavior

The semantic scroll renderer is the R1 default.

It renders generated chapter HTML with:

- Native headings, paragraphs, lists, links, figures, tables, code, and notes.
- Browser text selection.
- Native find-in-page over loaded content.
- Stable `id` anchors.
- Chapter-level loading where publication size requires it.
- Location observation without rewriting content semantics.
- CSS reading themes.
- Responsive, single-column mobile layout.

### 13.2 Progressive enhancement

| ID | Requirement |
|---|---|
| SEM-001 | A direct chapter response contains useful semantic HTML before reader enhancement. |
| SEM-002 | Content order remains logical without CSS. |
| SEM-003 | Reader enhancement does not replace text with canvas or inaccessible replicas. |
| SEM-004 | Internal anchor links function without the enhanced router. |
| SEM-005 | Enhancement failure leaves the current chapter readable. |

### 13.3 Chapter loading

R1 may use one of these strategies according to publication size:

- Server/static route per chapter.
- Initial chapter plus adjacent chapter prefetch.
- Bounded chapter DOM window for very large publications.

Regardless of strategy:

| ID | Requirement |
|---|---|
| SEM-LOAD-001 | The requested chapter and anchor have priority over prefetch work. |
| SEM-LOAD-002 | Prefetch does not block input or first readable content. |
| SEM-LOAD-003 | Failed adjacent prefetch does not hide the current chapter. |
| SEM-LOAD-004 | Navigating to an unloaded chapter has visible loading and error states. |
| SEM-LOAD-005 | Unloaded chapters remain reachable by normal links. |

### 13.4 Location observation

The renderer reports the most relevant stable anchor and a local progress
fraction. It should use `IntersectionObserver` where appropriate, with a
scroll-event fallback only if required.

Location updates caused by normal reading use replace-state semantics by
default. Explicit navigation such as selecting a TOC item uses push-state
semantics.

### 13.5 Content layout

The default theme must:

- Limit measure to a readable line length.
- Support user font scaling without clipping.
- Avoid fixed content heights.
- Allow horizontal containment for wide tables and code without making the
  entire page horizontally scroll.
- Reserve image aspect ratios.
- Preserve visible focus.
- Support light, dark, and system preference.
- Support a low-decoration academic mode.
- Allow print styles independent of interactive chrome.

## 14. Reader shell and interaction

### 14.1 Shell regions

The enhanced shell contains:

- Publication title and current chapter.
- Table of contents.
- Reading progress.
- Previous and next chapter or location commands.
- Bookmark command.
- Annotation and notes access.
- Appearance preferences.
- Rendition switch when a fixed-layout rendition is available.
- Close/back behavior appropriate to embedded or routed mode.

### 14.2 Responsive behavior

| Width mode | Default shell behavior |
|---|---|
| Narrow | Single-column content; controls in compact bars or sheets |
| Medium | Single-column content with optional persistent TOC |
| Wide | Reading column with optional TOC and annotation margin |

Breakpoints are theme tokens and must be tested with content, not selected only
from device names.

### 14.3 Input requirements

| ID | Requirement |
|---|---|
| UX-IN-001 | Every action is operable by keyboard. |
| UX-IN-002 | Pointer gestures are supplementary to visible controls. |
| UX-IN-003 | Global arrow keys are not captured while focus is outside the active reader. |
| UX-IN-004 | Editable controls retain normal arrow-key behavior. |
| UX-IN-005 | Pointer interactions use Pointer Events rather than separate mouse and touch implementations. |
| UX-IN-006 | Touch behavior preserves native vertical scrolling. |
| UX-IN-007 | Target sizes meet WCAG 2.2 minimums, with larger defaults where practical. |
| UX-IN-008 | Disabled navigation communicates its state to assistive technology. |

### 14.4 Motion

| ID | Requirement |
|---|---|
| UX-MOT-001 | System `prefers-reduced-motion` is honored on first use. |
| UX-MOT-002 | The reader provides a persistent motion preference. |
| UX-MOT-003 | Reduced motion removes curl and large spatial movement. |
| UX-MOT-004 | Essential loading feedback remains understandable without animation. |
| UX-MOT-005 | Motion preference is applied before an optional renderer starts. |

### 14.5 Modal and embedded modes

The reader can be:

- A routed full-page reading application.
- An embedded region.
- A modal rendition viewer.

Modal mode must:

- Move focus to an appropriate element inside.
- Contain focus.
- Make background content inert.
- Close on Escape unless a nested interaction consumes it.
- Restore focus to the invoking control.
- Support only one global scroll lock owner through a shared overlay manager.

Embedded and routed modes must not lock body scrolling automatically.

## 15. Preferences and resume

### 15.1 Preference model

```ts
type ReaderPreferences = {
  colorScheme: "system" | "light" | "dark";
  readingMode: "book" | "academic";
  fontFamily: "serif" | "sans";
  fontScale: number;
  lineHeight: number;
  contentWidth: "narrow" | "standard" | "wide";
  motion: "system" | "reduced" | "full";
};
```

Allowed ranges are enforced by the UI and storage validator.

### 15.2 Requirements

| ID | Requirement |
|---|---|
| PREF-001 | Preferences apply without changing canonical content. |
| PREF-002 | Preferences persist locally by schema version. |
| PREF-003 | Invalid stored values are rejected and reported through diagnostics. |
| PREF-004 | Font scaling supports at least 200 percent text resizing without lost content or function. |
| PREF-005 | Last location is stored by `bookId` and `editionId`. |
| PREF-006 | Opening an explicit deep link takes precedence over auto-resume. |
| PREF-007 | Auto-resume never changes the URL before the reader can determine whether an explicit location was requested. |
| PREF-008 | Storage failure does not prevent reading. |

`localStorage` is sufficient for preferences and last location because these
records are small and accessed synchronously at startup.

## 16. Bookmarks

### 16.1 Bookmark model

```ts
type Bookmark = {
  bookmarkId: string;
  schemaVersion: 1;
  bookId: string;
  editionId: string;
  location: ReaderLocation;
  label?: string;
  excerpt?: string;
  createdAt: string;
  updatedAt: string;
};
```

### 16.2 Requirements

| ID | Requirement |
|---|---|
| BM-001 | A reader can add and remove a bookmark at the visible semantic location. |
| BM-002 | A reader can assign or edit a short label. |
| BM-003 | Bookmarks persist locally in IndexedDB. |
| BM-004 | Bookmark lists are grouped by publication and edition. |
| BM-005 | Opening a bookmark restores its location or reports why it cannot. |
| BM-006 | Bookmarks from another edition are not silently attached to the current edition. |
| BM-007 | Duplicate bookmark behavior is deterministic and documented. |
| BM-008 | Deleting a bookmark requires an explicit action but not a disruptive confirmation when undo is available. |

The V3 beta stores its small edition-scoped bookmark array in `localStorage`.
V3-413 remains responsible for migration to the versioned IndexedDB model above
before production promotion.

## 17. Highlights and notes

### 17.1 Annotation model

```ts
type Annotation = {
  annotationId: string;
  schemaVersion: 1;
  bookId: string;
  editionId: string;
  motivation: "highlighting" | "commenting";
  target: {
    chapterId: string;
    anchor: string;
    selector: TextSelector;
  };
  body?: {
    format: "text/markdown";
    value: string;
  };
  style?: {
    color: "yellow" | "blue" | "green" | "pink";
    treatment: "highlight" | "underline";
  };
  createdAt: string;
  updatedAt: string;
};
```

The model aligns with the selector concepts in the
[Web Annotation Data Model](https://www.w3.org/TR/annotation-model/) without
requiring a remote annotation server.

The V3 beta stores chapter, source anchor, exact quote, optional plain-text
note, and timestamp. Context/position selectors, Markdown rendering, update
timestamps, style choices, and IndexedDB migration remain V3-413 production
work.

### 17.2 Creation

| ID | Requirement |
|---|---|
| ANN-CREATE-001 | A reader can create a highlight from a non-empty semantic text selection. |
| ANN-CREATE-002 | Selection across unsupported structural boundaries is rejected with an explanation. |
| ANN-CREATE-003 | The stored target includes anchor, exact quote, context, and normalized positions where available. |
| ANN-CREATE-004 | A reader can add or edit a Markdown note. |
| ANN-CREATE-005 | A reader can choose an available highlight color and treatment. |
| ANN-CREATE-006 | Annotation creation is keyboard accessible. |
| ANN-CREATE-007 | Annotation data remains local in R1. |

### 17.3 Restoration and re-anchoring

Resolution order:

1. Match edition, chapter, and anchor.
2. Match stored text position and exact quote.
3. Search the anchor block for exact quote plus prefix/suffix context.
4. Mark unresolved rather than attach to uncertain text.

| ID | Requirement |
|---|---|
| ANN-RES-001 | An exact valid target restores deterministically. |
| ANN-RES-002 | Re-anchoring never silently selects a different quote. |
| ANN-RES-003 | Unresolved annotations remain available in the notes list. |
| ANN-RES-004 | The UI explains that unresolved notes are not attached to current text. |
| ANN-RES-005 | A reader can delete or manually recreate an unresolved annotation. |
| ANN-RES-006 | The resolver is unit tested against content insertion, deletion, and repeated quotes. |

### 17.4 Presentation

- Highlights must preserve readable contrast.
- Color is not the only indicator of annotation state.
- Pencil-style underline is a CSS presentation over a semantic range.
- Desktop margin notes are optional at wide widths.
- Mobile notes use an accessible popover, sheet, or dedicated notes view.
- Annotation controls must not interfere with native selection handles.

### 17.5 Local storage

Annotations use IndexedDB because they are structured collections that may grow
beyond preference-sized data.

| ID | Requirement |
|---|---|
| ANN-STORE-001 | Database and record schemas are versioned. |
| ANN-STORE-002 | Migrations are transactional. |
| ANN-STORE-003 | A failed migration does not delete the existing database. |
| ANN-STORE-004 | Storage quota or availability errors are visible and do not claim success. |
| ANN-STORE-005 | No annotation content leaves the device in R1. |

## 18. Annotation export

### 18.1 Export format

R1 exports UTF-8 Markdown with YAML front matter or an equivalent documented
metadata block.

Example:

```markdown
---
bookId: governing-pandora
editionId: "2026-08"
title: Governing Pandora
exportedAt: 2026-08-27T18:00:00Z
---

## Chapter 3: Institutional Responses

> Exact selected quotation.

My note in Markdown.

- Location: `institutional-responses#oversight-models`
- Edition: `2026-08`
- Source: https://example.org/book/...
- Created: 2026-08-20T14:00:00Z
```

### 18.2 Requirements

| ID | Requirement |
|---|---|
| EXP-001 | A reader can export all local annotations for one publication and edition. |
| EXP-002 | Export includes title, authors, edition, canonical location, quote, note, style, and timestamps where available. |
| EXP-003 | Export ordering follows publication order, then annotation creation order. |
| EXP-004 | Unresolved annotations are included and marked unresolved. |
| EXP-005 | Export escapes untrusted text so it cannot alter metadata structure unexpectedly. |
| EXP-006 | Export works without a backend. |
| EXP-007 | An empty export state is explained rather than downloading a misleading success file. |

## 19. Legacy facsimile fallback

### 19.1 Purpose

The fallback preserves access to the current visual page-turn viewer while V2
is evaluated. It is not the canonical semantic renderer and does not inherit
R1 annotation promises.

### 19.2 Integration

The V2 host can configure a `legacyFacsimile` rendition in the publication
manifest. The legacy adapter:

- Loads only when the reader selects the legacy rendition.
- Calls only the legacy public API.
- Applies integration compatibility outside the legacy source.
- Passes page URLs, aspect, start page, title, and PDF URL.
- Receives page-change and close callbacks where supported.
- Maps fixed pages to semantic anchors where mapping exists.
- Returns control and focus to V2 when closed.

### 19.3 Requirements

| ID | Requirement |
|---|---|
| LEG-001 | V2 does not modify legacy package source. |
| LEG-002 | Legacy code is absent from the default semantic-reader bundle. |
| LEG-003 | A legacy load failure leaves the semantic rendition available. |
| LEG-004 | Legacy opening and closing preserve V2 session ownership. |
| LEG-005 | The adapter restores focus after close. |
| LEG-006 | The adapter prevents overlapping legacy viewers from one session. |
| LEG-007 | The adapter identifies the pinned legacy revision in diagnostics. |
| LEG-008 | Legacy limitations are documented, including raster accessibility and long-book loading. |
| LEG-009 | V2 bookmarks and annotations do not claim unsupported precision inside an unmapped legacy page. |
| LEG-010 | Removing the adapter is a separately approved migration. |

### 19.4 Compatibility fixes

The known UMD/ESM example issue and vulnerable PDF.js CLI dependency should be
fixed for any maintained legacy release. Such fixes do not authorize a rewrite
or overwrite. They must remain isolated and independently reversible.

## 20. New facsimile renderer prototype

### 20.1 Resource window

The prototype will begin with:

- Current page or spread.
- Previous page or spread.
- Next page or spread.
- One additional prefetch candidate in the navigation direction.

The final window is determined by measurement.

### 20.2 Requirements for promotion

| ID | Requirement |
|---|---|
| FAC-P-001 | Opening does not request all page images. |
| FAC-P-002 | Decoded resources are bounded by a configurable pixel or byte budget. |
| FAC-P-003 | Least-recently-used inactive pages are evicted when the budget is exceeded. |
| FAC-P-004 | Rapid navigation aborts stale fetch and decode work. |
| FAC-P-005 | Evicted `ImageBitmap`, object URL, and canvas resources are explicitly released where applicable. |
| FAC-P-006 | Resize uses host dimensions and does not recreate the whole publication. |
| FAC-P-007 | Current content is usable before optional curl code loads. |
| FAC-P-008 | Page turn animates transforms and opacity rather than rerendering the page every frame. |
| FAC-P-009 | `will-change` is applied only around active transitions. |
| FAC-P-010 | Reduced motion uses instant replacement or a short fade. |
| FAC-P-011 | Network and decoded-resource tests pass with a representative 200-page fixture. |
| FAC-P-012 | The prototype outperforms or uses materially fewer resources than the legacy implementation under the agreed test profile. |

Failure to meet these requirements keeps the legacy fallback and semantic
renderer as the supported paths.

## 21. Semantic paged mode prototype

### 21.1 Meaning

Semantic paged mode is an optional visual organization of semantic content.
Its screen page number is transient and cannot be used as a citation.

Book presentation models physical leaf order rather than placing page 1 on the
left: front cover, inside front board/flyleaf, page 1 on the right, then
verso/recto pairs. A turning leaf has distinct outgoing and incoming semantic
faces, while the destination spread is already present underneath. Pointer
dragging changes the peel progressively and can commit, reverse, or cancel
without changing canonical content until committed.

Binding presentation may use the shared appearance contract to show boards,
spine, joints, text-block swell, raised bands, and fanned fore-edge layers.
These layers are decorative and cannot replace semantic reading order or
increase the active content window without an explicit performance review.

### 21.2 Prototype requirements

| ID | Requirement |
|---|---|
| PAG-P-001 | Content remains native semantic HTML and selectable. |
| PAG-P-002 | Stable anchors remain navigable. |
| PAG-P-003 | User font and zoom changes repaginate without losing the semantic location. |
| PAG-P-004 | Unsupported content can fall back to scroll presentation. |
| PAG-P-005 | Tables, figures, code, footnotes, and long links have documented behavior. |
| PAG-P-006 | Pagination is tested across the supported browser matrix. |
| PAG-P-007 | Reduced motion removes spatial page transitions. |
| PAG-P-008 | UI calls the value screen progress or screen page, not a durable citation page. |
| PAG-P-009 | Publication figures may configure `off`, `on`, or `popout` treatment; absent media defaults to `off`. |
| PAG-P-010 | `off` requests no figure assets; `popout` requests an asset only after activation; `on` requests it only when its semantic page becomes active. |
| PAG-P-011 | Every configured figure records immutable provenance, intrinsic dimensions, meaningful alternative text, a caption, chapter identity, and a stable insertion anchor. |
| PAG-P-012 | Pop-out dialogs trap focus natively, close by keyboard, return focus to their trigger, and release the image source when closed. |
| PAG-P-013 | Changing figure treatment repaginates only the loaded chapter window and preserves the durable semantic source location. |

The implementation may use CSS columns, explicit semantic segments, or a
combination only after comparative prototype evidence.

### 21.3 Semantic page-turn geometry promotion

The selected visual-fidelity direction ports the useful StPageFlip fold,
clipping, and shadow mathematics into V2 without adopting StPageFlip's page
collection, DOM ownership, continuous render loop, or all-page lifecycle.

| ID | Requirement |
|---|---|
| TURN-P-001 | Canonical publication content remains native semantic HTML; the turn engine neither rasterizes content nor becomes a content authority. |
| TURN-P-002 | V2 continues to own pagination, stable anchors, history, focus, accessibility, and page-to-leaf content mapping. |
| TURN-P-003 | Fold calculation is a deterministic, renderer-neutral TypeScript module with no DOM, timer, or global-browser dependency. |
| TURN-P-004 | Only the current spread, destination underlay, moving front and back faces, and bounded shadow layers are mounted during a turn. |
| TURN-P-005 | Forward and backward turns expose the correct distinct semantic content on every visible face without mirrored text or duplicate IDs. |
| TURN-P-006 | The binding edge stays visually attached within 2 CSS pixels during top-corner, bottom-corner, automatic, committed, reversed, and cancelled turns. |
| TURN-P-007 | Pointer input changes presentation continuously, but canonical location, history, and focus change only after a committed turn settles. |
| TURN-P-008 | Pointer, keyboard/button, and corner-preview motion use the same geometry solver and face projection rather than separate visual approximations. |
| TURN-P-009 | Resize, breakpoint, font-size, and content repagination safely cancel or settle active geometry before rebuilding pages. |
| TURN-P-010 | Reduced motion bypasses spatial folding and preserves an understandable immediate end state. |
| TURN-P-011 | The geometry path adds no implicit publication-image requests, page textures, or idle animation loop. Explicit figure requests follow PAG-P-009 through PAG-P-013; deployed runtime remains subject to the 20 kB gzip promotion gate. |
| TURN-P-012 | Active-frame work meets at least 55 FPS on the desktop reference profile and 45 FPS on the representative mobile profile without a task over 50 ms. |
| TURN-P-013 | The current CSS turn remains available as an internal rollback until the geometry path passes promotion gates; the legacy fallback remains independently available. |
| TURN-P-014 | Derived StPageFlip code and design retain the MIT copyright and permission notice in distributed source and notices. |
| TURN-P-015 | Manifest chapter boundaries start fresh semantic pages and receive a distinct chapter-opening treatment without deriving chapter identity from visual numbering alone. |

Implementation details and measurable gates are in
[SEMANTIC-PAGE-TURN-GEOMETRY-PLAN.md](./SEMANTIC-PAGE-TURN-GEOMETRY-PLAN.md).

## 22. React adapter

### 22.1 Principles

- React owns composition, not reader state semantics.
- Hooks subscribe to a public `ReaderSession`.
- Session creation is stable across ordinary renders.
- Changes to callback identity do not rebuild the reader.
- Strict Mode does not create overlapping reader instances.

### 22.2 Conceptual API

```tsx
const session = useReaderSession({
  manifest,
  initialLocation,
});

<ReaderProvider session={session}>
  <ReaderShell>
    <SemanticReader />
  </ReaderShell>
</ReaderProvider>
```

An imperative non-React API remains available.

### 22.3 Requirements

| ID | Requirement |
|---|---|
| REACT-001 | The adapter passes React Strict Mode integration tests. |
| REACT-002 | Unmount disposes subscriptions and owned sessions. |
| REACT-003 | Async work can be canceled before it resolves. |
| REACT-004 | Fresh callback or array identities do not reset reading position by themselves. |
| REACT-005 | Controlled and uncontrolled open state semantics are documented and tested. |
| REACT-006 | React is a peer dependency only of the React adapter. |

## 23. Styling and theming

### 23.1 Token groups

The theme package exposes custom properties for:

- Color and contrast.
- Typography.
- Measure and spacing.
- Paper and surface treatment.
- Borders and shadows.
- Control sizes.
- Layering.
- Motion durations.
- Annotation colors.
- Responsive shell dimensions.

### 23.2 Requirements

| ID | Requirement |
|---|---|
| CSS-001 | Default styles work without a CSS framework. |
| CSS-002 | Host applications can override documented custom properties. |
| CSS-003 | Internal selectors are namespaced. |
| CSS-004 | Themes pass contrast requirements. |
| CSS-005 | Paper textures are decorative and do not reduce readability. |
| CSS-006 | Dark and academic modes preserve annotation distinctions. |
| CSS-007 | Print styles omit interactive chrome and preserve citation anchors where practical. |
| CSS-008 | Reduced-motion tokens are applied consistently across packages. |

## 24. Accessibility requirements

### 24.1 Semantic content

| ID | Requirement |
|---|---|
| A11Y-001 | Generated pages use valid landmarks and heading hierarchy. |
| A11Y-002 | Images use meaningful alternatives or are explicitly decorative. |
| A11Y-003 | Tables use appropriate captions and header associations where supplied by source. |
| A11Y-004 | Footnote links are bidirectional and keyboard reachable. |
| A11Y-005 | The publication language and direction are present in generated HTML. |
| A11Y-006 | Native text selection and browser zoom remain available. |

### 24.2 Reader UI

| ID | Requirement |
|---|---|
| A11Y-UI-001 | All controls have accessible names and states. |
| A11Y-UI-002 | Focus order follows visual and task order. |
| A11Y-UI-003 | Focus is never hidden behind sticky controls. |
| A11Y-UI-004 | Location changes are announced politely and without announcing every scroll update. |
| A11Y-UI-005 | Error and save status are associated with the relevant task. |
| A11Y-UI-006 | Color is not the only indicator for highlights or status. |
| A11Y-UI-007 | The UI supports keyboard, switch-style sequential navigation, and touch. |
| A11Y-UI-008 | Modal behavior follows the WAI-ARIA dialog pattern. |
| A11Y-UI-009 | Forced-colors mode preserves controls and selection indicators. |
| A11Y-UI-010 | Controls do not prevent assistive technology from accessing native document structure. |

### 24.3 Conformance target

R1 targets WCAG 2.2 Level AA for the generated reader experience. Any known
exception must be documented, scoped, approved, and have an accessible
alternative. The facsimile fallback does not remove the requirement for an
equivalent semantic rendition.

## 25. Performance requirements

### 25.1 General field targets

- LCP at or below 2.5 seconds at p75.
- INP at or below 200 milliseconds at p75.
- CLS at or below 0.1 at p75.

These are overall web targets, not substitutes for reader-specific measurement.

### 25.2 Reader-specific budgets

Initial laboratory budgets for the R1 representative fixture on the agreed
mobile profile:

| ID | Budget |
|---|---|
| PERF-001 | Semantic chapter HTML is readable before optional renderer adapters load. |
| PERF-002 | Reader-core plus semantic enhancement JavaScript is at most 100 kB gzip, excluding host framework and publication content. |
| PERF-003 | Optional legacy or facsimile code is in a separate lazy chunk. |
| PERF-004 | Opening the reader does not fetch an entire facsimile publication. |
| PERF-005 | Adjacent content prefetch begins only after requested content is usable or clear idle capacity exists. |
| PERF-006 | Navigation does not create a main-thread task longer than 50 ms under the test profile. |
| PERF-007 | Container resize does not reload unrelated chapters or fixed pages. |
| PERF-008 | Image dimensions reserve layout space before decode. |
| PERF-009 | IndexedDB work is asynchronous and does not block first readable content. |
| PERF-010 | Bundle and generated-asset budgets run in CI. |

The 100 kB budget is an initial ceiling and should be reduced where
implementation evidence supports it.

### 25.3 Measurement profiles

Before release, the project will define:

- Desktop reference device.
- Mid-range mobile reference device.
- Low-memory mobile validation device or emulation.
- Network profiles.
- Short, medium, and 200-page fixed-layout fixtures.
- Small and large semantic publication fixtures.

## 26. Offline and caching

R1 may ship without a service worker. If offline support is enabled:

| ID | Requirement |
|---|---|
| OFF-001 | Offline behavior is opt-in at host integration level. |
| OFF-002 | The service worker versions caches by application and publication edition. |
| OFF-003 | It precaches the shell, manifest, current chapter, and only explicitly selected assets. |
| OFF-004 | It does not precache every fixed page by default. |
| OFF-005 | Runtime caches have entry and byte limits. |
| OFF-006 | Updates do not force mixed application versions into an active reading session. |
| OFF-007 | Readers can identify unavailable offline content and retry online. |

## 27. Privacy

| ID | Requirement |
|---|---|
| PRIV-001 | Reading semantic content requires no account. |
| PRIV-002 | R1 bookmarks and annotations remain on the device. |
| PRIV-003 | The reader sends no selection or note content to a remote service. |
| PRIV-004 | Analytics are absent or disabled by default. |
| PRIV-005 | A host must explicitly configure consented analytics. |
| PRIV-006 | Diagnostic events exclude selected text and note bodies. |
| PRIV-007 | Share actions show what content will leave the device. |
| PRIV-008 | Future synchronization, collaboration, and AI require separate privacy review. |

The V3 beta decision is recorded in
[V3-LOCAL-DATA-PRIVACY-REVIEW.md](./V3-LOCAL-DATA-PRIVACY-REVIEW.md).
It permits edition-scoped local bookmarks/annotations, explicit selected-text
sharing, and local Markdown export. It does not permit synchronization,
collaboration, identity, remote backup, analytics, or AI processing.

## 28. Security

### 28.1 Content security

| ID | Requirement |
|---|---|
| SEC-001 | Raw Markdown HTML is disabled by default. |
| SEC-002 | Allowed HTML passes a strict sanitizer. |
| SEC-003 | Generated links reject dangerous URL schemes. |
| SEC-004 | Publication manifests are schema validated before use. |
| SEC-005 | Content Security Policy does not require unsafe inline scripts. |
| SEC-006 | User-authored annotation Markdown is rendered through a safe subset. |

### 28.2 Conversion security

| ID | Requirement |
|---|---|
| SEC-CONV-001 | PDF and archive converters run with no inherited cloud or developer credentials. |
| SEC-CONV-002 | Conversion has file-size, page-count, memory, CPU, and wall-time limits. |
| SEC-CONV-003 | Conversion cannot access the network unless explicitly configured. |
| SEC-CONV-004 | Converter dependencies are pinned and vulnerability scanned. |
| SEC-CONV-005 | A conversion failure cannot publish partial artifacts. |
| SEC-CONV-006 | Generated filenames and module identifiers are validated, not interpolated unchecked. |

### 28.3 Local data security

R1 local data is not encrypted from a user or process with access to the same
browser profile. Documentation must not imply otherwise.

Exported notes may contain sensitive research. The UI must make the destination
and scope clear before download or sharing.

## 29. Observability and diagnostics

### 29.1 Local diagnostics

The reader provides opt-in development diagnostics for:

- Manifest and schema version.
- Active rendition.
- Current location without selected quote or note body.
- State transitions.
- Load and render timing.
- Abort counts.
- Storage availability.
- Annotation resolution status counts.
- Legacy revision where active.

### 29.2 Host events

The core may emit privacy-safe events:

```ts
type ReaderEvent =
  | { type: "state-changed"; state: ReaderSessionState }
  | { type: "location-changed"; location: ReaderLocation; source: string }
  | { type: "rendition-changed"; rendition: RenditionKind }
  | { type: "error"; error: ReaderError }
  | { type: "bookmark-changed"; action: "added" | "updated" | "removed" }
  | { type: "annotation-changed"; action: "added" | "updated" | "removed" };
```

Events for host integration must not contain note bodies or selected quotes by
default.

## 30. Testing strategy

### 30.1 Unit tests

Required coverage:

- Manifest validation and URL resolution.
- Stable ID generation.
- Location serialization and parsing.
- State transitions and command rejection.
- Abort and latest-navigation behavior.
- Preference validation.
- Bookmark storage.
- Text normalization and annotation re-anchoring.
- Markdown export escaping and ordering.
- CLI argument validation.

### 30.2 Integration tests

- Markdown source to complete staged edition.
- Failed build preserves prior edition.
- Static chapter page enhances successfully.
- Direct URL and browser history.
- Resume precedence versus explicit deep link.
- IndexedDB schema creation and migration.
- Legacy adapter load, failure, close, and focus restoration.
- Packed package consumption from a clean fixture.

### 30.3 Browser tests

Run against the supported engines:

- Chromium.
- Firefox.
- WebKit.

Scenarios:

- Keyboard-only reading.
- TOC and history.
- Preference changes and reload.
- Highlight, note, restore, unresolved note, and export.
- Zoom and narrow viewport.
- Orientation and host-container resize.
- Reduced motion.
- Modal focus behavior.
- Offline states if a service worker ships.

### 30.4 Accessibility tests

- Automated rules in CI.
- Semantic snapshot or role assertions.
- Focus order and modal tests.
- Forced-colors checks.
- Manual screen-reader scripts for release candidates.
- Manual reflow and 200 percent text resize.

### 30.5 Visual tests

Visual regression covers:

- Light, dark, and academic modes.
- Narrow, medium, and wide layouts.
- Annotation colors and focus.
- Tables, figures, code, footnotes, and long headings.
- Reduced-motion end states, not animation timing.

### 30.6 Performance tests

- Bundle-size checks.
- Route-to-readable and open-to-ready timings.
- Long-task collection.
- Network request count for large fixtures.
- Facsimile decoded-resource accounting in P-FAC.
- Resize and rapid-navigation stress.

## 31. CI and release

### 31.1 Pull request checks

- Formatting using the selected existing formatter.
- Type checking.
- Unit tests.
- Integration tests.
- Browser smoke tests.
- Automated accessibility checks.
- Bundle and artifact budgets.
- Manifest schema fixtures.
- Dependency and vulnerability review.
- Package dry-run and clean-consumer test.

### 31.2 Release artifacts

R1 release produces:

- Versioned ESM packages.
- Type declarations.
- Theme CSS.
- Publication CLI.
- Schema documentation.
- Migration and integration documentation.
- Static demo using packed artifacts.
- Release notes with compatibility and known limitations.

### 31.3 Versioning

- Runtime packages follow semantic versioning.
- Publication manifest schema versions independently.
- IndexedDB schema versions independently.
- The CLI records its version in build metadata, not canonical content identity.
- A legacy adapter release identifies the legacy revision it supports.

## 32. Acceptance scenarios

### AC-01 - direct semantic reading

Given a generated publication, when a reader opens a chapter URL with
JavaScript disabled, then the chapter has meaningful headings, text, links, and
images and the anchor resolves.

### AC-02 - enhanced restoration

Given a saved last location, when the reader opens the publication root without
an explicit location, then V2 offers or performs resume according to configured
policy and restores the correct semantic block.

### AC-03 - explicit link precedence

Given a saved location and a different explicit deep link, when the reader
opens the link, then the deep link wins and saved resume does not redirect it.

### AC-04 - bookmark lifecycle

Given a visible semantic location, when the reader creates, labels, reloads,
opens, and deletes a bookmark, then each state is reflected locally and no
remote request contains the bookmark.

### AC-05 - annotation lifecycle

Given a text selection, when the reader highlights it, adds a note, reloads,
and reopens it, then the correct range and note are restored.

### AC-06 - annotation re-anchoring

Given an annotation and an edition fixture with nearby inserted text, when the
resolver runs, then it finds the same exact quote using context or marks it
unresolved without attaching to another occurrence.

### AC-07 - export

Given highlights, notes, and one unresolved annotation, when the reader exports
the edition, then the Markdown contains ordered entries, provenance, canonical
locations, and an unresolved marker without executable content injection.

### AC-08 - accessibility

Given keyboard-only and screen-reader use, when a reader navigates the shell,
content, annotations, and an optional modal fallback, then focus, names, states,
reading order, Escape, and focus restoration behave according to this
specification.

### AC-09 - reduced motion

Given reduced motion at system or reader level, when the reader navigates or
opens a rendition, then page curl and large spatial transitions do not run.

### AC-10 - legacy fallback

Given a publication configured with the legacy fallback, when it is opened and
closed, then it loads separately, V2 remains intact, focus returns, and a
failure leaves semantic reading available.

### AC-11 - failed publication build

Given a valid published edition and an invalid replacement source, when the
build fails, then the valid edition remains unchanged and the CLI reports the
source and validation rule.

### AC-12 - packaged integration

Given a clean consumer fixture, when it installs packed V2 artifacts, then the
semantic reader and styles work without undeclared dependencies.

## 33. Requirement trace summary

The implementation backlog must trace work to these requirement groups:

| Group | Scope |
|---|---|
| `PUB-*` | Publication source, stable IDs, and atomic build |
| `MAN-*` | Manifest |
| `URL-*`, `CIT-*` | Location, URL, and citation |
| `CORE-*` | Headless session |
| `REN-*`, `SEM-*` | Renderer contracts and semantic reader |
| `UX-*`, `CSS-*` | Shell, input, motion, and themes |
| `PREF-*` | Preferences and resume |
| `BM-*` | Bookmarks |
| `ANN-*` | Highlights, notes, persistence, and re-anchoring |
| `EXP-*` | Export |
| `LEG-*` | Existing viewer preservation and fallback |
| `FAC-P-*`, `PAG-P-*`, `TURN-P-*` | Follow-on prototypes |
| `REACT-*` | React adapter |
| `A11Y-*` | Accessibility |
| `PERF-*`, `OFF-*` | Performance and offline |
| `PRIV-*`, `SEC-*` | Privacy and security |

## 34. Open decisions for implementation kickoff

The unavailable stakeholder response was resolved with the recommended R1
scope. The following decisions can be made during the relevant backlog stories
without changing the approved architecture:

1. Exact package manager and workspace tooling.
2. YAML parsing and Markdown AST libraries.
3. Validation-schema library or generated validator.
4. Stable generated-ID algorithm.
5. Exact static route integration for the first host site.
6. Whether resume is automatic or offered through a prompt by default.
7. Duplicate bookmark behavior.
8. Exact annotation note editor UI.
9. Initial fixture publications.
10. Whether offline support enters R1 or remains follow-on.

The following require explicit product approval if a proposed change affects
scope:

- Moving new facsimile or semantic paged mode into R1.
- Adding identity, remote data, analytics, or AI.
- Dropping semantic no-JavaScript reading.
- Replacing stable semantic citations with responsive page numbers.
- Modifying or removing the existing viewer.

## 35. Definition of done for R1

R1 is done only when:

- All R1 requirement IDs are implemented or explicitly deferred with approval.
- Acceptance scenarios AC-01 through AC-12 pass.
- The representative publication pilot is approved.
- No critical or high-severity known vulnerability affects shipped or converter
  dependencies without an approved exception.
- Supported browser and assistive technology checks pass.
- Performance and bundle budgets pass.
- Static-host deployment is documented and reproduced.
- Legacy fallback remains independently usable and unchanged.
- Migration, rollback, privacy, security, and accessibility limitations are
  documented.
