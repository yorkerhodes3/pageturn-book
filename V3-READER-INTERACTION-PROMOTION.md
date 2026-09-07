# V3 reader interaction promotion decision

| Field | Result |
|---|---|
| Decision | **Withhold broad promotion; retain beta capability gates** |
| Automated tranche | Complete on available Chromium host |
| Numeric harness | 14 pass, 1 fail, 0 unknown with a validated detached baseline |
| Evidence date | 2026-09-07 |
| Measured commit | `b6e923e917fbe5e2aefe49a3db081eb63d2841b9` |
| Integrated record | Session-only `v3-425-final-validated-baseline.json` |
| Clean retained record | [`validation/v3-405-clean-attempt-2026-09-07.json`](./validation/v3-405-clean-attempt-2026-09-07.json) |
| Record SHA-256 | Integrated `380b87869414e9f27c0ce4405000e13b442f678d0bc8e3237756ae2a694e935a`; clean V3-405 `184c5d695e377c018a43d77a862ffe2aeff74519a6f7b5f0bddd537fd24c75c9` |

The integrated JSON is not versioned because its repository capture correctly
reports the reviewed V3-425 implementation tree as dirty. Its payload baseline
did pass strict provenance validation: clean detached `HEAD` at exact commit
`c1cf0f8`, with all eight workspace dependency junctions retargeted inside that
worktree. The harness rebuilt both worktrees and verified that neither commit nor
source status changed before measuring their outputs. A clean post-commit build
may rerun and retain the record under
`validation/`. The existing clean V3-405 attempt captured
`dirtyWorkingTree: false`, so its complete 1,230 raw frame intervals remain
retained even though that performance attempt failed.

## Environment and protocol

- Windows `10.0.26200` x64; Node `24.14.0`; Chromium `151.0.7922.34`;
  1440 x 1000 desktop, DPR 1. V3-405 used 390 x 844, ANGLE/D3D11 on an
  NVIDIA GTX 1660 Ti Max-Q.
- Every interaction profile discarded 5 warm-ups and retained 30 measured
  samples. Percentiles are nearest-rank median/p95 over the same raw array.
- Selection and low-end share rendering used CDP 4x CPU throttling. Exact
  resolution measured the kernel on already-loaded canonical blocks, excluding
  fetch/navigation. Share used an 800-code-point, two-block canonical input.
- The harness starts isolated ports 4318/4319 by default, supports
  `V3_INTERACTION_BASE` and `V3_INTERACTION_OUTPUT`, and exits nonzero for every
  gate status other than `pass`, including a required unknown baseline gate.
  When supplied, `V3_BASELINE_ROOT` must be a clean detached git worktree at
  `V3_BASELINE_COMMIT` (default `c1cf0f8`, full SHA or prefix) with the expected
  workspace and build outputs before any payload comparison runs. Both payloads
  measure the same `sdk/` and `v3/` route inputs.
- Marginalia is measured through the mounted Plurality 2026-09 chapter 3-2
  historical-tome reader. One resolved comment is created through the UI,
  duplicated transactionally to 20, reloaded, and timed over 5 + 30 public
  **Show marginalia** false-to-true render/layout operations.

## Commands executed

```powershell
npm.cmd run typecheck
npm.cmd run test:unit
npm.cmd run build
npx.cmd playwright test interaction-accessibility.spec.ts `
  visual-sharing.spec.ts selection-actions.spec.ts source-cards.spec.ts `
  marginalia.spec.ts external-preview.spec.ts
$env:V3_INTERACTION_OUTPUT = "v3-425-final-validated-baseline.json"
$env:V3_BASELINE_ROOT = "C:\Dev\pageturn-book-v3-425-baseline"
$env:V3_BASELINE_COMMIT = "c1cf0f8"
npm.cmd run measure:v3-interactions
npm.cmd run test:sdk-consumer
$env:PAGES_BASE_PATH = "/pageturn-book/"
npm.cmd run build:pages
npm.cmd run check:pages
npx.cmd playwright test interaction-accessibility.spec.ts
npm.cmd audit --audit-level=high
```

Typecheck, 156 unit tests, package/demo builds, the packed SDK consumer, Pages
artifact check, dependency audit, and focused selection/accessibility coverage
passed. The validated-baseline interaction harness intentionally exited 1 only
because the initial-route payload gate failed. Selection and every other numeric
gate passed. Full root and Pages runs each reached 142/143 on the shared host;
their single unrelated action/timing failures passed 3/3 and 5/5 respectively
when isolated. After the resize-readiness race was fixed, the final root and
Pages matrices both passed 143/143.

## Numeric gates

