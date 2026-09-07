# Reader interaction, source, sharing, and media feature plan

| Field | Value |
|---|---|
| Status | Ready for implementation |
| Decision date | 2026-09-06 |
| Backlog | [BACKLOG.md](./BACKLOG.md), V3-418 through V3-425 |
| Primary intent | Keep readers inside the book when useful, make selected-text actions immediate and physical, and support exact, visual scholarly sharing |
| Delivery model | Incremental V3 work packages behind public capability options |
| Core constraint | Preserve the lightweight semantic SDK, static hosting, bounded loading, native text, durable locations, and local-only privacy model |

## 1. Approved direction

PageTurn V3 will add four connected capabilities:

1. **Catalog-aware source handling**
   - Known sources with approved local PageTurn editions default to the local
     reading experience.
   - The canonical external source remains visible and available.
   - Unknown sources receive a local metadata card before optional navigation.
   - Trusted embeds are explicit, allowlisted, and user activated.

2. **Contextual selected-text actions**
   - Selecting valid page text exposes Copy, Share, Highlight, and Annotate
     controls close to the selection.
   - The controls are lightweight, branded, responsive, and keyboard
     accessible.

3. **Exact, visual quote sharing**
   - A share preview combines the quote, a book-style visual clipping, citation,
     and a URL that restores and highlights the exact text.
   - Image sharing progressively enhances Web Share and clipboard behavior.

4. **Book-styled publication images**
   - Image placement and visual treatment become independent choices.
   - One optimized source asset can be rendered as original, book-toned,
     monochrome, or later duotone without pre-generating stylistic variants.

These capabilities share one exact-range selector model and one publication
identity model. They do not introduce accounts, remote annotation storage,
analytics, arbitrary website proxying, or a server-side screenshot service.

## 2. Goals

- Preserve the reader's page and location when evaluating a citation.
- Prefer a known local book or course-reading edition when one exists.
- Retain the original canonical source and provenance.
- Make the likely intents after text selection immediately discoverable.
- Render private annotations as handwritten marginalia without repagination.
- Share an exact quote with both machine-resolvable location and useful visual
  context.
- Produce a book-like share image without capturing private reader state.
- Let publication figures inherit a book's visual character without multiplying
  stored art assets.
- Keep all new heavyweight or optional work demand-loaded.
- Keep the public SDK host-configurable and independent of the demo catalog.

## 3. Non-goals

- Fetching or rewriting arbitrary websites through a runtime proxy.
- Automatically loading third-party pages, scripts, images, or metadata on
  hover.
- Matching external sources by fuzzy title alone.
- Ingesting copyrighted full text without an explicit rights basis.
- Supporting selections across unloaded chapters in the first delivery.
- Replacing native text with canvas.
- Capturing private notes or saved highlights in a shared image by default.
- Guaranteeing that every OS share target accepts image, text, and URL together.
- Pre-generating separate art files for every book appearance.
- Replacing the existing Explore annotation manager.
- Adding identity, synchronization, collaboration, moderation, or remote
  storage.

## 4. Current V3 baseline

### 4.1 External links

Local cross-chapter links are recognized and routed through V3 navigation.
External `http` and `https` links retain ordinary browser behavior and can leave
the reader completely.

### 4.2 Selection and annotations

V3 currently:

- accepts a 2 to 2,000 character selection within one composed sheet;
- records chapter, source anchor, and normalized quote;
- changes the permanent Share control to **Share selection**;
- stores local annotations with a quote, note, source anchor, and timestamp;
- marks the entire source block when it contains an annotation;
- manages and exports annotations through Explore.

The current model is not sufficient for exact-range highlights, marginalia, or
exact-text restoration after responsive repagination.

### 4.3 Sharing

V3 currently sends title, selected text, and a durable source-anchor URL through
Web Share, falling back to copied text and URL. It does not:

- show a pre-share preview;
- attach an image;
- encode an exact text selector;
- restore a temporary shared highlight;
- distinguish copied quote, copied image, and downloaded image outcomes.

### 4.4 Publication media

Media placement currently supports:

- `off`;
- `on`;
- `popout`.

On-page and pop-out images retain the original image treatment. Visual styling
is not a separate configuration axis.

## 5. Architecture

```text
Publication manifest and semantic HTML
                 |
                 +---------------------------+
                 |                           |
                 v                           v
      Source identity registry       Publication media metadata
      - canonical aliases            - placement
      - DOI / ISBN / revision         - visual kind
      - local PageTurn target         - color semantics
      - rights and provenance         - transformation rights
                 |                           |
                 v                           v
        Source-link resolver          Runtime image treatment
        - local reading               - original
        - source card                 - book-toned
        - trusted embed               - monochrome
        - direct fallback             - optional duotone

Native DOM selection
        |
        v
Versioned exact-range selector
  - source anchors and offsets
  - quote, prefix, suffix
  - edition checksum
        |
        +----------------+----------------+----------------+
        |                |                |                |
        v                v                v                v
      Copy             Share          Highlight        Annotate
                         |                |                |
                         v                +--------+-------+
                 Share composer                  |
                 - exact URL                     v
                 - book clipping          Local annotation store
                 - citation               - exact range
                 - export/share           - handwritten marginalia
```

The reader owns selection, page composition, and canonical location. Optional
host resolvers provide catalog identity and external-preview policy. The demo
catalog must not be imported by the public SDK.

## 6. Shared exact-range selector

### 6.1 Data contract

All selection-driven features use one versioned target:

```ts
type PageTurnTextTargetV1 = Readonly<{
  version: 1;
  bookId: string;
  editionId: string;
  chapterId: string;
  chapterContentHash: string;
  start: Readonly<{
    anchor: string;
    offset: number;
  }>;
  end: Readonly<{
    anchor: string;
    offset: number;
  }>;
  quote: Readonly<{
    exact: string;
    prefix: string;
    suffix: string;
  }>;
  checksum: string;
}>;
```

Offsets are Unicode code-point offsets into normalized source-block text, not
DOM node offsets or responsive page coordinates.

The checksum is the first 96 bits of SHA-256 over a versioned canonical string
containing book ID, edition ID, chapter ID, full chapter content hash, start/end
anchors and offsets, exact quote, prefix, and suffix. It validates identity and
accidental corruption; it is not an authentication mechanism. Source anchors
are unique only within a chapter and are always scoped by book, edition, and
chapter.

### 6.2 Text normalization

The selector implementation must define one reusable normalizer:

