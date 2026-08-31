# V3 mobile page-turn performance

| Field | Value |
|---|---|
| Date | 2026-08-31 |
| Viewport | Chromium 390 x 844 |
| Publication | What Is Ethical AI? |
| Gesture | 42-frame top-corner drag followed by settle |
| Command | `npm run measure:v3-mobile` |
| Tuning in this pass | Coalesce pointer events to one latest-value write per animation frame |

## Results

| CPU profile | Captured frames | p50 interval | p95 interval | p95 FPS | Long tasks |
|---|---:|---:|---:|---:|---:|
| 1x | 64 | 16.7 ms | 18.2 ms | 54.9 | 0 |
| 2x | 64 | 16.6 ms | 18.5 ms | 54.1 | 0 |
| 4x | 63 | 17.0 ms | 26.0 ms | 38.5 | 0 |

The native and 2x profiles pass the current 45 FPS representative-mobile gate.
The 4x profile has no long tasks but remains below 45 FPS at p95. V3 therefore
remains a beta and must not claim broad low-end promotion. V3-405 tracks
bringing the 4x p95 frame interval below 22.2 ms.

## Reproduction

Build the root artifact, then run:

```powershell
Set-Location .\v2
$env:V3_CPU_RATE = "1"
$env:V3_MEASURE_PORT = "4183"
npm run measure:v3-mobile

$env:V3_CPU_RATE = "2"
$env:V3_MEASURE_PORT = "4184"
npm run measure:v3-mobile

$env:V3_CPU_RATE = "4"
$env:V3_MEASURE_PORT = "4185"
npm run measure:v3-mobile
```

The harness drives pointer events from in-page animation frames rather than
Playwright command round trips, observes actual `data-v3-progress` writes, and
collects long tasks only during the measured gesture.
