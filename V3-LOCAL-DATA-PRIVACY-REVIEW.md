# V3 local data and sharing privacy review

| Field | Decision |
|---|---|
| Status | Approved for local-only beta |
| Accounts | None |
| Remote annotation service | None |
| Analytics | None |
| Storage | Same-origin browser `localStorage` |
| Export | Explicit local Markdown download |
| Sharing | Explicit Web Share or clipboard action |

## Data handled

V3 may store the following by publication and edition:

- last semantic chapter and source anchor;
- typography preference;
- bookmarks containing chapter, anchor, label, and timestamp;
- annotations containing selected quote, optional note, chapter, anchor, and
  timestamp.

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

Annotation export creates a local Markdown `Blob` after an explicit **Export
Markdown** action. V3 does not upload the file or choose a remote destination.

## Controls and limits

- Selection is capped at 2,000 characters.
- Annotation notes are capped at 4,000 characters.
- Unsupported cross-page selections are rejected.
- Saved locations use stable source anchors rather than responsive page
  numbers.
- Notes and bookmarks are edition-scoped and validated when read.
- A reader can delete individual bookmarks and annotations.
- Synchronization, collaboration, identity, moderation, remote backup, and AI
  processing remain prohibited until a separate privacy/security review.

## Remaining production work

- Migrate the beta arrays to the versioned annotation/bookmark schemas and
  IndexedDB model in the main specification.
- Add whole-publication data deletion and import.
- Add an explicit pre-share preview if sharing moves beyond the browser/OS
  share surface.
- Complete accessibility and assistive-technology review of annotation
  highlighting and exported-note workflows.
