# V2 compatibility reader

> **Historical compatibility code — do not use for new integrations.**
>
> The supported product is [PageTurn Book V3](../../README.md), version 3.0.0,
> through [`@ethical-tech/pageturn-book`](../../packages/page-turn-v3/).

V2 was the semantic-first incubation layer built between the original
fixed-page viewer and PageTurn V3. It proved the publication model, compiler,
headless session, progressive semantic chapter enhancement, and the first CSS
book mode.

The V3 decision is complete. The repository root is now the active PageTurn
workspace, while this directory preserves only V2-specific implementation and
history.

## Retained V2-only packages

```text
packages/
  reader-core/                V2 headless session state machine
  reader-ui/                  V2 reader shell and modal CSS book mode
  renderer-semantic/          V2 chapter renderer
  theme/                      V2 chapter/book-mode stylesheet
```

These packages remain private, version `0.0.0`, and are not consumer SDKs.
Existing `/book/...` and `?view=book` routes continue to use them through the
reference application solely for compatibility and regression testing.

## What moved to V3

The supported V3 package owns:

- page-turn geometry and projection;
- reader shell creation and lifecycle;
- bounded chapter-window loading;
- physical page composition;
- appearance, bookshelf, font, and sharing helpers;
- durable locations, search, bookmarks, resume, annotations, and media.

See the [V3 SDK integration guide](../../packages/page-turn-v3/README.md).

## Preservation rule

Do not add new product capabilities to V2. Fix only regressions required to
keep an existing compatibility route working. New reader, library, publication,
or cross-project work belongs in V3.

The independently pinned V1 rollback remains documented in
[the legacy record](../../legacy/README.md).
