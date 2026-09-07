import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import {
  mkdir,
  readFile,
  readdir,
  realpath,
  stat,
  writeFile,
} from "node:fs/promises";
import { createServer } from "node:http";
import { arch, platform, release } from "node:os";
import { basename, dirname, extname, relative, resolve, sep } from "node:path";
import { gzipSync } from "node:zlib";
import { preview } from "vite";

const warmUpRuns = 5;
const measuredRuns = 30;
const desktopViewport = { width: 1440, height: 1000 };
const selectionBudgetMs = 100;
const resolutionBudgetMs = 50;
const sourceCardBudgetMs = 50;
const marginaliaBudgetMs = 16;
const desktopShareBudgetMs = 500;
const lowEndShareBudgetMs = 1_200;
const maximumShareEdge = 1_600;
const maximumShareArea = 2_100_000;
const maximumShareBytes = 4 * 1024 * 1024;
const maximumCanvasBytes = 32 * 1024 * 1024;
const shareChunkBudget = 20 * 1024;
const previewChunkBudget = 8 * 1024;
const disabledCoreIncreaseBudget = 5 * 1024;
const port = integerEnvironment("V3_INTERACTION_PORT", 4_318);
const modulePort = integerEnvironment("V3_INTERACTION_MODULE_PORT", port + 1);
const localOrigin = `http://127.0.0.1:${port}`;
const configuredBase = process.env.V3_INTERACTION_BASE ?? localOrigin;
const baseUrl = new URL(configuredBase, `${localOrigin}/`);
baseUrl.pathname = `${baseUrl.pathname.replace(/\/+$/, "")}/`;
const moduleOrigin = `http://127.0.0.1:${modulePort}`;
const outputPath = process.env.V3_INTERACTION_OUTPUT;
const workspace = resolve(".");
const baselineRoot = process.env.V3_BASELINE_ROOT
  ? resolve(process.env.V3_BASELINE_ROOT)
  : undefined;
const baselineCommit = process.env.V3_BASELINE_COMMIT ?? "c1cf0f8";
const sdkModuleRoot = resolve("packages/page-turn-v3/dist");
const payloadRouteInputs = {
  sdkRoute: "sdk",
  hostedV3Route: "v3",
};
const baselineWorkspacePackages = [
  "packages/page-turn-v3/package.json",
  "packages/publication-model/package.json",
  "tools/publication-cli/package.json",
  "apps/demo/package.json",
];
const baselineWorkspaceLinks = [
  ["node_modules/@ethical-tech/book-demo", "apps/demo"],
  [
    "node_modules/@ethical-tech/book-publication-cli",
    "tools/publication-cli",
  ],
  [
    "node_modules/@ethical-tech/book-publication-model",
    "packages/publication-model",
  ],
  [
    "node_modules/@ethical-tech/book-reader-core",
    "compat/v2/packages/reader-core",
  ],
  [
    "node_modules/@ethical-tech/book-reader-ui",
    "compat/v2/packages/reader-ui",
  ],
  [
    "node_modules/@ethical-tech/book-renderer-semantic",
    "compat/v2/packages/renderer-semantic",
  ],
  ["node_modules/@ethical-tech/book-theme", "compat/v2/packages/theme"],
  ["node_modules/@ethical-tech/pageturn-book", "packages/page-turn-v3"],
];
const baselineBuildOutputs = [
  "packages/page-turn-v3/dist/index.js",
  "packages/publication-model/dist/index.js",
  "tools/publication-cli/dist/cli.js",
  "apps/demo/dist/sdk/index.html",
  "apps/demo/dist/v3/index.html",
];

function integerEnvironment(name, fallback) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < 1 || value > 65_535) {
    throw new Error(`${name} must be a valid TCP port`);
  }
  return value;
}

function git(...arguments_) {
  return execFileSync("git", arguments_, {
    cwd: workspace,
    encoding: "utf8",
  }).trim();
}

function gitAt(root, ...arguments_) {
  return execFileSync("git", arguments_, {
    cwd: root,
    encoding: "utf8",
  }).trim();
}

async function validateBaseline(root, provenance) {
  if (!/^[0-9a-f]{7,40}$/iu.test(baselineCommit)) {
    throw new Error(
      "V3_BASELINE_COMMIT must be a 7-40 character hexadecimal commit SHA",
    );
  }
  const [configuredPath, worktreePath] = await Promise.all([
    realpath(root),
    realpath(gitAt(root, "rev-parse", "--show-toplevel")),
  ]);
  provenance.path = configuredPath;
  provenance.worktreePath = worktreePath;
  provenance.isInsideWorktree =
    gitAt(root, "rev-parse", "--is-inside-work-tree") === "true";
  if (
    !provenance.isInsideWorktree ||
    configuredPath.toLowerCase() !== worktreePath.toLowerCase()
  ) {
    throw new Error(
      `V3_BASELINE_ROOT must be the root of a git worktree: ${configuredPath}`,
    );
  }
  provenance.commit = gitAt(root, "rev-parse", "HEAD").toLowerCase();
  provenance.head = gitAt(root, "rev-parse", "--abbrev-ref", "HEAD");
  if (!provenance.commit.startsWith(baselineCommit.toLowerCase())) {
    throw new Error(
      `V3 baseline commit mismatch: expected ${baselineCommit}, found ${provenance.commit}`,
    );
  }
  const status = gitAt(root, "status", "--porcelain=v1", "--untracked-files=all");
  provenance.status = status === "" ? "clean" : "dirty";
  provenance.statusPorcelain = status.split(/\r?\n/u).filter(Boolean);
  if (provenance.status !== "clean") {
    throw new Error(
      `V3 baseline worktree must be clean; found ${provenance.statusPorcelain.length} dirty entries`,
    );
  }
  if (provenance.head !== "HEAD") {
    throw new Error(
      `V3 baseline worktree must have a detached HEAD, found ${provenance.head}`,
    );
  }
  const expectedPaths = [...baselineWorkspacePackages];
  await Promise.all(
    expectedPaths.map(async (path) => {
      const entry = await stat(resolve(root, path));
      if (!entry.isFile()) {
        throw new Error(`Expected V3 baseline file is not a file: ${path}`);
      }
    }),
  );
  const workspaceLinks = await Promise.all(
    baselineWorkspaceLinks.map(async ([link, target]) => {
      const [actual, expected] = await Promise.all([
        realpath(resolve(root, link)),
        realpath(resolve(root, target)),
      ]);
      if (actual.toLowerCase() !== expected.toLowerCase()) {
        throw new Error(
          `V3 baseline workspace link ${link} resolves outside its worktree: ${actual}`,
        );
      }
      return { link, target, resolvedTarget: actual };
    }),
  );
  provenance.workspacePackages = baselineWorkspacePackages;
  provenance.workspaceLinks = workspaceLinks;
  provenance.routeInputs = payloadRouteInputs;
}

function workspaceState(root) {
  return {
    commit: gitAt(root, "rev-parse", "HEAD").toLowerCase(),
    status: gitAt(root, "status", "--porcelain=v1", "--untracked-files=all"),
  };
}

