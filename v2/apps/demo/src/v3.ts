import type { SemanticChapter } from "@ethical-tech/book-publication-model";
import {
  solvePageTurn,
  type PageTurnCorner,
  type PageTurnDirection,
  type PageTurnFrame,
  type PageTurnPoint,
} from "@ethical-tech/book-reader-ui/page-turn-geometry";
import {
  pageTurnPolygon,
  projectPageTurn,
} from "@ethical-tech/book-reader-ui/page-turn-projection";

type SemanticBlock = Readonly<{
  node: HTMLElement;
  anchor: string;
  chapterTitle: string;
}>;

type V3Chapter = Pick<
  SemanticChapter,
  "title" | "href" | "firstAnchor"
>;

type V3Manifest = Readonly<{
  title: string;
  authors: readonly Readonly<{ name: string }>[];
  publicationDate?: string;
  description?: string;
  frontMatter?: Readonly<{
    credits?: string;
    kicker?: string;
    thesis?: string;
  }>;
  cover?: Readonly<{
    subtitle?: string;
  }>;
  chapters: readonly V3Chapter[];
}>;

type PrototypePage = Readonly<{
  label: string;
  runningTitle: string;
  anchor: string;
  kind: "front-matter" | "content";
  nodes: readonly HTMLElement[];
}>;

type ActiveTurn = {
  direction: PageTurnDirection;
  corner: PageTurnCorner;
  targetSpread: number;
  pointer: PageTurnPoint;
  progress: number;
  pointerId?: number;
  capture?: HTMLButtonElement;
  animationFrame?: number;
  moving: HTMLElement;
  revealed: HTMLElement;
  shadow: HTMLElement;
};

const manifestRelativeUrl =
  "../book/what-is-ethical-ai/2026-07/manifest.json";
const selectedChapterCount = 3;
const maximumSegmentCharacters = 540;

function requiredElement<T extends Element>(
  selector: string,
  root: ParentNode = document,
): T {
  const node = root.querySelector<T>(selector);
  if (!node) {
    throw new Error(`V3 prototype is missing required element: ${selector}`);
  }
  return node;
}

function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}

function stripInteractiveIdentity(root: HTMLElement): void {
  root.removeAttribute("id");
  for (const identified of root.querySelectorAll("[id]")) {
    identified.removeAttribute("id");
  }
  for (const focusable of root.querySelectorAll<HTMLElement>(
    "a, button, input, select, textarea, [tabindex]",
  )) {
    focusable.tabIndex = -1;
  }
}

function cloneNodes(
  nodes: readonly HTMLElement[],
  preserveIdentity: boolean,
): HTMLElement[] {
  return nodes.map((node) => {
    const clone = node.cloneNode(true) as HTMLElement;
    if (!preserveIdentity) {
      stripInteractiveIdentity(clone);
    }
    return clone;
  });
}

function sentenceSegments(text: string): string[] {
  const sentences =
    text.trim().match(/[^.!?]+(?:[.!?]+["'”’)]*|$)/g)?.map((part) =>
      part.trim(),
    ) ?? [];
  if (sentences.length === 0) {
    return text.trim() ? [text.trim()] : [];
  }

  const segments: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    const candidate = current ? `${current} ${sentence}` : sentence;
    if (candidate.length > maximumSegmentCharacters && current) {
      segments.push(current);
      current = sentence;
    } else {
      current = candidate;
    }
  }
  if (current) {
    segments.push(current);
  }
  return segments;
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`V3 manifest ${path} must be an object`);
  }
  return value as Record<string, unknown>;
}

function stringValue(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`V3 manifest ${path} must be a non-empty string`);
  }
  return value;
}

function optionalStringValue(
  value: unknown,
  path: string,
): string | undefined {
  return value === undefined ? undefined : stringValue(value, path);
}