1. Read descendant text nodes in semantic DOM order.
2. Normalize text to Unicode NFC.
3. Normalize line endings.
4. Collapse Unicode whitespace runs to one ASCII space.
5. Trim only the boundaries of the complete source block.
6. Count offsets in Unicode code points.

The same function is used when capturing, resolving, testing, exporting, and
creating URLs.

For a same-block target, `quote.exact` is the normalized substring from
`start.offset` through `end.offset`. For a cross-block target:

1. use the selected tail of the start block;
2. append each complete intervening source block in semantic order;
3. append the selected head of the end block;
4. join block segments with one U+000A LINE FEED.

Prefix is taken only from text before the start offset in the start block.
Suffix is taken only from text after the end offset in the end block. Each is
limited to 32 Unicode code points.

### 6.3 Canonical checksum serialization

Create the checksum input as UTF-8 bytes of minified JSON with this exact key
order:

```text
v, b, e, c, h, sa, so, ea, eo, x, p, s
```

The values are:

```text
v  selector version (number)
b  book ID
e  edition ID
c  chapter ID
h  complete lowercase chapter content-hash string
sa start anchor
so start code-point offset (non-negative integer)
ea end anchor
eo end code-point offset (non-negative integer)
x  normalized exact quote, including U+000A cross-block separators
p  normalized prefix
s  normalized suffix
```

Strings use JSON escaping produced by `JSON.stringify`; no optional whitespace
is permitted. Hash these bytes with SHA-256, take the first 12 bytes, and encode
them as unpadded base64url.

The compact token payload uses minified JSON with this exact key order:

```text
v, b, e, c, h, sa, so, ea, eo, q
```

`h` is the first 128 bits of the lowercase chapter content hash represented as
32 hexadecimal characters. `q` is the 96-bit base64url checksum. The token is
`v1.` followed by the unpadded base64url encoding of the UTF-8 payload.

Golden vector:

```text
checksum JSON:
{"v":1,"b":"demo-book","e":"2026-08","c":"intro","h":"0000000000000000000000000000000000000000000000000000000000000000","sa":"p-1","so":6,"ea":"p-1","eo":11,"x":"world","p":"Hello ","s":"."}

q:
pbB6znXNrWUNh1mN

token:
v1.eyJ2IjoxLCJiIjoiZGVtby1ib29rIiwiZSI6IjIwMjYtMDgiLCJjIjoiaW50cm8iLCJoIjoiMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAiLCJzYSI6InAtMSIsInNvIjo2LCJlYSI6InAtMSIsImVvIjoxMSwicSI6InBiQjZ6blhOcldVTmgxbU4ifQ
```

### 6.4 Capture rules

- Selection must begin and end in stationary semantic pages.
- Decorative turn clones, reader chrome, hidden content, and dialogs are
  rejected.
- The first delivery supports one chapter and one composed spread.
- Selection may cross adjacent source blocks on that spread.
- Start and end source anchors are recorded independently.
- A live cloned `Range` may be retained only while the contextual controls are
  open; it is never durable state.
- Capture exact quote plus bounded prefix and suffix context immediately.
- Cap selected quote text at 2,000 characters.
- Revalidate the serialized target before every action.
- Collapse or repagination dismisses transient controls but does not invalidate
  a successfully serialized target.

### 6.5 Resolution order

The resolver returns:

```ts
type PageTurnTargetResolution =
  | Readonly<{
      state: "resolved";
      target: PageTurnTextTargetV1;
      strategy: "position" | "quote-context" | "unique-quote";
      range: Range;
    }>
  | Readonly<{
      state: "unresolved";
      target: PageTurnTextTargetV1;
      reason:
        | "edition-mismatch"
        | "missing-anchor"
        | "position-mismatch"
        | "quote-mismatch"
        | "ambiguous-quote";
    }>;
```

Resolve a stored target by:

1. exact edition;
2. exact start/end anchors and positions with matching checksum;
3. exact quote with prefix/suffix context;
4. unique exact quote within the source block;
5. unresolved.

Never silently attach a note or highlight to a different matching quote. Source
anchor fallback is navigation behavior only: a shared link may navigate to its
anchor and report degraded exact matching, but the target result remains
`unresolved`, no exact highlight is painted, and no persistent annotation is
reattached.

### 6.6 Persistent annotation target state

Persistent highlights and notes use a discriminated target state:

```ts
type PageTurnStoredTarget =
  | Readonly<{
      state: "resolved";
      selector: PageTurnTextTargetV1;
    }>
  | Readonly<{
      state: "unresolved";
      legacy: Readonly<{
        chapterId: string;
        anchor: string;
        quote: string;
      }>;
      reason:
        | "edition-mismatch"
        | "missing-anchor"
        | "quote-mismatch"
        | "ambiguous-quote"
        | "invalid-legacy-record";
    }>;
```

Unresolved records are quarantined data, not approximate selectors. They remain
visible in Explore and export, but cannot render a page highlight or marginal
note until the reader explicitly recreates or deletes them.

## 7. Catalog-aware source handling

### 7.1 Source registry

The SDK accepts an optional host-provided source registry or resolver.

```ts
type PageTurnSourceRecord = Readonly<{
  id: string;
  canonicalUrl: string;
  aliases?: readonly string[];
  doi?: string;
  isbn?: readonly string[];
  repository?: Readonly<{
    url: string;
    revision?: string;
  }>;
  title: string;
  publisher?: string;
  publicationDate?: string;
  sourceType:
    | "article"
    | "book"
    | "chapter"
    | "dataset"
    | "document"
    | "repository"
    | "video"
    | "website";
  localReading?: Readonly<{
    kind: "full-edition" | "excerpt" | "source-guide";
    bookId: string;
    editionId: string;
    chapterId?: string;
    anchor?: string;
    shelfHref?: string;
    rights: Readonly<{
      status: "approved";
      scope: "full-edition" | "excerpt" | "source-guide";
      basis: string;
      reviewedAt: string;
    }>;
  }>;
  courseReadingIds?: readonly string[];
  relation?: "sameAs" | "isVersionOf" | "isPartOf";
  rights?: Readonly<{
    status: "approved" | "link-only" | "unknown";
    license?: string;
    attribution?: string;
  }>;
  reviewedAt: string;
}>;

type PageTurnSourceContext = Readonly<{
  bookId: string;
  editionId: string;
  chapterId: string;
  anchor: string;
  courseReadingIds: readonly string[];
}>;

type PageTurnSourceResolution =
  | Readonly<{
      kind: "local-publication";
      record: PageTurnSourceRecord;
      target: NonNullable<PageTurnSourceRecord["localReading"]>;
    }>
  | Readonly<{
      kind: "external-card";
      record?: PageTurnSourceRecord;
      url: string;
    }>
  | Readonly<{
      kind: "ambiguous";
      candidates: readonly PageTurnSourceRecord[];
      url: string;
    }>
  | Readonly<{ kind: "direct-external"; url: string }>;

type PageTurnSourceResolver = (
  url: URL,
  context: PageTurnSourceContext,
  signal: AbortSignal,
) =>
  | PageTurnSourceResolution
  | Promise<PageTurnSourceResolution>;
```