function buildWorkspace(root) {
  const before = workspaceState(root);
  const environment = { ...process.env };
  delete environment.PAGES_BASE_PATH;
  const npmExecPath = process.env.npm_execpath;
  const executable =
    npmExecPath ??
    (process.platform === "win32"
      ? (process.env.ComSpec ?? "cmd.exe")
      : "npm");
  const arguments_ = npmExecPath
    ? [npmExecPath, "run", "build"]
    : process.platform === "win32"
      ? ["/d", "/s", "/c", "npm.cmd run build"]
      : ["run", "build"];
  try {
    execFileSync(npmExecPath ? process.execPath : executable, arguments_, {
      cwd: root,
      encoding: "utf8",
      env: environment,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const details = [
      error instanceof Error ? error.message : String(error),
      error && typeof error === "object" && "stderr" in error && error.stderr
        ? String(error.stderr).trim()
        : "",
      error && typeof error === "object" && "stdout" in error && error.stdout
        ? String(error.stdout).trim()
        : "",
    ].filter(Boolean);
    throw new Error(
      `V3 interaction workspace build failed in ${root}` +
        (details.length > 0 ? `: ${details.join("\n")}` : ""),
    );
  }
  const after = workspaceState(root);
  if (after.commit !== before.commit || after.status !== before.status) {
    throw new Error(
      `V3 interaction workspace changed while building ${root}`,
    );
  }
  return {
    command: "npm run build",
    commit: after.commit,
    status: after.status === "" ? "clean" : "dirty",
  };
}

async function validateBuildOutputs(root) {
  await Promise.all(
    baselineBuildOutputs.map(async (path) => {
      const entry = await stat(resolve(root, path));
      if (!entry.isFile()) {
        throw new Error(`Expected V3 build output is not a file: ${path}`);
      }
    }),
  );
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

function summarize(samples) {
  return {
    samples: samples.map(rounded),
    medianMs: rounded(percentile(samples, 0.5)),
    p95Ms: rounded(percentile(samples, 0.95)),
    maximumMs: rounded(Math.max(0, ...samples)),
  };
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function fileMeasurement(path, root) {
  const bytes = await readFile(path);
  return {
    path: relative(root, path).replaceAll("\\", "/"),
    rawBytes: bytes.length,
    gzipBytes: gzipSync(bytes, { level: 9 }).length,
    sha256: sha256(bytes),
  };
}

async function routeMeasurement(root, routePath) {
  const dist = resolve(root, "apps/demo/dist");
  const htmlPath = resolve(dist, routePath, "index.html");
  const html = await readFile(htmlPath, "utf8");
  const assetPaths = new Set();
  for (const match of html.matchAll(
    /<(?:script|link)\b[^>]*(?:src|href)="([^"]+\.js)"/g,
  )) {
    const assetPath = match[1]?.replace(/^https?:\/\/[^/]+/u, "");
    if (assetPath) {
      assetPaths.add(resolve(dist, assetPath.replace(/^\/+/u, "")));
    }
  }
  const assets = await Promise.all(
    [...assetPaths].sort().map((path) => fileMeasurement(path, root)),
  );
  return {
    html: relative(root, htmlPath).replaceAll("\\", "/"),
    assets,
    rawBytes: assets.reduce((sum, asset) => sum + asset.rawBytes, 0),
    gzipBytes: assets.reduce((sum, asset) => sum + asset.gzipBytes, 0),
  };
}

async function findNamedChunks(root) {
  const assetsRoot = resolve(root, "apps/demo/dist/assets");
  const chunks = [];
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(path);
      } else if (
        entry.isFile() &&
        /^(share-renderer|external-preview-runtime)-.*\.js$/u.test(entry.name)
      ) {
        chunks.push(await fileMeasurement(path, root));
      }
    }
  }
  await walk(assetsRoot);
  return chunks.sort((left, right) => left.path.localeCompare(right.path));
}

async function payloadMeasurement(root) {
  return {
    root,
    routeInputs: payloadRouteInputs,
    sdkRoute: await routeMeasurement(root, payloadRouteInputs.sdkRoute),
    hostedV3Route: await routeMeasurement(
      root,
      payloadRouteInputs.hostedV3Route,
    ),
    packedSdkMain: await fileMeasurement(
      resolve(root, "packages/page-turn-v3/dist/index.js"),
      root,
    ),
    lazyChunks: await findNamedChunks(root),
  };
}

function startModuleServer() {
  const rootPrefix = `${sdkModuleRoot}${sep}`;
  const server = createServer((request, response) => {
    const requestUrl = new URL(request.url ?? "/", moduleOrigin);
    if (!requestUrl.pathname.startsWith("/__v3-sdk/")) {
      response.writeHead(404).end();
      return;
    }
    const requested = decodeURIComponent(
      requestUrl.pathname.slice("/__v3-sdk/".length),
    );
    const path = resolve(sdkModuleRoot, requested);
    if (
      !path.startsWith(rootPrefix) ||
      extname(path) !== ".js"
    ) {
      response.writeHead(404).end();
      return;
    }
    response.setHeader("Content-Type", "text/javascript; charset=utf-8");
    response.setHeader("Access-Control-Allow-Origin", "*");
    const stream = createReadStream(path);
    stream.on("error", () => response.writeHead(404).end());
    stream.pipe(response);
  });
  return new Promise((resolveServer, rejectServer) => {
    server.once("error", rejectServer);
    server.listen(modulePort, "127.0.0.1", () => resolveServer(server));
  });
}

async function closeServer(server) {
  if (!server) {
    return;
  }
  await new Promise((resolveClose) => server.close(resolveClose));
}

async function waitForReader(page) {
  await page.waitForFunction(
    () =>
      document.querySelector("[data-v3-reader]")?.getAttribute("data-v3-ready") ===
        "true" &&
      document
        .querySelector("[data-v3-reader]")
        ?.getAttribute("data-v3-opening") === "false",
  );
}

async function startLongTaskCollection(page) {
  await page.evaluate(() => {
    globalThis.__v3ValidationLongTaskCleanup?.();
    globalThis.__v3ValidationLongTasks = [];
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        globalThis.__v3ValidationLongTasks.push({
          startTime: entry.startTime,
          duration: entry.duration,
        });
      }
    });
    try {
      observer.observe({ type: "longtask", buffered: true });
      globalThis.__v3ValidationLongTaskCleanup = () => observer.disconnect();
    } catch {
      globalThis.__v3ValidationLongTaskCleanup = () => {};
    }
  });
}

async function measuredLongTasks(page, startTime, endTime) {
  await page.evaluate(() => new Promise((resolveFrame) => setTimeout(resolveFrame, 0)));
  return page.evaluate(
    ({ start, end }) =>
      (globalThis.__v3ValidationLongTasks ?? [])
        .filter(
          (entry) =>
            entry.startTime < end && entry.startTime + entry.duration > start,
        )
        .map((entry) => ({
          startTime: Number(entry.startTime.toFixed(3)),
          duration: Number(entry.duration.toFixed(3)),
        })),
    { start: startTime, end: endTime },
  );
}

