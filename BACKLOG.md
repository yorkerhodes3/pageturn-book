# Ethical Tech CoLab Book Reader V2 - Implementation Backlog

| Field | Value |
|---|---|
| Status | Initial implementation backlog |
| Date | 2026-08-27 |
| Specification | [SPECIFICATION.md](./SPECIFICATION.md) |
| Architecture | [ARCHITECTURE-REVIEW.md](./ARCHITECTURE-REVIEW.md) |
| Concept | [CONCEPT-IDEA.md](./CONCEPT-IDEA.md) |

## 1. Backlog policy

This backlog implements the semantic-first hybrid architecture without
overwriting the existing `read-as-book` project.

### 1.1 Priority

| Priority | Meaning |
|---|---|
| P0 | Required for the R1 semantic reader release |
| P1 | Production hardening or a requirement that may enter R1.1 |
| P2 | Prototype or optional follow-on |
| P3 | Future product capability outside current delivery |

### 1.2 Estimate

Estimates are relative and must be refined by the implementing team.

| Size | Meaning |
|---|---|
| S | Narrow change with limited integration |
| M | Several related changes or one integration boundary |
| L | Cross-package feature or substantial test surface |
| XL | Epic-scale uncertainty; must be split after discovery or prototype |

### 1.3 Status

| Status | Meaning |
|---|---|
| Complete | Acceptance is implemented and verified |
| Ready | Requirements and dependencies are sufficient to begin |
| Blocked | A named dependency or product decision prevents work |
| Prototype | Evidence-gathering work, not release scope |
| Future | Intentionally outside R1/R1.1 |

### 1.4 Completion rule

A story is not done when its primary code path merely works. It is done when:

- Requirement and acceptance criteria pass.
- Error and cancellation paths are covered.
- Public types and documentation are updated.
- Targeted unit/integration/browser tests pass.
- Accessibility and performance implications are verified where applicable.
- No legacy source was modified unless a separately approved legacy task says
  so.

## 2. Delivery assumptions

The user was unavailable for the R1 scope question. This backlog uses the
recommended scope from [SPECIFICATION.md](./SPECIFICATION.md):

- Semantic scroll reader first.
- Headless shared reader state.
- Local preferences, resume, bookmarks, annotations, and Markdown export.
- Existing viewer retained unchanged behind a separate fallback adapter.
- New bounded facsimile and semantic paged modes remain prototype-gated.

Implementation starts in a new `v2/` workspace. The upstream legacy revision
remains pinned and independently recoverable.

## 3. Release map

### Wave 0 - preserve and establish

- Record the legacy baseline.
- Create the V2 workspace.
- Select ecosystem tooling.
- Establish CI, fixture policy, and contribution gates.

### Wave 1 - publication foundation

- Define publication types and schema.
- Compile Markdown into semantic chapters.
- Generate stable IDs, source maps, and manifests.
- Publish editions atomically.

### Wave 2 - reader foundation

- Implement the headless session.
- Implement location, URL, history, preferences, and error contracts.
- Implement the semantic renderer.

### Wave 3 - scholarly workflow

- Build accessible shell and themes.
- Add resume and bookmarks.
- Add local highlights, notes, restoration, and export.

### Wave 4 - fallback and integration

- Add the isolated legacy adapter.
- Add React integration.
- Add packaged demos and static-host integration.

### Wave 5 - release verification

- Complete browser, assistive technology, performance, security, and pilot
  gates.

### Follow-on prototypes

- New bounded facsimile renderer.
- Optional semantic paged mode.

## 4. Critical path

```text
V2-001 preserve legacy baseline
  -> V2-010 workspace bootstrap
  -> V2-020 publication model
  -> V2-030 Markdown parser and validation
  -> V2-034 stable IDs
  -> V2-039 semantic output
  -> V2-043 manifest generation
  -> V2-060 reader session
  -> V2-071 semantic renderer
  -> V2-082 reader shell
  -> V2-110 annotation model
  -> V2-116 annotation UI
  -> V2-122 export
  -> V2-150 release candidate verification
```

Legacy fallback and React work can proceed in parallel after the reader session
and shell contracts stabilize.

## 5. Epic E0 - preserve legacy and bootstrap V2

### V2-001 - record immutable legacy baseline

| Field | Value |
|---|---|
| Priority | P0 |
| Size | S |
| Status | Ready |
| Depends on | None |
| Requirements | G-010, NG-010, LEG-001, LEG-007, LEG-010 |

Create `legacy/README.md` recording:

- Upstream repository.
- Pinned revision `d1d1ec6`.
- Package version `0.1.0`.
- Known limitations and verified defects.
- How a fallback integration obtains the legacy artifact.
- Rule that V2 work does not modify legacy source.
- Conditions and approval required for removal.

Acceptance:

- The revision can be independently retrieved.
- The document distinguishes preservation from endorsement.
- No legacy source is copied into a mutable unversioned directory.

### V2-002 - define legacy change-control rule

| Field | Value |
|---|---|
| Priority | P0 |
| Size | S |
| Status | Ready |
| Depends on | V2-001 |
| Requirements | LEG-001, LEG-010 |

Document how emergency legacy security or compatibility fixes are isolated,
reviewed, versioned, and rolled back.

Acceptance:

- V2 feature work cannot be merged as a legacy fix.
- Legacy removal requires explicit product approval.
- A separate release identifier is required for a modified legacy artifact.

### V2-010 - bootstrap the `v2/` workspace

| Field | Value |
|---|---|
| Priority | P0 |
| Size | M |
| Status | Ready |
| Depends on | V2-001 |
| Requirements | EG-001, EG-002, EG-003, supported environment policy |

Create the TypeScript workspace and initial package boundaries from the
specification.

Acceptance:

- `v2/` is independently installable and buildable.
- The package manager and version are pinned.
- TypeScript strict mode is enabled.
- Runtime core output is ESM.
- Packages do not import from `legacy/`.
- Clean install, build, type check, and package dry-run commands exist.

### V2-011 - choose and record ecosystem libraries

| Field | Value |
|---|---|
| Priority | P0 |
| Size | M |
| Status | Ready |
| Depends on | V2-010 |
| Requirements | Open decisions 1-3 |

Select maintained libraries for:

- Workspace and build.
- Markdown parsing and AST transforms.
- YAML metadata.
- Runtime/build schema validation.
- Test runner.
- Browser automation.
- IndexedDB access, if a wrapper is justified.
- HTML sanitization.

Acceptance:

- Choices are recorded with version, license, maintenance signal, browser/Node
  fit, bundle impact, and rejected alternatives.
- No dependency is added only for functionality available clearly through
  platform APIs.
- Optional PDF/facsimile dependencies remain outside semantic core packages.

### V2-012 - establish CI skeleton

| Field | Value |
|---|---|
| Priority | P0 |
| Size | M |
| Status | Blocked by V2-010, V2-011 |
| Depends on | V2-010, V2-011 |
| Requirements | EG-006, PERF-010, CI requirements |

Add checks for install, formatting, types, unit tests, package boundaries,
package dry-run, and dependency review.

Acceptance:

- CI runs from a clean checkout.
- Lockfile drift fails.
- Package-boundary violations fail.
- Successful checks are required before merge according to repository policy.
- Browser and accessibility jobs have placeholders that later stories enable.

### V2-013 - create representative fixture corpus

| Field | Value |
|---|---|
| Priority | P0 |
| Size | L |
| Status | Ready |
| Depends on | V2-010 |
| Requirements | Test and performance profiles |

Create copyright-safe test publications covering:

- Small multi-chapter book.
- Long semantic publication.
- Headings with repeated text.
- Explicit and generated IDs.
- Images and figures.
- Tables.
- Code blocks.
- Footnotes.
- Long URLs and headings.
- Missing/invalid metadata fixtures.
- Unsafe HTML and URLs.
- Left-to-right content.
- Right-to-left fixture if R1 publication scope requires it.
- Short and 200-page fixed-layout metadata fixtures without committing
  unnecessarily large binaries.

Acceptance:

- Every fixture states the behavior it tests.
- Fixtures are deterministic.
- Large generated assets can be built or downloaded from trusted test inputs
  rather than bloating the repository.
- No third-party copyrighted publication is embedded without permission.

### V2-014 - create package-boundary tests

| Field | Value |
|---|---|
| Priority | P0 |
| Size | S |
| Status | Blocked by V2-010 |
| Depends on | V2-010 |
| Requirements | Package dependency direction |

Acceptance:

- `publication-model` cannot import DOM or framework code.
- `reader-core` cannot import React or the legacy viewer.
- Semantic default entry points cannot pull facsimile/PDF code.
- React is isolated to the React adapter.

## 6. Epic E1 - publication model and schema

### V2-020 - implement publication identity types

| Field | Value |
|---|---|
| Priority | P0 |
| Size | M |
| Status | Blocked by V2-010 |
| Depends on | V2-010, V2-011 |
| Requirements | MAN-001, MAN-002, MAN-003 |

Implement validated types for `bookId`, `editionId`, content hashes, language,
direction, author attribution, and publication metadata.

Acceptance:

- Invalid identifiers and language/direction values produce typed validation
  errors.
- `bookId` and `editionId` cannot be accidentally interchanged in core APIs.
- Serialization is stable and documented.

### V2-021 - implement publication manifest schema v1

| Field | Value |
|---|---|
| Priority | P0 |
| Size | L |
| Status | Blocked by V2-020 |
| Depends on | V2-020 |
| Requirements | MAN-001 through MAN-010 |