### 7.2 Deterministic resolution

Resolve in this order:

1. exact pinned URL or repository revision;
2. normalized canonical URL or declared alias;
3. normalized DOI;
4. normalized ISBN;
5. explicit course-reading mapping;
6. no match.

Do not use fuzzy title, publisher, author, or text similarity as an automatic
navigation decision.

Normalization rules:

- accept only `http:` and `https:` source URLs;
- lowercase scheme and host, convert internationalized hosts to their ASCII
  representation, and remove default ports;
- normalize dot segments and percent-encoding of unreserved URL characters;
- retain path case and query parameters unless a reviewed alias explicitly
  removes or replaces them;
- ignore fragments for work-level matching but retain them for the eventual
  canonical-source action;
- normalize DOI by removing a `doi:` or `https://doi.org/` prefix and
  lowercasing it;
- normalize ISBN to digits plus a possible final `X` and validate its checksum;
- require an exact declared repository URL and revision when a record pins a
  revision.

An ambiguous result never chooses a destination. It presents the ordinary
external card and may list reviewed candidates for explicit selection.

Resolver errors and aborts surface through the normal reader status path and
retain the authored direct link; they never become success-shaped fallbacks.

### 7.3 Known local sources

When a source has an approved `localReading`:

- label it **Available in the PageTurn Library**;
- make **Read in PageTurn** the primary action;
- target the mapped immutable edition, chapter, and source anchor;
- retain **Open original source**;
- optionally expose **View on shelf**;
- show edition/revision and source relationship;
- distinguish a complete local edition from a source guide or excerpt.

In the hosted reader, activating an external citation always opens the source
card. For a known source or course reading, **Read in PageTurn** is the first,
visually primary, initially focused action. This is the decided meaning of
"defaults to the local reading": no additional resolution choice is required,
but navigation does not occur before the reader can see the edition and
canonical-source alternatives.

The public SDK remains backward compatible:

- `sourceLinkMode: "direct"` is the default when no resolver is supplied;
- `sourceLinkMode: "card"` requires a resolver and uses the card-first flow;
- a host may explicitly configure `"direct-local"` after accepting the
  provenance tradeoff.

Local reading fails closed:

- `full-edition` requires local rights scope `full-edition`;
- `excerpt` requires local rights scope `excerpt` or `full-edition`;
- `source-guide` requires local rights scope `source-guide`;
- missing, expired, mismatched, or non-approved local rights disables the local
  action.

Top-level source rights may remain `link-only` while an independently authored
source guide has approved `source-guide` rights. Link-only or unknown source
rights never authorize a local excerpt or full edition.

### 7.4 External source cards

Unknown or link-only sources open a lightweight local card containing:

- the authored citation text;
- normalized registrable domain;
- source type;
- reviewed title/publisher/date when present in metadata;
- **Open source**;
- **Copy link**;
- an explicit external-navigation indicator.

The card performs no client-side metadata fetch. It is fully functional from
the link text and URL alone.

Richer metadata is supplied by a reviewed manifest record. A future editorial
refresh command may fetch metadata, but it must:

- run outside the reader;
- reject private/reserved network addresses and unsafe redirects;
- sanitize all fields;
- record retrieval date and provenance;
- pin or locally store approved images;
- leave deterministic publication builds.

### 7.5 Optional embedded previews

Embedded preview is a provider adapter, not generic baseline behavior.

```ts
type PageTurnExternalPreviewProvider = Readonly<{
  id: string;
  origins: readonly string[];
  pathPrefixes: readonly string[];
  sandbox: readonly string[];
  permissions: readonly string[];
  readiness:
    | Readonly<{
        kind: "message";
        origin: string;
        messageType: string;
        timeoutMs: number;
      }>
    | Readonly<{
        kind: "timeout";
        timeoutMs: number;
      }>;
}>;
```

Normative cooperative-provider handshake:

1. Generate 128 bits of cryptographically random nonce data and encode it as
   unpadded base64url.
2. Append `pageturn_parent_origin` and `pageturn_nonce` query parameters through
   the provider's reviewed URL template.
3. The provider posts only:

   ```ts
   {
     type: "pageturn-preview-ready";
     version: 1;
     nonce: string;
   }
   ```

4. The parent accepts readiness only when:
   - `event.origin` exactly equals the configured provider origin;
   - `event.source` equals the created iframe's `contentWindow`;
   - payload is a plain object with exactly the expected version, type, and
     nonce;
   - nonce comparison succeeds;
   - the message arrives before `timeoutMs`.
5. The listener and nonce are removed on success, timeout, close, navigation,
   or destroy.

Providers unable to accept these parameters and send this message must use
`kind: "timeout"` and cannot claim confirmed readiness.

It requires:

- an explicit **Load external preview** action;
- an allowlisted provider and URL pattern;
- a disclosure naming the third party before loading;
- strict `sandbox`;
- `referrerpolicy="no-referrer"`;
- minimal Permissions Policy;
- host-documented `frame-src` requirements, because the SDK cannot set the
  embedding application's response headers;
- a provider-specific readiness mode:
  - cooperative providers send an origin-checked, nonce-bound, schema-validated
    `postMessage`;
  - non-cooperative providers use a bounded timeout and never claim that
    framing refusal was positively detected;
- a direct source link that remains visible while loading and after timeout.

Cross-origin CSP or `X-Frame-Options` refusal cannot be detected reliably in a
generic client. The UI therefore says **Preview did not become ready** rather
than asserting why it failed.

The public SDK default remains source card or direct link.

## 8. Contextual selection action pill

### 8.1 Actions

The pill contains four controls in this order:

1. Copy
2. Share
3. Highlight
4. Annotate

Use inline SVG icons to avoid an icon-library dependency. Every control has a
programmatic name and a short visual tooltip.

### 8.2 Visual design

- Compact parchment or dark-ink pill.
- Existing brass accent and restrained physical-page shadow.
- No permanent reader-layout shift.
- Approximately 34 to 36 CSS-pixel controls for precise pointers.
- Minimum 44 CSS-pixel hit targets for touch.
- Visible focus and forced-colors support.
- No animation beyond a short fade/scale; reduced motion disables it.

