import type { PageTurnResolvedAppearance } from "./publication-types.js";

export const PAGE_TURN_SHARE_IMAGE_MAX_EDGE = 1_600;
export const PAGE_TURN_SHARE_IMAGE_MAX_AREA = 2_100_000;
export const PAGE_TURN_SHARE_IMAGE_MAX_BYTES = 4 * 1024 * 1024;
export const PAGE_TURN_SHARE_CANVAS_MAX_BYTES = 32 * 1024 * 1024;

export type PageTurnShareRenderInput = Readonly<{
  quote: string;
  contextBefore: string;
  contextAfter: string;
  title: string;
  authors: readonly string[];
  chapterTitle: string;
  runningTitle: string;
  editionId: string;
  source: string;
  citation: string;
  appearance: PageTurnResolvedAppearance;
}>;

export type PageTurnShareRenderResult = Readonly<{
  blob: Blob;
  width: number;
  height: number;
  estimatedCanvasBytes: number;
  fileName: string;
}>;

export type PageTurnShareCanvasPlan = Readonly<{
  width: number;
  height: number;
  area: number;
  estimatedCanvasBytes: number;
}>;

const CANVAS_WIDTH = 1_200;
const CANVAS_HEIGHT = 1_500;
const FONT_WAIT_MILLISECONDS = 250;
const ENCODE_WAIT_MILLISECONDS = 2_000;
const SHARE_SERIF_FONT = "serif";
const SHARE_SANS_SERIF_FONT = "sans-serif";
const MINIMUM_QUOTE_FONT_SIZE = 12;

type PageTurnShareFonts = Readonly<{
  body: string;
  heading: string;
  ui: string;
}>;

const fontDecisions = new Map<string, Promise<PageTurnShareFonts>>();

function abortError(): DOMException {
  return new DOMException("Share image rendering was cancelled", "AbortError");
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw abortError();
  }
}

function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    throwIfAborted(signal);
    const onAbort = () => reject(abortError());
    signal.addEventListener("abort", onAbort, { once: true });
    void promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

function configuredFonts(
  appearance: PageTurnResolvedAppearance,
): Promise<PageTurnShareFonts> {
  const requested = {
    body: appearance.typography.bodyFamily,
    heading: appearance.typography.headingFamily,
    ui: appearance.typography.uiFamily,
  };
  const key = JSON.stringify(requested);
  const existing = fontDecisions.get(key);
  if (existing) {
    return existing;
  }
  const fallback = {
    body: SHARE_SERIF_FONT,
    heading: SHARE_SERIF_FONT,
    ui: SHARE_SANS_SERIF_FONT,
  };
  const decision = (async (): Promise<PageTurnShareFonts> => {
    if (!document.fonts?.load || !document.fonts.check) {
      return fallback;
    }
    let timer: ReturnType<typeof globalThis.setTimeout> | undefined;
    const timeout = new Promise<"timeout">((resolve) => {
      timer = globalThis.setTimeout(
        () => resolve("timeout"),
        FONT_WAIT_MILLISECONDS,
      );
    });
    try {
      const loaded = await Promise.race([
        Promise.all([
          document.fonts.load(`16px ${requested.body}`),
          document.fonts.load(`16px ${requested.heading}`),
          document.fonts.load(`16px ${requested.ui}`),
        ]).then(() => "loaded" as const),
        timeout,
      ]);
      if (
        loaded === "loaded" &&
        document.fonts.check(`16px ${requested.body}`) &&
        document.fonts.check(`16px ${requested.heading}`) &&
        document.fonts.check(`16px ${requested.ui}`)
      ) {
        return requested;
      }
      return fallback;
    } catch {
      return fallback;
    } finally {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
    }
  })();
  fontDecisions.set(key, decision);
  return decision;
}

export function pageTurnShareCanvasPlan(): PageTurnShareCanvasPlan {
  const area = CANVAS_WIDTH * CANVAS_HEIGHT;
  const estimatedCanvasBytes = area * 4;
  if (
    Math.max(CANVAS_WIDTH, CANVAS_HEIGHT) > PAGE_TURN_SHARE_IMAGE_MAX_EDGE ||
    area > PAGE_TURN_SHARE_IMAGE_MAX_AREA ||
    estimatedCanvasBytes > PAGE_TURN_SHARE_CANVAS_MAX_BYTES
  ) {
    throw new RangeError("PageTurn share canvas exceeds its safety budget");
  }
  return {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    area,
    estimatedCanvasBytes,
  };
}