async function memorySnapshot(page, session, browserSession, label) {
  const userAgentSpecific = await page
    .evaluate(async () => {
      const measure = performance.measureUserAgentSpecificMemory;
      if (typeof measure !== "function") {
        return { available: false };
      }
      try {
        const measured = await measure.call(performance);
        return { available: true, bytes: measured.bytes, breakdown: measured.breakdown };
      } catch (error) {
        return {
          available: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })
    .catch((error) => ({ available: false, error: String(error) }));
  if (userAgentSpecific.available) {
    return { label, method: "measureUserAgentSpecificMemory", ...userAgentSpecific };
  }
  const [heap, dom, processInfo] = await Promise.all([
    session.send("Runtime.getHeapUsage"),
    session.send("Memory.getDOMCounters"),
    browserSession.send("SystemInfo.getProcessInfo").catch(() => undefined),
  ]);
  const metrics = await session.send("Performance.getMetrics");
  const metricValues = Object.fromEntries(
    metrics.metrics
      .filter(({ name }) =>
        [
          "JSHeapUsedSize",
          "JSHeapTotalSize",
          "Nodes",
          "Documents",
          "Frames",
          "LayoutCount",
          "RecalcStyleCount",
        ].includes(name),
      )
      .map(({ name, value }) => [name, value]),
  );
  return {
    label,
    method: "CDP Runtime.getHeapUsage/Memory.getDOMCounters",
    userAgentSpecificMemory: userAgentSpecific,
    runtime: heap,
    dom,
    performance: metricValues,
    processes:
      processInfo?.processInfo.map(({ type, id, cpuTime }) => ({
        type,
        id,
        cpuTime,
      })) ?? [],
  };
}

function memoryDelta(before, after) {
  const beforeBytes =
    before.bytes ?? before.runtime?.usedSize ?? before.performance?.JSHeapUsedSize;
  const afterBytes =
    after.bytes ?? after.runtime?.usedSize ?? after.performance?.JSHeapUsedSize;
  return Number.isFinite(beforeBytes) && Number.isFinite(afterBytes)
    ? afterBytes - beforeBytes
    : undefined;
}

async function measureSelection(page, session) {
  await session.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.goto(
    new URL(
      "v3/?book=what-is-ethical-ai&chapter=responsible-ai&media=off#responsible-ai",
      baseUrl,
    ).href,
  );
  await waitForReader(page);
  await startLongTaskCollection(page);
  const result = await page.evaluate(
    async ({ warmups, runs }) => {
      const toolbar = document.querySelector("[data-v3-selection-actions]");
      if (!(toolbar instanceof HTMLElement)) {
        throw new Error("Selection benchmark controls are unavailable");
      }
      await document.fonts.ready;
      const samples = [];
      let timeouts = 0;
      let measuredStart = 0;
      let measuredEnd = 0;
      for (let index = 0; index < warmups + runs; index += 1) {
        if (index === warmups) {
          await new Promise((resolveSettle) => setTimeout(resolveSettle, 750));
        }
        const paragraph = Array.from(
          document.querySelectorAll(
            "[data-v3-stationary] p[data-source-anchor]",
          ),
        ).find((candidate) => {
          const bounds = candidate.getBoundingClientRect();
          return bounds.width > 0 && bounds.height > 0;
        });
        const text =
          paragraph instanceof HTMLElement
            ? document
                .createTreeWalker(paragraph, NodeFilter.SHOW_TEXT)
                .nextNode()
            : undefined;
        if (!(paragraph instanceof HTMLElement) || !(text instanceof Text)) {
          throw new Error("Selection benchmark text is unavailable");
        }
        document.getSelection()?.removeAllRanges();
        document.dispatchEvent(new Event("selectionchange"));
        await new Promise((resolveFrame) =>
          requestAnimationFrame(() => requestAnimationFrame(resolveFrame)),
        );
        paragraph.dispatchEvent(
          new PointerEvent("pointerdown", {
            bubbles: true,
            pointerId: index + 1,
            pointerType: "mouse",
            isPrimary: true,
          }),
        );
        const range = document.createRange();
        const startOffset = text.data.search(/\S/u);
        range.setStart(text, startOffset);
        range.setEnd(text, Math.min(text.length, startOffset + 64));
        const selection = document.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        const start = performance.now();
        if (index === warmups) {
          measuredStart = start;
        }
        const visible = new Promise((resolveVisible) => {
          const timeout = setTimeout(() => {
            observer.disconnect();
            resolveVisible({ end: performance.now(), timedOut: true });
          }, 2_000);
          const inspect = () => {
            if (
              !toolbar.hidden &&
              getComputedStyle(toolbar).visibility !== "hidden"
            ) {
              clearTimeout(timeout);
              observer.disconnect();
              resolveVisible({ end: performance.now(), timedOut: false });
            }
          };
          const observer = new MutationObserver(inspect);
          observer.observe(toolbar, {
            attributes: true,
            attributeFilter: ["hidden", "style", "class"],
          });
          inspect();
        });
        document.dispatchEvent(new Event("selectionchange"));
        const { end, timedOut } = await visible;
        if (index >= warmups) {
          samples.push(end - start);
          if (timedOut) {
            timeouts += 1;
          }
          measuredEnd = end;
        }
      }
      return {
        samples,
        measuredStart,
        measuredEnd,
        selectedCodePoints: Array.from(
          document.getSelection()?.toString() ?? "",
        ).length,
        placement: toolbar.dataset.v3Placement,
        timeouts,
      };
    },
    { warmups: warmUpRuns, runs: measuredRuns },
  );
  const longTasks = await measuredLongTasks(
    page,
    result.measuredStart,
    result.measuredEnd,
  );
  return {
    protocol: {
      warmUpRunsDiscarded: warmUpRuns,
      measuredRuns,
      cpuThrottleRate: 4,
      content: "What Is Ethical AI? / responsible-ai",
      sample:
        "performance.now() from stable Range installation immediately before selectionchange through visible contextual-toolbar mutation",
      postWarmupSettleMs: 750,
    },
    selectedCodePoints: result.selectedCodePoints,
    placement: result.placement,
    timeouts: result.timeouts,
    ...summarize(result.samples),
    longTasks,
  };
}

async function canonicalResponsibleAiBlocks(page) {
  return page.evaluate(async () => {
    const manifestResponse = await fetch(
      new URL(
        "../book/what-is-ethical-ai/2026-09/manifest.json",
        location.href,
      ),
    );
    const manifest = await manifestResponse.json();
    const chapter = manifest.renditions?.semantic?.chapters?.find(
      (candidate) => String(candidate.chapterId) === "responsible-ai",
    );
    if (!chapter) {
      throw new Error("Responsible AI manifest entry is unavailable");
    }
    const chapterUrl = new URL(chapter.href, manifestResponse.url);
    const chapterResponse = await fetch(chapterUrl);
    const parsed = new DOMParser().parseFromString(
      await chapterResponse.text(),
      "text/html",
    );
    const paragraphs = Array.from(
      parsed.querySelectorAll("[data-reader-content] p[id]"),
    ).map((node) => ({
      anchor: node.id,
      text: node.textContent?.normalize("NFC").replace(/\s+/gu, " ").trim() ?? "",
    }));
    if (paragraphs.length < 3) {
      throw new Error("Responsible AI canonical paragraphs are unavailable");
    }
    return {
      bookId: manifest.bookId,
      editionId: manifest.editionId,
      chapterId: String(chapter.chapterId),
      chapterContentHash: chapter.contentHash,
      blocks: paragraphs,
    };
  });
}

async function measureExactResolution(page, session, canonical) {
  await session.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  await startLongTaskCollection(page);
  const result = await page.evaluate(
    async ({ moduleUrl, context, warmups, runs }) => {
      const { createPageTurnTextTarget, resolvePageTurnTextTarget } =
        await import(moduleUrl);
      const startIndex = context.blocks.findIndex(
        (block, index) =>
          Array.from(block.text).length >= 400 &&
          Array.from(context.blocks[index + 1]?.text ?? "").length >= 399,
      );
      const startBlock = context.blocks[startIndex];
      const endBlock = context.blocks[startIndex + 1];
      const startLength = Array.from(startBlock?.text ?? "").length;
      const endLength = Array.from(endBlock?.text ?? "").length;
      if (!startBlock || !endBlock || startLength < 400 || endLength < 399) {
        throw new Error("Canonical two-block resolution input is too short");
      }
      const startOffset = startLength - 400;
      const target = await createPageTurnTextTarget({
        ...context,
        start: { anchor: startBlock.anchor, offset: startOffset },
        end: { anchor: endBlock.anchor, offset: 399 },
      });
      if (Array.from(target.quote.exact).length !== 800) {
        throw new Error("Exact target is not the required 800 code points");
      }
      const samples = [];
      let measuredStart = 0;
      let measuredEnd = 0;
      for (let index = 0; index < warmups + runs; index += 1) {
        const start = performance.now();
        if (index === warmups) {
          measuredStart = start;
        }
        const resolution = await resolvePageTurnTextTarget(target, context);
        const end = performance.now();
        if (resolution.state !== "resolved" || resolution.strategy !== "position") {
          throw new Error("Exact target did not resolve by canonical position");
        }
        if (index >= warmups) {
          samples.push(end - start);
          measuredEnd = end;
        }
      }
      return {
        samples,
        measuredStart,
        measuredEnd,
        target: {
          start: target.start,
          end: target.end,
          quoteCodePoints: Array.from(target.quote.exact).length,
        },
      };
    },
    {
      moduleUrl: `${moduleOrigin}/__v3-sdk/text-target.js`,
      context: canonical,
      warmups: warmUpRuns,
      runs: measuredRuns,
    },
  );
  const longTasks = await measuredLongTasks(
    page,
    result.measuredStart,
    result.measuredEnd,
  );
  return {
    protocol: {
      warmUpRunsDiscarded: warmUpRuns,
      measuredRuns,
      cpuThrottleRate: 1,
      content: "already-loaded canonical responsible-ai paragraph blocks",
      excludes: ["manifest fetch", "chapter fetch", "navigation", "DOM pagination"],
    },
    target: result.target,
    ...summarize(result.samples),
    longTasks,
  };
}

async function measureSourceCard(page, session) {
  await session.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  const thirdPartyRequests = [];
  const local = new URL(page.url()).origin;
  const requestListener = (request) => {
    const url = new URL(request.url());
    if (url.protocol.startsWith("http") && url.origin !== local) {
      thirdPartyRequests.push(url.href);
    }
  };
  page.on("request", requestListener);
  const result = await page.evaluate(
    async ({ warmups, runs }) => {
      const sheet = Array.from(
        document.querySelectorAll("[data-v3-stationary] .v3-sheet-content"),
      ).find((node) => {
        const bounds = node.getBoundingClientRect();
        return bounds.width > 0 && bounds.height > 0;
      });
      if (!(sheet instanceof HTMLElement)) {
        throw new Error("Source-card benchmark sheet is unavailable");
      }
      const link = document.createElement("a");
      link.href = "https://ethical-tech-colab.github.io/what-is-ethical-ai/";
      link.textContent = "What Is Ethical AI? canonical source";
      link.dataset.v3ValidationSource = "true";
      sheet.append(link);
      const dialog = document.querySelector("[data-v3-source-dialog]");
      const close = dialog?.querySelector(
        'button[aria-label="Close source card"]',
      );
      if (
        !(dialog instanceof HTMLDialogElement) ||
        !(close instanceof HTMLButtonElement)
      ) {
        throw new Error("Source-card benchmark dialog is unavailable");
      }
      const samples = [];
      for (let index = 0; index < warmups + runs; index += 1) {
        if (dialog.open) {
          close.click();
        }
        await new Promise((resolveFrame) => requestAnimationFrame(resolveFrame));
        const visible = new Promise((resolveVisible, rejectVisible) => {
          const timeout = setTimeout(() => {
            observer.disconnect();
            rejectVisible(new Error("Local source card did not become visible"));
          }, 2_000);
          const inspect = () => {
            if (
              dialog.open &&
              dialog.querySelector(".v3-source-primary") &&
              dialog
                .querySelector("[data-v3-source-availability]")
                ?.textContent?.includes("Available in the PageTurn Library")
            ) {
              clearTimeout(timeout);
              observer.disconnect();
              resolveVisible(performance.now());
            }
          };
          const observer = new MutationObserver(inspect);
          observer.observe(dialog, {
            attributes: true,
            childList: true,
            subtree: true,
          });
          inspect();
        });
        const start = performance.now();
        link.click();
        const end = await visible;
        if (index >= warmups) {
          samples.push(end - start);
        }
      }
      const state = {
        title: dialog.querySelector("[data-v3-source-title]")?.textContent,
        availability: dialog.querySelector("[data-v3-source-availability]")
          ?.textContent,
        localAction:
          dialog.querySelector(".v3-source-primary")?.textContent,
      };
      close.click();
      link.remove();
      return { samples, state };
    },
    { warmups: warmUpRuns, runs: measuredRuns },
  );
  page.off("request", requestListener);
  return {
    protocol: {
      warmUpRunsDiscarded: warmUpRuns,
      measuredRuns,
      cpuThrottleRate: 1,
      content:
        "What Is Ethical AI? / responsible-ai with a benchmark-only canonical authored link and the hosted synchronous registry",
      sample:
        "performance.now() immediately before HTMLElement.click() through native dialog open mutation",
    },
    card: result.state,
    thirdPartyRequests,
    ...summarize(result.samples),
  };
}

async function measureMarginalia(page) {
  await page.goto(
    new URL("v3/?book=plurality&chapter=3-2&media=off#3-2", baseUrl).href,
  );
  await waitForReader(page);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(750);
  const publication = await page.evaluate(() => ({
    bookId: "plurality",
    editionId: "2026-09",
    chapterId: "3-2",
    appearance: document
      .querySelector("[data-v3-reader]")
      ?.getAttribute("data-v3-appearance-theme"),
  }));
  if (publication.appearance !== "historical-tome") {
    throw new Error(
      `Marginalia benchmark expected historical-tome, found ${publication.appearance}`,
    );
  }
  const paragraph = page
    .locator("[data-v3-stationary] p[data-source-anchor]:visible")
    .first();
  await paragraph.evaluate((node) => {
    const text = document
      .createTreeWalker(node, NodeFilter.SHOW_TEXT)
      .nextNode();
    if (!(text instanceof Text)) {
      throw new Error("Marginalia benchmark text is unavailable");
    }
    const start = text.data.search(/\S/u);
    const range = document.createRange();
    range.setStart(text, start);
    range.setEnd(text, Math.min(text.length, start + 72));
    const selection = document.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
  });
  const annotate = page.getByRole("button", {
    name: "Annotate selected text",
  });
  await annotate.waitFor({ state: "visible" });
  await page.waitForFunction(
    () => {
      const button = document.querySelector(
        '[data-v3-selection-action="annotate"]',
      );
      return button instanceof HTMLButtonElement && !button.disabled;
    },
    undefined,
    { timeout: 30_000 },
  );
  await annotate.click();
  const editor = page.getByRole("dialog", { name: "Add annotation" });
  await editor
    .getByRole("textbox", { name: "Note on selected text" })
    .fill("V3-425 mounted marginalia annotation 00.");
  await editor.getByRole("button", { name: "Save" }).click();
  await editor.waitFor({ state: "hidden" });
  const seededIds = await page.evaluate(async () => {
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
          `Expected one mounted annotation before duplication, found ${records.length}`,
        );
      }
      const base = records[0];
      if (
        base.motivation !== "commenting" ||
        base.target?.state !== "resolved" ||
        typeof base.target.selector?.quote?.exact !== "string" ||
        base.target.selector.quote.exact.length === 0
      ) {
        throw new Error(
          "Mounted annotation is not an exact resolved commenting record",
        );
      }
      const ids = [base.annotationId];
      for (let index = 1; index < 20; index += 1) {
        const suffix = String(index).padStart(2, "0");
        const annotationId = `v3-425-mounted-${suffix}`;
        ids.push(annotationId);
        store.put({
          ...base,
          annotationId,
          body: {
            ...base.body,
            value: `V3-425 mounted marginalia annotation ${suffix}.`,
          },
          createdAt: `2026-09-07T10:00:${suffix}.000Z`,
          updatedAt: `2026-09-07T10:00:${suffix}.000Z`,
        });
      }
      await new Promise((resolveTransaction, rejectTransaction) => {
        transaction.oncomplete = resolveTransaction;
        transaction.onerror = () => rejectTransaction(transaction.error);
        transaction.onabort = () => rejectTransaction(transaction.error);
      });
      return ids.sort();
    } finally {
      database.close();
    }
  });
  await page.reload();
  await waitForReader(page);
  await page.waitForFunction(
    (expectedIds) => {
      const markers = Array.from(
        document.querySelectorAll(
          "[data-v3-stationary] [data-v3-annotation-group], " +
            "[data-v3-stationary] [data-v3-annotation-open]",
        ),
      );
      const represented = new Set(
        markers.flatMap((marker) =>
          marker instanceof HTMLElement && marker.dataset.v3AnnotationGroup
            ? marker.dataset.v3AnnotationGroup.split(",")
            : marker instanceof HTMLElement && marker.dataset.v3AnnotationOpen
              ? [marker.dataset.v3AnnotationOpen]
              : [],
        ),
      );
      return (
        markers.length > 0 &&
        expectedIds.every((id) => represented.has(id)) &&
        markers.every((marker) => {
          const bounds = marker.getBoundingClientRect();
          return (
            bounds.width > 0 &&
            bounds.height > 0 &&
            bounds.right > 0 &&
            bounds.bottom > 0 &&
            bounds.left < innerWidth &&
            bounds.top < innerHeight &&
            getComputedStyle(marker).visibility !== "hidden"
          );
        })
      );
    },
    seededIds,
  );
  await page.getByRole("button", { name: "Explore" }).click();
  const marginaliaToggle = page.getByRole("checkbox", {
    name: "Show marginalia",
  });
  await marginaliaToggle.uncheck();
  await page.getByRole("button", { name: "Close book tools" }).click();
  const result = await page.evaluate(
    async ({ expectedIds, warmups, runs }) => {
      const toggle = document.querySelector("[data-v3-show-marginalia]");
      if (!(toggle instanceof HTMLInputElement) || toggle.checked) {
        throw new Error("Show marginalia toggle is unavailable or not reset");
      }
      const samples = [];
      let finalPlacement;
      for (let index = 0; index < warmups + runs; index += 1) {
        const start = performance.now();
        toggle.click();
        const markers = Array.from(
          document.querySelectorAll(
            "[data-v3-stationary] [data-v3-annotation-group], " +
              "[data-v3-stationary] [data-v3-annotation-open]",
          ),
        );
        const representedIds = [
          ...new Set(
            markers.flatMap((marker) =>
              marker instanceof HTMLElement && marker.dataset.v3AnnotationGroup
                ? marker.dataset.v3AnnotationGroup.split(",")
                : marker instanceof HTMLElement &&
                    marker.dataset.v3AnnotationOpen
                  ? [marker.dataset.v3AnnotationOpen]
                  : [],
            ),
          ),
        ].sort();
        const visible = markers.every((marker) => {
          const bounds = marker.getBoundingClientRect();
          return (
            bounds.width > 0 &&
            bounds.height > 0 &&
            bounds.right > 0 &&
            bounds.bottom > 0 &&
            bounds.left < innerWidth &&
            bounds.top < innerHeight &&
            getComputedStyle(marker).visibility !== "hidden"
          );
        });
        const end = performance.now();
        if (
          !visible ||
          representedIds.length !== expectedIds.length ||
          !expectedIds.every(
            (id, expectedIndex) => id === representedIds[expectedIndex],
          )
        ) {
          throw new Error(
            "Mounted marginalia did not visibly represent all 20 annotation IDs",
          );
        }
        finalPlacement = {
          placements: markers.length,
          groups: markers.filter(
            (marker) =>
              marker instanceof HTMLElement &&
              marker.dataset.v3AnnotationGroup !== undefined,
          ).length,
          individualNotes: markers.filter(
            (marker) =>
              marker instanceof HTMLElement &&
              marker.dataset.v3AnnotationOpen !== undefined,
          ).length,
          representedIds,
        };
        if (index >= warmups) {
          samples.push(end - start);
        }
        if (index < warmups + runs - 1) {
          toggle.click();
          if (
            toggle.checked ||
            document.querySelectorAll(
              "[data-v3-stationary] [data-v3-marginalia]",
            ).length !== 0
          ) {
            throw new Error("Show marginalia false reset did not complete");
          }
        }
      }
      return { samples, finalPlacement };
    },
    {
      expectedIds: seededIds,
      warmups: warmUpRuns,
      runs: measuredRuns,
    },
  );
  return {
    protocol: {
      warmUpRunsDiscarded: warmUpRuns,
      measuredRuns,
      cpuThrottleRate: 1,
      content:
        "Plurality 2026-09 chapter 3-2 with historical-tome appearance and 20 exact resolved commenting annotations",
      setup:
        "create one annotation through mounted reader UI, duplicate to 20 in one IndexedDB transaction, reload, and verify visible marginalia",
      sample:
        "performance.now() around the public Show marginalia false-to-true click through synchronous DOM creation and forced marker layout",
    },
    publication,
    annotations: {
      count: seededIds.length,
      seededIds,
      ...result.finalPlacement,
    },
    ...summarize(result.samples),
  };
}