Implement static types and a runtime validator for:

- Publication metadata.
- Table of contents.
- Semantic rendition.
- Optional fixed-page rendition.
- Optional legacy fallback rendition.
- Capability declarations.

Acceptance:

- Valid fixture manifests pass.
- Missing required or unsupported major versions fail with stable rule IDs.
- Unknown additive fields are tolerated according to policy.
- The same schema contract is used by the build and browser loader.

### V2-022 - implement manifest URL resolution

| Field | Value |
|---|---|
| Priority | P0 |
| Size | M |
| Status | Blocked by V2-021 |
| Depends on | V2-021 |
| Requirements | MAN-008 |

Acceptance:

- Nested relative paths retain all path segments.
- Absolute, root-relative, query, and encoded paths resolve predictably.
- Unsafe URL schemes are rejected.
- Tests cover the path-loss defect found in the legacy loader.

### V2-023 - implement table-of-contents model

| Field | Value |
|---|---|
| Priority | P0 |
| Size | M |
| Status | Blocked by V2-020 |
| Depends on | V2-020 |
| Requirements | MAN-004 |

Acceptance:

- Nested chapter/section entries preserve publication order.
- Every entry maps to a semantic location.
- Duplicate, missing, and cyclic structures fail validation.
- TOC labels remain plain semantic text.

### V2-024 - implement capability model

| Field | Value |
|---|---|
| Priority | P0 |
| Size | S |
| Status | Blocked by V2-021 |
| Depends on | V2-021 |
| Requirements | MAN-009, MAN-010 |

Define capabilities for semantic reading, local annotations, facsimile,
legacy fallback, search index, source map, and future optional behaviors.

Acceptance:

- Readers can distinguish unavailable from unsupported.
- Unknown optional capability is ignored.
- Unknown required capability produces an actionable error.

### V2-025 - implement location types

| Field | Value |
|---|---|
| Priority | P0 |
| Size | L |
| Status | Blocked by V2-020 |
| Depends on | V2-020 |
| Requirements | Location types, MAN-007 |

Implement semantic and facsimile locations, normalization, equality, ordering,
and runtime validation.

Acceptance:

- Semantic and fixed-page locations are discriminated.
- Fixed API page index is zero-based.
- Progress fractions outside 0 through 1 fail validation.
- Locations from another book or edition cannot be used silently.

### V2-026 - implement text selector types and normalization contract

| Field | Value |
|---|---|
| Priority | P0 |
| Size | M |
| Status | Blocked by V2-025 |
| Depends on | V2-025 |
| Requirements | Text selector model, ANN-CREATE-003 |

Acceptance:

- Exact quote is required.
- Prefix, suffix, and positions are validated.
- Text normalization behavior is documented and unit tested.
- Selector types can be serialized without DOM objects.

## 7. Epic E2 - Markdown publication CLI

### V2-030 - implement metadata loader

| Field | Value |
|---|---|
| Priority | P0 |
| Size | M |
| Status | Blocked by V2-011, V2-020 |
| Depends on | V2-011, V2-020 |
| Requirements | Required publication metadata |

Acceptance:

- Valid `book.yml` loads into validated publication metadata.
- Missing file, duplicate chapter, invalid language, and unsafe asset paths
  report source-aware errors.
- Metadata cannot escape the publication source directory through relative
  traversal.

### V2-031 - parse supported Markdown into a normalized AST

| Field | Value |
|---|---|
| Priority | P0 |
| Size | L |
| Status | Blocked by V2-011, V2-013 |
| Depends on | V2-011, V2-013 |
| Requirements | Markdown policy |

Acceptance:

- Supported structures map to documented normalized nodes.
- Unsupported syntax produces a warning or error according to policy.
- Source positions are preserved.
- Parsing never executes embedded code.

### V2-032 - validate unsafe HTML and URLs

| Field | Value |
|---|---|
| Priority | P0 |
| Size | M |
| Status | Blocked by V2-031 |
| Depends on | V2-031 |
| Requirements | SEC-001, SEC-002, SEC-003 |

Acceptance:

- Raw HTML is rejected by default.
- Configured allowed HTML is sanitized.
- Scripts, handlers, unsafe frames, and dangerous schemes are rejected.
- Fixture coverage includes encoded and mixed-case bypass attempts.

### V2-033 - validate semantic publication structure

| Field | Value |
|---|---|
| Priority | P0 |
| Size | M |
| Status | Blocked by V2-031 |
| Depends on | V2-031 |
| Requirements | Build validation, A11Y-001 through A11Y-005 |

Acceptance:

- Duplicate explicit IDs fail.
- Broken internal references fail.
- Required image alternatives are enforced.
- Heading and footnote diagnostics include source position.
- Language and direction are propagated.

### V2-034 - implement deterministic ID generation

| Field | Value |
|---|---|
| Priority | P0 |
| Size | L |
| Status | Blocked by V2-031 |
| Depends on | V2-031, V2-033 |
| Requirements | PUB-ID-001 through PUB-ID-007 |

Acceptance:

- Explicit IDs are preserved.
- Generated IDs remain stable after an unrelated edit in another chapter.
- Repeated heading text disambiguates deterministically.
- A snapshot fixture proves stable output.
- Generated nodes retain source locations.

### V2-035 - generate table of contents

| Field | Value |
|---|---|
| Priority | P0 |
| Size | M |
| Status | Blocked by V2-023, V2-034 |
| Depends on | V2-023, V2-034 |
| Requirements | MAN-004 |

Acceptance:

- Chapter and selected heading depth produce an ordered nested TOC.
- All targets exist.
- Explicit author labels remain intact.
- Hidden/non-TOC sections follow documented source syntax.

### V2-036 - generate semantic source map

| Field | Value |
|---|---|
| Priority | P0 |
| Size | L |
| Status | Blocked by V2-034 |
| Depends on | V2-034 |
| Requirements | PUB-ID-006, source-map responsibilities |

Acceptance:

- Every addressable output anchor maps to source file and range.
- Build diagnostics can use the map.
- The map is versioned and deterministic.
- Browser delivery of source paths is configurable to avoid disclosing
  sensitive repository layout.

### V2-037 - render accessible semantic HTML

| Field | Value |
|---|---|
| Priority | P0 |
| Size | L |
| Status | Blocked by V2-032, V2-034 |
| Depends on | V2-032, V2-034 |
| Requirements | SEM-001 through SEM-005, A11Y-001 through A11Y-006 |

Acceptance:

- Output remains useful without CSS and JavaScript.
- Heading, landmark, figure, table, code, and footnote fixtures have correct
  semantic output.
- Internal links use stable anchors.
- Publication language and direction are present.
- No unsafe source HTML reaches output.

### V2-038 - process publication assets

| Field | Value |
|---|---|
| Priority | P0 |
| Size | M |
| Status | Blocked by V2-030 |
| Depends on | V2-030 |
| Requirements | Asset and security requirements |

Acceptance:

- Referenced assets are copied or transformed into edition output.
- Paths cannot escape the source directory.
- Dimensions are recorded for images.
- Missing assets fail the build.
- Fingerprinted output is deterministic for unchanged bytes.

### V2-039 - emit complete semantic edition

| Field | Value |
|---|---|
| Priority | P0 |
| Size | L |
| Status | Blocked by V2-035, V2-036, V2-037, V2-038 |
| Depends on | V2-035, V2-036, V2-037, V2-038 |
| Requirements | G-001, G-005, G-006 |

Acceptance:

- Every chapter is directly addressable.
- A static server can serve the output.
- Internal links work without reader JavaScript.
- Content hashes are deterministic.
- Edition output contains no absolute local filesystem paths.

### V2-040 - implement staged atomic publication

| Field | Value |
|---|---|
| Priority | P0 |
| Size | L |
| Status | Blocked by V2-039 |
| Depends on | V2-039 |
| Requirements | PUB-BUILD-001 through PUB-BUILD-007, SEC-CONV-005 |

Acceptance:

- Output is written to a unique staging path.
- Complete validation happens before promotion.
- An injected mid-build failure leaves a prior edition byte-for-byte intact.
- Stale staging output is safely identifiable for later cleanup.
- Errors include source, rule ID, and remediation.

### V2-041 - implement publication CLI interface

| Field | Value |
|---|---|
| Priority | P0 |
| Size | M |
| Status | Blocked by V2-040 |
| Depends on | V2-040 |
| Requirements | PUB-BUILD-006, PUB-BUILD-007, SEC-CONV-006 |

Commands:

- `build`.
- `validate`.
- `inspect`.
- `clean-staging` for explicitly scoped stale staging directories.

Acceptance:

- Help and invalid arguments are tested.
- Exit codes distinguish success, source validation, generation, and internal
  failure.
- Names and output paths are validated.
- `--quiet` never suppresses errors.
- Cleanup cannot target the workspace root or an unresolved path.

### V2-042 - add content hash and edition consistency checks

| Field | Value |
|---|---|
| Priority | P0 |
| Size | M |
| Status | Blocked by V2-039 |
| Depends on | V2-039 |
| Requirements | MAN-002, MAN-003 |

Acceptance:

- Rebuilding identical input produces identical canonical hashes.
- Changing canonical content changes `contentHash`.
- Reusing an immutable `editionId` with conflicting content fails by default.
- Tool-version metadata does not change canonical content identity.

### V2-043 - emit and validate manifest

| Field | Value |
|---|---|
| Priority | P0 |
| Size | M |
| Status | Blocked by V2-021, V2-039, V2-042 |
| Depends on | V2-021, V2-039, V2-042 |
| Requirements | MAN-001 through MAN-010 |

