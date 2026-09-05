# Semantic page-turn geometry port plan

| Field | Value |
|---|---|
| Status | Selected direction; isolated V3 visual prototype available |
| Decision date | 2026-08-29 |
| Selected option | Option 1 - port StPageFlip geometry/render behavior |
| Primary intent | Preserve semantic HTML and small book payloads while improving physical page-turn fidelity |
| Estimate | 12-18 person-weeks for production completion |
| Backlog | [BACKLOG.md](./BACKLOG.md), V2-230 through V2-238 |

## 1. Decision

V2 will port the useful fold calculation, clipping, and soft-shadow behavior
from StPageFlip into its existing virtualized semantic-book renderer.

V2 will not adopt StPageFlip as a page owner. It will not give a third-party
engine responsibility for publication loading, semantic pagination, page
collection, content cloning, navigation, history, focus, or accessibility.

This boundary keeps the defining V2 properties:

- Canonical content remains native semantic HTML.
- Publication transfer remains text-first and does not add page images.
- Stable source anchors remain more durable than responsive screen pages.
- Only a bounded set of visible semantic faces is mounted.
- Scroll view remains useful before optional book behavior loads.
- The current CSS turn and the independent legacy viewer remain available as
  rollback paths until promotion is approved.

## 2. Source baseline and attribution

The mathematical reference is StPageFlip 2.0.7:

- Repository: <https://github.com/Nodlik/StPageFlip>
- Tag: `v2.0.7`
- Tag revision: `9b7c17a7de81d47389e3828e8aa6a91cb6ed725d`
- License: MIT
- Primary references:
  - [`FlipCalculation.ts`](https://github.com/Nodlik/StPageFlip/blob/v2.0.7/src/Flip/FlipCalculation.ts)
  - [`Flip.ts`](https://github.com/Nodlik/StPageFlip/blob/v2.0.7/src/Flip/Flip.ts)
  - [`HTMLPage.ts`](https://github.com/Nodlik/StPageFlip/blob/v2.0.7/src/Page/HTMLPage.ts)
  - [`HTMLRender.ts`](https://github.com/Nodlik/StPageFlip/blob/v2.0.7/src/Render/HTMLRender.ts)

Substantial derived source must retain the StPageFlip copyright and MIT
permission notice. V2 will keep the notice in source and in a distributed
third-party notices file.

The port may improve validation, naming, types, numerical stability, scheduling,
and error reporting. It must not preserve upstream behaviors that conflict with
V2, including broad error swallowing, direct `cssText` replacement, a permanent
requestAnimationFrame loop, or cloning an unbounded page collection.

## 3. Scope

### 3.1 In scope

1. Page-local fold constraints for top and bottom corners.
2. Forward and backward direction symmetry.
3. Moving-face and revealed-page clip polygons.
4. Moving-face position and rotation.
5. Fold progress and a stable fold/shadow axis.
6. Inner, outer, and fold-edge shadow projection.
7. Pointer drag, reverse, cancel, and commit settling.
8. Button and keyboard turns using the same geometry solver.
9. Optional bounded corner preview using the same solver.
10. Integration with V2's existing front/back semantic face mapping.
11. Cancellation around resize, font changes, repagination, close, and destroy.
12. Unit, browser, accessibility, visual, payload, and frame-performance gates.

### 3.2 Explicitly out of scope

- StPageFlip's page collection, settings object, UI classes, and DOM lifecycle.
- Loading all responsive pages into the live document.
- Rasterizing semantic pages into canvas or WebGL textures.
- Changing publication schemas, Markdown output, canonical anchors, or URLs.
- Treating responsive screen numbers as citation locations.
- Replacing the semantic scroll renderer.
- Removing or modifying the legacy fallback.
- Full deformable-paper physics or a mesh surface.
- Mirrored right-to-left physical mechanics in this phase.
- Rebuilding cover-board physics before soft semantic leaves pass their gates.

## 4. Architecture boundary

```text
Publication HTML + manifest
          |
          v
V2 semantic pagination and BookPage model       unchanged
          |
          v
Turn coordinator                                V2-owned
  - selects current/destination faces
  - owns drag/settle state
  - commits canonical navigation
          |
          v
Pure page-turn geometry kernel                  new
  - dimensions + direction + corner + pointer
  - returns polygons, transform, progress, shadow axis
  - no DOM, time, content, or browser globals
          |
          v
Semantic-face projector                         new
  - maps geometry to CSS transforms/clip paths
  - batches writes during active frames
  - does not choose or clone content
          |
          v
Existing virtualized semantic faces             retained
  - stationary left/right spread
  - destination underlay
  - moving front and back
  - bounded decorative shadows
```

The geometry kernel is intentionally unaware of:

- chapter and anchor identity;
- page text or nodes;
- which semantic page belongs on a face;
- history and reader-session navigation;
- pointer capture and event targets;
- DOM style syntax;
- animation clocks.

This makes the mathematical behavior independently testable and prevents the
visual engine from becoming a second reader state model.

## 5. Render topology and semantic ownership

At most these content-bearing surfaces are needed:

1. Stationary left page.
2. Stationary right page.
3. Destination page beneath the moving leaf.
4. Moving leaf front.
5. Moving leaf back.
6. A second stationary destination page when required by spread layout.

The moving front and back are inert decorative clones of already paginated
semantic faces. IDs are removed. They are `aria-hidden`, do not receive focus,
and do not replace the stationary accessible reading order.

The turn coordinator, not geometry, maps physical roles:

| Turn | Moving front | Moving back | Underlay |
|---|---|---|---|
| Forward | Current recto | Destination verso | Destination recto |
| Backward | Current verso | Destination recto | Destination verso |

Single-page presentation uses the same roles with only one stationary page.
Canonical reader location remains unchanged throughout dragging and settling.
It changes once only after a committed turn reaches its final frame.

## 6. Coordinate system and geometry contract

The kernel uses fold-local CSS-pixel coordinates:

- `x = 0` is the binding.
- `x = page.width` is the resting free edge.
- Negative `x` is beyond the binding on the destination side.
- `y = 0` is the top edge.
- `y = page.height` is the bottom edge.
- Direction is projected later, so the constraint math has one local system.

A conceptual contract is:

```ts
type PageTurnInput = {
  page: { width: number; height: number };
  direction: "forward" | "backward";
  corner: "top" | "bottom";
  pointer: { x: number; y: number };
};

type PageTurnResult =
  | { status: "ok"; frame: PageTurnFrame }
  | {
      status: "degenerate";
      reason: "pointer-at-rest" | "unsolved-intersection";
    };
```

`PageTurnFrame` contains:

- the constrained pointer;
- normalized progress from 0 to 1;
- moving-page origin and rotation in radians;
- the four transformed page corners;
- moving and revealed clip polygons;
- fold/shadow start, angle, width factor, and opacity factor.

Invalid dimensions or non-finite coordinates throw a descriptive range error.
A valid but visually singular rest position returns a typed degenerate result.
The kernel does not catch and discard arbitrary errors.

## 7. Turn state machine

```text
idle
  -> previewing -> settling-cancel -> idle
  -> dragging
       -> settling-cancel -> idle
       -> settling-commit -> committing-navigation -> idle
  -> animating-automatic -> committing-navigation -> idle
```

Rules:

- Only one operation version may own moving faces.
- Starting resize, repagination, close, or destroy cancels active presentation
  before page nodes are rebuilt.
- Pointer capture is released on end, cancel, close, and destroy.
- A direction is selected only after the movement threshold is crossed.
- Top or bottom corner is selected from the starting pointer, not hard-coded.
- Settle animations interpolate a pointer trajectory and call the same solver.
- Button and keyboard turns use time-based trajectories through the same path.
- requestAnimationFrame exists only during preview, drag coalescing, or settling.
- Reduced motion skips moving-face creation and commits the semantic end state.
- Navigation rejection restores the original spread and emits the existing
  reader error behavior.

## 8. Implementation layout

The geometry modules originally planned under `v2/packages/reader-ui/src/` now
ship from `packages/page-turn-v3/src/`:

```text
page-turn-geometry.ts       pure types, constraints, intersections, solver
page-turn-geometry.test.ts  numerical and invariant tests
page-turn-projection.ts     geometry-to-CSS projection, no content selection
page-turn-controller.ts     active operation and animation scheduling
book-mode.ts                page mapping, navigation, lifecycle integration
```

The first foundation slice adds only the pure kernel and tests. It does not
activate new production behavior. Integration follows after the contract is
reviewable and numerically stable.

## 9. Delivery phases

| Phase | Backlog | Effective effort | Exit evidence |
|---|---|---:|---|
| 0. Freeze boundary and baseline | V2-230 | 1-2 weeks including source/legal and visual baseline work | Pinned source, notices, current frame/payload measurements, approved contract |
| 1. Pure geometry kernel | V2-231 | 1-2 weeks | Deterministic unit tests for corners, directions, constraints, polygons, progress, and shadows |
| 2. Semantic-face projector | V2-232 | 2-3 weeks with initial adapter work | Correct front/back/underlay projection using only bounded mounted faces |
| 3. Pointer and settle controller | V2-233 | 2-3 weeks with automatic interaction work | Drag, reverse, cancel, velocity commit, history, resize, and font tests |
| 4. Unified automatic motion | V2-234 | Included with Phase 3 | Button, keyboard, and pointer turns share solver and final states |
| 5. Fold and shadow fidelity | V2-235 | 2-3 weeks | Aligned shadows, no seams, attached binding, real-book regression frames |
| 6. Integration and rollback | V2-236 | 1 week | Internal comparison switch and safe fallback |
| 7. Browser/accessibility/performance hardening | V2-237 | 2-3 weeks | Browser matrix and all promotion budgets pass |
| 8. Visual tuning and promotion | V2-238 | 3-4 weeks overlapping earlier phases | Review against production content and legacy reference |

The rows overlap; they reconcile to the existing 12-18 person-week production
estimate rather than summing as a serial schedule.

## 10. First working session

The implementation-ready objective for the first few hours is:

1. Record this architecture decision and executable backlog.
2. Pin the upstream tag and retain its MIT notice.
3. Add renderer-neutral geometry types.
4. Implement robust point, rotation, circle-limit, and line-intersection
   primitives.
5. Implement the first top/bottom fold solution without a DOM dependency.
6. Add unit tests for finite output, constraints, progress, symmetry, and
   explicit degenerate/invalid input.
7. Run unit tests and TypeScript type-check.
8. Measure emitted module size so the starting payload is known.

Not activating the production renderer in this slice is intentional. It keeps
the current working reader stable while making the riskiest math reviewable.

### 10.1 Foundation checkpoint - 2026-08-29

The first non-activating slice is complete:

- Added a strict, DOM-free fold solver with typed invalid and degenerate
  outcomes.
- Retained StPageFlip's MIT notice in source and the reader UI package.
- A one-time 50 CSS-pixel grid audit matched 1,488 comparable StPageFlip 2.0.7
  reference frames across direction, corner, pointer, polygon, progress, and
  angle output with zero numerical mismatches.
- Deliberately resolved 12 reference failures on the bottom-corner `x = 0`
  vertical axis by replacing a division-based circle limiter with stable vector
  scaling.
- Preserved a continuous small destination reveal below StPageFlip's 10-pixel
  side-intersection cutoff instead of expanding it to the full page height.
- Added 18 geometry tests, including reference values, direction and corner
  symmetry, constraints, monotonic progress, invalid input, and finite-output
  grid coverage.
- Measured the unminified emitted geometry module at 13,482 bytes raw and 3,089
  bytes gzip. It is not imported by the production reader yet, so current
  deployed transfer is unchanged.
- Verified the full 35-test unit suite, strict TypeScript build, demo build,
  package notice contents, and GitHub Pages-path artifact.

V2-232 now has an isolated projector implementation exercised by V3.
Production activation remains blocked on controller, integration, shadow-tuning,
and promotion gates.

### 10.2 Initial isolated V3 visual checkpoint - 2026-08-29

The measurements in this subsection record the first one-book slice. The
current multi-book measurements are in section 10.3.

The geometry foundation is now reviewable without modifying the V2 book route:

- `/v3/` renders the complete 17-chapter semantic edition through an isolated
  projector and responsive page composer.
- `/compare/` presents legacy/V1, V2, and V3 together.
- Top and bottom corner targets, forward and backward drags, button turns, and
  keyboard turns all use the same geometry solver.
- Stationary pages remain native and selectable. Moving and revealed clones are
  inert, `aria-hidden`, and stripped of IDs.
- The V3 route uses no canvas, SVG page texture, or raster publication page.
- The full V3 shell adds 1.56 kB HTML, 3.66 kB CSS, 7.67 kB JavaScript, and
  0.38 kB module-preload support when opened, measured gzip. With the manifest
  and all 17 chapters, the complete path is about 63.8 kB gzip-equivalent.
- V3 has no runtime import from the V2 reader or its manifest validator. The
  existing V2 chapter bundle remains the same 61.80 kB raw / 19.11 kB gzip
  artifact measured before V3.
- The complete 38-test unit suite and 49-scenario browser suite pass. Dedicated
  V3 checks cover forward/backward content mapping, ID removal, narrow
  repagination, full-edition traversal, shelf handoff, and the three-way
  comparison.
- All 17 manifest chapters begin fresh semantic pages with explicit
  chapter-opening presentation. The viewer does not infer chapter boundaries
  from the displayed heading number.

V3 is deliberately a comparison prototype, not a promoted reader. It does not
yet own canonical history, sharing, TOC navigation, or typography controls.
Those remain V2-owned until the geometry path passes the later integration
gates.

The next production-oriented work remains V2-232 through V2-236: harden the
projector, add active-frame write coalescing, integrate the existing page and
history model behind an internal switch, and tune fold shadows.

### 10.3 Multi-book V3 library checkpoint - 2026-08-30

V3 now accepts a validated shelf publication identity instead of a hard-coded
Ethical AI manifest. The shelf contains 22 V3-capable bindings:

- all 21 Ethical Tech CoLab publications;
- the CC0 Plurality community book at pinned revision `8615885`.

The committed source set contains 322 shelf-publication chapters. The build
emits 22 shelf manifests plus the internal demo, 324 semantic chapter routes,
and a 410-file Pages artifact measuring 6.06 MB raw / 1.67 MB gzip.

The shared V3 route is 17.8 kB gzip including HTML, CSS, JavaScript, catalog
metadata, and module-preload support. It preserves prose, lists, tables, chart
data, formulas, glossary records, chapter notes, figure links, and H1-H6
headings. Unsupported non-empty top-level blocks now fail explicitly instead
of disappearing.

Chapter-aware presentation includes:

- a fresh page for every manifest chapter;
- labels such as `CHAPTER 12` or Plurality's `CHAPTER 6-4`;
- a separate, prominent title;
- a desktop drop cap on the first prose paragraph;
- a chapter picker and optional `?chapter=` start;
- working internal note jumps.

The complete suite contains 38 unit tests and 51 browser scenarios, including
one that initializes every shelf publication and representative assertions for
tables, formulas, Plurality notes, and all 28 Plurality H4-H6 headings.

The largest current limitation is eager source loading. Plurality's complete
30-chapter path is about 514 kB gzip, initializes in about 5-10 seconds on the
desktop test profile, and retains detached parsed source documents even though
only 116 elements are attached. Chapter-level loading and source-document
release are the next performance priorities.

### 10.4 Bounded-reader hardening checkpoint - 2026-08-30

The eager-loading limitation recorded in section 10.3 is now addressed:

- V3 loads the requested chapter first and then only the adjacent chapter
  window. Stable state contains no more than three chapter source/page runs.
- Chapters open on the right by default. Those books use lightweight two-leaf
  placeholders and pad odd chapter runs with a blank verso.
- Compact books can opt into continuous chapter flow. VANGO, CERAI, Agentic
  Behavior Observatory, and AI Research Assistant use natural parity because
  at least half of their desktop chapters fit one page.
- A stable window retains three chapters. Boundary turns may temporarily retain
  the visible and destination spreads together, then contract after commit.
- Works Cited keeps its chapter-opening hierarchy but suppresses the decorative
  initial-letter treatment used for narrative prose.
- Navigation is represented by book, edition, chapter, and source anchor.
  Responsive screen-page numbers remain presentation-only.
- URLs use `?book=<id>&chapter=<id>#<source-anchor>`. Explicit URLs outrank saved
  resume state, chapter and anchor jumps push history, ordinary page turns
  replace it, and Back/Forward restores and focuses the semantic target.
- V3 now has per-publication 80%-130% typography controls shared with V2. A
  change repaginates only the loaded window and preserves the source anchor.
- V3 shares a canonical book/chapter/anchor URL through Web Share or clipboard
  fallback. Embed and shelf-handoff query state is omitted from shared links.

The catalog-enabled V3 assets measure 40,263 bytes gzip, 20,263 bytes above the
strict decimal 20 kB optimization target; payload trimming therefore remains
open even though V3 is now the supported product path. Including route HTML,
the shared route is 40.8 kB gzip; the catalog-free SDK example is 35.5 kB. After
adjacent prefetch, the initial Plurality path is about 93.2 kB gzip versus 531.1
kB for its complete static path. A fresh local Chromium profile retained 3,885 DOM
nodes and 1.39 MB heap versus the earlier eager baseline of 31,850 nodes and
2.00 MB. The expanded validation contains 42 unit tests and 73 browser
scenarios against both root and Pages base paths. Full measurements and
methodology are in [V3-LIBRARY-REVIEW.md](./V3-LIBRARY-REVIEW.md).

### 10.5 Navigation, media, and personal-tools checkpoint - 2026-08-31

- Moving and revealed faces now include a real opaque paper occluder beneath
  semantic content; computed opacity and cross-binding turn tests remain
  explicit.
- Programmatic chapter focus uses a restrained underline treatment instead of
  a browser-default rectangle. Mobile chapter openings suppress the duplicate
  running head and continuation heads truncate to one line.
- Plurality has 99 local cross-chapter links, note return links, and 11
  explicitly licensed figures mapped into Off/On-page/Pop-out treatment.
- Explore provides hierarchical contents and an abortable, demand-loaded search
  with four-worker bounded fetch concurrency.
- Edition-scoped bookmarks, visible resume restart, selected-text sharing,
  local-only annotations, navigation, deletion, and Markdown export are
  available under the recorded privacy boundary.
- Pointer events are coalesced to one update per animation frame. The
  reproducible 390 x 844 profile reaches 54.9 p95 FPS at 1x CPU and 54.1 at 2x;
  the 4x profile has no long tasks but reaches 38.5 and remains below promotion
  gate.

## 11. Promotion gates

The geometry path cannot replace the current CSS path until all gates pass:

### Semantic and accessibility

- Native text, links, selection, and source anchors remain available while the
  book is stationary.
- Moving clones expose no duplicate IDs and are absent from the accessibility
  tree.
- Canonical URL, focus, and history change exactly once after commit.
- Scroll presentation and JavaScript-independent chapter HTML are unchanged.
- Reduced motion has no curl or large spatial transition.

### Visual correctness

- Correct distinct content appears on front, back, and underlay for forward and
  backward turns.
- No mirrored or reversed text appears at quarter, half, or three-quarter
  progress.
- The binding edge deviates by no more than 2 CSS pixels.
- Top and bottom grabs produce corner-specific folds.
- Cancel and reverse do not flash destination content in the wrong layer.
- No black seam appears along the fold.

### Payload and document size

- Added deployed runtime is no more than 20 kB gzip; target is 12 kB or less.
- No page images, page textures, or new publication requests are introduced.
- Active content remains bounded to 4-6 semantic faces.
- Total DOM remains preferably below 5,000 nodes on the real production book.

### Runtime

- Desktop drag reaches at least 55 FPS.
- Representative mobile drag reaches at least 45 FPS.
- No active navigation task exceeds 50 ms.
- Geometry calculation itself targets less than 1 ms at p95 on the desktop
  reference and less than 2 ms at p95 on representative mobile.
- Resize and font repagination stay within existing budgets.
- No requestAnimationFrame callback runs while idle.

### Reliability

- Pointer cancel, lost capture, close, resize, font change, navigation rejection,
  and destroy each restore a coherent stationary spread.
- Automatic and interactive turns end in identical semantic states.
- Existing book-mode, direct-link, sharing, TOC, font, overflow, and RTL-gating
  tests continue passing.

## 12. Risks and controls

| Risk | Control |
|---|---|
| Derived math inherits old numerical edge cases | Pure strict module, explicit invalid/degenerate outcomes, finite-output properties, browser fuzz cases |
| Geometry starts owning content state | Keep page identity out of the kernel and projector APIs |
| Moving clones duplicate IDs or focus targets | Strip IDs, set inert and `aria-hidden`, and test the accessibility tree |
| Per-pointer DOM work causes jank | Coalesce input to one active frame, perform one bounds read, and batch style writes |
| Automatic and dragged turns diverge | Generate both from pointer trajectories through one solver |
| CSS clipping differs by browser | Cross-browser frame tests and an internal rollback path |
| Payload grows toward a general physics engine | No dependency, mesh, texture, all-page lifecycle, or idle loop |
| A visually better turn regresses citations | Commit navigation only after settle; retain existing semantic location tests |
| Cover mechanics expand the critical path | Stabilize soft leaves first; keep current cover path until explicitly migrated |

## 13. Definition of ready

Implementation beyond the kernel is ready when:

- this scope and boundary are recorded;
- upstream source and attribution are pinned;
- geometry input/output types compile under strict TypeScript;
- representative top/bottom and forward/backward frames are covered by tests;
- invalid and degenerate behavior is explicit;
- the emitted foundation size is measured;
- current production page-turn behavior remains unchanged;
- V2-232 through V2-238 each have an explicit dependency and acceptance gate.