async function selectShareFixtureText(page) {
  await page.locator("[data-v3-chapter-select]").selectOption("introduction");
  await page.waitForFunction(
    () =>
      document.querySelector("[data-v3-reader]")?.getAttribute("data-v3-ready") ===
      "true",
  );
  await page.evaluate(() => {
    const paragraph = document.querySelector(
      "[data-v3-stationary] p[data-source-anchor]",
    );
    const text = paragraph
      ? document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT).nextNode()
      : undefined;
    if (!(text instanceof Text)) {
      throw new Error("Share benchmark selection is unavailable");
    }
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, Math.min(text.length, 72));
    const selection = document.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
  });
  await page
    .locator('[data-v3-selection-action="share"]')
    .waitFor({ state: "visible" });
}

async function runRendererSamples(page, session, canonical, cpuRate) {
  await session.send("Emulation.setCPUThrottlingRate", { rate: cpuRate });
  return page.evaluate(
    async ({ moduleBase, context, warmups, runs }) => {
      const [{ renderPageTurnShareImage }, { resolvePageTurnAppearance }] =
        await Promise.all([
          import(`${moduleBase}/share-renderer.js`),
          import(`${moduleBase}/appearance.js`),
        ]);
      const first = context.blocks[0]?.text ?? "";
      const second = context.blocks.at(-1)?.text ?? "";
      const quote = Array.from(`${first}\n${second}`).slice(0, 800).join("");
      if (Array.from(quote).length !== 800 || !quote.includes("\n")) {
        throw new Error("Share benchmark requires an 800-code-point two-block quote");
      }
      const input = {
        quote,
        contextBefore: first.slice(0, 120),
        contextAfter: second.slice(-120),
        title: "What Is Ethical AI?",
        authors: ["Ethical Tech CoLab"],
        chapterTitle: "The Rise of Responsible AI",
        runningTitle: "Responsible AI",
        editionId: "2026-09",
        source: "https://example.invalid/v3/?book=what-is-ethical-ai",
        citation: "Ethical Tech CoLab. What Is Ethical AI? 2026-09.",
        appearance: resolvePageTurnAppearance(undefined, "historical-tome"),
      };
      const samples = [];
      const outputs = [];
      for (let index = 0; index < warmups + runs; index += 1) {
        const controller = new AbortController();
        const start = performance.now();
        const output = await renderPageTurnShareImage(input, controller.signal);
        const end = performance.now();
        if (index >= warmups) {
          samples.push(end - start);
          outputs.push({
            width: output.width,
            height: output.height,
            area: output.width * output.height,
            encodedBytes: output.blob.size,
            estimatedCanvasBytes: output.estimatedCanvasBytes,
          });
        }
        await new Promise((resolveFrame) => requestAnimationFrame(resolveFrame));
      }
      return { samples, outputs, quoteCodePoints: Array.from(quote).length };
    },
    {
      moduleBase: `${moduleOrigin}/__v3-sdk`,
      context: canonical,
      warmups: warmUpRuns,
      runs: measuredRuns,
    },
  );
}