Acceptance:

- Manifest validates through the same runtime schema used by the reader.
- All chapter, asset, TOC, and source-map references exist.
- URLs are relative to the edition as configured.
- Capabilities match emitted artifacts.

### V2-044 - add build reproducibility integration tests

| Field | Value |
|---|---|
| Priority | P0 |
| Size | M |
| Status | Blocked by V2-043 |
| Depends on | V2-013, V2-043 |
| Requirements | EG-007, atomic build acceptance |

Acceptance:

- Two clean builds of the same fixture have identical canonical outputs.
- Platform-specific path separators do not enter public artifacts.
- Failure fixtures verify last-known-good preservation.

## 8. Epic E3 - headless reader core

### V2-060 - implement synchronous session handle

| Field | Value |
|---|---|
| Priority | P0 |
| Size | L |
| Status | Blocked by V2-021, V2-025 |
| Depends on | V2-021, V2-025 |
| Requirements | CORE-001, CORE-003, CORE-013, CORE-014 |

Acceptance:

- `createReaderSession()` returns synchronously.
- Initial async manifest work appears in session state.
- Core imports no DOM or React code.
- State snapshots are immutable to consumers.

### V2-061 - implement state machine and command results

| Field | Value |
|---|---|
| Priority | P0 |
| Size | L |
| Status | Blocked by V2-060 |
| Depends on | V2-060 |
| Requirements | CORE-003, CORE-006, CORE-007 |

Acceptance:

- Every specified state and valid transition is tested.
- Invalid commands return typed failures.
- Expected abort does not enter user-visible error state.
- `ready` requires renderer-visible readiness.

### V2-062 - implement subscriptions and events

| Field | Value |
|---|---|
| Priority | P0 |
| Size | M |
| Status | Blocked by V2-060 |
| Depends on | V2-060 |
| Requirements | CORE-004, diagnostics events |

Acceptance:

- Subscriptions receive ordered snapshots.
- Unsubscribe is idempotent.
- A subscriber cannot mutate internal state.
- Events exclude selected quotes and note bodies by default.

### V2-063 - implement cancellation and latest-navigation wins

| Field | Value |
|---|---|
| Priority | P0 |
| Size | L |
| Status | Blocked by V2-061 |
| Depends on | V2-061 |
| Requirements | CORE-002, CORE-005, CORE-008, EG-004 |

Acceptance:

- New navigation aborts superseded preparation.
- An aborted result cannot overwrite a later location.
- Dispose aborts manifest and renderer work.
- Stress tests issue rapid conflicting commands.

### V2-064 - implement typed error model

| Field | Value |
|---|---|
| Priority | P0 |
| Size | M |
| Status | Blocked by V2-061 |
| Depends on | V2-061 |
| Requirements | Reader error model, CORE-011 |

Acceptance:

- Stable error codes cover specified categories.
- User-safe and technical detail are separate.
- Retryable errors expose retry behavior.
- Internal causes do not leak sensitive source or note content.

### V2-065 - implement renderer registry and lifecycle

| Field | Value |
|---|---|
| Priority | P0 |
| Size | L |
| Status | Blocked by V2-061, V2-063 |
| Depends on | V2-061, V2-063 |
| Requirements | REN-001 through REN-010 |

Acceptance:

- Renderers register by rendition kind.
- Mount provides immediate destroy ownership.
- Session waits for prepared and presented content.
- Changing renderer destroys prior owned resources.
- Missing renderer produces `RENDITION_UNAVAILABLE`.

### V2-066 - implement rendition location mapping

| Field | Value |
|---|---|
| Priority | P1 |
| Size | L |
| Status | Blocked by V2-065 and mapping fixtures |
| Depends on | V2-025, V2-065 |
| Requirements | CORE-009, CORE-010 |

Acceptance:

- Exact mapping is distinguished from nearest/approximate mapping.
- No mapping leaves the current renderer unchanged unless the user confirms a
  fallback location.
- Unit tests cover section-to-page and page-to-section mapping.

### V2-067 - prevent cross-session global corruption

| Field | Value |
|---|---|
| Priority | P0 |
| Size | M |
| Status | Blocked by V2-065 |
| Depends on | V2-065 |
| Requirements | CORE-012 |

Acceptance:

- Two embedded sessions operate independently.
- A modal overlay manager reference-counts or owns scroll locking correctly.
- Closing one session cannot restore another session's global state.

## 9. Epic E4 - URL, history, progress, and preferences

### V2-070 - implement location serialization

| Field | Value |
|---|---|
| Priority | P0 |
| Size | L |
| Status | Blocked by V2-025 |
| Depends on | V2-025 |
| Requirements | URL-001, URL-004 through URL-008 |

Acceptance:

- Semantic and facsimile locations round-trip.
- Private note bodies never serialize.
- Malformed state produces a typed correction.
- Encoded anchors and base paths are tested.

### V2-071 - implement history adapter

| Field | Value |
|---|---|
| Priority | P0 |
| Size | L |
| Status | Blocked by V2-060, V2-070 |
| Depends on | V2-060, V2-070 |
| Requirements | URL-002, URL-003 |

Acceptance:

- Explicit TOC navigation pushes history.
- passive scroll-location updates replace history.
- Browser back/forward restores location once.
- Adapters can integrate a host router without importing it into core.

### V2-072 - implement reading progress

| Field | Value |
|---|---|
| Priority | P0 |
| Size | M |
| Status | Blocked by V2-023, V2-025 |
| Depends on | V2-023, V2-025 |
| Requirements | Reading progress and citation distinction |

Acceptance:

- Progress is based on stable ordered semantic blocks or chapters.
- It does not claim to be a printed page.
- Fixed-page progress is renderer-specific.
- Progress remains monotonic within ordinary forward reading.

### V2-073 - implement preference validation and local storage

| Field | Value |
|---|---|
| Priority | P0 |
| Size | M |
| Status | Blocked by V2-060 |
| Depends on | V2-060 |
| Requirements | PREF-001 through PREF-004, PREF-008 |

Acceptance:

- Preference schema and ranges are validated.
- Invalid stored values do not apply.
- Storage unavailability leaves defaults and reports diagnostics.
- Motion preference can be read before optional renderer activation.

### V2-074 - implement last-location storage

| Field | Value |
|---|---|
| Priority | P0 |
| Size | M |
| Status | Blocked by V2-070, V2-073 |
| Depends on | V2-070, V2-073 |
| Requirements | PREF-005 through PREF-008 |

Acceptance:

- Locations are stored by book and edition.
- Explicit URL location wins over stored resume.
- Invalid or old-edition resume is not silently applied.
- Storage failure does not prevent navigation.

### V2-075 - decide and implement resume UX policy

| Field | Value |
|---|---|
| Priority | P0 |
| Size | S |
| Status | Blocked by product choice; implement after V2-074 |
| Depends on | V2-074 |
| Requirements | Open decision 6 |

Recommended default: automatically restore only when opening the publication
root, with an immediate visible "Start from beginning" action.

Acceptance:

- Policy is documented.
- Deep-link precedence is tested.
- Reader is not trapped at a stored invalid location.

## 10. Epic E5 - semantic renderer

### V2-080 - implement semantic renderer mount lifecycle

| Field | Value |
|---|---|
| Priority | P0 |
| Size | L |
| Status | Blocked by V2-037, V2-065 |
| Depends on | V2-037, V2-065 |
| Requirements | REN-001 through REN-005, SEM-001 through SEM-005 |

Acceptance:

- Mount is synchronous and returns destroy.
- Initial chapter preparation is abortable.
- Existing server/static semantic HTML can be adopted or enhanced.
- Destroy releases observers and listeners.
- The renderer does not replace semantic text with canvas.

### V2-081 - implement chapter loading and prefetch

| Field | Value |
|---|---|
| Priority | P0 |
| Size | L |
| Status | Blocked by V2-080 |
| Depends on | V2-080 |
| Requirements | SEM-LOAD-001 through SEM-LOAD-005 |

Acceptance:

- Requested content outranks prefetch.
- Adjacent prefetch starts only after usable content or idle opportunity.
- Prefetch failure does not disturb current content.
- Navigation has visible loading, retry, and failure states.
- Unloaded content remains reachable by ordinary links.

### V2-082 - implement semantic location observation

| Field | Value |
|---|---|
| Priority | P0 |
| Size | L |
| Status | Blocked by V2-080, V2-071 |
| Depends on | V2-080, V2-071 |
| Requirements | Semantic location observation |

Acceptance:

- Relevant stable anchor updates during reading.
- High-frequency scroll does not flood history or announcements.
- Local block progress is clamped and used only for resume.
- Explicit anchor navigation wins over observation until settled.

### V2-083 - implement host-aware sizing

| Field | Value |
|---|---|
| Priority | P0 |
| Size | M |
| Status | Blocked by V2-080 |
| Depends on | V2-080 |
| Requirements | REN-001, REN-002, PERF-007 |

Acceptance:

- Embedded and full-page readers use their actual host size.
- Resize does not reload unrelated chapters.
- Observer loops and zero-size hosts are handled explicitly.

### V2-084 - implement semantic renderer error recovery

| Field | Value |
|---|---|
| Priority | P0 |
| Size | M |
| Status | Blocked by V2-064, V2-081 |
| Depends on | V2-064, V2-081 |
| Requirements | CORE-011, SEM-LOAD-003 through SEM-LOAD-005 |