function parseV3Manifest(value: unknown): V3Manifest {
  const root = record(value, "root");
  const authorsValue = root.authors;
  if (!Array.isArray(authorsValue) || authorsValue.length === 0) {
    throw new Error("V3 manifest authors must be a non-empty array");
  }
  const authors = authorsValue.map((author, index) => ({
    name: stringValue(
      record(author, `authors[${index}]`).name,
      `authors[${index}].name`,
    ),
  }));
  const renditions = record(root.renditions, "renditions");
  const semantic = record(renditions.semantic, "renditions.semantic");
  const chaptersValue = semantic.chapters;
  if (!Array.isArray(chaptersValue) || chaptersValue.length === 0) {
    throw new Error(
      "V3 manifest renditions.semantic.chapters must be a non-empty array",
    );
  }
  const chapters: V3Chapter[] = chaptersValue.map((chapter, index) => {
    const parsed = record(
      chapter,
      `renditions.semantic.chapters[${index}]`,
    );
    return {
      title: stringValue(
        parsed.title,
        `renditions.semantic.chapters[${index}].title`,
      ),
      href: stringValue(
        parsed.href,
        `renditions.semantic.chapters[${index}].href`,
      ),
      firstAnchor: stringValue(
        parsed.firstAnchor,
        `renditions.semantic.chapters[${index}].firstAnchor`,
      ),
    };
  });
  const frontMatterRecord =
    root.frontMatter === undefined
      ? undefined
      : record(root.frontMatter, "frontMatter");
  const appearance =
    root.appearance === undefined
      ? undefined
      : record(root.appearance, "appearance");
  const coverRecord =
    appearance?.cover === undefined
      ? undefined
      : record(appearance.cover, "appearance.cover");
  const publicationDate = optionalStringValue(
    root.publicationDate,
    "publicationDate",
  );
  const description = optionalStringValue(
    root.description,
    "description",
  );
  const credits = optionalStringValue(
    frontMatterRecord?.credits,
    "frontMatter.credits",
  );
  const kicker = optionalStringValue(
    frontMatterRecord?.kicker,
    "frontMatter.kicker",
  );
  const thesis = optionalStringValue(
    frontMatterRecord?.thesis,
    "frontMatter.thesis",
  );
  const subtitle = optionalStringValue(
    coverRecord?.subtitle,
    "appearance.cover.subtitle",
  );

  return {
    title: stringValue(root.title, "title"),
    authors,
    chapters,
    ...(publicationDate === undefined ? {} : { publicationDate }),
    ...(description === undefined ? {} : { description }),
    ...(frontMatterRecord === undefined
      ? {}
      : {
          frontMatter: {
            ...(credits === undefined ? {} : { credits }),
            ...(kicker === undefined ? {} : { kicker }),
            ...(thesis === undefined ? {} : { thesis }),
          },
        }),
    ...(coverRecord === undefined
      ? {}
      : {
          cover: {
            ...(subtitle === undefined ? {} : { subtitle }),
          },
        }),
  };
}

function semanticBlocks(
  article: HTMLElement,
  chapter: V3Chapter,
): SemanticBlock[] {
  const blocks: SemanticBlock[] = [];
  for (const child of article.children) {
    if (
      !(child instanceof HTMLElement) ||
      !child.matches("h1, h2, h3, p, blockquote, ul, ol")
    ) {
      continue;
    }
    const anchor = child.id || chapter.firstAnchor;
    if (child.matches("p") && (child.textContent?.length ?? 0) > 680) {
      sentenceSegments(child.textContent ?? "").forEach((text, index) => {
        const paragraph = createElement("p", undefined, text);
        paragraph.dataset.sourceAnchor = anchor;
        if (index === 0 && child.id) {
          paragraph.id = child.id;
        }
        blocks.push({
          node: paragraph,
          anchor,
          chapterTitle: chapter.title,
        });
      });
      continue;
    }

    const clone = child.cloneNode(true) as HTMLElement;
    clone.dataset.sourceAnchor = anchor;
    blocks.push({
      node: clone,
      anchor,
      chapterTitle: chapter.title,
    });
  }
  return blocks;
}