### 8.3 Desktop placement

- Derive the union of usable `Range.getClientRects()`.
- Prefer centered above the selection.
- Flip below when top space is insufficient.
- Clamp within the reader viewport and page shell.
- Do not cover selection text, page-turn corners, or the binding.
- When no collision-free adjacent placement exists, use the bottom dock. If the
  dock would also cover the selection or native controls, keep actions available
  through the permanent reader toolbar and hide the contextual pill.

### 8.4 Touch placement

- Preserve native selection handles and operating-system text selection.
- Wait for selection geometry to stabilize.
- Use a nearby pill only when it does not cover handles.
- Otherwise dock above the visual viewport's bottom safe area.
- Reposition for the software keyboard and `visualViewport` changes.

Native Copy/Share actions may coexist. PageTurn must not disable the browser's
selection menu merely to force its custom UI.

### 8.5 Accessibility

Use the WAI-ARIA toolbar pattern:

- `role="toolbar"` and an accessible name;
- one tab stop into the toolbar;
- roving `tabindex`;
- Left/Right and optional Home/End navigation;
- Enter/Space activation;
- Escape dismissal;
- focus restoration to the selected passage.

Pointer selection does not steal focus. Keyboard selection announces
**Selection actions available** through a polite live region and exposes a
documented command to move focus into the toolbar.

The default command is `Alt+Shift+A` (`Option+Shift+A` on macOS), exposed in the
button description and configurable by the host. When invoked:

- the serialized selection remains the target even if native selection
  collapses;
- the first enabled toolbar control receives focus;
- Escape returns focus with `preventScroll` to the start source block;
- a normally non-focusable source block receives temporary `tabindex="-1"`
  while it is the focus-return target, then the attribute is removed.

### 8.6 Dismissal

Dismiss the pill on:

- collapsed or invalid selection;
- Escape;
- outside pointer action;
- page turn;
- navigation;
- repagination;
- opening another modal/popover;
- reader destroy.

## 9. Action behavior

### 9.1 Copy

- Copy normalized selected text.
- Show a short success status.
- Do not create storage.
- If Clipboard API is unavailable, retain native selection and expose a manual
  copy instruction instead of reporting success.

### 9.2 Highlight

- Store the exact target with an empty note body.
- Render only the exact range, not the complete paragraph.
- Offer a short Undo action.
- Keep all data local and edition scoped.
- Use a subtle ink/highlighter treatment that remains legible in forced colors.

### 9.3 Annotate

- Open a compact editor in the physical outer margin next to the selection.
- Save an exact target plus note body.
- Display the saved note as handwritten marginalia.
- Keep Explore as the full manager and export surface.

### 9.4 Share

- Open the share composer.
- Do not immediately invoke the OS share surface.
- Preserve the serialized selection while the composer is open.

## 10. Handwritten marginalia

### 10.1 Placement

- Left-page notes use the left outer margin.
- Right-page notes use the right outer margin.
- Never place marginalia in the gutter.
- Position vertically from the resolved range geometry.
- Render in an absolute page annotation layer so notes do not alter body
  pagination.

### 10.2 Display

- Show a 2 to 4 line handwritten preview.
- Selecting or focusing it opens the full semantic note in a lightweight
  popover.
- Mark the referenced text with a restrained pencil or highlight treatment.
- Permit an independent **Show marginalia** toggle without deleting data.

### 10.3 Collisions

For each page:

1. Sort notes by requested vertical position and creation time.
2. Place each note no higher than its target when possible.
3. Shift subsequent notes to maintain minimum separation.
4. Backtrack upward when the final note exceeds the safe page area.
5. Collapse an unresolved dense cluster into an accessible `N notes` marker.

Marginalia must not overlap body text, folios, running heads, another note, or
page-turn corner controls.

### 10.4 Responsive behavior

- Wide spread: show the handwritten preview in the outer margin.
- Narrow single page: show a compact handwritten marker and open the note in a
  popover or bottom sheet.
- Very narrow/mobile: do not reduce body width or scale handwriting below the
  accessible minimum.
- Recompute placement after resize or repagination while preserving semantic
  targets.

### 10.5 Page turns

Marginalia is visually part of its page:

- moving-page decorative clones include inert annotation previews;
- destination/revealed clones include corresponding inert previews;
- decorative copies are `aria-hidden`, contain no IDs, and receive no focus;
- the stationary semantic page is the only accessible instance.

### 10.6 Typography

Expose:

```ts
type PageTurnAnnotationAppearance = Readonly<{
  fontFamily?: string;
  fontScale?: number;
  inkColor?: string;
  showMarginalia?: boolean;
}>;
```

The zero-download handwritten fallback is:

```css
"Segoe Print", "Bradley Hand", cursive
```

Hosts may provide a licensed WOFF2 font. Core does not bundle a handwriting
font. A standard-font reader preference remains available because script fonts
can reduce legibility for dyslexic and low-vision readers.

The underlying note remains ordinary semantic text regardless of visual font.

## 11. Exact quote URLs

### 11.1 URL form

Use both durable structure and exact-text enhancement:

```text
/v3/
  ?book=<book-id>
  &edition=<edition-id>
  &chapter=<chapter-id>
  &selection=<versioned-compact-selector>
  #<source-anchor>:~:text=<prefix-,start,end,-suffix>
```

The source anchor is the durable fallback. The Text Fragment provides
browser-native exact-text highlighting when the text is present during
navigation. The query selector lets V3 restore the highlight after asynchronous
chapter loading.

### 11.2 Compact selector token

The query token contains:

- version;
- start and end anchor identity;
- normalized offsets;
- the chapter content-hash prefix;
- the 96-bit selector checksum.

It does not contain a private annotation note. Avoid duplicating the complete
quote in the query because the Text Fragment already exposes the public source
text and URLs have practical length limits.

Canonical token encoding is compact JSON with fixed short keys, UTF-8 encoded
and base64url encoded without padding. Encoders emit keys in the specified
order; decoders reject unknown versions, duplicate keys, negative/non-integer
offsets, invalid base64url, mismatched editions, and tokens longer than 512
bytes. The complete shared URL is capped at 2,048 characters.

### 11.3 Text Fragment generation

- Percent-encode delimiter characters.
- Use bounded start/end terms instead of the complete 2,000-character quote.
- Add prefix/suffix when needed to disambiguate repeated text.
- Preserve logical text order for bidirectional content.
- Limit the combined start, end, prefix, and suffix terms to 160 Unicode code
  points before percent encoding.
