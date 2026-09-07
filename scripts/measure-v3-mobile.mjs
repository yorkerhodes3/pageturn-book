import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { arch, platform, release } from "node:os";
import { dirname, resolve } from "node:path";
import { preview } from "vite";

const viewport = { width: 390, height: 844 };
const warmUpRuns = 5;
const measuredRunCount = 30;
const gestureFrames = 42;
const maximumFrameIntervalMs = 22.2;
const maximumLongTaskMs = 50;
const minimumFramesPerRun = 40;
const port = Number(process.env.V3_MEASURE_PORT ?? "4317");
if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error("V3_MEASURE_PORT must be a valid TCP port");
}
const cpuRate = Number(process.env.V3_CPU_RATE ?? "4");
if (!Number.isFinite(cpuRate) || cpuRate < 1) {
  throw new Error("V3_CPU_RATE must be a finite number greater than or equal to 1");
}

const localOrigin = `http://127.0.0.1:${port}`;
const configuredBase = process.env.V3_MEASURE_BASE ?? localOrigin;
const baseUrl = new URL(configuredBase, `${localOrigin}/`);
baseUrl.pathname = `${baseUrl.pathname.replace(/\/+$/, "")}/`;
const readerUrl = new URL(
  "v3/?book=plurality&chapter=3-2&media=on#v3-media-plurality-3-2-b-georg-simmel",
  baseUrl,
);
const portraitUrl =
  "**/pluralitybook/plurality/86158859464aee75633acd854c656928121a7fd8/figs/3-2-georg.jpg";
const portraitAsset = resolve("scripts/assets/georg-simmel.jpg");
const portraitIntegrity =
  "sha256:f8ca12bccfc1a1102795c9023094433281135844de6ab2b4f6ecb97d9dcc9076";
const outputPath = process.env.V3_MEASURE_OUTPUT;

function git(...arguments_) {
  return execFileSync("git", arguments_, { encoding: "utf8" }).trim();
}

function percentile(values, fraction) {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)];
}

function rounded(value) {
  return Number(value.toFixed(3));
}