async function fetchManifest(): Promise<{
  manifest: V3Manifest;
  url: URL;
}> {
  const url = new URL(manifestRelativeUrl, globalThis.location.href);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `V3 could not load the publication manifest (${response.status})`,
    );
  }
  return {
    manifest: parseV3Manifest(await response.json()),
    url,
  };
}

async function fetchChapterBlocks(
  chapter: V3Chapter,
  manifestUrl: URL,
): Promise<SemanticBlock[]> {
  const response = await fetch(new URL(chapter.href, manifestUrl));
  if (!response.ok) {
    throw new Error(
      `V3 could not load ${chapter.title} (${response.status})`,
    );
  }
  const parsed = new DOMParser().parseFromString(
    await response.text(),
    "text/html",
  );
  const article = parsed.querySelector<HTMLElement>("[data-reader-content]");
  if (!article) {
    throw new Error(`V3 chapter ${chapter.title} has no semantic article`);
  }
  return semanticBlocks(article, chapter);
}

function frontMatterPages(manifest: V3Manifest): PrototypePage[] {
  const insideTitle = createElement("p", "v3-title-kicker", "Publication record");
  const insideHeading = createElement("h2", undefined, manifest.title);
  const credits = createElement(
    "p",
    undefined,
    manifest.frontMatter?.credits ??
      manifest.authors.map(({ name }) => name).join(", "),
  );
  const date = createElement(
    "p",
    undefined,
    `Published ${manifest.publicationDate ?? "as an immutable semantic edition"}`,
  );

  const titleKicker = createElement(
    "p",
    "v3-title-kicker",
    manifest.frontMatter?.kicker ?? "Ethical Tech CoLab",
  );
  const title = createElement("h1", "v3-title", manifest.title);
  const subtitle = createElement(
    "p",
    "v3-subtitle",
    manifest.cover?.subtitle ?? manifest.description ?? "",
  );

  const thesisHeading = createElement("h2", undefined, "The question");
  const thesis = createElement(
    "p",
    "v3-thesis",
    manifest.frontMatter?.thesis ?? manifest.description ?? "",
  );

  return [
    {
      label: "Inside front board",
      runningTitle: manifest.title,
      anchor: "v3-inside-cover",
      kind: "front-matter",
      nodes: [insideTitle, insideHeading, credits, date],
    },
    {
      label: "Title page",
      runningTitle: "Ethical Tech CoLab",
      anchor: "v3-title-page",
      kind: "front-matter",
      nodes: [titleKicker, title, subtitle],
    },
    {
      label: "Thesis",
      runningTitle: manifest.title,
      anchor: "v3-thesis",
      kind: "front-matter",
      nodes: [thesisHeading, thesis],
    },
  ];
}

function pageFromBlocks(
  blocks: readonly SemanticBlock[],
  pageNumber: number,
): PrototypePage {
  const first = blocks[0];
  if (!first) {
    throw new Error("Cannot create a semantic page without content");
  }
  return {
    label: `${first.chapterTitle}, semantic page ${pageNumber}`,
    runningTitle: first.chapterTitle,
    anchor: first.anchor,
    kind: "content",
    nodes: blocks.map(({ node }) => node),
  };
}

function createSheet(
  page: PrototypePage,
  side: "left" | "right",
  folio: number,
  decorative: boolean,
): HTMLElement {
  const sheet = createElement(
    "article",
    [
      "v3-sheet",
      `v3-sheet-${side}`,
      page.kind === "front-matter" ? "v3-sheet-front-matter" : "",
    ]
      .filter(Boolean)
      .join(" "),
  );
  sheet.setAttribute("aria-label", page.label);
  sheet.dataset.v3Anchor = page.anchor;
  if (decorative) {
    sheet.setAttribute("aria-hidden", "true");
    sheet.inert = true;
  }
  const running = createElement(
    "div",
    "v3-sheet-running",
    page.runningTitle,
  );
  const content = createElement("div", "v3-sheet-content");
  content.append(...cloneNodes(page.nodes, !decorative));
  const pageFolio = createElement("div", "v3-sheet-folio", String(folio));
  sheet.append(running, content, pageFolio);
  return sheet;
}