- Enforce the 2,048-character URL ceiling.
- Omit the text directive when a safe compact directive cannot be generated.
- Always retain the source anchor and app selector.

### 11.4 Receiving behavior

1. Validate the explicit `edition` parameter and load that immutable
   edition/chapter.
2. Decode and validate the app selector.
3. Resolve the exact range.
4. Navigate to its responsive page.
5. If resolved, render a temporary **shared quote** highlight distinct from
   private highlights.
6. If unresolved, navigate only to the source anchor and announce degraded
   exact matching without attaching a highlight.
7. Do not store the shared highlight unless the reader explicitly chooses
   Highlight or Annotate.

The URL references a semantic passage, not a stable responsive page number.

## 12. Share composer

### 12.0 Publication share policy

Visual and excerpt sharing is fail closed.

```ts
type PageTurnSharePolicy = Readonly<{
  location: "public" | "disabled";
  quote: Readonly<{
    permitted: boolean;
    maximumCharacters: number;
  }>;
  visual: Readonly<{
    permitted: boolean;
    maximumContextCharacters: number;
    sourceImages: "none" | "same-origin-approved";
  }>;
}>;
```

Defaults when policy is absent:

- public canonical location sharing may remain available when the host can
  produce a public URL;
- quote sharing is disabled;
- visual export is disabled;
- source images are excluded.

Before V3-421 is enabled for the hosted catalog, every public publication must
receive an explicit policy. `maximumCharacters` is capped by the SDK at 2,000;
the recommended publication default is 800. Visual context defaults to at most
240 additional public characters.

Local-only, authenticated, expiring, or non-public reader URLs are not shared
unless the host provides an explicit public canonical URL. Rights policy is
checked before generating a Text Fragment, clipping, file, clipboard payload,
or download.

Capability matrix:

| Location | Quote | Visual | Available share result |
|---|---|---|---|
| Disabled | Any | Any | Share is unavailable; Copy remains local |
| Public | Not permitted | Any | Anchor-only URL; no selector token, Text Fragment, quote payload, temporary exact highlight, or clipping |
| Public | Permitted | Not permitted | Exact selector URL plus quote text; no image generation |
| Public | Permitted | Permitted | Exact selector URL, quote text, and book clipping |

`visual.permitted: true` is invalid when `quote.permitted` is false. Both the
Text Fragment and app-readable selector identify exact text and therefore count
as quote sharing. Preview content and controls are conditional on this matrix;
they never imply unavailable capabilities.

### 12.1 Preview

Show:

- selected quote;
- book title and authors;
- chapter title;
- immutable edition;
- source attribution;
- exact-passage URL;
- generated book-style visual clipping;
- a disclosure of exactly what will leave the browser.

Private notes and existing private highlights are excluded. The current
selection highlight is included because it is the content being shared.

### 12.2 Book-style visual clipping

The production default is a deterministic local renderer, not a screenshot of
the live reader.

Render:

- active paper color, age, texture, and optional ruling;
- configured body and heading typography;
- selected quote with a visible highlight;
- a limited amount of surrounding public source context;
- running title or chapter;
- book title/author attribution;
- source URL or short citation;
- restrained page edge or gutter cue.

Generate one bounded PNG on demand. Use a small internal Canvas 2D renderer
rather than a large DOM screenshot dependency.

Requirements:

- wait for the selected font when available, with a deterministic fallback;
- cap dimensions, device scale, byte size, and render duration;
- render only public publication content;
- exclude toolbars, dialogs, bookmarks, annotations, local storage, and
  selection controls;
- never read cross-origin pixels;
- cancel safely on close, navigation, or destroy.

A host may later opt into literal DOM capture, but it is experimental because
fonts, pseudo-elements, transforms, filters, cross-origin images, and
high-device-pixel-ratio memory make it unreliable.

### 12.3 Share and export actions

- **Share...**
  - Prepare the preview before the final user activation.
  - On a second explicit click, test `navigator.canShare()` with the exact
    `File` payload.
  - Share image, quote, and URL when all members are supported.
  - Fall back without claiming unsupported members were included.
- **Copy quote + link**
  - Copy plain text plus exact URL.
- **Copy image**
  - Use async Clipboard API when PNG clipboard writing is supported.
- **Download image**
  - Use an object URL and `download` when the browser and embedding policy
    support it.
  - Otherwise open the generated image in a new top-level tab and provide
    platform-appropriate save/long-press instructions.
  - Sandboxed hosts must explicitly allow downloads.

Treat OS share cancellation as cancellation, not an error. Embedded hosts must
document required `web-share` and clipboard Permissions Policy.

Shared text remains available outside the image because image text alone is not
an accessible substitute.

## 13. Book-styled source images

### 13.1 Separate configuration axes

Replace the single conceptual media choice with two independent values:

```ts
type PageTurnBookMediaDisplay = "off" | "on-page" | "pop-out";

type PageTurnBookMediaStyle =
  | "original"
  | "book-toned"
  | "monochrome"
  | "duotone";
```

Existing `off`, `on`, and `popout` inputs remain backward compatible through
normalization.

Publication defaults and per-figure overrides are supported:

```ts
type PageTurnBookMediaFigure = Readonly<{
  // Existing fields omitted
  originalSrc?: string;
  style?: PageTurnBookMediaStyle;
  visualKind?:
    | "chart"
    | "diagram"
    | "facsimile"
    | "map"
    | "photo"
    | "portrait";
  colorSemantics?: "essential" | "decorative";
  transformPermitted?: boolean;
  exportPermitted?: boolean;
  rights?: Readonly<{
    license: string;
    attribution: string;
  }>;
}>;
```

### 13.2 Easy, low-art implementation

Use one neutral optimized derivative per image and apply visual style at
runtime.

The derivative is technical optimization, not a separate artistic version:

- bounded intrinsic dimensions;
- normalized orientation;
- normalized color profile;
- modern same-origin format where rights permit;
- original URL retained for provenance and full-resolution viewing.

`book-toned` combines:

- CSS saturation, sepia, contrast, and brightness filters;
- a paper-color overlay;
- `mix-blend-mode` within an isolated image wrapper;
- subtle configured page texture, vignette, border, and caption treatment.

`monochrome` maps the image toward configured page ink and paper.

`duotone` may use a reusable inline SVG `feColorMatrix`/component-transfer
filter after browser and print verification.

No style-specific raster variants are generated.

### 13.3 Defaults and safeguards