async function measureSharing(page, session, browserSession, canonical) {
  await session.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.goto(new URL("sdk/?share=visual", baseUrl).href);
  await page.waitForFunction(
    () =>
      document.querySelector("#page-turn-book")?.getAttribute("data-sdk-ready") ===
      "true",
  );
  await selectShareFixtureText(page);
  const beforeActivation = await memorySnapshot(
    page,
    session,
    browserSession,
    "before cold share activation",
  );
  const resourcesBefore = await page.evaluate(() =>
    performance.getEntriesByType("resource").map(({ name }) => name),
  );
  await page.evaluate(() => {
    const action = document.querySelector('[data-v3-selection-action="share"]');
    const image = document.querySelector("[data-v3-share-image]");
    if (!(action instanceof HTMLButtonElement) || !(image instanceof HTMLImageElement)) {
      throw new Error("Share benchmark controls are unavailable");
    }
    const ready = new Promise((resolveReady, rejectReady) => {
      const timeout = setTimeout(() => {
        observer.disconnect();
        rejectReady(new Error("Cold share image did not become ready"));
      }, 5_000);
      const inspect = () => {
        if (image.src.startsWith("blob:")) {
          clearTimeout(timeout);
          observer.disconnect();
          resolveReady(performance.now());
        }
      };
      const observer = new MutationObserver(inspect);
      observer.observe(image, { attributes: true, attributeFilter: ["src"] });
      inspect();
    });
    const start = performance.now();
    action.click();
    globalThis.__v3ColdShareResult = ready.then(async (end) => {
      const bytes = await (await fetch(image.src)).arrayBuffer();
      return {
        durationMs: end - start,
        width: image.naturalWidth,
        height: image.naturalHeight,
        area: image.naturalWidth * image.naturalHeight,
        encodedBytes: bytes.byteLength,
      };
    });
  });
  await page.waitForFunction(
    () =>
      document
        .querySelector("[data-v3-share-composer-status]")
        ?.textContent?.includes("Generating a bounded local PNG preview"),
  );
  const peakRender = await memorySnapshot(
    page,
    session,
    browserSession,
    "during cold render",
  );
  const cold = await page.evaluate(async () => {
    const result = await globalThis.__v3ColdShareResult;
    delete globalThis.__v3ColdShareResult;
    return result;
  });
  const resourcesAfter = await page.evaluate(() =>
    performance.getEntriesByType("resource").map(({ name }) => name),
  );
  const shareRendererResourcesBefore = resourcesBefore.filter((resource) =>
    resource.includes("share-renderer"),
  );
  const newlyLoadedResources = resourcesAfter.filter(
    (resource) => !resourcesBefore.includes(resource),
  );
  const newShareRendererResources = newlyLoadedResources.filter((resource) =>
    resource.includes("share-renderer"),
  );
  await page
    .getByRole("button", { name: "Close share preview" })
    .click();

  const lowEnd = await runRendererSamples(page, session, canonical, 4);
  const desktop = await runRendererSamples(page, session, canonical, 1);

  await session.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await selectShareFixtureText(page);
  await page.evaluate(() => {
    const action = document.querySelector('[data-v3-selection-action="share"]');
    const close = document.querySelector("[data-v3-close-share]");
    if (!(action instanceof HTMLButtonElement) || !(close instanceof HTMLButtonElement)) {
      throw new Error("Share cancellation controls are unavailable");
    }
    action.click();
    close.click();
  });
  await page.waitForTimeout(100);
  const afterCancellation = await memorySnapshot(
    page,
    session,
    browserSession,
    "after cancellation",
  );
  await page
    .getByRole("button", { name: "Destroy SDK reader" })
    .evaluate((button) => button.click());
  await page.waitForTimeout(100);
  const afterDestroy = await memorySnapshot(
    page,
    session,
    browserSession,
    "after destroy",
  );
  const outputSummary = (outputs) => ({
    maximumEdge: Math.max(
      ...outputs.map(({ width, height }) => Math.max(width, height)),
    ),
    maximumArea: Math.max(...outputs.map(({ area }) => area)),
    maximumEncodedBytes: Math.max(
      ...outputs.map(({ encodedBytes }) => encodedBytes),
    ),
    maximumEstimatedCanvasBytes: Math.max(
      ...outputs.map(({ estimatedCanvasBytes }) => estimatedCanvasBytes),
    ),
  });
  return {
    protocol: {
      warmUpRunsDiscarded: warmUpRuns,
      measuredRunsPerProfile: measuredRuns,
      content:
        "800-code-point canonical input assembled from two responsible-ai paragraph blocks",
      coldActivation:
        "fresh SDK route at 4x; selection prepared before timer; includes lazy chunk import, composer, render, encode, and blob URL publication",
      measuredRenderer:
        "public renderer module already loaded; each sample includes Canvas 2D layout, paint, and PNG encoding",
    },
    coldActivation: {
      ...Object.fromEntries(
        Object.entries(cold).map(([key, value]) => [
          key,
          typeof value === "number" ? rounded(value) : value,
        ]),
      ),
      resourcesBefore,
      shareRendererResourcesBefore,
      newlyLoadedResources,
      newShareRendererResources,
      shareRendererResourcesAfter: resourcesAfter.filter((resource) =>
        resource.includes("share-renderer"),
      ),
    },
    desktop: {
      cpuThrottleRate: 1,
      quoteCodePoints: desktop.quoteCodePoints,
      ...summarize(desktop.samples),
      outputs: desktop.outputs,
      outputSummary: outputSummary(desktop.outputs),
    },
    lowEnd: {
      cpuThrottleRate: 4,
      quoteCodePoints: lowEnd.quoteCodePoints,
      ...summarize(lowEnd.samples),
      outputs: lowEnd.outputs,
      outputSummary: outputSummary(lowEnd.outputs),
    },
    memory: {
      strictGate:
        "Only the deterministic canvas estimate is gated; observed heap deltas are diagnostic.",
      beforeActivation,
      peakRender,
      afterCancellation,
      afterDestroy,
      peakMinusBeforeBytes: memoryDelta(beforeActivation, peakRender),
      cancellationMinusBeforeBytes: memoryDelta(
        beforeActivation,
        afterCancellation,
      ),
      destroyMinusBeforeBytes: memoryDelta(beforeActivation, afterDestroy),
    },
  };
}