let server;
let browser;
let context;
let page;
try {
  const portraitBytes = await readFile(portraitAsset);
  const measuredPortraitIntegrity =
    `sha256:${createHash("sha256").update(portraitBytes).digest("hex")}`;
  if (measuredPortraitIntegrity !== portraitIntegrity) {
    throw new Error(
      `V3 benchmark portrait integrity mismatch: ${measuredPortraitIntegrity}`,
    );
  }
  if (process.env.V3_MEASURE_BASE === undefined) {
    server = await preview({
      configFile: resolve("apps/demo/vite.config.ts"),
      preview: {
        host: "127.0.0.1",
        port,
        strictPort: true,
      },
    });
  }
  const gpuArguments =
    platform() === "win32"
      ? [
          "--enable-gpu",
          "--force_high_performance_gpu",
          "--use-angle=d3d11",
        ]
      : ["--enable-gpu"];
  browser = await chromium.launch({
    headless: true,
    args: gpuArguments,
  });
  context = await browser.newContext({
    viewport,
    reducedMotion: "no-preference",
  });
  page = await context.newPage();
  let portraitInterceptions = 0;
  await page.route(portraitUrl, async (route) => {
    portraitInterceptions += 1;
    await route.fulfill({
      body: portraitBytes,
      contentType: "image/jpeg",
    });
  });
  const session = await context.newCDPSession(page);
  await session.send("Emulation.setCPUThrottlingRate", { rate: cpuRate });
  await page.goto(readerUrl.href);
  await page.waitForFunction(
    () =>
      document.querySelector("[data-v3-reader]")?.getAttribute(
        "data-v3-opening",
      ) === "false",
  );

  const figure = page.locator(
    '[data-v3-stationary] [data-v3-media-id="plurality-3-2-b-georg-simmel"]',
  );
  await figure.waitFor({ state: "visible" });
  await page.waitForFunction(
    () => {
      const node = document.querySelector(
        '[data-v3-stationary] [data-v3-media-id="plurality-3-2-b-georg-simmel"]',
      );
      const image = node?.querySelector("img");
      return (
        node?.classList.contains("v3-media-style-book-toned") === true &&
        image instanceof HTMLImageElement &&
        image.complete &&
        image.naturalWidth > 0
      );
    },
  );

  const caption = figure.locator("figcaption");
  await caption.evaluate((node) => {
    const text = node.firstChild;
    if (!(text instanceof Text) || text.length < 8) {
      throw new Error("V3 benchmark could not select the figure caption");
    }
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, text.length);
    const selection = document.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
  });
  const annotate = page.getByRole("button", {
    name: "Annotate selected text",
  });
  await annotate.waitFor({ state: "visible" });
  await annotate.click();
  const editor = page.getByRole("dialog", { name: "Add annotation" });
  await editor
    .getByRole("textbox", { name: "Note on selected text" })
    .fill("V3-405 visible performance annotation 00.");
  await editor.getByRole("button", { name: "Save" }).click();
  await editor.waitFor({ state: "hidden" });

  const annotationCount = await page.evaluate(async () => {
    const request = indexedDB.open("ethical-tech-pageturn-personal", 2);
    const database = await new Promise((resolveDatabase, rejectDatabase) => {
      request.onsuccess = () => resolveDatabase(request.result);
      request.onerror = () => rejectDatabase(request.error);
    });
    try {
      const transaction = database.transaction("annotations", "readwrite");
      const store = transaction.objectStore("annotations");
      const records = await new Promise((resolveRecords, rejectRecords) => {
        const read = store.getAll();
        read.onsuccess = () => resolveRecords(read.result);
        read.onerror = () => rejectRecords(read.error);
      });
      if (records.length !== 1) {
        throw new Error(
          `Expected one annotation before duplication, found ${records.length}`,
        );
      }
      const base = records[0];
      for (let index = 1; index < 20; index += 1) {
        const suffix = String(index).padStart(2, "0");
        store.put({
          ...base,
          annotationId: `v3-405-visible-${suffix}`,
          body: {
            ...base.body,
            value: `V3-405 visible performance annotation ${suffix}.`,
          },
          createdAt: `2026-09-07T07:00:${suffix}.000Z`,
          updatedAt: `2026-09-07T07:00:${suffix}.000Z`,
        });
      }
      await new Promise((resolveTransaction, rejectTransaction) => {
        transaction.oncomplete = resolveTransaction;
        transaction.onerror = () => rejectTransaction(transaction.error);
        transaction.onabort = () => rejectTransaction(transaction.error);
      });
      return 20;
    } finally {
      database.close();
    }
  });
  if (annotationCount !== 20) {
    throw new Error("V3 benchmark failed to create 20 annotations");
  }

  await page.reload();
  await page.waitForFunction(
    () =>
      document.querySelector("[data-v3-reader]")?.getAttribute(
        "data-v3-opening",
      ) === "false",
  );
  await page.waitForFunction(
    () => {
      const figure = document.querySelector(
        '[data-v3-stationary] [data-v3-media-id="plurality-3-2-b-georg-simmel"]',
      );
      const image = figure?.querySelector("img");
      const markers = Array.from(
        document.querySelectorAll(
          "[data-v3-stationary] [data-v3-annotation-group], " +
            "[data-v3-stationary] [data-v3-annotation-open]",
        ),
      );
      const renderedIds = new Set(
        markers.flatMap((marker) =>
          marker instanceof HTMLElement &&
          marker.dataset.v3AnnotationGroup
            ? marker.dataset.v3AnnotationGroup.split(",")
            : marker instanceof HTMLElement &&
                marker.dataset.v3AnnotationOpen
              ? [marker.dataset.v3AnnotationOpen]
              : [],
        ),
      );
      if (
        !figure?.classList.contains("v3-media-style-book-toned") ||
        !(image instanceof HTMLImageElement) ||
        !image.complete ||
        image.naturalWidth === 0 ||
        markers.length === 0 ||
        renderedIds.size !== 20
      ) {
        return false;
      }
      const figureBounds = figure.getBoundingClientRect();
      const visible = (bounds) =>
        bounds.width > 0 &&
        bounds.height > 0 &&
        bounds.right > 0 &&
        bounds.bottom > 0 &&
        bounds.left < innerWidth &&
        bounds.top < innerHeight;
      return (
        visible(figureBounds) &&
        markers.every((marker) => visible(marker.getBoundingClientRect()))
      );
    },
  );
  const visibleState = await page.evaluate(async () => {
    const request = indexedDB.open("ethical-tech-pageturn-personal", 2);
    const database = await new Promise((resolveDatabase, rejectDatabase) => {
      request.onsuccess = () => resolveDatabase(request.result);
      request.onerror = () => rejectDatabase(request.error);
    });
    const transaction = database.transaction("annotations", "readonly");
    const count = await new Promise((resolveCount, rejectCount) => {
      const read = transaction.objectStore("annotations").count();
      read.onsuccess = () => resolveCount(read.result);
      read.onerror = () => rejectCount(read.error);
    });
    database.close();
    const markers = Array.from(
      document.querySelectorAll(
        "[data-v3-stationary] [data-v3-annotation-group], " +
          "[data-v3-stationary] [data-v3-annotation-open]",
      ),
    );
    const renderedIds = new Set(
      markers.flatMap((marker) =>
        marker instanceof HTMLElement && marker.dataset.v3AnnotationGroup
          ? marker.dataset.v3AnnotationGroup.split(",")
          : marker instanceof HTMLElement && marker.dataset.v3AnnotationOpen
            ? [marker.dataset.v3AnnotationOpen]
            : [],
      ),
    );
    const groupCount = markers.filter(
      (marker) =>
        marker instanceof HTMLElement &&
        marker.dataset.v3AnnotationGroup !== undefined,
    ).length;
    return {
      annotations: count,
      marker:
        groupCount === markers.length
          ? "group"
          : groupCount === 0
            ? "notes"
            : "mixed",
      markers: markers.length,
      renderedAnnotationIds: renderedIds.size,
    };
  });
  if (
    visibleState.annotations !== 20 ||
    visibleState.renderedAnnotationIds !== 20
  ) {
    throw new Error(
      "V3 benchmark did not represent all 20 annotations in visible marginalia",
    );
  }
  if (portraitInterceptions < 1) {
    throw new Error("V3 benchmark did not intercept the pinned portrait request");
  }
  await page.locator(
    '[data-v3-stationary] [data-v3-media-id="plurality-3-2-b-georg-simmel"] img',
  ).evaluate(async (image) => {
    await image.decode();
    await document.fonts.ready;
  });
  await page.evaluate(() => {
    const metrics = {
      activeRun: undefined,
      runs: [],
      longTasks: [],
    };
    const mutationObserver = new MutationObserver(() => {
      if (metrics.activeRun) {
        metrics.activeRun.frames.push(performance.now());
      }
    });
    const turnLayer = document.querySelector("[data-v3-turn-layer]");
    if (!turnLayer) {
      throw new Error("V3 benchmark turn layer is unavailable");
    }
    mutationObserver.observe(turnLayer, {
      attributes: true,
      subtree: true,
      attributeFilter: ["data-v3-progress"],
    });
    const longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        metrics.longTasks.push({
          startTime: entry.startTime,
          duration: entry.duration,
        });
      }
    });
    longTaskObserver.observe({ type: "longtask" });
    globalThis.__v3MobileMetrics = metrics;
    globalThis.__v3MobileMetricsCleanup = () => {
      mutationObserver.disconnect();
      longTaskObserver.disconnect();
      delete globalThis.__v3MobileMetrics;
      delete globalThis.__v3MobileMetricsCleanup;
      globalThis.__v3PendingPointerDownCleanup?.();
      delete globalThis.__v3PendingPointerDownCleanup;
      delete globalThis.__v3RunCompletion;
    };
  });

  const spread = page.locator("[data-v3-spread]");
  const corner = page.getByRole("button", {
    name: "Turn the next page from its top corner",
  });
  const [bounds, cornerBounds] = await Promise.all([
    spread.boundingBox(),
    corner.boundingBox(),
  ]);
  if (!bounds || !cornerBounds) {
    throw new Error("V3 benchmark could not resolve turn bounds");
  }
  const gesture = {
    startX: cornerBounds.x + cornerBounds.width * 0.75,
    startY: cornerBounds.y + cornerBounds.height * 0.25,
    endX: bounds.x + bounds.width * 0.18,
    endY: bounds.y + bounds.height * 0.2,
    frames: gestureFrames,
  };

  for (let index = 0; index < warmUpRuns + measuredRunCount; index += 1) {
    const measured = index >= warmUpRuns;
    await page.mouse.move(gesture.startX, gesture.startY);
    await page.evaluate(
      ({
        runIndex,
        measuredRun,
        startX,
        startY,
        endX,
        endY,
        frames,
      }) => {
        const metrics = globalThis.__v3MobileMetrics;
        if (!metrics || metrics.activeRun) {
          throw new Error("V3 benchmark metrics are not ready for a run");
        }
        const run = {
          index: runIndex,
          measured: measuredRun,
          startTime: undefined,
          endTime: undefined,
          frames: [],
        };
        metrics.runs.push(run);
        const corner = document.querySelector(
          '[data-v3-direction="forward"][data-v3-corner="top"]',
        );
        const spread = document.querySelector("[data-v3-spread]");
        if (!corner || !spread) {
          throw new Error("V3 benchmark gesture controls are unavailable");
        }
        const pointerMoves = Array.from({ length: frames }, (_, index) => {
          const progress = (index + 1) / frames;
          return new PointerEvent("pointermove", {
            bubbles: true,
            pointerId: 1,
            pointerType: "mouse",
            isPrimary: true,
            buttons: 1,
            clientX: startX + (endX - startX) * progress,
            clientY: startY + (endY - startY) * progress,
          });
        });
        const pointerCancel = new PointerEvent("pointercancel", {
          bubbles: true,
          pointerId: 1,
          pointerType: "mouse",
          isPrimary: true,
          buttons: 0,
          clientX: endX,
          clientY: endY,
        });
        globalThis.__v3RunCompletion = new Promise((resolveGesture) => {
          const onPointerDown = () => {
            delete globalThis.__v3PendingPointerDownCleanup;
            let frame = 0;
            const waitForReset = () => {
              if (
                document
                  .querySelector("[data-v3-turn-layer]")
                  ?.hasAttribute("data-v3-prepared") ||
                !document.querySelector(".v3-turn-surface")
              ) {
                resolveGesture();
                return;
              }
              requestAnimationFrame(waitForReset);
            };
            const finishGesture = () => {
              setTimeout(() => {
                run.endTime = performance.now();
                metrics.activeRun = undefined;
                spread.dispatchEvent(pointerCancel);
                requestAnimationFrame(waitForReset);
              }, 0);
            };
            const animate = () => {
              if (frame === 0) {
                run.startTime = performance.now();
                metrics.activeRun = run;
              }
              frame += 1;
              const pointerMove = pointerMoves[frame - 1];
              if (!pointerMove) {
                throw new Error("V3 benchmark pointer sample is unavailable");
              }
              spread.dispatchEvent(pointerMove);
              if (frame < frames) {
                requestAnimationFrame(animate);
                return;
              }
              requestAnimationFrame(finishGesture);
            };
            requestAnimationFrame(animate);
          };
          corner.addEventListener("pointerdown", onPointerDown, {
            capture: true,
            once: true,
          });
          globalThis.__v3PendingPointerDownCleanup = () =>
            corner.removeEventListener("pointerdown", onPointerDown, {
              capture: true,
            });
        });
      },
      { runIndex: index, measuredRun: measured, ...gesture },
    );
    await page.mouse.down();
    await page.evaluate(() => globalThis.__v3RunCompletion);
    await page.evaluate(() => {
      delete globalThis.__v3RunCompletion;
    });
    await page.mouse.up();
  }
  await page.waitForTimeout(100);

  const rawMetrics = await page.evaluate(() => {
    const metrics = globalThis.__v3MobileMetrics;
    if (!metrics) {
      throw new Error("V3 benchmark metrics were removed before collection");
    }
    return {
      runs: metrics.runs,
      longTasks: metrics.longTasks,
      environment: {
        userAgent: navigator.userAgent,
        viewport: { width: innerWidth, height: innerHeight },
        devicePixelRatio,
        graphicsRenderer: (() => {
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("webgl");
          const extension = context?.getExtension("WEBGL_debug_renderer_info");
          return extension
            ? String(
                context?.getParameter(extension.UNMASKED_RENDERER_WEBGL) ??
                  "unknown",
              )
            : "unavailable";
        })(),
      },
    };
  });
  const measuredRuns = rawMetrics.runs.filter(({ measured }) => measured);
  const runSamples = measuredRuns.map((run, runIndex) => {
    const frameIntervalsMs = run.frames
      .slice(1)
      .map((timestamp, frameIndex) =>
        rounded(timestamp - run.frames[frameIndex]),
      );
    return {
      run: runIndex + 1,
      startTime: rounded(run.startTime),
      endTime: rounded(run.endTime),
      frames: run.frames.length,
      frameIntervalsMs,
      medianFrameIntervalMs: rounded(percentile(frameIntervalsMs, 0.5)),
      p95FrameIntervalMs: rounded(percentile(frameIntervalsMs, 0.95)),
    };
  });
  const frameIntervalsMs = runSamples.flatMap(
    ({ frameIntervalsMs: samples }) => samples,
  );
  const totalFrames = runSamples.reduce(
    (sum, { frames }) => sum + frames,
    0,
  );
  const measuredWindows = measuredRuns.map(({ startTime, endTime }) => ({
    startTime,
    endTime,
  }));
  const longTaskEntries = rawMetrics.longTasks
    .filter(({ startTime, duration }) =>
      measuredWindows.some(
        (window) =>
          window.endTime !== undefined &&
          startTime < window.endTime &&
          startTime + duration > window.startTime,
      ),
    )
    .map(({ startTime, duration }) => ({
      startTime: rounded(startTime),
      duration: rounded(duration),
    }));
  const longTasksMs = longTaskEntries.map(({ duration }) => duration);
  const p95FrameIntervalMs = rounded(percentile(frameIntervalsMs, 0.95));
  const maximumObservedLongTaskMs = rounded(Math.max(0, ...longTasksMs));
  const result = {
    protocol: {
      warmUpRunsDiscarded: warmUpRuns,
      measuredRuns: measuredRunCount,
      gesture:
        `${gestureFrames}-frame top-right-corner drag, then pointercancel and ` +
        "same-page reset",
      sampleSet:
        "All adjacent data-v3-progress mutation intervals from the first through " +
        "last drag update in each measured gesture, pooled without pointerdown, " +
        "cancellation/reset, or inter-run intervals; nearest-rank median and p95.",
      minimumFramesPerRun,
      gates: {
        rate4P95FrameIntervalMs: maximumFrameIntervalMs,
        maximumLongTaskMs,
      },
    },
    content: {
      publication: "Plurality",
      edition: "2026-09",
      chapter: "3-2",
      appearance: "historical-tome",
      media: "plurality-3-2-b-georg-simmel",
      mediaStyle: "book-toned",
      localMediaAsset: "scripts/assets/georg-simmel.jpg",
      localMediaIntegrity: portraitIntegrity,
      interceptedMediaRequests: portraitInterceptions,
      annotations: visibleState.annotations,
      annotationMarker: visibleState.marker,
      annotationMarkers: visibleState.markers,
      renderedAnnotationIds: visibleState.renderedAnnotationIds,
    },
    environment: {
      measuredAt: new Date().toISOString(),
      browser: `Chromium ${browser.version()}`,
      userAgent: rawMetrics.environment.userAgent,
      os: `${platform()} ${release()} ${arch()}`,
      viewport: rawMetrics.environment.viewport,
      devicePixelRatio: rawMetrics.environment.devicePixelRatio,
      graphicsRenderer: rawMetrics.environment.graphicsRenderer,
      chromiumArguments: gpuArguments,
      cpuThrottleRate: cpuRate,
      baseUrl: baseUrl.href,
      commit: git("rev-parse", "HEAD"),
      dirtyWorkingTree: git("status", "--porcelain") !== "",
    },
    summary: {
      totalFrames,
      frameIntervalSamples: frameIntervalsMs.length,
      medianFrameIntervalMs: rounded(percentile(frameIntervalsMs, 0.5)),
      p95FrameIntervalMs,
      p95Fps: rounded(
        p95FrameIntervalMs > 0 ? 1_000 / p95FrameIntervalMs : 0,
      ),
      longTasks: longTasksMs.length,
      maximumLongTaskMs: maximumObservedLongTaskMs,
      runP95RangeMs: [
        rounded(Math.min(...runSamples.map(({ p95FrameIntervalMs }) => p95FrameIntervalMs))),
        rounded(Math.max(...runSamples.map(({ p95FrameIntervalMs }) => p95FrameIntervalMs))),
      ],
    },
    samples: {
      frameIntervalsMs,
      longTasksMs,
      longTaskEntries,
      runs: runSamples,
    },
  };
  const serializedResult = `${JSON.stringify(result, null, 2)}\n`;
  process.stdout.write(serializedResult);
  if (outputPath) {
    const resolvedOutputPath = resolve(outputPath);
    await mkdir(dirname(resolvedOutputPath), { recursive: true });
    await writeFile(resolvedOutputPath, serializedResult, "utf8");
  }

  const shortRuns = runSamples.filter(
    ({ frames }) => frames < minimumFramesPerRun,
  );
  if (
    measuredRuns.length !== measuredRunCount ||
    shortRuns.length > 0 ||
    totalFrames < measuredRunCount * minimumFramesPerRun
  ) {
    throw new Error(
      `V3 benchmark captured too few frames (${totalFrames} across ${measuredRuns.length} measured runs)`,
    );
  }
  if (cpuRate === 4 && p95FrameIntervalMs > maximumFrameIntervalMs) {
    throw new Error(
      `V3 benchmark p95 ${p95FrameIntervalMs} ms exceeds the 4x gate of ${maximumFrameIntervalMs} ms`,
    );
  }
  if (maximumObservedLongTaskMs > maximumLongTaskMs) {
    throw new Error(
      `V3 benchmark long task ${maximumObservedLongTaskMs} ms exceeds the ${maximumLongTaskMs} ms gate`,
    );
  }
} finally {
  if (page) {
    await page
      .evaluate(() => globalThis.__v3MobileMetricsCleanup?.())
      .catch(() => {});
  }
  if (context) {
    await context.close().catch(() => {});
  }
  if (browser) {
    await browser.close().catch(() => {});
  }
  if (server) {
    await server.close().catch(() => {});
  }
}
