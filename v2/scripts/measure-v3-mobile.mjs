import { chromium } from "@playwright/test";
import { resolve } from "node:path";
import { preview } from "vite";

const port = Number(process.env.V3_MEASURE_PORT ?? "4181");
if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error("V3_MEASURE_PORT must be a valid TCP port");
}
const cpuRate = Number(process.env.V3_CPU_RATE ?? "4");
if (!Number.isFinite(cpuRate) || cpuRate < 1) {
  throw new Error("V3_CPU_RATE must be a finite number greater than or equal to 1");
}
const server = await preview({
  configFile: resolve("apps/demo/vite.config.ts"),
  preview: {
    host: "127.0.0.1",
    port,
    strictPort: true,
  },
});

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  const session = await context.newCDPSession(page);
  await session.send("Emulation.setCPUThrottlingRate", { rate: cpuRate });
  await page.goto(
    `http://127.0.0.1:${port}/v3/?book=what-is-ethical-ai&chapter=what-is-ethics#what-is-ethics`,
  );
  await page.waitForFunction(
    () =>
      document.querySelector("[data-v3-reader]")?.getAttribute(
        "data-v3-opening",
      ) === "false",
  );
  await page.evaluate(() => {
    globalThis.__v3MobileMetrics = {
      frames: [],
      longTasks: [],
    };
    const observer = new MutationObserver(() => {
      globalThis.__v3MobileMetrics.frames.push(performance.now());
    });
    observer.observe(document.querySelector("[data-v3-turn-layer]"), {
      attributes: true,
      subtree: true,
      attributeFilter: ["data-v3-progress"],
    });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        globalThis.__v3MobileMetrics.longTasks.push(entry.duration);
      }
    }).observe({ type: "longtask" });
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
    throw new Error("V3 mobile measurement could not resolve turn bounds");
  }
  await page.mouse.move(
    cornerBounds.x + cornerBounds.width * 0.75,
    cornerBounds.y + cornerBounds.height * 0.25,
  );
  await page.mouse.down();
  await page.evaluate(
    ({ startX, startY, endX, endY }) =>
      new Promise((resolveAnimation) => {
        const spread = document.querySelector("[data-v3-spread]");
        if (!spread) {
          throw new Error("V3 mobile measurement spread is unavailable");
        }
        let frame = 0;
        const animate = () => {
          frame += 1;
          const progress = frame / 42;
          spread.dispatchEvent(
            new PointerEvent("pointermove", {
              bubbles: true,
              pointerId: 1,
              pointerType: "mouse",
              isPrimary: true,
              buttons: 1,
              clientX: startX + (endX - startX) * progress,
              clientY: startY + (endY - startY) * progress,
            }),
          );
          if (frame < 42) {
            requestAnimationFrame(animate);
          } else {
            requestAnimationFrame(resolveAnimation);
          }
        };
        requestAnimationFrame(animate);
      }),
    {
      startX: cornerBounds.x + cornerBounds.width * 0.75,
      startY: cornerBounds.y + cornerBounds.height * 0.25,
      endX: bounds.x + bounds.width * 0.18,
      endY: bounds.y + bounds.height * 0.2,
    },
  );
  await page.mouse.up();
  await page.waitForTimeout(500);

  const metrics = await page.evaluate(() => globalThis.__v3MobileMetrics);
  const intervals = metrics.frames
    .slice(1)
    .map((timestamp, index) => timestamp - metrics.frames[index])
    .sort((left, right) => left - right);
  const percentile = (values, fraction) =>
    values[Math.min(values.length - 1, Math.floor(values.length * fraction))] ??
    0;
  const p95FrameMs = percentile(intervals, 0.95);
  const result = {
    profile: `Chromium 390x844, ${cpuRate}x CPU throttle`,
    frames: metrics.frames.length,
    p50FrameMs: Number(percentile(intervals, 0.5).toFixed(2)),
    p95FrameMs: Number(p95FrameMs.toFixed(2)),
    p95Fps: Number((p95FrameMs > 0 ? 1_000 / p95FrameMs : 0).toFixed(1)),
    maximumLongTaskMs: Number(
      Math.max(0, ...metrics.longTasks).toFixed(2),
    ),
    longTasks: metrics.longTasks.length,
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.frames < 20) {
    throw new Error("V3 mobile measurement captured too few rendered frames");
  }
} finally {
  await browser.close();
  await new Promise((resolveClose, rejectClose) => {
    server.httpServer.close((error) => {
      if (error) {
        rejectClose(error);
      } else {
        resolveClose();
      }
    });
  });
}