function wrappedLines(
  context: CanvasRenderingContext2D,
  text: string,
  maximumWidth: number,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    const words = paragraph
      .trim()
      .split(/\s+/u)
      .filter(Boolean)
      .flatMap((word) => {
        if (context.measureText(word).width <= maximumWidth) {
          return [word];
        }
        const fragments: string[] = [];
        let fragment = "";
        for (const character of Array.from(word)) {
          if (
            fragment !== "" &&
            context.measureText(fragment + character).width > maximumWidth
          ) {
            fragments.push(fragment);
            fragment = character;
          } else {
            fragment += character;
          }
        }
        if (fragment !== "") {
          fragments.push(fragment);
        }
        return fragments;
      });
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      const candidate = line === "" ? word : `${line} ${word}`;
      if (line !== "" && context.measureText(candidate).width > maximumWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    lines.push(line);
  }
  return lines;
}

function drawLines(
  context: CanvasRenderingContext2D,
  lines: readonly string[],
  x: number,
  y: number,
  lineHeight: number,
  maximumLines?: number,
): number {
  const displayed =
    maximumLines === undefined ? lines : lines.slice(0, maximumLines);
  displayed.forEach((line, index) => {
    context.fillText(line, x, y + index * lineHeight);
  });
  return y + displayed.length * lineHeight;
}

export type PageTurnShareQuoteLayout = Readonly<{
  lines: readonly string[];
  fontSize: number;
  lineHeight: number;
  height: number;
}>;

function visibleQuoteText(quote: string): string {
  return quote.replaceAll("\n", "↵");
}

export function pageTurnShareQuoteLayout(
  context: CanvasRenderingContext2D,
  quote: string,
  maximumWidth: number,
  maximumHeight: number,
  fontFamily = SHARE_SERIF_FONT,
): PageTurnShareQuoteLayout {
  const visibleQuote = visibleQuoteText(quote);
  for (let fontSize = 47; fontSize >= MINIMUM_QUOTE_FONT_SIZE; fontSize -= 1) {
    context.font = `600 ${fontSize}px ${fontFamily}`;
    const lines = wrappedLines(context, visibleQuote, maximumWidth);
    const lineHeight = Math.round(fontSize * 1.38);
    const height = lines.length * lineHeight + 52;
    if (height <= maximumHeight) {
      return { lines, fontSize, lineHeight, height };
    }
  }
  throw new RangeError(
    "The complete quote cannot fit legibly within the bounded share image",
  );
}

function safeFileName(title: string): string {
  const stem = title
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-|-$/gu, "")
    .toLowerCase()
    .slice(0, 72);
  return `${stem || "pageturn-quote"}.png`;
}

function canvasBlob(canvas: HTMLCanvasElement, signal: AbortSignal): Promise<Blob> {
  return new Promise((resolve, reject) => {
    throwIfAborted(signal);
    let settled = false;
    const finish = (action: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      action();
    };
    const onAbort = () => finish(() => reject(abortError()));
    const timer = globalThis.setTimeout(
      () =>
        finish(() =>
          reject(
            new RangeError("The share image encoder exceeded its time limit"),
          ),
        ),
      ENCODE_WAIT_MILLISECONDS,
    );
    signal.addEventListener("abort", onAbort, { once: true });
    canvas.toBlob((blob) => {
      if (signal.aborted) {
        finish(() => reject(abortError()));
      } else if (!blob) {
        finish(() =>
          reject(new Error("The browser could not encode the share image")),
        );
      } else {
        finish(() => resolve(blob));
      }
    }, "image/png");
  });
}