function interpolate(
  start: PageTurnPoint,
  end: PageTurnPoint,
  progress: number,
): PageTurnPoint {
  return {
    x: start.x + (end.x - start.x) * progress,
    y: start.y + (end.y - start.y) * progress,
  };
}

const reader = requiredElement<HTMLElement>("[data-v3-reader]");
const spread = requiredElement<HTMLElement>("[data-v3-spread]");
const stationary = requiredElement<HTMLElement>("[data-v3-stationary]");
const turnLayer = requiredElement<HTMLElement>("[data-v3-turn-layer]");
const measure = requiredElement<HTMLElement>("[data-v3-measure]");
const measureContent = requiredElement<HTMLElement>(
  "[data-v3-measure-content]",
);
const status = requiredElement<HTMLElement>("[data-v3-status]");
const counter = requiredElement<HTMLOutputElement>("[data-v3-counter]");
const previous = requiredElement<HTMLButtonElement>("[data-v3-previous]");
const next = requiredElement<HTMLButtonElement>("[data-v3-next]");
const corners = Array.from(
  document.querySelectorAll<HTMLButtonElement>("[data-v3-direction]"),
);
const reducedMotion = globalThis.matchMedia(
  "(prefers-reduced-motion: reduce)",
);

let manifest: V3Manifest | undefined;
let contentBlocks: SemanticBlock[] = [];
let pages: PrototypePage[] = [];
let spreadStart = 0;
let activeTurn: ActiveTurn | undefined;
let resizeTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
let loadedChapterCount = 0;

if (new URLSearchParams(globalThis.location.search).get("embed") === "1") {
  document.body.classList.add("v3-page-embedded");
}

function pageSize(): { width: number; height: number } {
  const bounds = spread.getBoundingClientRect();
  if (bounds.width <= 0 || bounds.height <= 0) {
    throw new Error("V3 book has no measurable page area");
  }
  return { width: bounds.width / 2, height: bounds.height };
}

function pageAt(index: number): PrototypePage {
  const page = pages[index];
  if (!page) {
    throw new Error(`V3 semantic page ${index} is unavailable`);
  }
  return page;
}

function canTurn(direction: PageTurnDirection): boolean {
  return direction === "forward"
    ? spreadStart + 2 < pages.length
    : spreadStart >= 2;
}

function targetSpread(direction: PageTurnDirection): number {
  return direction === "forward" ? spreadStart + 2 : spreadStart - 2;
}

function renderControls(): void {
  previous.disabled = !canTurn("backward") || activeTurn !== undefined;
  next.disabled = !canTurn("forward") || activeTurn !== undefined;
  for (const corner of corners) {
    const direction = corner.dataset.v3Direction;
    corner.disabled =
      activeTurn !== undefined ||
      (direction !== "forward" && direction !== "backward") ||
      !canTurn(direction);
  }
}

function renderStationary(): void {
  stationary.replaceChildren(
    createSheet(pageAt(spreadStart), "left", spreadStart + 1, false),
    createSheet(pageAt(spreadStart + 1), "right", spreadStart + 2, false),
  );
  const totalSpreads = Math.ceil(pages.length / 2);
  counter.value = `Spread ${spreadStart / 2 + 1} of ${totalSpreads}`;
  reader.dataset.v3Turning = "false";
  renderControls();
}