Acceptance:

- Current readable content remains when adjacent content fails.
- Retry targets only failed work.
- An unrecoverable chapter failure offers navigation to available content.

## 11. Epic E6 - shell, themes, and accessibility

### V2-090 - implement reader shell structure

| Field | Value |
|---|---|
| Priority | P0 |
| Size | L |
| Status | Blocked by V2-060, V2-080 |
| Depends on | V2-060, V2-080 |
| Requirements | Shell regions, A11Y-UI-001 through A11Y-UI-010 |

Acceptance:

- Title, chapter, TOC, progress, navigation, appearance, and feature regions
  use appropriate semantics.
- Content remains the primary reading region.
- Loading and errors are associated with their task.
- Shell functions by keyboard.

### V2-091 - implement responsive TOC

| Field | Value |
|---|---|
| Priority | P0 |
| Size | M |
| Status | Blocked by V2-023, V2-090 |
| Depends on | V2-023, V2-090 |
| Requirements | TOC and responsive shell |

Acceptance:

- Current location is indicated without color alone.
- Nested entries are keyboard usable.
- Narrow layout uses an accessible disclosure or modal pattern.
- Selecting an entry closes transient navigation and focuses content.

### V2-092 - implement design tokens and default theme

| Field | Value |
|---|---|
| Priority | P0 |
| Size | L |
| Status | Blocked by V2-090 |
| Depends on | V2-090 |
| Requirements | CSS-001 through CSS-008 |

Acceptance:

- Tokens cover specified groups.
- Styles are framework independent and namespaced.
- Host overrides are documented.
- Paper effects do not reduce text contrast.
- Light, dark, system, and academic modes pass visual/accessibility checks.

### V2-093 - implement typography controls

| Field | Value |
|---|---|
| Priority | P0 |
| Size | M |
| Status | Blocked by V2-073, V2-092 |
| Depends on | V2-073, V2-092 |
| Requirements | Preference model, PREF-004 |

Acceptance:

- Font, scale, line height, and width choices apply through tokens.
- Values remain within validated ranges.
- 200 percent text resizing loses no content or function.
- Long tables and code are contained locally.

### V2-094 - implement motion policy

| Field | Value |
|---|---|
| Priority | P0 |
| Size | M |
| Status | Blocked by V2-073, V2-092 |
| Depends on | V2-073, V2-092 |
| Requirements | UX-MOT-001 through UX-MOT-005 |

Acceptance:

- System preference applies on first load.
- User override persists.
- Reduced mode removes large spatial transitions.
- Automated tests inspect resulting states.

### V2-095 - implement input ownership

| Field | Value |
|---|---|
| Priority | P0 |
| Size | M |
| Status | Blocked by V2-090 |
| Depends on | V2-090 |
| Requirements | UX-IN-001 through UX-IN-008, REN-006 |

Acceptance:

- Keyboard shortcuts activate only within the active reader scope.
- Editable controls retain expected key behavior.
- Visible controls work without gestures.
- Touch scrolling remains native.

### V2-096 - implement modal overlay manager

| Field | Value |
|---|---|
| Priority | P0 |
| Size | L |
| Status | Blocked by V2-067, V2-090 |
| Depends on | V2-067, V2-090 |
| Requirements | Modal requirements, A11Y-UI-008 |

Acceptance:

- Initial focus, focus containment, Escape, inert background, and restoration
  pass browser tests.
- Nested overlays have deterministic ownership.
- Body scrolling restores correctly after overlapping open/close sequences.
- Embedded and routed mode do not acquire modal behavior.

### V2-097 - add print stylesheet

| Field | Value |
|---|---|
| Priority | P1 |
| Size | M |
| Status | Blocked by V2-092 |
| Depends on | V2-092 |
| Requirements | CSS-007 |

Acceptance:

- Interactive chrome is omitted.
- Content and source links remain legible.
- Printed pagination is not assumed to match responsive citations.

### V2-098 - add automated accessibility checks

| Field | Value |
|---|---|
| Priority | P0 |
| Size | M |
| Status | Blocked by V2-090, V2-092 |
| Depends on | V2-090, V2-092 |
| Requirements | Accessibility testing |

Acceptance:

- CI runs automated rules on representative routes and states.
- Semantic role assertions cover shell and modal behavior.
- Known false positives have documented scoped suppressions.

## 12. Epic E7 - bookmarks

### V2-100 - establish IndexedDB database and migration framework

| Field | Value |
|---|---|
| Priority | P0 |
| Size | L |
| Status | Blocked by V2-011, V2-020 |
| Depends on | V2-011, V2-020 |
| Requirements | ANN-STORE-001 through ANN-STORE-004, BM-003 |

Acceptance:

- Database schema is versioned.
- Opening, transaction, quota, and unavailable-storage errors are typed.
- Failed migration preserves the prior database.
- Tests run in a browser-capable IndexedDB environment.

### V2-101 - implement bookmark repository

| Field | Value |
|---|---|
| Priority | P0 |
| Size | M |
| Status | Blocked by V2-025, V2-100 |
| Depends on | V2-025, V2-100 |
| Requirements | BM-001 through BM-007 |

Acceptance:

- Add, update, list, get, and remove are transactional.
- Records are isolated by book and edition.
- Invalid records fail validation.
- Duplicate behavior is chosen and documented.

### V2-102 - implement bookmark UI

| Field | Value |
|---|---|
| Priority | P0 |
| Size | L |
| Status | Blocked by V2-090, V2-101 |
| Depends on | V2-090, V2-101 |
| Requirements | BM-001 through BM-008 |

Acceptance:

- Add/remove/label/open work by keyboard and pointer.
- Save success and failure are communicated.
- Opening an invalid bookmark reports the issue.
- Delete supports undo or an appropriate confirmation policy.

## 13. Epic E8 - highlights and notes

### V2-110 - implement annotation record and repository

| Field | Value |
|---|---|
| Priority | P0 |
| Size | L |
| Status | Blocked by V2-026, V2-100 |
| Depends on | V2-026, V2-100 |
| Requirements | Annotation model, ANN-STORE-001 through ANN-STORE-005 |

Acceptance:

- Records validate before storage.
- CRUD is transactional.
- Records are edition isolated.
- No remote request occurs.
- Storage failures cannot produce success UI.

### V2-111 - implement DOM selection to text selector

| Field | Value |
|---|---|
| Priority | P0 |
| Size | L |
| Status | Blocked by V2-026, V2-080 |
| Depends on | V2-026, V2-080 |
| Requirements | ANN-CREATE-001 through ANN-CREATE-003 |

Acceptance:

- Non-empty supported semantic selections produce normalized selectors.
- Unsupported cross-boundary selections explain the limitation.
- Exact quote, context, and position are captured.
- DOM nodes are not persisted.
- Repeated quote fixtures are covered.

### V2-112 - implement annotation resolver

| Field | Value |
|---|---|
| Priority | P0 |
| Size | XL |
| Status | Blocked by V2-026, V2-034 |
| Depends on | V2-026, V2-034 |
| Requirements | ANN-RES-001 through ANN-RES-006 |

Split during implementation into:

1. Exact position and quote match.
2. Anchor-local quote/context search.
3. Ambiguity detection.
4. Unresolved result model.
5. Mutation fixture suite.

Acceptance:

- Resolver follows the specified order.
- It never silently attaches to an ambiguous different occurrence.
- Insertion, deletion, repeated quote, and removed quote tests pass.
- Result reports exact, re-anchored, ambiguous, or unresolved.

### V2-113 - render semantic highlight ranges

| Field | Value |
|---|---|
| Priority | P0 |
| Size | L |
| Status | Blocked by V2-080, V2-112 |
| Depends on | V2-080, V2-112 |
| Requirements | Annotation presentation, A11Y-UI-006 |

Acceptance:

- Highlight presentation does not replace or duplicate accessible text.
- Overlapping annotations have deterministic behavior.
- Color is supplemented by another state indicator.
- Rendering survives chapter unload/reload.
- Native copy and selection continue to work.

### V2-114 - implement annotation creation UI

| Field | Value |
|---|---|
| Priority | P0 |
| Size | L |
| Status | Blocked by V2-095, V2-110, V2-111 |
| Depends on | V2-095, V2-110, V2-111 |
| Requirements | ANN-CREATE-001 through ANN-CREATE-007 |

Acceptance:

- Selection actions work by keyboard and pointer.
- Color and underline/highlight treatment are available.
- Cancel leaves no partial annotation.
- Storage failure remains visible.
- Touch selection handles are not obstructed.

### V2-115 - implement Markdown note editor

| Field | Value |
|---|---|
| Priority | P0 |
| Size | L |
| Status | Blocked by V2-110, V2-114 |
| Depends on | V2-110, V2-114 |
| Requirements | ANN-CREATE-004, SEC-006 |

Acceptance:

- Create, edit, save, cancel, and delete are accessible.
- Markdown preview uses a safe subset.
- Unsaved changes have a clear policy.
- Note text never enters diagnostic events.

### V2-116 - implement notes and unresolved-annotation view

| Field | Value |
|---|---|
| Priority | P0 |
| Size | L |
| Status | Blocked by V2-112, V2-115 |
| Depends on | V2-090, V2-112, V2-115 |
| Requirements | ANN-RES-003 through ANN-RES-005 |

Acceptance:

- Notes list follows publication order.
- Selecting a resolved note navigates and focuses the passage.
- Unresolved notes remain visible and are labeled.
- Mobile and desktop presentations remain accessible.