| Gate | Budget | Observed | Status |
|---|---:|---:|---|
| Stable-selection toolbar, 4x | p95 <=100 ms | median 36.3; p95 61.1; max 76.8 ms; 0 timeouts; no overlapping long task | Pass |
| Loaded exact target | p95 <=50 ms; no >50 ms task | median 0.3; p95 1.0; max 1.2 ms; no long task | Pass |
| Local synchronous source card | p95 <=50 ms; 0 third-party requests | median 8.3; p95 15.5; max 15.6 ms; 0 requests | Pass |
| Mounted marginalia render/layout, 20 notes | p95 <=16 ms | median 5.2; p95 8.7; max 8.9 ms | Pass |
| Mounted marginalia grouping | group before layout; represent all IDs | 20 IDs represented by 8 visible placements: 1 group + 7 individual notes | Pass |
| Share renderer desktop | p95 <=500 ms | median 40.5; p95 71.8; max 82.1 ms | Pass |
| Share renderer, 4x | p95 <=1,200 ms | median 361.3; p95 721.7; max 723.9 ms | Pass |
| Share output | <=1600 px; <=2.1 MP; <=4 MB; <=32 MB estimate | 1200 x 1500; 1.8 MP; max PNG 496,324 B; canvas 7,200,000 B | Pass |
| Share cold activation | 0 renderer resources before; exactly 1 new after | 1,041.1 ms end-to-end at 4x; before `[]`; one new `share-renderer-Cg2PVt7S.js`; bounded PNG | Pass |
| Share renderer chunk | <=20 KiB gzip | 2,521 B gzip; SHA-256 `2ccf222d6a36d3da7d285c972d8eae7663603cce61c35976910c61a914703cba` | Pass |
| External preview runtime | <=8 KiB gzip | 922 B gzip; SHA-256 `741069f6d6ab66c40caf0d28b6f027a3fc9d23d60da1a75473e1d02d90ebae0d` | Pass |
| Disabled route boundary | neither lazy chunk; no provider/capture request | 0 / 0 / 0 | Pass |
| Disabled-feature public V3 route increase | <=5 KiB gzip vs `c1cf0f8` | 33,523 B -> 67,533 B; **+34,010 B** | **Fail** |

The validated-baseline selection window passed the 4x p95 gate with no
overlapping long task. Earlier contaminated selection runs remain diagnostics,
not counter-evidence. The passing result still comes from a dirty reviewed tree,
so the complete harness should be retained only after a clean post-commit rerun.

The exact target spans two canonical Responsible AI paragraphs and contains
exactly 800 code points. The local card reached its final reviewed local action,
not merely its pending dialog state.

## Validated payload comparison

Baseline `c1cf0f8` was built in a detached
`C:\Dev\pageturn-book-v3-425-baseline` worktree. Its `node_modules` used local
junctions to existing third-party packages; every
`@ethical-tech` workspace junction was deliberately retargeted into the
detached tree. No install ran. The harness verified the exact commit, detached
`HEAD`, clean status, workspace manifests, build outputs, and identical `sdk/`
and `v3/` route inputs before measuring either side.

```powershell
git worktree add --detach C:\Dev\pageturn-book-v3-425-baseline c1cf0f8
# Create per-package junctions from the existing node_modules, but point every
# @ethical-tech workspace link at the matching detached-worktree directory.
Set-Location C:\Dev\pageturn-book-v3-425-baseline
npm.cmd run build
# From main after its like-for-like build:
$env:V3_BASELINE_ROOT = "C:\Dev\pageturn-book-v3-425-baseline"
npm.cmd run measure:v3-interactions
```

| Artifact | Baseline | Current | Delta |
|---|---:|---:|---:|
| Public V3 route initial JS, gzip | 33,523 B | 67,533 B | **+34,010 B** |
| Disabled SDK route initial JS, gzip | 28,321 B | 65,555 B | +37,234 B |
| Packed SDK `dist/index.js`, gzip | 551 B | 1,150 B | +599 B |

Packed main SHA-256 changed from
`27e4e7cd9d57653b5860260071eb73d6a5f4371ecf9d6accc562f58cc00563f7`
to
`244d7ab550462824fa9ac0e015a623cf3fab6efa6af675cc39a591528fe39a1c`.
The current shared reader chunk is 59,063 B gzip. The package-level
`reader.js` also grew from 136,012 to 287,903 raw bytes, while the standalone
personal and exact-target kernels contribute about 13.6 KiB gzip before their
reader integration. Meeting the remaining 28.9 KiB gap requires a deliberate
interaction-subsystem extraction and behavior-preserving lazy boundaries; a
manual chunk or whole-reader deferral would only move bytes or delay first
readable layout. The session JSON retains every route asset and raw size. CSS
and publication content are excluded consistently.

## Memory and cleanup