function turnPages(direction: PageTurnDirection): {
  moving: PrototypePage;
  revealed: PrototypePage;
  revealedSide: "left" | "right";
} {
  const target = targetSpread(direction);
  return direction === "forward"
    ? {
        moving: pageAt(target),
        revealed: pageAt(target + 1),
        revealedSide: "right",
      }
    : {
        moving: pageAt(target + 1),
        revealed: pageAt(target),
        revealedSide: "left",
      };
}

function beginTurn(
  direction: PageTurnDirection,
  corner: PageTurnCorner,
  pointer: PageTurnPoint,
): ActiveTurn | undefined {
  if (activeTurn || !canTurn(direction)) {
    return undefined;
  }
  const target = targetSpread(direction);
  const selected = turnPages(direction);
  const moving = createElement("div", "v3-turn-surface");
  moving.setAttribute("aria-hidden", "true");
  moving.inert = true;
  moving.append(
    createSheet(
      selected.moving,
      direction === "forward" ? "left" : "right",
      direction === "forward" ? target + 1 : target + 2,
      true,
    ),
  );
  const revealed = createElement("div", "v3-revealed-page");
  revealed.setAttribute("aria-hidden", "true");
  revealed.inert = true;
  revealed.append(
    createSheet(
      selected.revealed,
      selected.revealedSide,
      direction === "forward" ? target + 2 : target + 1,
      true,
    ),
  );
  const shadow = createElement("div", "v3-fold-shadow");
  shadow.setAttribute("aria-hidden", "true");
  turnLayer.replaceChildren(revealed, moving, shadow);

  activeTurn = {
    direction,
    corner,
    targetSpread: target,
    pointer,
    progress: 0,
    moving,
    revealed,
    shadow,
  };
  reader.dataset.v3Turning = "true";
  counter.value = "Turning semantic leaf";
  renderControls();
  applyTurn(pointer);
  return activeTurn;
}

function applyFrame(frame: PageTurnFrame): void {
  const turn = activeTurn;
  if (!turn) {
    return;
  }
  const projection = projectPageTurn(frame);
  turn.pointer = frame.pointer;
  turn.progress = frame.progress;

  turn.moving.style.width = `${frame.page.width}px`;
  turn.moving.style.height = `${frame.page.height}px`;
  turn.moving.style.transform = [
    `translate3d(${projection.moving.translate.x}px,`,
    `${projection.moving.translate.y}px, 0)`,
    `rotate(${projection.moving.angleRadians}rad)`,
  ].join(" ");
  turn.moving.style.clipPath = pageTurnPolygon(projection.moving.clip);
  turn.moving.style.setProperty(
    "--v3-fold-sheen-direction",
    frame.direction === "forward" ? "90deg" : "270deg",
  );

  turn.revealed.style.width = `${frame.page.width}px`;
  turn.revealed.style.height = `${frame.page.height}px`;
  turn.revealed.style.transform = `translate3d(${projection.revealed.translate.x}px, ${projection.revealed.translate.y}px, 0)`;
  turn.revealed.style.clipPath = pageTurnPolygon(projection.revealed.clip);

  const shadow = projection.foldShadow;
  const shadowTranslate =
    frame.direction === "backward" ? shadow.width : 0;
  turn.shadow.style.width = `${Math.max(1, shadow.width)}px`;
  turn.shadow.style.height = `${frame.page.height * 2}px`;
  turn.shadow.style.opacity = String(
    Math.min(0.52, Math.max(0, shadow.opacity * 0.52)),
  );
  turn.shadow.style.background =
    shadow.gradient === "to-right"
      ? "linear-gradient(to right, rgb(38 27 16 / 58%), transparent)"
      : "linear-gradient(to left, rgb(38 27 16 / 58%), transparent)";
  turn.shadow.style.transformOrigin = `${shadowTranslate}px ${frame.page.height}px`;
  turn.shadow.style.transform = [
    `translate3d(${shadow.origin.x - shadowTranslate}px,`,
    `${shadow.origin.y - frame.page.height}px, 0)`,
    `rotate(${shadow.angleRadians}rad)`,
  ].join(" ");
}