### V2-117 - test annotation lifecycle across reload and content mutations

| Field | Value |
|---|---|
| Priority | P0 |
| Size | L |
| Status | Blocked by V2-113 through V2-116 |
| Depends on | V2-113, V2-114, V2-115, V2-116 |
| Requirements | AC-05, AC-06 |

Acceptance:

- Full create/edit/reload/resolve/delete flow passes in all browser engines.
- Same-edition mutation fixtures test exact and unresolved outcomes.
- Cross-edition records do not silently attach.

## 14. Epic E9 - export and citation

### V2-120 - implement citation formatter

| Field | Value |
|---|---|
| Priority | P0 |
| Size | M |
| Status | Blocked by V2-025, V2-070 |
| Depends on | V2-025, V2-070 |
| Requirements | CIT-001 through CIT-005 |

Acceptance:

- Output includes publication attribution, edition, semantic location, and URL.
- Printed page label is supplementary.
- Responsive screen page is never emitted as a citation.
- Formatting is independent from storage.

### V2-121 - implement quote link generation

| Field | Value |
|---|---|
| Priority | P1 |
| Size | M |
| Status | Blocked by V2-070, V2-111 |
| Depends on | V2-070, V2-111 |
| Requirements | URL-004, URL-005 |

Acceptance:

- Link contains public passage selector only.
- Private note content is excluded.
- Opening restores or reports an unresolved passage.
- Excessively long selections follow a documented limit.

### V2-122 - implement Markdown annotation export

| Field | Value |
|---|---|
| Priority | P0 |
| Size | L |
| Status | Blocked by V2-110, V2-112, V2-120 |
| Depends on | V2-110, V2-112, V2-120 |
| Requirements | EXP-001 through EXP-007 |

Acceptance:

- Export order, metadata, quotes, notes, styles, timestamps, and unresolved
  state meet the specification.
- YAML/front-matter injection is prevented.
- Empty state does not download a misleading file.
- Export works entirely in the browser.

### V2-123 - implement export UI

| Field | Value |
|---|---|
| Priority | P0 |
| Size | M |
| Status | Blocked by V2-116, V2-122 |
| Depends on | V2-116, V2-122 |
| Requirements | EXP-001, EXP-006, EXP-007 |

Acceptance:

- Scope and destination are clear.
- Keyboard and screen-reader flow works.
- Errors are visible.
- Download filename is safe and deterministic.

## 15. Epic E10 - legacy fallback adapter

### V2-130 - define legacy adapter boundary

| Field | Value |
|---|---|
| Priority | P0 |
| Size | M |
| Status | Blocked by V2-001, V2-065 |
| Depends on | V2-001, V2-065 |
| Requirements | LEG-001 through LEG-004, LEG-007 |

Acceptance:

- Adapter depends only on the legacy public API.
- Legacy code is lazy and absent from default semantic bundle.
- Pinned revision is available in diagnostics.
- The interface can be replaced by the new facsimile renderer later.

### V2-131 - implement legacy fallback loading

| Field | Value |
|---|---|
| Priority | P0 |
| Size | L |
| Status | Blocked by V2-130 |
| Depends on | V2-130 |
| Requirements | LEG-002, LEG-003, LEG-004, LEG-006 |

Acceptance:

- One session cannot open overlapping legacy viewers.
- Load and initialization failure returns to semantic reading with a useful
  error.
- Semantic reader state remains alive while fallback is open.
- The compatibility layer resolves the legacy module form correctly without
  modifying legacy source.

### V2-132 - implement legacy modal accessibility wrapper

| Field | Value |
|---|---|
| Priority | P0 |
| Size | L |
| Status | Blocked by V2-096, V2-131 |
| Depends on | V2-096, V2-131 |
| Requirements | LEG-005, A11Y-UI-008 |

Acceptance:

- V2 wrapper owns focus entry, containment, Escape, inert background, and
  restoration.
- Reduced-motion limitations are clearly handled or communicated.
- A direct semantic-rendition action is present.

### V2-133 - implement legacy page mapping

| Field | Value |
|---|---|
| Priority | P1 |
| Size | L |
| Status | Blocked by V2-066 and publication mapping data |
| Depends on | V2-066, V2-131 |
| Requirements | LEG-004, LEG-009 |

Acceptance:

- Exact mapped page opens when known.
- Page changes can update an approximate semantic counterpart without claiming
  unsupported precision.
- Unmapped books keep separate semantic and facsimile resume locations.

### V2-134 - document legacy limitations and rollback

| Field | Value |
|---|---|
| Priority | P0 |
| Size | S |
| Status | Blocked by V2-131 |
| Depends on | V2-131 |
| Requirements | LEG-008, LEG-010 |

Acceptance:

- Documentation covers raster accessibility, all-page loading, browser/module
  compatibility, and fallback behavior.
- Rollback instructions restore the independently pinned legacy entry point.

## 16. Epic E11 - React adapter and reference app

### V2-140 - implement `useReaderSession`

| Field | Value |
|---|---|
| Priority | P0 |
| Size | L |
| Status | Blocked by V2-060 through V2-065 |
| Depends on | V2-060, V2-061, V2-062, V2-063, V2-065 |
| Requirements | REACT-001 through REACT-004, REACT-006 |

Acceptance:

- Hook creates or consumes session according to documented ownership.
- Strict Mode does not create overlapping sessions.
- Callback identity changes do not reset location.
- Unmount unsubscribes and disposes owned sessions.
- React remains a peer dependency only here.

### V2-141 - implement React provider and shell components

| Field | Value |
|---|---|
| Priority | P0 |
| Size | L |
| Status | Blocked by V2-090, V2-140 |
| Depends on | V2-090, V2-140 |
| Requirements | REACT-001 through REACT-006 |

Acceptance:

- Components consume public state and commands.
- Controlled/uncontrolled behaviors are explicit.
- An imperative integration remains fully supported.
- Components do not duplicate core state.

### V2-142 - create static-host reference app

| Field | Value |
|---|---|
| Priority | P0 |
| Size | L |
| Status | Blocked by V2-039, V2-090, V2-141 |
| Depends on | V2-039, V2-090, V2-141 |
| Requirements | G-005, AC-01 through AC-05 |

Acceptance:

- App serves a generated fixture on a static server.
- Direct chapter and anchor URLs work.
- Semantic reading works before enhancement.
- Preferences, bookmark, annotation, and export journeys are demonstrated.
- Legacy fallback is optional and separately loaded.

### V2-143 - create imperative integration example

| Field | Value |
|---|---|
| Priority | P0 |
| Size | M |
| Status | Blocked by V2-065, V2-090 |
| Depends on | V2-065, V2-090 |
| Requirements | Framework-neutral delivery |

Acceptance:

- Example uses no React.
- Mount, subscribe, navigate, and destroy are demonstrated.
- Packed artifacts, not workspace source aliases, are used in at least one CI
  integration test.

### V2-144 - add clean-consumer package test

| Field | Value |
|---|---|
| Priority | P0 |
| Size | M |
| Status | Blocked by V2-140 through V2-143 |
| Depends on | V2-140, V2-141, V2-142, V2-143 |
| Requirements | AC-12, EG-006 |

Acceptance:

- CI packs packages and installs them into clean React and imperative fixtures.
- No undeclared workspace dependency is available.
- CSS and dynamic imports resolve.
- Browser smoke tests open and navigate the packed app.

## 17. Epic E12 - quality, performance, and release

### V2-150 - establish browser test matrix

| Field | Value |
|---|---|
| Priority | P0 |
| Size | M |
| Status | Blocked by V2-142 |
| Depends on | V2-142 |
| Requirements | Browser testing, supported environments |

Acceptance:

- Chromium, Firefox, and WebKit jobs run.
- Direct link, history, preferences, bookmark, annotation, export, reduced
  motion, modal fallback, and failure scenarios are covered.
- Exact supported browser versions are recorded for R1.

### V2-151 - run manual assistive technology protocol

| Field | Value |
|---|---|
| Priority | P0 |
| Size | L |
| Status | Blocked by feature-complete release candidate |
| Depends on | V2-098, V2-102, V2-116, V2-123, V2-132 |
| Requirements | Assistive technology validation, WCAG 2.2 AA |

Acceptance:

- NVDA/Chromium, NVDA/Firefox, VoiceOver/macOS Safari, and VoiceOver/iOS Safari
  scripts are completed.
- Defects are logged and release-blocking severity is assigned.
- Any exception has an approved accessible alternative.

### V2-152 - establish bundle budgets

| Field | Value |
|---|---|
| Priority | P0 |
| Size | M |
| Status | Blocked by V2-010 |
| Depends on | V2-010 |
| Requirements | PERF-002, PERF-003, PERF-010 |

Acceptance:

- Core plus semantic enhancement is measured compressed.
- 100 kB gzip ceiling fails CI.
- Legacy and facsimile chunks are independently reported.
- Host framework is excluded consistently.

### V2-153 - establish semantic performance profile

| Field | Value |
|---|---|
| Priority | P0 |
| Size | L |
| Status | Blocked by V2-013, V2-142 |
| Depends on | V2-013, V2-142, V2-152 |
| Requirements | PERF-001, PERF-005 through PERF-010 |

Acceptance:

- Reference devices and network profiles are documented.
- Route-to-readable, navigation, long tasks, CLS, and requests are measured.
- No main-thread navigation task exceeds the specified threshold under the
  profile.
- Results are reproducible in CI where stable and manually where not.

### V2-154 - perform privacy review

