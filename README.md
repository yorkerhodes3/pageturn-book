# Ethical Tech CoLab Book Reader

> **Published demo:** [Reader overview](https://yorkerhodes3.github.io/pageturn-book/)
> · [Library shelf](https://yorkerhodes3.github.io/pageturn-book/shelf/)
> · [Functionality dashboard](https://yorkerhodes3.github.io/pageturn-book/dashboard/)
> · [V3 geometry experiment](https://yorkerhodes3.github.io/pageturn-book/v3/)

This repository develops and compares three reader presentation paths before
integration with the Ethical Tech CoLab website:

- The original fixed-page `read-as-book` viewer, preserved at revision
  `d1d1ec6`.
- The new semantic-first Book Reader V2.
- The isolated V3 semantic geometry reader, now exercised across the full
  22-volume shelf with bounded chapter loading, durable source locations,
  configurable right-hand chapter openings, persistent typography, and
  canonical sharing.

## Project documents

- [Concept](./CONCEPT-IDEA.md)
- [Architecture review](./ARCHITECTURE-REVIEW.md)
- [Specification](./SPECIFICATION.md)
- [Implementation backlog](./BACKLOG.md)
- [Real-content and Edge investigation](./RUNTIME-INVESTIGATION.md)
- [V2 visual fidelity review](./VISUAL-FIDELITY-REVIEW.md)
- [Page-turn implementation estimates](./PAGE-TURN-IMPLEMENTATION-ESTIMATES.md)
- [Semantic page-turn geometry port plan](./SEMANTIC-PAGE-TURN-GEOMETRY-PLAN.md)
- [Publication ingest pipeline and all-book enablement](./PUBLICATION-INGEST-PIPELINE.md)
- [V3 full-book measurements and visual review](./V3-FULL-BOOK-REVIEW.md)
- [V3 22-book library and Plurality review](./V3-LIBRARY-REVIEW.md)
- [Plurality pinned source and CC0 record](./v2/apps/fixtures/plurality/SOURCE.md)

## Implementations

- [Legacy fallback record](./legacy/README.md)
- [V2 workspace and commands](./v2/README.md)

The implementations remain separate. V2 does not overwrite or privately import
the legacy source.

## Comparison demo

GitHub Actions builds a Pages artifact containing:

- `/` - comparison overview.
- `/legacy/` - pinned fixed-page viewer.
- `/shelf/` - responsive mahogany library shelf containing 21 Ethical Tech
  CoLab publications plus the CC0 Plurality community book. Every binding opens
  in V3; available V2, designed-page, and source-reader options remain separate.
- `/dashboard/` - implementation status, showcase routes, sharing/commenting
  status, and measured V2-versus-legacy payload weight.
- `/v3/` - isolated semantic page-turn geometry experiment using real
  publication HTML without changing V2. It loads only the current/adjacent
  chapter window and supports
  `?book=<id>&chapter=<id>#<source-anchor>` deep links.
- `/book/what-is-ethical-ai/2026-07/chapters/executive-summary/` - V2
  semantic scroll reader using production content.
- `/book/what-is-ethical-ai/2026-07/chapters/executive-summary/?view=book` -
  V2 semantic
  open-book presentation.
- `/compare/` - side-by-side view of the production 46-page legacy book, the V2
  semantic reader, and the isolated V3 geometry experiment.

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