function applyTurn(pointer: PageTurnPoint): void {
  const turn = activeTurn;
  if (!turn) {
    return;
  }
  const result = solvePageTurn({
    page: pageSize(),
    direction: turn.direction,
    corner: turn.corner,
    pointer,
  });
  if (result.status === "ok") {
    applyFrame(result.frame);
  }
}

function finishTurn(commit: boolean): void {
  const turn = activeTurn;
  if (!turn) {
    return;
  }
  if (turn.animationFrame !== undefined) {
    cancelAnimationFrame(turn.animationFrame);
  }
  if (turn.capture && turn.pointerId !== undefined) {
    if (turn.capture.hasPointerCapture(turn.pointerId)) {
      turn.capture.releasePointerCapture(turn.pointerId);
    }
  }
  if (commit) {
    spreadStart = turn.targetSpread;
  }
  activeTurn = undefined;
  turnLayer.replaceChildren();
  renderStationary();
}

function settleTurn(commit: boolean): void {
  const turn = activeTurn;
  if (!turn) {
    return;
  }
  if (reducedMotion.matches) {
    finishTurn(commit);
    return;
  }

  const size = pageSize();
  const start = turn.pointer;
  const destination = commit
    ? {
        x: -size.width,
        y: turn.corner === "top" ? 0 : size.height,
      }
    : {
        x: size.width - 2,
        y: turn.corner === "top" ? 2 : size.height - 2,
      };
  const duration = commit ? 360 : 260;
  const startedAt = performance.now();
  const animate = (now: number) => {
    const current = activeTurn;
    if (current !== turn) {
      return;
    }
    const elapsed = Math.min(1, (now - startedAt) / duration);
    const eased = 1 - Math.pow(1 - elapsed, 3);
    applyTurn(interpolate(start, destination, eased));
    if (elapsed < 1) {
      turn.animationFrame = requestAnimationFrame(animate);
    } else {
      finishTurn(commit);
    }
  };
  turn.animationFrame = requestAnimationFrame(animate);
}

function pointerForEvent(
  event: PointerEvent,
  direction: PageTurnDirection,
): PageTurnPoint {
  const bounds = spread.getBoundingClientRect();
  const binding = bounds.left + bounds.width / 2;
  return {
    x:
      direction === "forward"
        ? event.clientX - binding
        : binding - event.clientX,
    y: event.clientY - bounds.top,
  };
}

function onCornerPointerDown(event: PointerEvent): void {
  if (
    !event.isPrimary ||
    event.button !== 0 ||
    !(event.currentTarget instanceof HTMLButtonElement)
  ) {
    return;
  }
  const direction = event.currentTarget.dataset.v3Direction;
  const corner = event.currentTarget.dataset.v3Corner;
  if (
    (direction !== "forward" && direction !== "backward") ||
    (corner !== "top" && corner !== "bottom")
  ) {
    throw new Error("V3 corner control has invalid turn metadata");
  }
  if (reducedMotion.matches) {
    if (canTurn(direction)) {
      spreadStart = targetSpread(direction);
      renderStationary();
    }
    return;
  }
  const turn = beginTurn(
    direction,
    corner,
    pointerForEvent(event, direction),
  );
  if (!turn) {
    return;
  }
  event.preventDefault();
  turn.pointerId = event.pointerId;
  turn.capture = event.currentTarget;
  event.currentTarget.setPointerCapture(event.pointerId);
}

function onPointerMove(event: PointerEvent): void {
  const turn = activeTurn;
  if (!turn || turn.pointerId !== event.pointerId) {
    return;
  }
  event.preventDefault();
  applyTurn(pointerForEvent(event, turn.direction));
}

function onPointerEnd(event: PointerEvent): void {
  const turn = activeTurn;
  if (!turn || turn.pointerId !== event.pointerId) {
    return;
  }
  event.preventDefault();
  settleTurn(turn.progress >= 0.34);
}