| Field | Value |
|---|---|
| Priority | P0 |
| Size | M |
| Status | Blocked by V2-110, V2-122 |
| Depends on | V2-110, V2-122 |
| Requirements | PRIV-001 through PRIV-008 |

Acceptance:

- Network inspection confirms no bookmark, quote, or note content leaves the
  browser in R1.
- Diagnostic and host events are reviewed.
- Export and share boundaries are documented.

### V2-155 - perform security review

| Field | Value |
|---|---|
| Priority | P0 |
| Size | L |
| Status | Blocked by release candidate |
| Depends on | V2-032, V2-040, V2-110, V2-122, V2-131 |
| Requirements | SEC-001 through SEC-CONV-006 |

Review:

- Markdown and URL sanitization.
- Manifest validation.
- Annotation Markdown.
- Export injection.
- Path traversal.
- Atomic generation.
- Dependency advisories.
- Legacy lazy loading and CSP.

Acceptance:

- No open critical or high-severity issue without approved exception.
- Threat model and mitigations are documented.
- Converter isolation requirements are tested where conversion ships.

### V2-156 - create deployment and CSP guide

| Field | Value |
|---|---|
| Priority | P0 |
| Size | M |
| Status | Blocked by V2-142 |
| Depends on | V2-142 |
| Requirements | Hosting and SEC-005 |

Acceptance:

- Static routing, content types, cache headers, compression, CSP, and immutable
  editions are documented.
- Guide does not require unsafe inline scripts.
- Deployment is reproduced in a clean environment.

### V2-157 - run representative publication pilot

| Field | Value |
|---|---|
| Priority | P0 |
| Size | XL |
| Status | Blocked by release candidate and content-owner selection |
| Depends on | V2-043, V2-142, V2-150, V2-153 |
| Requirements | R1 completion, Definition of done |

Acceptance:

- At least one representative Ethical Tech CoLab book builds and is reviewed.
- Editors review build diagnostics and authoring workflow.
- Readers review semantic layout, navigation, annotations, and fallback.
- Pilot defects and requested scope changes are triaged before release.

### V2-158 - produce R1 migration and rollback plan

| Field | Value |
|---|---|
| Priority | P0 |
| Size | M |
| Status | Blocked by V2-134, V2-157 |
| Depends on | V2-134, V2-157 |
| Requirements | Existing implementation preservation and decommission conditions |

Acceptance:

- Publication entry points can opt into V2 independently.
- Rollback restores the legacy entry point.
- No data migration claims are made for unsupported legacy annotations.
- Legacy removal is explicitly out of this plan.

### V2-159 - R1 release readiness review

| Field | Value |
|---|---|
| Priority | P0 |
| Size | M |
| Status | Blocked by all P0 release work |
| Depends on | V2-044, V2-117, V2-123, V2-134, V2-144, V2-150 through V2-158 |
| Requirements | AC-01 through AC-12, R1 Definition of done |

Acceptance:

- Every P0 story is done or has an approved documented deferral.
- AC-01 through AC-12 have evidence.
- Browser, accessibility, performance, privacy, and security gates pass.
- Known limitations are published.
- Legacy remains independently usable.

## 18. Epic E13 - optional R1.1 hardening

### V2-170 - add semantic search index

| Field | Value |
|---|---|
| Priority | P1 |
| Size | XL |
| Status | Blocked by search product behavior |
| Depends on | V2-039, V2-065 |
| Requirements | R1.1 optional search |

Discovery must choose:

- Browser-native loaded-content search.
- Generated static index.
- Hybrid per-chapter index.

Acceptance is defined after corpus and index-size measurement. Search results
must resolve to stable semantic locations.

### V2-171 - add annotation import

| Field | Value |
|---|---|
| Priority | P1 |
| Size | L |
| Status | Blocked by V2-122 |
| Depends on | V2-122 |
| Requirements | R1.1 optional import |

Acceptance:

- Import validates schema, book, edition, IDs, selectors, and timestamps.
- It previews changes and handles duplicates explicitly.
- Invalid import cannot corrupt existing local records.

### V2-172 - add opt-in bounded offline cache

| Field | Value |
|---|---|
| Priority | P1 |
| Size | XL |
| Status | Blocked by host offline decision |
| Depends on | V2-142, V2-153 |
| Requirements | OFF-001 through OFF-007 |

Acceptance:

- Cache is edition versioned and bounded.
- It does not precache an entire book by default.
- Update and unavailable-offline behavior pass browser tests.

### V2-173 - add additional publication fixtures and themes

| Field | Value |
|---|---|
| Priority | P1 |
| Size | L |
| Status | Ready after pilot feedback |
| Depends on | V2-157 |
| Requirements | R1.1 hardening |

Scope is driven by pilot gaps, not aesthetic additions alone.

## 19. Epic E14 - bounded facsimile prototype

All stories in this epic have `Prototype` status and do not block R1.

### V2-200 - create facsimile benchmark harness

| Field | Value |
|---|---|
| Priority | P2 |
| Size | L |
| Status | Prototype |
| Depends on | V2-013, V2-153 |
| Requirements | FAC-P-011, FAC-P-012 |

Measure legacy baseline and prototype:

- Requests on open.
- Encoded bytes.
- Approximate decoded pixel bytes.
- Open-to-visible.
- Navigation-to-paint.
- Long tasks.
- Resize behavior.
- Rapid navigation.

Acceptance:

- Profiles and fixtures are reproducible.
- Results separate transfer bytes from decoded resource estimates.

### V2-201 - define fixed-page resource manager

| Field | Value |
|---|---|
| Priority | P2 |
| Size | XL |
| Status | Prototype |
| Depends on | V2-200 |
| Requirements | FAC-P-001 through FAC-P-006 |

Split into:

- Page-window planner.
- Fetch/decode cancellation.
- LRU budget.
- Resource release.
- Instrumentation.

Acceptance:

- 200-page fixture never requests all pages on open.
- Latest navigation wins.
- Eviction returns accounting toward budget.
- Tests cover failure and abort.

### V2-202 - implement non-curl fixed-page presentation

| Field | Value |
|---|---|
| Priority | P2 |
| Size | L |
| Status | Prototype |
| Depends on | V2-201, V2-065 |
| Requirements | FAC-P-006, FAC-P-007, FAC-P-010 |

Acceptance:

- Current spread works before decorative effects.
- Host-aware resize preserves location.
- Buttons, keyboard, touch, focus, and reduced motion work.

### V2-203 - prototype composited page transition

| Field | Value |
|---|---|
| Priority | P2 |
| Size | XL |
| Status | Prototype |
| Depends on | V2-202 |
| Requirements | FAC-P-008 through FAC-P-010 |

Compare:

- Simple hinge/turn.
- Layered corner fold.
- Short crossfade under resource constraints.

Acceptance:

- Active animation uses transform and opacity.
- No per-frame page rerender.
- `will-change` is temporary.
- Reduced motion bypasses curl.
- Frame behavior meets agreed profile.

### V2-204 - implement responsive image variants in build pipeline

| Field | Value |
|---|---|
| Priority | P2 |
| Size | XL |
| Status | Prototype |
| Depends on | V2-040, V2-201 |
| Requirements | Facsimile manifest and asset guidance |

Acceptance:

- Manifest records dimensions, MIME, pixel width, and byte size.
- AVIF/WebP and fallback matrix is measurement-driven.
- Build concurrency is bounded.
- Untrusted PDF conversion follows converter security requirements.

### V2-205 - prototype semantic/facsimile source mapping

| Field | Value |
|---|---|
| Priority | P2 |
| Size | XL |
| Status | Prototype |
| Depends on | V2-036, V2-066, V2-204 |
| Requirements | CORE-009, CORE-010, FAC-P mapping |

Acceptance:

- One representative publication switches in both directions.
- Exact and approximate mappings are explicit.
- Unmapped regions have predictable behavior.

### V2-206 - facsimile promotion decision

| Field | Value |
|---|---|
| Priority | P2 |
| Size | M |
| Status | Prototype |
| Depends on | V2-200 through V2-205 |
| Requirements | FAC-P-001 through FAC-P-012 |

Decision outcomes:

- Promote new renderer.
- Continue prototype with named gaps.
- Retain legacy fallback.
- Drop enhanced facsimile and provide static PDF access only.

Promotion requires measured material improvement and accessibility approval.

## 20. Epic E15 - semantic paged-mode prototype

All stories in this epic have `Prototype` status and do not block R1.

### V2-220 - define representative pagination corpus

| Field | Value |
|---|---|
| Priority | P2 |
| Size | M |
| Status | Prototype |
| Depends on | V2-013, V2-039 |
| Requirements | P-PAGED corpus |

Acceptance:

- Corpus covers headings, figures, tables, code, footnotes, long links, zoom,
  user fonts, and supported directions.

### V2-221 - prototype CSS multi-column pagination

| Field | Value |
|---|---|
| Priority | P2 |
| Size | L |
| Status | Prototype |
| Depends on | V2-220 |
| Requirements | PAG-P-001 through PAG-P-008 |

Measure layout correctness, reflow stability, location retention, and browser
differences.

### V2-222 - prototype explicit semantic segment composition

| Field | Value |
|---|---|
| Priority | P2 |
| Size | XL |
| Status | Prototype |
| Depends on | V2-220 |
| Requirements | PAG-P-001 through PAG-P-008 |

Prototype bounded segments at stable block boundaries without splitting unsafe
structures.

### V2-223 - compare pagination approaches

