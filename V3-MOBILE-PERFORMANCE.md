# V3 mobile page-turn performance

## V3-403 historical protocol (2026-08-31)

The earlier harness used *What Is Ethical AI?*, one 42-frame top-corner drag
plus settle, and one run per CPU rate. It observed `data-v3-progress`, but its
sample included settle frames and did not exercise styled media or marginalia.

| CPU profile | Captured frames | p50 interval | p95 interval | p95 FPS | Long tasks |
|---|---:|---:|---:|---:|---:|
| 1x | 64 | 16.7 ms | 18.2 ms | 54.9 | 0 |
| 2x | 64 | 16.6 ms | 18.5 ms | 54.1 | 0 |
| 4x | 63 | 17.0 ms | 26.0 ms | 38.5 | 0 |

That result created V3-405 because the 4x result exceeded 22.2 ms.

## V3-405 reproducible protocol (2026-09-07)

`npm run measure:v3-mobile` now:

- launches Chromium at 390 x 844, records DPR, browser, OS, GPU renderer, CPU
  rate, commit, and base URL, and defaults to isolated port 4317;
- opens Plurality edition `2026-09`, chapter `3-2`, in the historical-tome
  appearance with the on-page book-toned Georg Simmel portrait;
- intercepts only the immutable portrait URL and serves the checked-in,
  digest-identical `scripts/assets/georg-simmel.jpg` to remove network variance;
- creates one exact commenting annotation through selection and **Annotate**,
  duplicates that record to 20 in one IndexedDB transaction, reloads, then
  verifies the styled image and marginalia/group marker are visible;
- performs identical 42-frame top-corner drags, cancels and resets on the same
  page, discards five warm-ups, and measures 30 runs;
- pools only the 41 adjacent `data-v3-progress` intervals within each measured
  drag (1,230 raw intervals total). Pointer-down setup, cancellation/reset, and
  inter-run gaps are excluded from both frame and long-task windows;
- reports nearest-rank median and p95 from that same pooled raw sample set and
  includes every raw interval plus per-run summaries in its JSON output; and
- fails at 4x for fewer than 40 frames in any run, pooled p95 over 22.2 ms, or
  any overlapping long task over 50 ms. Other CPU rates keep the frame gate
  report-only, while the long-task gate remains active.

`V3_MEASURE_PORT`, `V3_MEASURE_BASE`, and `V3_CPU_RATE` configure the port,
existing preview base, and CPU rate. `V3_MEASURE_OUTPUT` optionally retains the
complete JSON result at an explicit path. The harness verifies the intercepted
portrait SHA-256, confirms the union of visible individual/group marginalia
represents all 20 seeded annotation IDs, and closes observers, context, browser,
and any preview server in `finally`.

## Clean-HEAD baseline

Clean HEAD `8b1aedc2bbc541e64dfc71a272a330610d7658b6` was rebuilt and measured
with the final protocol (plus the empty-source selector prerequisite needed to
create the caption annotation).

| Invocation | Frames / intervals | Median | p95 | Long tasks | Maximum |
|---|---:|---:|---:|---:|---:|
| Baseline 1 | 1,260 / 1,230 | 16.7 ms | 22.4 ms | 5 | 100 ms |
| Baseline 2 | 1,260 / 1,230 | 16.7 ms | 22.0 ms | 0 | 0 ms |
| Baseline 3 | 1,260 / 1,230 | 16.7 ms | 21.2 ms | 1 | 93 ms |

The baseline was borderline on frame p95 and failed the long-task gate in two
of three invocations. The older 26.0 ms result is not directly comparable
because its content and sample window differ.

## Initial tuned result

Environment: Chromium 151.0.7922.34, Windows 10.0.26200 x64, 390 x 844,
DPR 1, 4x CPU throttle, ANGLE/D3D11 on NVIDIA GTX 1660 Ti Max-Q. Three
consecutive final invocations passed:

| Invocation | Frames / intervals | Median | p95 | p95 FPS | Long tasks | Per-run p95 range |
|---|---:|---:|---:|---:|---:|---:|
| Final 1 | 1,260 / 1,230 | 16.6 ms | 21.9 ms | 45.66 | 0 | 17.7–29.1 ms |
| Final 2 | 1,260 / 1,230 | 16.7 ms | 22.0 ms | 45.45 | 0 | 17.9–30.4 ms |
| Final 3 | 1,260 / 1,230 | 16.7 ms | 21.2 ms | 47.17 | 0 | 17.6–27.9 ms |

The pooled p95 varied by 0.8 ms across the final invocations; individual-run
p95 remains noisier because each run has only 41 intervals. All three pooled
samples passed with no long task.

The independent review then hardened resize cache keys, mobile semantic
exposure, all-20-note verification, intercepted-media digest checking, and raw
JSON retention. A post-review dirty-tree run passed at 21.8 ms p95 with no long
tasks. The implementation must be committed before the three retained clean
evidence runs used to close V3-405.

## Implementation

The turn path now initializes invariant page/effect dimensions, directions,
appearance scalars, and reveal placement once at `beginTurn`. It reuses the
page solver and decorative semantic faces across cancelled turns, resolves
duplicate annotation targets once per marginalia render, hides the duplicate
stationary phone face during the turn, and limits `applyFrame` to progress,
moving transform/clip, and fold transform/opacity writes. The opaque revealed
page is a fixed underlay, so it needs no changing clip.

The curved edge remains analytic: the runtime clip uses a quadratic Bézier
with the same endpoints and bend parameter as the prior sampled curve.
Curvature, shadow, styled media, and decorative marginalia remain present.
Compositor hints exist only while active and for a bounded 500 ms post-cancel
cooldown.

## Reproduction

```powershell
npm run build
$env:V3_CPU_RATE = "4"
$env:V3_MEASURE_PORT = "4317"
npm run measure:v3-mobile
```

The command writes the complete machine-readable raw sample set to stdout.
