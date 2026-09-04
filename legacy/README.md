# Legacy `read-as-book` fallback

The original viewer is preserved as an independent fallback for PageTurn Book
V3.

## Pinned baseline

- Repository: <https://github.com/Ethical-Tech-CoLab/read-as-book>
- Revision: [`d1d1ec6193867c13637636fc03e538c27d95261c`](https://github.com/Ethical-Tech-CoLab/read-as-book/commit/d1d1ec6193867c13637636fc03e538c27d95261c)
- Package version: `0.1.0`
- Review: [ARCHITECTURE-REVIEW.md](../ARCHITECTURE-REVIEW.md)

This directory intentionally does not contain a mutable copy of the legacy
source. Retrieve the pinned revision from the upstream repository when the
fallback is needed.

## Preservation rules

1. V3 work is implemented in the [repository root](../) and does not modify the
   legacy source.
2. Compatibility code uses only the legacy public API through a separately loaded
   adapter.
3. A legacy safety or compatibility fix must be released independently and
   remain reversible to the pinned baseline.
4. V3 features are not added to the legacy package.
5. Removing the fallback requires a separate product decision after the V3
   pilot, accessibility review, performance review, migration test, and
   rollback review.

## Known baseline limitations

- The documented vanilla example maps the dependency to a UMD build while the
  package expects an ESM `PageFlip` export.
- StPageFlip registers and begins loading every fixed page.
- The raster canvas does not provide the semantic text required for scholarly
  selection, citation, and accessible reading.
- Dialog focus containment and reduced-motion page-turn behavior are
  incomplete.
- The locked PDF.js CLI version has the high-severity
  `GHSA-hq66-cqwq-w95j` advisory.
- The package declares Node 18 support while its PDF.js 6.x development
  dependency requires a newer Node runtime.

These limitations are documented so the fallback is used knowingly. They do
not authorize V3 work to overwrite the baseline.

## Rollback principle

Publication entry points must be able to select the pinned legacy viewer
without depending on V3 internals. Until the legacy decommission conditions in
[SPECIFICATION.md](../SPECIFICATION.md) are approved, the pinned revision
remains the independent rollback target.