async function measureDisabledRoute(page) {
  const requests = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto(new URL("sdk/", baseUrl).href);
  await page.waitForFunction(
    () =>
      document.querySelector("#page-turn-book")?.getAttribute("data-sdk-ready") ===
      "true",
  );
  await page.waitForTimeout(100);
  const local = new URL(page.url()).origin;
  const resources = await page.evaluate(() =>
    performance.getEntriesByType("resource").map(({ name }) => name),
  );
  return {
    route: page.url(),
    resources,
    shareRendererRequests: requests.filter((url) =>
      url.includes("share-renderer"),
    ),
    externalPreviewRuntimeRequests: requests.filter((url) =>
      url.includes("external-preview-runtime"),
    ),
    providerOrCaptureRequests: requests.filter((value) => {
      const url = new URL(value);
      return (
        url.origin !== local ||
        /(?:external-preview|capture)/iu.test(url.pathname)
      );
    }),
  };
}

function gate(name, passed, actual, budget) {
  return { name, status: passed ? "pass" : "fail", actual, budget };
}

const capturedRepository = {
  capturedAt: new Date().toISOString(),
  commit: git("rev-parse", "HEAD"),
  branch: git("branch", "--show-current"),
  dirtyWorkingTree: git("status", "--porcelain") !== "",
  dirtyEntries: git("status", "--porcelain")
    .split(/\r?\n/u)
    .filter(Boolean),
};
const result = {
  schemaVersion: 1,
  protocol: {
    name: "V3-425 integrated interaction validation",
    warmUpRunsDiscarded: warmUpRuns,
    measuredRuns,
    percentile: "nearest-rank",
  },
  repository: capturedRepository,
  baseline:
    baselineRoot === undefined
      ? {
          path: undefined,
          requestedCommit: baselineCommit,
          validationStatus: "not-provided",
        }
      : {
          path: baselineRoot,
          requestedCommit: baselineCommit,
          validationStatus: "pending",
        },
  environment: {
    measuredAt: undefined,
    node: process.version,
    os: `${platform()} ${release()} ${arch()}`,
    baseUrl: baseUrl.href,
    ports: { preview: port, sdkModules: modulePort },
  },
  coverage: {
    executed: ["Chromium automated"],
    notExecutedBlockers: [
      "Firefox",
      "Safari",
      "iOS Safari",
      "Android Chrome",
      "manual NVDA",
      "manual VoiceOver on macOS/iOS",
      "manual TalkBack",
    ],
  },
  measurements: {},
  gates: [],
};