- Photos and portraits may default to `book-toned` only when
  `transformPermitted` is explicitly `true`.
- Archival images may default to `monochrome` only when
  `transformPermitted` is explicitly `true`.
- Charts, heatmaps, maps, flags, and scientific diagrams with meaningful color
  default to `original`.
- `colorSemantics: essential` forces Original unless the user explicitly
  previews another treatment.
- Missing rights metadata or any value other than
  `transformPermitted: true` forces Original.
- Transformation and export permissions are independent:
  - styling requires `transformPermitted: true`;
  - sharing or downloading the unchanged original requires
    `exportPermitted: true`;
  - cropping, recoloring, or including an image in a book clipping requires
    both values to be `true`, same-origin bytes, and a share policy that permits
    source images.
- Pop-out defaults to Original even when the on-page version is styled.
- Provide **View original** and preserve alt text, caption, attribution, source,
  and license.
- Styling never replaces the semantic `<img>` or its text alternative.

### 13.4 Canvas boundary

Canvas or `OffscreenCanvas` is reserved for:

- share-image export;
- optional future engraving, threshold, or dither effects;
- hosts with same-origin, transformation-approved source assets.

It is not required for normal book-toned display. Remote images without usable
CORS remain stylable through CSS but cannot be safely sampled for export.

## 14. Public SDK boundary

The core package may add optional contracts such as:

```ts
type PageTurnBookOptions = Readonly<{
  // Existing options omitted
  sourceResolver?: PageTurnSourceResolver;
  sourceLinkMode?: "direct" | "card" | "direct-local";
  courseReadingIds?: readonly string[];
  selectionActions?: boolean;
  shareComposer?: boolean;
  sharePolicy?: PageTurnSharePolicy;
  annotationAppearance?: PageTurnAnnotationAppearance;
  externalPreviewProviders?: readonly PageTurnExternalPreviewProvider[];
}>;
```

Rules:

- Default SDK behavior does not import the demo catalog.
- Existing direct links remain backward compatible unless a resolver is
  supplied.
- Hosted-reader defaults may enable source cards and selection actions.
- Capture/render code is dynamically loaded only after Share is requested.
- Optional embed providers are separate adapters.
- All options participate in idempotent destroy and cancellation.

## 15. Privacy, security, and rights

### 15.1 Local data

- Highlights and notes remain local and edition scoped.
- No selection, note, or image is uploaded.
- The user explicitly initiates copy, share, or download.
- Publication research-data deletion and versioned JSON backup/import remain
  part of the personal-data backlog.

Round-trip backup uses
`application/vnd.ethical-tech.pageturn-annotations+json;version=2`.
Human-readable Markdown remains export-only.

Stored annotation data is capped at 16 MiB of UTF-8 JSON per book and edition.
Before saving, the writer serializes the prospective edition collection and
rejects an operation that would exceed the cap with a visible storage-limit
message. This bounds every backup produced by PageTurn.

The JSON envelope contains:

- schema version;
- export timestamp;
- publication book ID, immutable edition ID, and title;
- complete version-2 annotation records, including resolved or unresolved
  target state, body, style, and timestamps.

Import rules:

1. The user explicitly selects a file.
2. Reject files larger than 20 MiB, malformed JSON, unknown schema versions,
   invalid records, or a different book/edition before writing anything.
3. Show a preview with new, identical duplicate, ID conflict, and unresolved
   counts.
4. Default to **Merge**. Offer **Replace this edition's annotations** only after
   explicit confirmation.
5. Merge skips an identical annotation ID and record.
6. Merge treats the same ID with different content as a conflict; the default
   keeps the existing record, while an explicit **Import as copy** creates a new
   UUID and preserves both.
7. Valid unresolved records import as unresolved and never attach
   approximately.
8. Commit the selected operation in one IndexedDB transaction.
9. A failed validation or transaction leaves existing data unchanged.
10. Import performs no network request.

Publication research-data deletion has an explicit scope:

- **Delete current edition research data** removes bookmarks and annotations
  for one `(bookId, editionId)` key range.
- **Delete all publication research data** removes bookmarks and annotations
  for every edition of one `bookId`.
- Both stores live in the same PageTurn IndexedDB database and are deleted in
  one transaction.
- Resume locations and typography preferences remain in `localStorage`, are not
  annotation research data, and are handled by a separate **Reset reading
  state** action.
- Search indexes are memory-only and require no deletion.

The UI never describes IndexedDB plus `localStorage` cleanup as one atomic
transaction.

### 15.2 Sharing

- Preview exactly what leaves the browser.
- Never include private notes or existing highlights implicitly.
- Warn that a Text Fragment URL exposes the selected public quote.
- Enforce selection and output-size limits.
- Do not include local-only or authenticated URLs in share output without an
  explicit host policy.

### 15.3 External sources

- No hover-triggered third-party requests.
- Use `noopener` and a deliberate referrer policy.
- Normalize displayed domains to reduce deceptive-link risk.
- Never render untrusted external HTML in a source card.
- Provider embeds use explicit consent and strict isolation.

### 15.4 Images and rights

- Record source, license, attribution, and transformation permission.
- Do not locally ingest, recolor, crop, or export an image without the required
  rights.
- Keep Original available where a derivative is allowed.
- Do not misrepresent color-critical source information.

The existing
[V3-LOCAL-DATA-PRIVACY-REVIEW.md](./V3-LOCAL-DATA-PRIVACY-REVIEW.md)
must be updated before promotion.

## 16. Accessibility requirements

- External/local destination and new-tab behavior are announced.
- Source cards are keyboard accessible and dismissible.
- Context controls follow the ARIA toolbar pattern.
- Selection remains native and usable without PageTurn controls.
- Highlight and annotation targets have semantic associations.
- Handwritten notes have a readable standard-font alternative.
- Marginalia never becomes the only access to complete note text.
- Shared images have equivalent quote/citation text.
- Status messages announce copy, save, share, fallback, and failure.
- Focus returns to the originating passage or link.
- Forced colors, 200 percent text zoom, reduced motion, keyboard-only,
  VoiceOver, TalkBack, NVDA, and high-contrast modes are included in review.

## 17. Performance and payload budgets