| Field | Value |
|---|---|
| Priority | P2 |
| Size | M |
| Status | Prototype |
| Depends on | V2-221, V2-222 |
| Requirements | P-PAGED promotion |

Compare:

- Correctness.
- Accessibility.
- Location retention.
- Performance.
- Maintenance.
- Browser variance.
- Fallback behavior.

### V2-224 - paged-mode promotion decision

| Field | Value |
|---|---|
| Priority | P2 |
| Size | S |
| Status | Prototype |
| Depends on | V2-223 |
| Requirements | PAG-P-001 through PAG-P-008 |

Possible decision includes not shipping responsive pages and instead using
semantic scroll with chapter transitions. That outcome satisfies the approved
architecture.

## 21. Epic E15A - semantic page-turn geometry port

Option 1 from
[PAGE-TURN-IMPLEMENTATION-ESTIMATES.md](./PAGE-TURN-IMPLEMENTATION-ESTIMATES.md)
was selected on 2026-08-29. This epic improves physical-turn fidelity without
changing semantic ownership or replacing the independently preserved legacy
fallback.

### V2-230 - freeze page-turn baseline and port boundary

| Field | Value |
|---|---|
| Priority | P1 |
| Size | M |
| Status | Complete |
| Depends on | Existing V2 semantic book-mode implementation |
| Requirements | TURN-P-001, TURN-P-002, TURN-P-013, TURN-P-014 |

Record the selected upstream StPageFlip version and revision, current visual and
runtime baselines, the code that may be derived, and the subsystems that remain
V2-owned.

Acceptance:

- StPageFlip 2.0.7 and tag revision `9b7c17a` are pinned in the plan.
- The MIT notice is retained.
- Page collection, pagination, history, accessibility, and content ownership
  are explicitly excluded from the port.
- The current CSS turn and legacy fallback are not overwritten.

### V2-231 - implement the pure fold geometry kernel

| Field | Value |
|---|---|
| Priority | P1 |
| Size | L |
| Status | Complete |
| Depends on | V2-230 |
| Requirements | TURN-P-003, TURN-P-006, TURN-P-014 |

Build strict TypeScript geometry types and deterministic calculations for
top/bottom corners, forward/backward direction, constrained pointer position,
moving and revealed clip polygons, rotation, progress, and shadow axis.

Acceptance:

- The module has no DOM, timer, global, page-content, or reader-session import.
- Invalid dimensions and non-finite input fail explicitly.
- Degenerate folds return a typed non-success result rather than being silently
  swallowed.
- Unit tests cover symmetry, finite output, progress, constraints, both
  directions, and both corners.

### V2-232 - implement the semantic-face projector

| Field | Value |
|---|---|
| Priority | P1 |
| Size | L |
| Status | Ready |
| Depends on | V2-231 |
| Requirements | TURN-P-004, TURN-P-005, TURN-P-006, TURN-P-015 |

Translate a geometry frame into bounded transforms, clip paths, face
visibility, and inner/outer shadow styles on V2's existing virtualized semantic
faces.

Acceptance:

- Projection performs no content cloning and no page selection.
- All style writes are batched in one active animation frame.
- The stationary spread remains normal semantic HTML.
- Moving clones remain inert, hidden from assistive technology, and stripped of
  IDs.
- Manifest chapter boundaries force fresh pages with a separate chapter label,
  prominent title, and first-prose treatment.

### V2-233 - unify pointer turn interaction

| Field | Value |
|---|---|
| Priority | P1 |
| Size | L |
| Status | Ready |
| Depends on | V2-232 |
| Requirements | TURN-P-005 through TURN-P-009 |

Replace progress-only pointer styling with page-local pointer coordinates,
corner selection, geometry solving, and a deterministic drag/settle state
machine.

Acceptance:

- A page can be grabbed from the full bounded top or bottom corner target.
- Reversing direction, pointer cancellation, and lost capture restore the
  original spread without navigation.
- Navigation and history update once, after a committed settle.
- Native selection and links away from the turn targets continue to work.

### V2-234 - drive automatic and preview turns through geometry

| Field | Value |
|---|---|
| Priority | P1 |
| Size | L |
| Status | Ready |
| Depends on | V2-233 |
| Requirements | TURN-P-008, TURN-P-010, UX-MOT-* |

Use time-based pointer trajectories through the same solver for button,
keyboard, and optional corner-preview turns.

Acceptance:

- Automatic turns do not use a separate clip-path keyframe approximation.
- Frame-rate variation does not change duration or final state.
- No requestAnimationFrame loop runs while the reader is idle.
- Reduced motion commits immediately without creating moving faces.

### V2-235 - port and tune soft-page shadow geometry

| Field | Value |
|---|---|
| Priority | P1 |
| Size | L |
| Status | Ready |
| Depends on | V2-232 |
| Requirements | TURN-P-006, TURN-P-011, TURN-P-012, TURN-P-014 |

Add bounded fold-edge, inner, and outer shadows aligned to the solved fold axis,
then tune paper lift and static page arch without raster surfaces.

Acceptance:

- Shadows follow the fold rather than the book rectangle.
- Shadow opacity and width remain bounded at fold endpoints.
- No black seam appears between front and back faces.
- Shadow layers do not intercept input or enter the accessibility tree.

### V2-236 - integrate behind an internal geometry-path switch

| Field | Value |
|---|---|
| Priority | P1 |
| Size | M |
| Status | Ready |
| Depends on | V2-233, V2-234, V2-235 |
| Requirements | TURN-P-001 through TURN-P-013 |

Make the geometry path selectable for comparison while retaining the current CSS
turn as rollback until promotion.

Acceptance:

- Both paths use identical semantic page and face mapping.
- The switch does not alter canonical URLs or publication data.
- Failure to create a geometry frame surfaces a diagnostic and safely restores
  the stationary spread.
- The switch is not exposed as a reader preference before promotion.

### V2-237 - validate accessibility, performance, and browser behavior

| Field | Value |
|---|---|
| Priority | P1 |
| Size | XL |
| Status | Ready |
| Depends on | V2-236 |
| Requirements | PAG-P-001 through PAG-P-008, TURN-P-004 through TURN-P-013 |

Run unit, browser, accessibility-tree, visual-frame, bundle, DOM, and
active-frame measurements on the real production book.

Acceptance:

- Chrome, Edge, Firefox, Safari, iOS Safari, and representative Android Chrome
  meet the agreed functional matrix.
- Added runtime is at most 20 kB gzip and introduces no page-image requests.
- Desktop reaches at least 55 FPS and representative mobile reaches at least
  45 FPS while dragging.
- No active task exceeds 50 ms; resize/font rebuild budgets remain satisfied.
- Quarter, half, and three-quarter frames show correct text and an attached
  binding edge.

### V2-238 - decide geometry-path promotion

| Field | Value |
|---|---|
| Priority | P1 |
| Size | S |
| Status | Ready |
| Depends on | V2-237 |
| Requirements | TURN-P-001 through TURN-P-014 |

Compare the geometry path with the current CSS turn and legacy visual baseline.
Promote only if it materially improves fold fidelity while satisfying semantic,
accessibility, payload, and runtime gates. Otherwise retain the current path and
record the failed gate.

### V3 beta open-work register

The V3 route is a broad, book-first semantic beta across the full 22-volume
shelf. The following work remains after the August 30, 2026 reader-shell,
opaque-turn, reference-styling, and back-navigation pass.

| ID | Priority | Status | Remaining work |
|---|---|---|---|
| V3-400 | P1 | Ready | Move adjacent prefetch to an idle scheduler, abort obsolete chapter requests, and incrementally paginate unusually long chapters. |
| V3-401 | P1 | Ready | Complete publication-by-publication editorial parity, table splitting, responsive tables, formula typography, chart labels, and the AI Research Assistant appendix comparison. |
| V3-402 | P2 | Ready | Verify all Plurality cross-chapter links and note back-links; decide which pinned figures should become bounded lazy images. |
| V3-403 | P1 | Ready | Measure and tune turn frames on representative low-end mobile hardware, then record browser/device budgets. |
| V3-410 | P2 | Ready | Add hierarchical contents navigation and in-book search for long publications. |
| V3-411 | P2 | Ready | Add bookmarks and a visible start-from-beginning action for resumed books. |
| V3-412 | P3 | Future | Extend sharing to selected text and exported annotations after privacy and content-boundary review. |

These V3 items are independent of V2-232 through V2-238, which still govern
whether the same geometry path is promoted into the V2 production reader.

## 22. Epic E16 - future product capabilities

These stories are placeholders only. They must not enter implementation without
separate product, privacy, security, accessibility, and operational review.

### V2-300 - collaborative annotations

| Field | Value |
|---|---|
| Priority | P3 |
| Size | XL |
| Status | Future |
| Depends on | Stable local annotation APIs, identity and moderation design |

### V2-301 - consented reader analytics

| Field | Value |
|---|---|
| Priority | P3 |
| Size | XL |
| Status | Future |
| Depends on | Privacy policy, consent integration, event minimization |

### V2-302 - AI chapter assistant

| Field | Value |
|---|---|
| Priority | P3 |
| Size | XL |
| Status | Future |
| Depends on | Provider, provenance, consent, retention, and accessibility review |

### V2-303 - highlight summarization

| Field | Value |
|---|---|
| Priority | P3 |
| Size | XL |
| Status | Future |
| Depends on | V2-302 plus explicit selection-content transmission |

### V2-304 - community reading circles