function onPointerCancel(event: PointerEvent): void {
  if (activeTurn?.pointerId === event.pointerId) {
    settleTurn(false);
  }
}

function automaticTurn(direction: PageTurnDirection): void {
  if (!canTurn(direction) || activeTurn) {
    return;
  }
  if (reducedMotion.matches) {
    spreadStart = targetSpread(direction);
    renderStationary();
    return;
  }
  const size = pageSize();
  const corner: PageTurnCorner = "top";
  const turn = beginTurn(direction, corner, {
    x: size.width - Math.max(24, size.width * 0.08),
    y: Math.max(18, size.height * 0.08),
  });
  if (turn) {
    settleTurn(true);
  }
}

function pageFits(blocks: readonly SemanticBlock[]): boolean {
  measureContent.replaceChildren(
    ...cloneNodes(
      blocks.map(({ node }) => node),
      false,
    ),
  );
  return measureContent.scrollHeight <= measureContent.clientHeight + 1;
}

function paragraphFragment(
  block: SemanticBlock,
  text: string,
  first: boolean,
): SemanticBlock {
  const paragraph = createElement("p", undefined, text);
  paragraph.dataset.sourceAnchor = block.anchor;
  if (first && block.node.id) {
    paragraph.id = block.node.id;
  }
  return {
    node: paragraph,
    anchor: block.anchor,
    chapterTitle: block.chapterTitle,
  };
}

function fitBlock(block: SemanticBlock): SemanticBlock[] {
  if (pageFits([block])) {
    return [block];
  }
  if (!block.node.matches("p")) {
    throw new Error(
      `V3 semantic ${block.node.tagName.toLowerCase()} at ${block.anchor} does not fit a page`,
    );
  }

  const words = (block.node.textContent ?? "").trim().split(/\s+/);
  const fragments: SemanticBlock[] = [];
  let current: string[] = [];
  for (const word of words) {
    const candidateWords = [...current, word];
    const candidate = paragraphFragment(
      block,
      candidateWords.join(" "),
      fragments.length === 0,
    );
    if (pageFits([candidate])) {
      current = candidateWords;
      continue;
    }
    if (current.length === 0) {
      throw new Error(
        `V3 word in semantic block ${block.anchor} does not fit a page`,
      );
    }
    fragments.push(
      paragraphFragment(
        block,
        current.join(" "),
        fragments.length === 0,
      ),
    );
    current = [word];
  }
  if (current.length > 0) {
    fragments.push(
      paragraphFragment(
        block,
        current.join(" "),
        fragments.length === 0,
      ),
    );
  }
  return fragments;
}

function paginateContent(blocks: readonly SemanticBlock[]): PrototypePage[] {
  if (measureContent.clientHeight <= 0) {
    throw new Error("V3 pagination measure has no usable height");
  }
  const result: PrototypePage[] = [];
  let current: SemanticBlock[] = [];
  const fittedBlocks = blocks.flatMap((block) => fitBlock(block));

  for (const block of fittedBlocks) {
    const candidate = [...current, block];
    if (pageFits(candidate)) {
      current = candidate;
      continue;
    }

    if (
      current.length > 1 &&
      current.at(-1)?.node.matches("h1, h2, h3")
    ) {
      const heading = current.pop();
      if (current.length > 0) {
        result.push(pageFromBlocks(current, result.length + 1));
      }
      const headingWithBlock = heading ? [heading, block] : [block];
      if (pageFits(headingWithBlock)) {
        current = headingWithBlock;
      } else {
        if (heading) {
          result.push(pageFromBlocks([heading], result.length + 1));
        }
        current = [block];
      }
    } else {
      if (current.length > 0) {
        result.push(pageFromBlocks(current, result.length + 1));
      }
      current = [block];
    }

    if (!pageFits(current)) {
      throw new Error(`V3 pagination failed at ${block.anchor}`);
    }
  }

  if (current.length > 0) {
    result.push(pageFromBlocks(current, result.length + 1));
  }
  return result;
}

