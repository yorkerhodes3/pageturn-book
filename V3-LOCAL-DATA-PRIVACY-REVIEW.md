# V3 local data and sharing privacy review

| Field | Decision |
|---|---|
| Status | Approved and implemented for versioned local storage |
| Accounts | None |
| Remote annotation service | None |
| Analytics | None |
| Storage | Same-origin IndexedDB; resume/typography remain in `localStorage` |
| Export | Explicit local Markdown or version 2 JSON download |
| Sharing | Explicit Web Share or clipboard action |

## Data handled

V3 may store the following by publication and edition:

- last semantic chapter and source anchor;
- typography preference;
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

Selected text leaves the reader only after the reader activates **Share
selection**. The payload is handed to the operating-system Web Share surface,
or copied with its canonical source URL when clipboard fallback is used.

Annotation export creates a local Markdown or version 2 JSON `Blob` after an
explicit export/backup action. Import reads only the local file selected by the
reader. V3 does not upload the file or choose a remote destination.

## Controls and limits

- Selection is capped at 2,000 characters.
- Annotation notes are capped at 4,000 characters.
- Unsupported cross-page selections are rejected.
- Saved locations use stable source anchors rather than responsive page
  numbers.
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

An explicit pre-share preview remains required if sharing moves beyond the
browser/OS share surface.
