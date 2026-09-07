# V3 local data and sharing privacy review

| Field | Decision |
|---|---|
| Status | Approved and implemented for versioned local storage, marginalia, policy-gated visual sharing, and no-fetch source cards |
| Accounts | None |
| Remote annotation service | None |
| Analytics | None |
| Storage | Same-origin IndexedDB; resume/typography remain in `localStorage` |
| Export | Explicit local Markdown or version 2 JSON download |
| Sharing | Explicit contextual Copy or pre-share composer action |
| External sources | Host-reviewed local registry; no card-open metadata fetch |

## Data handled

V3 may store the following by publication and edition:

- last semantic chapter and source anchor;
- typography preference;
- marginalia visibility and readable-font preferences (no note content);
- bookmarks containing chapter, anchor, label, and timestamp;
- version 2 annotations containing a resolved exact selector or quarantined
  unresolved legacy target, optional Markdown note, style, and timestamps.

This data is not encrypted from a person, extension, or process with access to
the same browser profile. The UI and documentation do not imply otherwise.

## Data leaving the browser

Ordinary reading, bookmark creation, annotation creation, deletion, and search
send no personal data to an application service. Search fetches static
publication chapters from the same deployment and retains a text index only in
memory.

Selected text leaves the reader only after the reader activates **Copy** or a
final action in **Share selection**. The pre-share composer displays the exact
policy-approved quote, publication identity, citation, URL, disclosure, and
optional generated PNG before the system share, clipboard, or save action.
Copy writes only the displayed normalized quote and link. Missing policy emits
only a public anchor and citation; invalid policy disables sharing.

Visual output is rendered locally from supplied public semantic text and
resolved appearance values. It is not a DOM screenshot, does not read
cross-origin pixels, and never reads or uploads private notes, annotations,
stored highlights, toolbars, or arbitrary live DOM. The selected public quote
is the only highlight represented. Equivalent quote and citation text remains
outside the image.

Annotation export creates a local Markdown or version 2 JSON `Blob` after an
explicit export/backup action. Import reads only the local file selected by the
reader. V3 does not upload the file or choose a remote destination.

Opening an enabled source card sends no third-party request. The card is built
only from authored citation text/URL and optional host-supplied reviewed
records. It never renders remote HTML. External navigation occurs only after
the reader activates an explicitly labeled new-tab action, with `noopener` and
`no-referrer`; Copy writes only the displayed authored URL. Resolver rejection
is announced and retains that authored action. The default SDK mode remains
direct authored navigation, while the hosted reader opts into card mode.

Local-reading actions require an exact immutable edition and kind-matched,
approved local rights. Full editions and excerpts additionally require approved
top-level source rights. Link-only/unknown records can authorize only a
separately approved original source guide. Malformed, missing, mismatched,
expired runtime rights, unsafe URLs, and ambiguous matches expose no automatic
local action. The demo registry is host code and is not imported by the SDK.

## Controls and limits

- Selection is capped at 2,000 characters.
- Publication quote limits are capped at 2,000 characters; hosted publications
  use 800. Visual context defaults to and is capped at 240 characters.
- Visual output is one PNG with longest edge at most 1,600 px, area at most
  2.1 MP, encoded size at most 4 MB, and estimated canvas bytes at most 32 MB.
- Canvas rendering is dynamically imported after Share and cancelled or
  generation-guarded on close, navigation, repagination, and destroy.
- `navigator.canShare()` receives the exact File payload before image sharing.
  Clipboard image writing requires both `ClipboardItem` and `clipboard.write`;
  download and new-tab save controls report unsupported embedding capabilities.
- Annotation notes are capped at 4,000 characters.
- Unsupported cross-page selections are rejected.
- Saved locations use stable source anchors rather than responsive page
  numbers.
- Marginalia is an absolute visual layer and does not change semantic body
  pagination. Hiding it does not delete annotations.
- Notes and bookmarks are edition-scoped, schema-versioned, and validated when
  read or imported.
- A reader can delete individual bookmarks and annotations.
- Annotation data is capped at 16 MiB per book/edition; imports are capped at
  20 MiB and validated in full before one-transaction Merge or Replace writes.
- Current-edition and all-edition research-data deletion remove bookmarks and
  annotations together in one IndexedDB transaction. Resume and typography
  remain separately labeled reading state.
- Synchronization, collaboration, identity, moderation, remote backup, and AI
  processing remain prohibited until a separate privacy/security review.

## Assistive-technology review

- Explore uses native buttons, labels, file input, checkbox confirmation, and a
  polite status output for storage success and failure.
- Import preview names new, duplicate, conflict, and unresolved counts before
  any write. Replace remains disabled until its explicit confirmation is
  checked.
- Unresolved annotations remain readable and deletable in the notes list, carry
  a textual unresolved status, and are never represented by color alone or
  painted onto publication text.
- Storage failures retain the current UI data and announce an error rather than
  claiming success.
- Contextual selection controls use an accessible toolbar, do not take focus
  after pointer selection, retain native selection, and provide keyboard entry,
  roving focus, Escape return, touch-safe placement, and a visible Undo action.
- Only stationary page marginalia is exposed to accessibility APIs. Moving and
  revealed page copies are inert, `aria-hidden`, have no IDs or controls, and
  the complete note remains available through a standard-font dialog/sheet and
  Explore. Grouped collisions expose an explicit note count.
- The share composer is a labeled modal with an exact textual equivalent,
  policy-reduced controls, live operation status, OS-cancellation messaging,
  and focus return to the invoking control or source passage.
- Source cards use a labeled native modal, initially focus the local primary
  action when one is approved, expose source type/domain/provenance/rights in
  text, announce external/new-tab behavior and failures, and return focus to
  the authored citation. Resolver work is aborted and generation-guarded on
  close, reader navigation, and destroy.