function blankPage(manifestTitle: string): PrototypePage {
  return {
    label: "Blank final leaf",
    runningTitle: manifestTitle,
    anchor: "v3-blank-final",
    kind: "front-matter",
    nodes: [createElement("p", "v3-title-kicker", "End of preview")],
  };
}

function rebuildPages(preserveAnchor?: string): void {
  if (!manifest) {
    return;
  }
  measure.hidden = false;
  const built = [
    ...frontMatterPages(manifest),
    ...paginateContent(contentBlocks),
  ];
  if (built.length % 2 !== 0) {
    built.push(blankPage(manifest.title));
  }
  pages = built;
  measure.hidden = true;
  const preservedIndex = preserveAnchor
    ? pages.findIndex(({ anchor }) => anchor === preserveAnchor)
    : -1;
  spreadStart =
    preservedIndex >= 0
      ? Math.max(0, Math.floor(preservedIndex / 2) * 2)
      : Math.min(spreadStart, Math.max(0, pages.length - 2));
  renderStationary();
}

function prototypeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown V3 reader error";
}

function reportReady(): void {
  reader.dataset.v3Ready = "true";
  reader.setAttribute("aria-busy", "false");
  status.textContent = `Geometry ready · ${loadedChapterCount} real chapters · ${pages.length} semantic pages`;
}

function reportFailure(context: string, error: unknown): void {
  reader.dataset.v3Ready = "false";
  reader.setAttribute("aria-busy", "false");
  status.textContent = `${context}: ${prototypeErrorMessage(error)}`;
  console.error(error);
}

async function initialize(): Promise<void> {
  const loaded = await fetchManifest();
  manifest = loaded.manifest;
  const chapters = loaded.manifest.chapters.slice(0, selectedChapterCount);
  const blocks = await Promise.all(
    chapters.map((chapter) => fetchChapterBlocks(chapter, loaded.url)),
  );
  contentBlocks = blocks.flat();
  loadedChapterCount = chapters.length;
  await document.fonts.ready;
  rebuildPages();
  reportReady();
}

for (const corner of corners) {
  corner.addEventListener("pointerdown", onCornerPointerDown);
}
spread.addEventListener("pointermove", onPointerMove);
spread.addEventListener("pointerup", onPointerEnd);
spread.addEventListener("pointercancel", onPointerCancel);
previous.addEventListener("click", () => automaticTurn("backward"));
next.addEventListener("click", () => automaticTurn("forward"));

const onKeyDown = (event: KeyboardEvent) => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
    return;
  }
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    automaticTurn("backward");
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    automaticTurn("forward");
  }
};
document.addEventListener("keydown", onKeyDown);

const observer = new ResizeObserver(() => {
  if (!manifest || pages.length === 0) {
    return;
  }
  if (resizeTimer !== undefined) {
    clearTimeout(resizeTimer);
  }
  resizeTimer = globalThis.setTimeout(() => {
    const anchor = pages[spreadStart]?.anchor;
    if (activeTurn) {
      finishTurn(false);
    }
    try {
      rebuildPages(anchor);
      reportReady();
    } catch (error: unknown) {
      reportFailure("V3 could not repaginate", error);
    }
  }, 120);
});
observer.observe(spread);

globalThis.addEventListener(
  "pagehide",
  () => {
    observer.disconnect();
    document.removeEventListener("keydown", onKeyDown);
    if (resizeTimer !== undefined) {
      clearTimeout(resizeTimer);
    }
    if (activeTurn?.animationFrame !== undefined) {
      cancelAnimationFrame(activeTurn.animationFrame);
    }
  },
  { once: true },
);

void initialize().catch((error: unknown) => {
  reportFailure("V3 could not initialize", error);
});