| Field | Value |
|---|---|
| Priority | P3 |
| Size | XL |
| Status | Future |
| Depends on | Identity, collaboration, moderation, notification, and deletion policy |

## 23. Requirement-to-story trace

| Requirement group | Primary stories |
|---|---|
| Existing preservation | V2-001, V2-002, V2-130 through V2-134, V2-158 |
| `PUB-ID-*` | V2-031, V2-034, V2-036 |
| `PUB-BUILD-*` | V2-030 through V2-044 |
| `MAN-*` | V2-020 through V2-025, V2-043 |
| `URL-*` | V2-070, V2-071, V2-074, V2-121 |
| `CIT-*` | V2-120 |
| `CORE-*` | V2-060 through V2-067 |
| `REN-*` | V2-065, V2-080 through V2-084 |
| `SEM-*` | V2-037, V2-080 through V2-084 |
| `UX-IN-*` | V2-090, V2-095, V2-150 |
| `UX-MOT-*` | V2-073, V2-094, V2-150 |
| `PREF-*` | V2-073 through V2-075 |
| `BM-*` | V2-100 through V2-102 |
| `ANN-CREATE-*` | V2-110, V2-111, V2-114, V2-115 |
| `ANN-RES-*` | V2-112, V2-113, V2-116, V2-117 |
| `ANN-STORE-*` | V2-100, V2-110 |
| `EXP-*` | V2-120, V2-122, V2-123 |
| `LEG-*` | V2-001, V2-130 through V2-134 |
| `REACT-*` | V2-140, V2-141, V2-144 |
| `CSS-*` | V2-092 through V2-094, V2-097 |
| `A11Y-*` | V2-033, V2-037, V2-090 through V2-098, V2-151 |
| `PERF-*` | V2-081 through V2-083, V2-152, V2-153 |
| `OFF-*` | V2-172 |
| `PRIV-*` | V2-110, V2-122, V2-154 |
| `SEC-*` | V2-032, V2-040, V2-041, V2-110, V2-122, V2-155 |
| `FAC-P-*` | V2-200 through V2-206 |
| `PAG-P-*` | V2-220 through V2-224 |
| `TURN-P-*` | V2-230 through V2-238 |

## 24. Acceptance-scenario trace

| Scenario | Stories |
|---|---|
| AC-01 direct semantic reading | V2-037, V2-039, V2-142 |
| AC-02 enhanced restoration | V2-074, V2-075, V2-142 |
| AC-03 explicit link precedence | V2-070, V2-071, V2-074 |
| AC-04 bookmark lifecycle | V2-100 through V2-102 |
| AC-05 annotation lifecycle | V2-110 through V2-117 |
| AC-06 annotation re-anchoring | V2-112, V2-117 |
| AC-07 export | V2-120, V2-122, V2-123 |
| AC-08 accessibility | V2-090 through V2-098, V2-151 |
| AC-09 reduced motion | V2-073, V2-094, V2-150 |
| AC-10 legacy fallback | V2-130 through V2-134 |
| AC-11 failed publication build | V2-040, V2-044 |
| AC-12 packaged integration | V2-144 |

## 25. Exact requirement coverage index

This index supplements the grouped trace above. It names requirements that
would otherwise appear only inside a numeric range, so automated and human
review can find every specification ID directly.

| Story or guardrail | Exact requirement IDs |
|---|---|
| V2-010, V2-020, V2-021, V2-025, V2-100 | EG-005 |
| V2-092, V2-130 through V2-134 | G-002 |
| V2-070, V2-120 | G-003 |
| V2-100 through V2-123 | G-004 |
| V2-081, V2-152, V2-153 | G-007 |
| V2-060 through V2-067, V2-140 | G-008 |
| V2-090 through V2-098, V2-151 | G-009 |
| Scope guardrail: do not implement paper-physics fidelity in R1 | NG-001 |
| Scope guardrail: do not use responsive screen pages as citations | NG-002 |
| Scope guardrail: reader is not a Markdown editor | NG-003 |
| Scope guardrail: collaboration remains future work | NG-004 |
| Scope guardrail: R1 has no identity or cloud synchronization | NG-005 |
| Scope guardrail: analytics are absent or disabled by default | NG-006 |
| Scope guardrail: AI remains future work | NG-007 |
| Scope guardrail: V2 does not replace print-authoring tools | NG-008 |
| Scope guardrail: arbitrary PDFs are outside the semantic renderer | NG-009 |
| V2-034 | PUB-ID-002, PUB-ID-003, PUB-ID-004, PUB-ID-005 |
| V2-040 | PUB-BUILD-002, PUB-BUILD-003, PUB-BUILD-004, PUB-BUILD-005 |
| V2-021, V2-043 | MAN-005, MAN-006 |
| V2-070 | URL-006, URL-007 |
| V2-120 | CIT-002, CIT-003, CIT-004 |
| V2-065, V2-080 | REN-003, REN-004, REN-007, REN-008, REN-009 |
| V2-037, V2-080 | SEM-002, SEM-003, SEM-004 |
| V2-081 | SEM-LOAD-002, SEM-LOAD-004 |
| V2-090, V2-095 | UX-IN-002, UX-IN-003, UX-IN-004, UX-IN-005, UX-IN-006, UX-IN-007 |
| V2-073, V2-094 | UX-MOT-002, UX-MOT-003, UX-MOT-004 |
| V2-073 | PREF-002, PREF-003 |
| V2-074 | PREF-006, PREF-007 |
| V2-101, V2-102 | BM-002, BM-004, BM-005, BM-006 |
| V2-111, V2-114 | ANN-CREATE-002, ANN-CREATE-005, ANN-CREATE-006 |
| V2-112, V2-116 | ANN-RES-002, ANN-RES-004 |
| V2-100, V2-110 | ANN-STORE-002, ANN-STORE-003 |
| V2-122 | EXP-002, EXP-003, EXP-004, EXP-005 |
| V2-140, V2-141 | REACT-002, REACT-003, REACT-005 |
| V2-092 | CSS-002, CSS-003, CSS-004, CSS-005, CSS-006 |
| V2-033, V2-037 | A11Y-002, A11Y-003, A11Y-004 |
| V2-090, V2-096, V2-098 | A11Y-UI-002, A11Y-UI-003, A11Y-UI-004, A11Y-UI-005, A11Y-UI-007, A11Y-UI-009 |
| V2-152, V2-153 | PERF-004, PERF-006, PERF-008, PERF-009 |
| V2-172 | OFF-002, OFF-003, OFF-004, OFF-005, OFF-006 |
| V2-110, V2-122, V2-154 | PRIV-002, PRIV-003, PRIV-004, PRIV-005, PRIV-006, PRIV-007 |
| V2-021, V2-043, V2-155 | SEC-004 |
| V2-155 and converter implementation stories if fixed-page conversion ships | SEC-CONV-001, SEC-CONV-002, SEC-CONV-003, SEC-CONV-004 |
| V2-201 | FAC-P-002, FAC-P-003, FAC-P-004, FAC-P-005 |
| V2-203 | FAC-P-009 |
| V2-221 through V2-224 | PAG-P-002, PAG-P-003, PAG-P-004, PAG-P-005, PAG-P-006, PAG-P-007 |

## 26. Suggested first implementation slice

The first slice should produce a thin vertical result rather than building all
packages in isolation:

1. V2-001 - record legacy baseline.
2. V2-010 - bootstrap workspace.
3. V2-011 - choose libraries.
4. V2-013 - create smallest valid fixture.
5. V2-020 and V2-021 - publication identity and manifest.
6. V2-030 and V2-031 - metadata and Markdown parsing.
7. V2-034 - stable ID minimum.
8. V2-037 and V2-039 - one semantic chapter output.
9. V2-060 and V2-061 - minimal reader session.
10. V2-080 - enhance the generated chapter.
11. V2-142 - serve the result in the reference app.

Slice acceptance:

- Legacy remains untouched.
- One Markdown chapter builds into directly readable semantic HTML.
- A validated manifest describes it.
- A headless session loads it.
- A browser opens and navigates to a stable anchor.
- Clean build, type check, unit test, and browser smoke test pass.

Only after this slice should the team broaden shell and scholarly feature work.

## 27. Product decisions queued during implementation

These decisions are intentionally attached to stories rather than blocking the
entire backlog:

| Decision | Story | Recommended default |
|---|---|---|
| Package manager and workspace tool | V2-011 | Use the team's existing supported Node ecosystem where available |
| Markdown and schema libraries | V2-011 | Maintained AST ecosystem and runtime schema shared by build/browser |
| Generated ID algorithm | V2-034 | Explicit IDs first; local text-based stable fallback |
| Static routing integration | V2-142 | Chapter routes with real HTML files |
| Resume policy | V2-075 | Auto-resume only at publication root with restart action |
| Duplicate bookmarks | V2-101 | One bookmark per exact location, editable label |
| Note editor | V2-115 | Plain Markdown textarea with safe preview |
| Offline R1 scope | V2-172 | Defer unless pilot identifies a firm requirement |
| Semantic paged mode | V2-224 | Do not ship without prototype evidence |
| New facsimile renderer | V2-206 | Promote only on measured resource/accessibility improvement |

## 28. Backlog exit criteria

The backlog is ready for implementation when:

- The architecture and specification are approved.
- The first slice is accepted as the kickoff sequence.
- A product owner identifies the first representative publication.
- The implementing team refines estimates for Wave 0 and the first slice.
- Repository ownership and release process are known.

No further architecture question blocks starting V2-001, V2-010, V2-011, or
V2-013.
