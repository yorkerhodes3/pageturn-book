# Ethical Tech CoLab Book Reader

This repository develops and compares two reader approaches before integration
with the Ethical Tech CoLab website:

- The original fixed-page `read-as-book` viewer, preserved at revision
  `d1d1ec6`.
- The new semantic-first Book Reader V2.

## Project documents

- [Concept](./CONCEPT-IDEA.md)
- [Architecture review](./ARCHITECTURE-REVIEW.md)
- [Specification](./SPECIFICATION.md)
- [Implementation backlog](./BACKLOG.md)

## Implementations

- [Legacy fallback record](./legacy/README.md)
- [V2 workspace and commands](./v2/README.md)

The implementations remain separate. V2 does not overwrite or privately import
the legacy source.

## Comparison demo

GitHub Actions builds a Pages artifact containing:

- `/` - comparison overview.
- `/legacy/` - pinned fixed-page viewer.
- `/book/demo-book/2026-08/chapters/introduction/` - V2 semantic scroll reader.
- `/book/demo-book/2026-08/chapters/introduction/?view=book` - V2 semantic
  open-book presentation.
- `/compare/` - side-by-side view with both book presentations opened.

The Pages deployment workflow is
[`.github/workflows/pages.yml`](./.github/workflows/pages.yml).

To build and test locally:

```powershell
Set-Location .\v2
npm install
npm run typecheck
npm run test:unit
npm run build
npm run test:browser
```