let viteServer;
let moduleServer;
let browser;
let context;
let page;
try {
  if (baselineRoot) {
    try {
      await validateBaseline(baselineRoot, result.baseline);
      result.baseline.build = buildWorkspace(baselineRoot);
      await validateBuildOutputs(baselineRoot);
      result.baseline.buildOutputs = baselineBuildOutputs;
      result.baseline.validationStatus = "pass";
    } catch (error) {
      result.baseline.validationStatus = "fail";
      result.baseline.error =
        error instanceof Error ? error.message : String(error);
      throw error;
    }
  }
  result.repository.build = buildWorkspace(workspace);
  await validateBuildOutputs(workspace);
  result.measurements.payload = {
    current: await payloadMeasurement(workspace),
    baseline: baselineRoot ? await payloadMeasurement(baselineRoot) : undefined,
  };
  moduleServer = await startModuleServer();
  if (process.env.V3_INTERACTION_BASE === undefined) {
    viteServer = await preview({
      configFile: resolve("apps/demo/vite.config.ts"),
      preview: { host: "127.0.0.1", port, strictPort: true },
    });
  }
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({
    viewport: desktopViewport,
    reducedMotion: "reduce",
  });
  page = await context.newPage();
  const session = await context.newCDPSession(page);
  const browserSession = await browser.newBrowserCDPSession();
  await session.send("Performance.enable");

  result.environment.browser = `Chromium ${browser.version()}`;
  result.environment.userAgent = await page.evaluate(() => navigator.userAgent);
  result.environment.viewport = desktopViewport;
  result.environment.devicePixelRatio = await page.evaluate(
    () => devicePixelRatio,
  );
  result.environment.measureUserAgentSpecificMemoryAvailable =
    await page.evaluate(
      () => typeof performance.measureUserAgentSpecificMemory === "function",
    );

  result.measurements.disabledRoute = await measureDisabledRoute(page);
  result.measurements.selection = await measureSelection(page, session);
  const canonical = await canonicalResponsibleAiBlocks(page);
  result.measurements.exactResolution = await measureExactResolution(
    page,
    session,
    canonical,
  );
  result.measurements.sourceCard = await measureSourceCard(page, session);
  result.measurements.marginalia = await measureMarginalia(page);
  result.measurements.sharing = await measureSharing(
    page,
    session,
    browserSession,
    canonical,
  );

  const payload = result.measurements.payload;
  const shareChunk = payload.current.lazyChunks.find(({ path }) =>
    basename(path).startsWith("share-renderer-"),
  );
  const previewChunk = payload.current.lazyChunks.find(({ path }) =>
    basename(path).startsWith("external-preview-runtime-"),
  );
  const baselineDelta = payload.baseline
    ? payload.current.hostedV3Route.gzipBytes -
      payload.baseline.hostedV3Route.gzipBytes
    : undefined;
  const selection = result.measurements.selection;
  const resolution = result.measurements.exactResolution;
  const source = result.measurements.sourceCard;
  const marginalia = result.measurements.marginalia;
  const sharing = result.measurements.sharing;
  const allShareOutputs = [
    ...sharing.desktop.outputs,
    ...sharing.lowEnd.outputs,
  ];

  result.gates.push(
    gate(
      "selection-p95-at-4x",
      selection.samples.length === measuredRuns &&
        selection.timeouts === 0 &&
        selection.p95Ms <= selectionBudgetMs,
      { p95Ms: selection.p95Ms, timeouts: selection.timeouts },
      `<= ${selectionBudgetMs} ms`,
    ),
    gate(
      "loaded-exact-resolution-p95",
      resolution.samples.length === measuredRuns &&
        resolution.p95Ms <= resolutionBudgetMs,
      resolution.p95Ms,
      `<= ${resolutionBudgetMs} ms`,
    ),
    gate(
      "loaded-exact-resolution-no-task-over-50ms",
      resolution.maximumMs <= resolutionBudgetMs &&
        resolution.longTasks.every(
          ({ duration }) => duration <= resolutionBudgetMs,
        ),
      {
        maximumSampleMs: resolution.maximumMs,
        maximumLongTaskMs: Math.max(
          0,
          ...resolution.longTasks.map(({ duration }) => duration),
        ),
      },
      "<= 50 ms",
    ),
    gate(
      "local-source-card-p95",
      source.samples.length === measuredRuns &&
        source.p95Ms <= sourceCardBudgetMs,
      source.p95Ms,
      `<= ${sourceCardBudgetMs} ms`,
    ),
    gate(
      "local-source-card-third-party-requests",
      source.thirdPartyRequests.length === 0,
      source.thirdPartyRequests,
      "zero",
    ),
    gate(
      "marginalia-placement-p95",
      marginalia.samples.length === measuredRuns &&
        marginalia.p95Ms <= marginaliaBudgetMs,
      marginalia.p95Ms,
      `<= ${marginaliaBudgetMs} ms`,
    ),
    gate(
      "mounted-marginalia-grouping",
      marginalia.annotations.groups > 0 &&
        marginalia.annotations.representedIds.length === 20 &&
        marginalia.annotations.seededIds.every(
          (id, index) => id === marginalia.annotations.representedIds[index],
        ),
      marginalia.annotations,
      "mounted placements include grouping and visibly represent all 20 seeded IDs",
    ),
    gate(
      "share-desktop-p95",
      sharing.desktop.samples.length === measuredRuns &&
        sharing.desktop.p95Ms <= desktopShareBudgetMs,
      sharing.desktop.p95Ms,
      `<= ${desktopShareBudgetMs} ms`,
    ),
    gate(
      "share-4x-p95",
      sharing.lowEnd.samples.length === measuredRuns &&
        sharing.lowEnd.p95Ms <= lowEndShareBudgetMs,
      sharing.lowEnd.p95Ms,
      `<= ${lowEndShareBudgetMs} ms`,
    ),
    gate(
      "share-cold-lazy-behavior",
      sharing.coldActivation.shareRendererResourcesBefore.length === 0 &&
        sharing.coldActivation.newShareRendererResources.length === 1 &&
        Math.max(
          sharing.coldActivation.width,
          sharing.coldActivation.height,
        ) <= maximumShareEdge &&
        sharing.coldActivation.area <= maximumShareArea &&
        sharing.coldActivation.encodedBytes <= maximumShareBytes,
      {
        durationMs: sharing.coldActivation.durationMs,
        shareRendererResourcesBefore:
          sharing.coldActivation.shareRendererResourcesBefore,
        newShareRendererResources:
          sharing.coldActivation.newShareRendererResources,
      },
      "zero share-renderer resources before activation, exactly one newly loaded afterward, and bounded output",
    ),
    gate(
      "share-output-bounds",
      allShareOutputs.every(
        ({ width, height, area, encodedBytes, estimatedCanvasBytes }) =>
          Math.max(width, height) <= maximumShareEdge &&
          area <= maximumShareArea &&
          encodedBytes <= maximumShareBytes &&
          estimatedCanvasBytes <= maximumCanvasBytes,
      ),
      {
        desktop: sharing.desktop.outputSummary,
        lowEnd: sharing.lowEnd.outputSummary,
      },
      `edge <= ${maximumShareEdge}, area <= ${maximumShareArea}, PNG <= ${maximumShareBytes} bytes, canvas estimate <= ${maximumCanvasBytes} bytes`,
    ),
    gate(
      "share-lazy-chunk",
      shareChunk !== undefined && shareChunk.gzipBytes <= shareChunkBudget,
      shareChunk,
      `<= ${shareChunkBudget} gzip bytes`,
    ),
    gate(
      "external-preview-lazy-chunk",
      previewChunk !== undefined && previewChunk.gzipBytes <= previewChunkBudget,
      previewChunk,
      `<= ${previewChunkBudget} gzip bytes`,
    ),
    gate(
      "disabled-route-lazy-boundary",
      result.measurements.disabledRoute.shareRendererRequests.length === 0 &&
        result.measurements.disabledRoute.externalPreviewRuntimeRequests.length ===
          0 &&
        result.measurements.disabledRoute.providerOrCaptureRequests.length === 0,
      {
        shareRendererRequests:
          result.measurements.disabledRoute.shareRendererRequests,
        externalPreviewRuntimeRequests:
          result.measurements.disabledRoute.externalPreviewRuntimeRequests,
        providerOrCaptureRequests:
          result.measurements.disabledRoute.providerOrCaptureRequests,
      },
      "zero lazy capture/embed chunks and zero provider/capture requests",
    ),
  );
  result.gates.push(
    baselineDelta === undefined
      ? {
          name: "disabled-feature-core-increase",
          status: "unknown",
          actual: "V3_BASELINE_ROOT not provided",
          budget: `<= ${disabledCoreIncreaseBudget} gzip bytes`,
        }
      : gate(
          "disabled-feature-core-increase",
          baselineDelta <= disabledCoreIncreaseBudget,
          {
            baselineHostedV3RouteGzipBytes:
              payload.baseline.hostedV3Route.gzipBytes,
            currentHostedV3RouteGzipBytes:
              payload.current.hostedV3Route.gzipBytes,
            deltaGzipBytes: baselineDelta,
            packedSdkMainGzipBytes: {
              baseline: payload.baseline.packedSdkMain.gzipBytes,
              current: payload.current.packedSdkMain.gzipBytes,
            },
            sdkRouteGzipBytes: {
              baseline: payload.baseline.sdkRoute.gzipBytes,
              current: payload.current.sdkRoute.gzipBytes,
            },
          },
          `<= ${disabledCoreIncreaseBudget} gzip bytes`,
        ),
  );
  result.environment.measuredAt = new Date().toISOString();
  result.summary = {
    passed: result.gates.filter(({ status }) => status === "pass").length,
    failed: result.gates.filter(({ status }) => status === "fail").length,
    unknown: result.gates.filter(({ status }) => status === "unknown").length,
    recommendation:
      result.gates.some(({ status }) => status !== "pass") ||
      result.coverage.notExecutedBlockers.length > 0
        ? "withhold broad promotion"
        : "eligible for promotion review",
  };
} catch (error) {
  result.environment.measuredAt = new Date().toISOString();
  result.error = error instanceof Error ? error.stack ?? error.message : String(error);
  result.summary = {
    passed: result.gates.filter(({ status }) => status === "pass").length,
    failed: result.gates.filter(({ status }) => status === "fail").length + 1,
    unknown: result.gates.filter(({ status }) => status === "unknown").length,
    recommendation: "withhold broad promotion",
  };
  process.exitCode = 1;
} finally {
  if (page) {
    await page
      .evaluate(() => globalThis.__v3ValidationLongTaskCleanup?.())
      .catch(() => {});
  }
  if (context) {
    await context.close().catch(() => {});
  }
  if (browser) {
    await browser.close().catch(() => {});
  }
  if (viteServer) {
    await viteServer.close().catch(() => {});
  }
  await closeServer(moduleServer).catch(() => {});
  const serialized = `${JSON.stringify(result, null, 2)}\n`;
  process.stdout.write(serialized);
  if (outputPath) {
    const resolvedOutput = resolve(outputPath);
    await mkdir(dirname(resolvedOutput), { recursive: true });
    await writeFile(resolvedOutput, serialized, "utf8");
  }
  if (
    result.error !== undefined ||
    result.gates.some(({ status }) => status !== "pass")
  ) {
    process.exitCode = 1;
  }
}