export async function renderPageTurnShareImage(
  input: PageTurnShareRenderInput,
  signal: AbortSignal,
): Promise<PageTurnShareRenderResult> {
  const plan = pageTurnShareCanvasPlan();
  const fonts = await abortable(configuredFonts(input.appearance), signal);
  throwIfAborted(signal);
  throwIfAborted(signal);

  const canvas = document.createElement("canvas");
  canvas.width = plan.width;
  canvas.height = plan.height;
  const context = canvas.getContext("2d", {
    alpha: false,
    willReadFrequently: false,
  });
  if (!context) {
    throw new Error("Canvas 2D is unavailable for visual quote sharing");
  }

  const paper = input.appearance.paper;
  context.fillStyle = paper.color;
  context.fillRect(0, 0, plan.width, plan.height);

  if (paper.pattern !== "plain") {
    context.strokeStyle = paper.ruleColor;
    context.globalAlpha = 0.26;
    context.lineWidth = 1;
    const spacing = Math.max(24, Math.round(paper.ruleSpacingRem * 32));
    for (let y = 150; y < plan.height - 90; y += spacing) {
      context.beginPath();
      context.moveTo(76, y + 0.5);
      context.lineTo(plan.width - 76, y + 0.5);
      context.stroke();
    }
    if (paper.pattern === "grid") {
      for (let x = 76; x < plan.width - 76; x += spacing) {
        context.beginPath();
        context.moveTo(x + 0.5, 140);
        context.lineTo(x + 0.5, plan.height - 90);
        context.stroke();
      }
    }
    context.globalAlpha = 1;
  }

  if (paper.texture > 0 || paper.age > 0) {
    const strength = Math.min(0.12, paper.texture * 0.2 + paper.age * 0.035);
    context.fillStyle = input.appearance.paper.inkColor;
    for (let index = 0; index < 540; index += 1) {
      const x = 68 + ((index * 193) % (plan.width - 136));
      const y = 68 + ((index * 317) % (plan.height - 136));
      context.globalAlpha = strength * (0.35 + ((index * 17) % 61) / 100);
      context.fillRect(x, y, index % 5 === 0 ? 2 : 1, 1);
    }
    context.globalAlpha = 1;
  }

  const edge = context.createLinearGradient(
    plan.width - 54,
    0,
    plan.width,
    0,
  );
  edge.addColorStop(0, "rgba(0,0,0,0)");
  edge.addColorStop(1, input.appearance.paper.edgeColor);
  context.fillStyle = edge;
  context.fillRect(plan.width - 54, 0, 54, plan.height);
  const gutter = context.createLinearGradient(0, 0, 46, 0);
  gutter.addColorStop(0, "rgba(30,20,12,0.20)");
  gutter.addColorStop(1, "rgba(30,20,12,0)");
  context.fillStyle = gutter;
  context.fillRect(0, 0, 46, plan.height);

  const left = 112;
  const width = plan.width - left * 2;
  context.fillStyle = paper.inkColor;
  context.textBaseline = "alphabetic";
  context.font = `600 25px ${fonts.heading}`;
  context.globalAlpha = 0.72;
  context.fillText(input.runningTitle || input.chapterTitle, left, 92);
  context.textAlign = "right";
  context.fillText(`EDITION ${input.editionId}`, plan.width - left, 92);
  context.textAlign = "left";
  context.globalAlpha = 1;

  context.font = `600 52px ${fonts.heading}`;
  let y = drawLines(
    context,
    wrappedLines(context, input.chapterTitle, width),
    left,
    180,
    62,
    3,
  );
  y += 28;

  context.font = `30px ${fonts.body}`;
  context.globalAlpha = 0.66;
  y = drawLines(
    context,
    wrappedLines(context, input.contextBefore, width),
    left,
    y,
    43,
    4,
  );
  context.globalAlpha = 1;
  y += 18;

  const quoteWidth = width - 58;
  const quoteLayout = pageTurnShareQuoteLayout(
    context,
    input.quote,
    quoteWidth,
    1_260 - y,
    fonts.body,
  );
  context.font = `600 ${quoteLayout.fontSize}px ${fonts.body}`;
  context.fillStyle = paper.highlight;
  context.fillRect(left - 20, y - 32, width + 4, quoteLayout.height);
  context.fillStyle = paper.inkColor;
  context.globalAlpha = 0.92;
  y = drawLines(
    context,
    quoteLayout.lines,
    left + 10,
    y + 12,
    quoteLayout.lineHeight,
  );
  context.globalAlpha = 1;
  y += 28;

  context.font = `30px ${fonts.body}`;
  context.globalAlpha = 0.66;
  const afterLineLimit = Math.max(
    0,
    Math.min(4, Math.floor((1_260 - y) / 43)),
  );
  drawLines(
    context,
    wrappedLines(context, input.contextAfter, width),
    left,
    y,
    43,
    afterLineLimit,
  );
  context.globalAlpha = 1;

  context.fillStyle = paper.inkColor;
  context.font = `600 34px ${fonts.heading}`;
  context.fillText(input.title, left, 1_312);
  context.font = `26px ${fonts.body}`;
  context.globalAlpha = 0.78;
  context.fillText(input.authors.join(", ") || "Publication authors", left, 1_354);
  context.font = `22px ${fonts.ui}`;
  drawLines(
    context,
    wrappedLines(context, input.citation, width),
    left,
    1_400,
    29,
    2,
  );
  context.globalAlpha = 0.6;
  drawLines(
    context,
    wrappedLines(context, input.source, width),
    left,
    1_466,
    25,
    1,
  );
  context.globalAlpha = 1;

  throwIfAborted(signal);
  const blob = await canvasBlob(canvas, signal);
  throwIfAborted(signal);
  if (blob.type !== "image/png") {
    throw new Error("The share image encoder did not return a PNG");
  }
  if (blob.size > PAGE_TURN_SHARE_IMAGE_MAX_BYTES) {
    throw new RangeError("The generated share image exceeds the 4 MB limit");
  }
  return {
    blob,
    width: plan.width,
    height: plan.height,
    estimatedCanvasBytes: plan.estimatedCanvasBytes,
    fileName: safeFileName(`${input.title}-${input.chapterTitle}-quote`),
  };
}