`measureUserAgentSpecificMemory` was unavailable, so the record uses CDP
`Runtime.getHeapUsage`, `Memory.getDOMCounters`, performance metrics, and
process information. JS heap used was 10,451,288 B before activation, 10,777,460
B during cold render, 7,971,336 B after cancellation, and 8,164,488 B after
destroy. DOM nodes changed from 20,520 before to 20,537 during render, then
2,010 after cancellation and 2,016 after destroy. Embedder heap rose from
42,014,712 B before to 44,312,080 B during render, then fell to about 27.3 MB
after the 60
renderer samples. No garbage collection was forced, so native/embedder cleanup
is **not established** by this short diagnostic window. These values do not
create a fabricated strict heap gate; only the plan's 7.2 MB deterministic
canvas estimate is gated against 32 MB.

## Automated accessibility, hosting, privacy, and rights

Focused Chromium tests cover forced colors, browser page scale and 200% root
text zoom, reduced motion, programmatically installed ranges with
keyboard-intent selection-action entry, keyboard-operated share/source/note flows,
roving focus and restoration, native dialog names/descriptions, CDP AX roles and
names, standard-font marginalia, mobile bottom-sheet safe-area padding, image
alt/caption/provenance, textual equivalents outside the share image, static
no-JavaScript reading, embedded Permissions Policy denial messaging, and
lifecycle teardown. Root and Pages-base focused runs both passed 5/5; the
earlier related interaction regression set passed 48/48. The current focused
selection/accessibility/marginalia rerun passed 15/15, including the new delayed
exact-target busy-toolbar case.

Privacy/rights boundaries passed automated review: the disabled SDK route
loaded no renderer/preview runtime and made no provider/capture request; the
local source card made no third-party request; share output used public semantic
text only; source-image export remained absent; invalid/missing policies fail
closed; static content remained readable; embedded clipboard/download denial
was explicit. Reviewed V3-424 media retained alt, caption, attribution, license,
provenance, integrity, and Original treatment where transformation is forbidden.

## Coverage matrix and blockers

| Coverage | Status |
|---|---|
| Chromium automated, root and Pages focused | Pass |
| Unit (156), typecheck, build, packed consumer, Pages artifact, npm audit | Pass |
| Full root browser matrix | Pass, 143/143 |
| Full Pages browser matrix | Pass, 143/143 |
| Firefox | **Not executed blocker** — not installed |
| Safari | **Not executed blocker** — unavailable on Windows |
| iOS Safari | **Not executed blocker** — unavailable on host |
| Android Chrome | **Not executed blocker** — unavailable on host |
| Manual NVDA | **Not executed blocker** |
| Manual VoiceOver macOS/iOS | **Not executed blocker** — unavailable on host |
| Manual TalkBack | **Not executed blocker** |

V3-404 responsive variants/editorial mapping and V3-406 rights metadata for 26
unmapped Plurality figures remain open. Those links remain ordinary links.

## Public deployment contract

GitHub Pages currently serves successful deployment `c1cf0f8`, not the local
review tree. Public Plurality and *What Is Ethical AI?* therefore resolve edition
`2026-07`; the local catalog's `2026-09` manifests are not deployed. The hosted
V3 route selects the catalog edition by `book` and does not enforce the
informational `edition` query parameter as a manifest selector. Course links
must use `book + chapter + source anchor` and retain the published,
edition-specific semantic HTML chapter as their stable fallback.

Independent course-design verification resolved 40 chapter/anchor records
across 15 books through published semantic HTML. Its integrated browser rendered
Plurality but reported no measurable hosted-V3 layout for a fresh Ethical AI
executive-summary tab, reinforcing the static fallback requirement. Exact quote
tokens and the newer interaction suite remain beta until a successful Pages
deployment.

## V3-405 clean attempt

A detached, clean `b6e923e` build ran the required 5 + 30 V3-405 profile. It
captured 1,260 frames/1,230 intervals but failed under host contention: median
16.9 ms, p95 31.3 ms, 10 measured-window long tasks, and a 140 ms maximum.
Because three clean retained passing runs were not obtained, **V3-405 remains
in progress**. Prior dirty-tree passes are useful tuning evidence but are not
promoted to clean evidence.

```powershell
git worktree add --detach C:\Dev\pageturn-book-v3-405-clean b6e923e
# node_modules junction to the existing installation; then npm.cmd run build
$env:V3_CPU_RATE = "4"
$env:V3_MEASURE_PORT = "4321"
$env:V3_MEASURE_OUTPUT = "temp-assets\v3-405-clean-1.json"
npm.cmd run measure:v3-mobile
```

## Recommendation

Keep contextual actions, marginalia, visual sharing, source cards, and previews
at their current beta/host-opt-in boundaries. Broad promotion is withheld
because the validated initial-route payload exceeds budget by 34,010 B gzip;
the V3-405 clean profile failed on this host; native/embedder cleanup remains
unestablished; mandatory browser/AT coverage is not executed; and V3-404/406
remain open. Implement the dedicated lazy interaction boundary tracked by
V3-426, then rerun from a clean post-review commit before reconsidering
promotion.