| Metric | Promotion budget |
|---|---|
| Selection pill visible after stable selection | At most 100 ms p95 under 4x CPU throttle |
| Loaded-chapter exact target resolution | At most 50 ms p95; no task over 50 ms |
| Local source-card activation | At most 50 ms p95; zero third-party requests |
| Marginalia placement | At most 16 ms p95 for up to 20 visible notes; denser sets group before layout |
| Disabled-feature core increase | At most 5 kB gzip across the public V3 route |
| Lazy share-renderer chunk | At most 20 kB gzip |
| Optional embed-adapter chunk | At most 8 kB gzip, excluding provider content |
| Share image dimensions | Longest edge at most 1,600 px and total area at most 2.1 megapixels |
| Share image encoded size | At most 4 MB |
| Share render time | At most 500 ms p95 desktop and 1,200 ms p95 under 4x CPU throttle |
| Share transient canvas memory | At most 32 MB |
| Active turn with visible marginalia/styled media | At most 22.2 ms p95 at 4x CPU throttle; no task over 50 ms |

Additional rules:

- Inline icons add no external dependency.
- Selection pill setup adds no permanent animation loop.
- Marginalia placement runs only for visible pages and changed annotations.
- Exact selector resolution is bounded to the target chapter/source blocks.
- Share renderer is code-split and loaded only after Share.
- Book-toned images use CSS/SVG before considering pixel processing.
- Only visible on-page images load; pop-out images retain activation loading.

The promotion matrix freezes the latest and previous stable Chrome, Edge,
Firefox, and Safari at implementation start, plus current iOS Safari and
Android Chrome. Manual assistive-technology coverage includes current NVDA,
VoiceOver on macOS/iOS, and TalkBack.

Benchmark protocol:

- record browser versions, OS, viewport, device pixel ratio, CPU throttle, and
  commit;
- use 30 measured runs after 5 discarded warm-up runs;
- report median and p95 from the same raw sample set;
- use `What Is Ethical AI? / responsible-ai` for selection and source cards;
- use a Plurality historical-tome spread with 20 exact-range notes for
  marginalia and active-turn measurements;
- use an 800-character two-block selection for quote resolution and share
  rendering;
- use one photo, one portrait, and one color-essential diagram for media paint;
- run desktop at 1440 x 1000 and mobile at 390 x 844;
- run the low-end profile at 4x CPU throttle with cold lazy chunks;
- measure memory before activation, at peak render, and after cancellation and
  destroy; use `measureUserAgentSpecificMemory` where available and browser
  process metrics otherwise;
- retain machine-readable results with the promotion record.

## 18. Work packages

### V3-418 - exact-range target foundation

**Priority:** P1

**Status:** Complete

**Depends on:** Existing source anchors

Deliver:

- normalization and DOM-offset mapping helpers;
- versioned selector types and validation;
- capture and resolver;
- exact-range rendering;
- compact URL token;
- unit corpus for repeated text, Unicode, nested markup, lists, and split
  paragraphs.

Acceptance:

- Exact selected words restore after repagination and reload.
- Repeated quotes resolve through context or fail safely.
- No different passage is silently selected.
- The selector API is complete before persistent annotation migration begins.

### Required storage sequence - V3-413

After V3-418 and before V3-419 persistence actions, V3-413 must:

- finalize the versioned IndexedDB bookmark/annotation schema;
- store the resolved/unresolved `PageTurnStoredTarget` union;
- enforce the 16 MiB serialized annotation-data cap per book and edition;
- migrate valid anchor-only beta annotations after successful quote resolution;
- retain unresolved legacy records without reattaching them;
- implement transactional current-edition and all-edition publication
  research-data deletion across the IndexedDB bookmark/annotation stores;
- retain Markdown as human-readable export;
- add versioned JSON backup/import with validation preview, Merge/Replace
  semantics, deterministic duplicate handling, and transactional writes;
- complete the personal-data assistive-technology review.

### V3-419 - contextual Copy, Share, Highlight, Annotate controls

**Priority:** P1

**Status:** Complete

**Depends on:** V3-418, V3-413

Deliver:

- adaptive action pill;
- desktop and touch placement;
- keyboard toolbar interaction;
- Copy;
- immediate exact Highlight with Undo;
- launch points for Share and Annotate;
- lifecycle dismissal and cancellation.

Acceptance:

- Native selection remains functional.
- Copy and Highlight work with mouse, touch, and keyboard in this package.
- Share and Annotate controls appear only when their registered downstream
  capability is available and dispatch the serialized target contract.
- Placement never covers handles, binding, turn corners, or selected text; when
  this is geometrically impossible, the pill docks or yields to the permanent
  reader toolbar.
- No stale action survives navigation or repagination.

### V3-420 - handwritten marginalia

**Priority:** P1

**Status:** Complete

**Depends on:** V3-418, V3-413, V3-419

Deliver:

- margin editor;
- exact note storage;
- stationary page annotation layer;
- collision layout and grouped markers;
- narrow-screen marker/bottom-sheet behavior;
- page-turn decorative clones;
- visibility and readable-font preferences;
- Explore integration and export updates.

Acceptance:

- Notes never repaginate or cover publication text.
- Notes remain attached to exact text after resize and reload.
- Decorative turn copies are inert and hidden from accessibility APIs.
- Complete note text is keyboard and screen-reader accessible.

### V3-421 - exact visual quote sharing

**Priority:** P1

**Status:** Complete

**Depends on:** V3-418, V3-419

Deliver:

- anchor plus Text Fragment URLs;
- explicit immutable edition identity;
- publication share-policy enforcement;
- app-readable exact selector restoration;
- temporary recipient highlight;
- share preview;
- deterministic Canvas 2D book clipping;
- Web Share file capability detection;
- copy text/link, copy image, and image download fallbacks;
- privacy disclosure.

Acceptance:

- Recipient reaches and sees the exact quote when the selector validates.
- Anchor-only navigation works when native/app exact matching fails, while the
  selector remains unresolved and no exact highlight is painted.
- Shared visual contains only public source content and current selection.
- Missing or restrictive share policy disables quote/image output visibly.
- Quote-disabled policy produces anchor-only sharing and no exact-text token or
  highlight.
- Unsupported share targets retain usable independent fallbacks.

### V3-422 - source registry, local course readings, and cards

**Priority:** P1

**Status:** Ready

**Depends on:** None

Deliver:

- public resolver contract;
- explicit course context and ambiguity result;
- canonical identity normalization;
- hosted catalog/source registry;
- course-reading mapping;
- local-edition-first card;
- unknown external source card;
- canonical source and provenance actions;
- no-fetch default.

Acceptance:

- Exact known sources consistently open their approved local edition.
- All external citations use the decided card-first activation flow when source
  cards are enabled.
- Original canonical source remains visible and usable.
- Link-only/unknown rights never expose unauthorized local full text.
- No fuzzy source match changes navigation.
- Opening a source card sends no third-party request.

### V3-423 - allowlisted external preview adapters

**Priority:** P2

**Status:** Ready

**Depends on:** V3-422; privacy/security review before promotion

Deliver:

- provider adapter contract;
- explicit load disclosure;
- sandbox/referrer/Permissions Policy configuration;
- provider readiness handshake or bounded timeout plus direct-link fallback;
- lifecycle teardown.

Acceptance:

- No third-party request occurs before explicit activation.
- Unapproved origins cannot load.
- Cooperative providers require a valid origin/nonce/schema readiness message.
- Non-cooperative timeout reports only that readiness was not confirmed.
- No unvalidated cross-origin message affects reader state.

### V3-424 - book-styled source images

**Priority:** P1

**Status:** Ready

**Depends on:** Existing media treatment, V3-404, V3-406

Deliver:

- independent display/style types;
- backward-compatible option normalization;
- figure visual-kind, color-semantics, and transformation-rights metadata;
- CSS book-toned and monochrome treatments;
- optional SVG duotone after verification;
- Original/View original controls;
- one-derivative publication pipeline guidance.

Acceptance:

- No stylistic raster variant is required.
- Color-essential and non-transformable figures remain Original.
- Missing transformation rights remain Original.
- Missing export rights disable image sharing/download independently of display
  styling.
- Pop-out can always present Original.
- Alt text, caption, attribution, and license remain available.
- Treatment responds to the active book appearance without repagination.

### V3-425 - integrated validation and promotion

**Priority:** P1

**Status:** Ready

**Depends on:** V3-405, V3-413, and V3-418 through V3-424

Deliver:

- privacy and rights review updates;
- browser/accessibility matrix;
- static-host and embedded-host coverage;
- payload and frame measurements;
- the numeric budgets in section 17;
- mobile and low-end tuning;
- SDK documentation;
- promotion decision record.

Acceptance:

- Existing V3 regression matrices remain green.
- Non-enabled SDK consumers do not load capture or embed code.
- All local-data, external-request, and shared-output boundaries are explicit.
- Course source mappings and image rights are validated.
- No feature is promoted with unresolved assistive-technology blockers.

## 19. Dependency sequence

```text
V3-418 exact-range foundation
  -> V3-413 versioned personal-data storage
       -> V3-419 contextual actions
       -> V3-420 marginalia
       -> V3-421 visual sharing

V3-422 source registry/cards
  -> V3-423 trusted embed adapters

V3-404 + V3-406
  -> V3-424 source-image styling

V3-405 + V3-413 + V3-418..V3-424
  -> V3-425 integrated validation and promotion
```

V3-422 and V3-424 can proceed in parallel with V3-418. Marginalia and sharing
must not invent separate selector formats.

## 20. Expected implementation surfaces

Likely V3 package additions:

- `text-target.ts`
- `selection-actions.ts`
- `marginalia.ts`
- `share-composer.ts`
- `share-image.ts`
- `source-links.ts`
- `media-style.ts`

Likely existing changes:

- `publication-types.ts`
- `reader.ts`
- `shell.ts`
- `personal.ts`
- `share.ts`
- `styles.css`
- public exports and SDK README
- publication manifest/schema/build validation
- demo catalog source registry
- privacy review, specification, and browser tests

Implementation should reuse existing source-anchor, appearance, media, and
personal-data helpers rather than duplicate them.

## 21. Required test matrix

### Unit

- text normalization and Unicode offsets;
- capture/resolve round trips;
- repeated quote disambiguation;
- compact selector encoding;
- Text Fragment term generation and URL limits;
- source identity normalization and resolution order;
- rights-based local-source decisions;
- marginalia collision placement;
- media-style defaults and guards;
- share payload capability selection.

### Browser

- mouse, touch, and keyboard selection;
- toolbar positioning and dismissal;
- native selection preservation;
- Copy success/failure;
- Highlight and Undo;
- handwritten note create/edit/delete/hide;
- resize, repagination, and page-turn annotation fidelity;
- exact shared URL restoration;
- repeated and stale quote fallback;
- share image generation/cancellation;
- Web Share file and clipboard fallbacks;
- known local course source and canonical-source actions;
- unknown source card with zero third-party requests;
- iframe allow/deny/failure;
- original/book-toned/monochrome images;
- color-essential and transform-prohibited figures;
- mobile safe areas and virtual keyboard;
- embedded SDK Permissions Policy failures;
- teardown during every asynchronous path.

### Accessibility

- accessibility-tree snapshots;
- toolbar roving focus;
- focus restoration;
- screen-reader note relationships;
- standard-font marginalia preference;
- forced colors;
- 200 percent zoom;
- reduced motion;
- image and share-text equivalents.

### Performance and payload

- selection-response latency;
- marginalia layout cost;
- share renderer lazy chunk size;
- share render time and peak memory;
- styled-image paint cost;
- no new third-party network requests;
- no capture/embed chunk on disabled routes;
- low-end mobile frame interval while annotations and styled figures are
  visible.

## 22. Rollout

1. Land V3-418 as a pure selector/URL foundation.
2. Complete V3-413 storage migration using the V3-418 target.
3. Enable contextual Copy/Highlight in the hosted reader.
4. Add Annotate marginalia behind a beta option.
5. Add text/link share preview, then image output as a lazy enhancement.
6. Enable source cards with a small reviewed registry.
7. Prefer local PageTurn editions for explicitly mapped course readings.
8. Enable book-toned images on a representative photo, portrait, and diagram.
9. Keep embeds off until provider/security review.
10. Run V3-425 and record promotion decisions.
11. Expose stable SDK options only after the hosted path meets all gates.

Each phase must retain the current direct-link, ordinary Share, Explore
annotation, and Original-image fallbacks until promotion.

## 23. Definition of done

The feature set is complete only when:

- known approved sources reliably prefer their local PageTurn editions;
- canonical external sources and provenance remain available;
- arbitrary links never trigger hidden third-party requests;
- Copy, Share, Highlight, and Annotate are immediate and accessible;
- annotations target exact text and appear as non-repaginating marginalia;
- shared links restore and visibly mark the exact quote or clearly degrade to
  its source anchor when quote sharing is permitted;
- permitted share output includes quote, citation, URL, and, when visual
  sharing is permitted, a safe book-style visual;
- private notes and unrelated local state never leak into shared output;
- source images can adopt book styling without pre-generated art variants;
- color-critical and non-transformable images remain faithful;
- static hosting, embedding, bounded loading, and public SDK lifecycle remain
  intact;
- payload, performance, privacy, rights, and assistive-technology gates pass.
