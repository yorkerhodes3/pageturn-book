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
import { catalogBook } from "./library-catalog.js";

type SemanticBlock = Readonly<{
  node: HTMLElement;
  anchor: string;
  chapterTitle: string;
  chapterLabel: string;
  chapterStart: boolean;
}>;

type V3Chapter = Pick<
  SemanticChapter,
  "chapterId" | "title" | "href" | "firstAnchor"
>;

type V3Manifest = Readonly<{
  bookId: string;
  editionId: string;
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
    background?: string;
    foreground?: string;
    accent?: string;
    subtitle?: string;
  }>;
  chapters: readonly V3Chapter[];
}>;

type PrototypePage = Readonly<{
  label: string;
  runningTitle: string;
  anchor: string;
  kind: "front-matter" | "content";
  chapterOpening: boolean;
  chapterLabel?: string;
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

const query = new URLSearchParams(globalThis.location.search);
const requestedBookId = query.get("book") ?? "what-is-ethical-ai";
const requestedChapterId = query.get("chapter");
const selectedBook = catalogBook(requestedBookId);
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

function applyPublicationIdentity(publication: V3Manifest): void {
  publicationTitle.textContent = publication.title;
  coverKicker.textContent =
    publication.authors[0]?.name ?? "Semantic publication";
  coverTitle.textContent = publication.title;
  coverSubtitle.textContent =
    publication.cover?.subtitle ?? "Complete semantic edition";
  document.title = `${publication.title} - V3 semantic geometry`;
  const catalogCover = selectedBook?.appearance.cover;
  reader.style.setProperty(
    "--v3-cover-background",
    catalogCover?.background ??
      publication.cover?.background ??
      "#111b31",
  );
  reader.style.setProperty(
    "--v3-cover-foreground",
    catalogCover?.foreground ??
      publication.cover?.foreground ??
      "#f1ead8",
  );
  reader.style.setProperty(
    "--v3-cover-accent",
    catalogCover?.accent ?? publication.cover?.accent ?? "#b99a5e",
  );
  chapterSelect.replaceChildren(
    new Option("Front matter", ""),
    ...publication.chapters.map(
      (chapter) =>
        new Option(chapter.title, String(chapter.chapterId)),
    ),
  );
  chapterSelect.disabled = false;
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

function chapterOpeningLabel(text: string): HTMLElement {
  const label = createElement(
    "span",
    "v3-chapter-opening-label",
    text,
  );
  return label;
}

type TextRange = Readonly<{
  start: number;
  end: number;
}>;

function sentenceRanges(text: string): TextRange[] {
  const sentences = Array.from(
    new Intl.Segmenter(undefined, { granularity: "sentence" }).segment(
      text,
    ),
  );
  if (sentences.length === 0) {
    return text.length > 0 ? [{ start: 0, end: text.length }] : [];
  }

  const ranges: TextRange[] = [];
  let start = sentences[0]?.index ?? 0;
  let end = start;
  for (const sentence of sentences) {
    const sentenceEnd = sentence.index + sentence.segment.length;
    if (end > start && sentenceEnd - start > maximumSegmentCharacters) {
      ranges.push({ start, end });
      start = sentence.index;
    }
    end = sentenceEnd;
  }
  if (end > start) {
    ranges.push({ start, end });
  }
  return ranges;
}

function stripIds(root: HTMLElement): void {
  root.removeAttribute("id");
  for (const identified of root.querySelectorAll("[id]")) {
    identified.removeAttribute("id");
  }
}

function cloneTextRange(
  source: HTMLElement,
  start: number,
  end: number,
  preserveIds: boolean,
): HTMLElement {
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(source, NodeFilter.SHOW_TEXT);
  for (
    let current = walker.nextNode();
    current !== null;
    current = walker.nextNode()
  ) {
    textNodes.push(current as Text);
  }
  if (textNodes.length === 0) {
    const clone = source.cloneNode(true) as HTMLElement;
    if (!preserveIds) {
      stripIds(clone);
    }
    return clone;
  }

  const locate = (offset: number): Readonly<{ node: Text; offset: number }> => {
    let consumed = 0;
    for (const node of textNodes) {
      const next = consumed + node.data.length;
      if (offset <= next) {
        return {
          node,
          offset: Math.max(0, offset - consumed),
        };
      }
      consumed = next;
    }
    const finalNode = textNodes.at(-1);
    if (!finalNode) {
      throw new Error("V3 paragraph range has no final text node");
    }
    return { node: finalNode, offset: finalNode.data.length };
  };

  const boundedStart = Math.max(0, start);
  const boundedEnd = Math.max(boundedStart, end);
  const rangeStart = locate(boundedStart);
  const rangeEnd = locate(boundedEnd);
  const range = document.createRange();
  range.setStart(rangeStart.node, rangeStart.offset);
  range.setEnd(rangeEnd.node, rangeEnd.offset);
  const clone = source.cloneNode(false) as HTMLElement;
  clone.append(range.cloneContents());
  if (!preserveIds) {
    stripIds(clone);
  }
  return clone;
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
      chapterId: stringValue(
        parsed.chapterId,
        `renditions.semantic.chapters[${index}].chapterId`,
      ) as SemanticChapter["chapterId"],
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
  const coverBackground = optionalStringValue(
    coverRecord?.background,
    "appearance.cover.background",
  );
  const coverForeground = optionalStringValue(
    coverRecord?.foreground,
    "appearance.cover.foreground",
  );
  const coverAccent = optionalStringValue(
    coverRecord?.accent,
    "appearance.cover.accent",
  );

  return {
    bookId: stringValue(root.bookId, "bookId"),
    editionId: stringValue(root.editionId, "editionId"),
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
            ...(coverBackground === undefined
              ? {}
              : { background: coverBackground }),
            ...(coverForeground === undefined
              ? {}
              : { foreground: coverForeground }),
            ...(coverAccent === undefined
              ? {}
              : { accent: coverAccent }),
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
  const chapterId = String(chapter.chapterId);
  for (const child of article.children) {
    if (!(child instanceof HTMLElement)) {
      continue;
    }
    if (child.matches("nav.book-chapter-nav")) {
      continue;
    }
    if (
      !child.matches(
        "h1, h2, h3, h4, h5, h6, p, blockquote, ul, ol, table, pre, figure, hr",
      )
    ) {
      if ((child.textContent?.trim().length ?? 0) > 0) {
        throw new Error(
          `V3 chapter ${chapter.title} contains unsupported ${child.tagName.toLowerCase()} content`,
        );
      }
      continue;
    }
    const anchor = child.id || chapter.firstAnchor;
    const headingText = child.textContent?.trim() ?? "";
    const displayedNumber = /^(\d+(?:[-.]\d+)*)[.)]?\s+/.exec(
      headingText,
    )?.[1];
    const sourceNumber =
      displayedNumber ??
      (/^\d+(?:-\d+)*$/.test(chapterId) ? chapterId : undefined);
    const chapterNumber = sourceNumber
      ?.split("-")
      .map((part) => String(Number(part)))
      .join("-");
    const chapterLabel = chapterNumber
      ? `Chapter ${chapterNumber}`
      : "Chapter";
    if (child.matches("p") && (child.textContent?.length ?? 0) > 680) {
      sentenceRanges(child.textContent ?? "").forEach((range, index) => {
        const paragraph = cloneTextRange(
          child,
          range.start,
          range.end,
          index === 0,
        );
        paragraph.dataset.sourceAnchor = anchor;
        blocks.push({
          node: paragraph,
          anchor,
          chapterTitle: chapter.title,
          chapterLabel,
          chapterStart: false,
        });
      });
      continue;
    }

    const clone = child.cloneNode(true) as HTMLElement;
    if (child.matches("h1") && displayedNumber) {
      clone.textContent = headingText.replace(
        /^(\d+(?:[-.]\d+)*)[.)]?\s+/,
        "",
      );
    }
    clone.dataset.sourceAnchor = anchor;
    blocks.push({
      node: clone,
      anchor,
      chapterTitle: chapter.title,
      chapterLabel,
      chapterStart:
        child.matches("h1") &&
        (child.id === chapter.firstAnchor ||
          !blocks.some(({ chapterStart }) => chapterStart)),
    });
  }
  return blocks;
}

async function fetchManifest(): Promise<{
  manifest: V3Manifest;
  url: URL;
}> {
  if (!selectedBook) {
    throw new Error(`V3 does not know publication: ${requestedBookId}`);
  }
  const manifestRelativeUrl =
    `../book/${encodeURIComponent(selectedBook.id)}/` +
    `${encodeURIComponent(selectedBook.semanticEdition)}/manifest.json`;
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
    manifest.frontMatter?.kicker ?? "Semantic publication",
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
      chapterOpening: false,
      nodes: [insideTitle, insideHeading, credits, date],
    },
    {
      label: "Title page",
      runningTitle: manifest.authors[0]?.name ?? manifest.title,
      anchor: "v3-title-page",
      kind: "front-matter",
      chapterOpening: false,
      nodes: [titleKicker, title, subtitle],
    },
    {
      label: "Thesis",
      runningTitle: manifest.title,
      anchor: "v3-thesis",
      kind: "front-matter",
      chapterOpening: false,
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
    chapterOpening: first.chapterStart,
    ...(first.chapterStart
      ? { chapterLabel: first.chapterLabel }
      : {}),
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
      page.chapterOpening ? "v3-sheet-chapter-opening" : "",
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
  if (page.chapterOpening) {
    content.append(chapterOpeningLabel(page.chapterLabel ?? "Chapter"));
  }
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
const entryCover = requiredElement<HTMLElement>("[data-v3-entry-cover]");
const measure = requiredElement<HTMLElement>("[data-v3-measure]");
const measureContent = requiredElement<HTMLElement>(
  "[data-v3-measure-content]",
);
const status = requiredElement<HTMLElement>("[data-v3-status]");
const chapterSelect = requiredElement<HTMLSelectElement>(
  "[data-v3-chapter-select]",
);
const publicationTitle = requiredElement<HTMLElement>(
  "[data-v3-publication-title]",
);
const coverKicker = requiredElement<HTMLElement>("[data-v3-cover-kicker]");
const coverTitle = requiredElement<HTMLElement>("[data-v3-cover-title]");
const coverSubtitle = requiredElement<HTMLElement>(
  "[data-v3-cover-subtitle]",
);
const counter = requiredElement<HTMLOutputElement>("[data-v3-counter]");
const previous = requiredElement<HTMLButtonElement>("[data-v3-previous]");
const next = requiredElement<HTMLButtonElement>("[data-v3-next]");
const corners = Array.from(
  document.querySelectorAll<HTMLButtonElement>("[data-v3-direction]"),
);
const singlePageMedia = globalThis.matchMedia("(max-width: 48rem)");
const reducedMotion = globalThis.matchMedia(
  "(prefers-reduced-motion: reduce)",
);

let manifest: V3Manifest | undefined;
let contentBlocks: SemanticBlock[] = [];
let pages: PrototypePage[] = [];
let spreadStart = 0;
let activeTurn: ActiveTurn | undefined;
let resizeTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
let openingTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
let loadedChapterCount = 0;
let opening = true;

if (query.get("embed") === "1") {
  document.body.classList.add("v3-page-embedded");
}

function pageSize(): { width: number; height: number } {
  const bounds = spread.getBoundingClientRect();
  if (bounds.width <= 0 || bounds.height <= 0) {
    throw new Error("V3 book has no measurable page area");
  }
  return {
    width: singlePageMedia.matches ? bounds.width : bounds.width / 2,
    height: bounds.height,
  };
}

function pageStep(): 1 | 2 {
  return singlePageMedia.matches ? 1 : 2;
}

function pageAt(index: number): PrototypePage {
  const page = pages[index];
  if (!page) {
    throw new Error(`V3 semantic page ${index} is unavailable`);
  }
  return page;
}

function canTurn(direction: PageTurnDirection): boolean {
  const step = pageStep();
  return direction === "forward"
    ? spreadStart + step < pages.length
    : spreadStart >= step;
}

function targetSpread(direction: PageTurnDirection): number {
  const step = pageStep();
  return direction === "forward"
    ? spreadStart + step
    : spreadStart - step;
}

function renderControls(): void {
  previous.disabled =
    opening || !canTurn("backward") || activeTurn !== undefined;
  next.disabled =
    opening || !canTurn("forward") || activeTurn !== undefined;
  for (const corner of corners) {
    const direction = corner.dataset.v3Direction;
    corner.disabled =
      opening ||
      activeTurn !== undefined ||
      (direction !== "forward" && direction !== "backward") ||
      !canTurn(direction);
  }
}

function renderStationary(): void {
  const singlePage = singlePageMedia.matches;
  spread.classList.toggle("v3-spread-single", singlePage);
  stationary.replaceChildren(
    ...(singlePage
      ? [createSheet(pageAt(spreadStart), "right", spreadStart + 1, false)]
      : [
          createSheet(pageAt(spreadStart), "left", spreadStart + 1, false),
          createSheet(
            pageAt(spreadStart + 1),
            "right",
            spreadStart + 2,
            false,
          ),
        ]),
  );
  counter.value = singlePage
    ? `Page ${spreadStart + 1} of ${pages.length}`
    : `Spread ${spreadStart / 2 + 1} of ${Math.ceil(pages.length / 2)}`;
  reader.dataset.v3Turning = "false";
  if (manifest) {
    const visibleEnd = spreadStart + pageStep() - 1;
    const starts = manifest.chapters
      .map((chapter) => ({
        id: String(chapter.chapterId),
        pageIndex: pages.findIndex((page) =>
          pageContainsAnchor(page, chapter.firstAnchor),
        ),
      }))
      .filter(({ pageIndex }) => pageIndex >= 0);
    const current = starts
      .filter(({ pageIndex }) => pageIndex <= visibleEnd)
      .at(-1);
    chapterSelect.value = current?.id ?? "";
  }
  renderControls();
}

function pageContainsAnchor(page: PrototypePage, anchor: string): boolean {
  return page.nodes.some(
    (node) =>
      node.id === anchor ||
      node.querySelector(`#${CSS.escape(anchor)}`) !== null,
  );
}

function onStationaryClick(event: MouseEvent): void {
  if (
    event.button !== 0 ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    !(event.target instanceof Element)
  ) {
    return;
  }
  const link = event.target.closest<HTMLAnchorElement>('a[href^="#"]');
  const href = link?.getAttribute("href");
  if (!link || !href || href.length <= 1) {
    return;
  }
  let anchor: string;
  try {
    anchor = decodeURIComponent(href.slice(1));
  } catch {
    console.warn(`V3 ignored malformed internal anchor: ${href}`);
    return;
  }
  const pageIndex = pages.findIndex((page) =>
    pageContainsAnchor(page, anchor),
  );
  if (pageIndex < 0) {
    console.warn(`V3 could not locate internal anchor: ${anchor}`);
    return;
  }
  event.preventDefault();
  const step = pageStep();
  spreadStart = Math.floor(pageIndex / step) * step;
  renderStationary();
  const target = stationary.querySelector<HTMLElement>(
    `#${CSS.escape(anchor)}`,
  );
  if (target) {
    target.tabIndex = -1;
    target.focus({ preventScroll: true });
  }
}

function goToChapter(chapterId: string): void {
  if (!manifest) {
    return;
  }
  if (chapterId === "") {
    spreadStart = 0;
    renderStationary();
    return;
  }
  const chapter = manifest.chapters.find(
    ({ chapterId: candidate }) => String(candidate) === chapterId,
  );
  if (!chapter) {
    throw new Error(`V3 chapter is unavailable: ${chapterId}`);
  }
  const pageIndex = pages.findIndex((page) =>
    pageContainsAnchor(page, chapter.firstAnchor),
  );
  if (pageIndex < 0) {
    throw new Error(`V3 could not locate chapter: ${chapter.title}`);
  }
  const step = pageStep();
  spreadStart = Math.floor(pageIndex / step) * step;
  renderStationary();
  const heading = stationary.querySelector<HTMLElement>(
    `#${CSS.escape(chapter.firstAnchor)}`,
  );
  if (heading) {
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }
}

function turnPages(direction: PageTurnDirection): {
  moving: PrototypePage;
  movingIndex: number;
  revealed: PrototypePage;
  revealedIndex: number;
  revealedSide: "left" | "right";
} {
  const target = targetSpread(direction);
  if (singlePageMedia.matches) {
    const movingIndex = spreadStart;
    return {
      moving: pageAt(movingIndex),
      movingIndex,
      revealed: pageAt(target),
      revealedIndex: target,
      revealedSide: "right",
    };
  }
  return direction === "forward"
    ? {
        moving: pageAt(target),
        movingIndex: target,
        revealed: pageAt(target + 1),
        revealedIndex: target + 1,
        revealedSide: "right",
      }
    : {
        moving: pageAt(target + 1),
        movingIndex: target + 1,
        revealed: pageAt(target),
        revealedIndex: target,
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
      singlePageMedia.matches
        ? "right"
        : direction === "forward"
          ? "left"
          : "right",
      selected.movingIndex + 1,
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
      selected.revealedIndex + 1,
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
  const singlePageOffset =
    singlePageMedia.matches && frame.direction === "forward"
      ? -frame.page.width
      : 0;
  turn.pointer = frame.pointer;
  turn.progress = frame.progress;
  turn.moving.dataset.v3Progress = frame.progress.toFixed(4);

  turn.moving.style.width = `${frame.page.width}px`;
  turn.moving.style.height = `${frame.page.height}px`;
  turn.moving.style.transform = [
    `translate3d(${projection.moving.translate.x + singlePageOffset}px,`,
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
  turn.revealed.style.transform = `translate3d(${projection.revealed.translate.x + singlePageOffset}px, ${projection.revealed.translate.y}px, 0)`;
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
    `translate3d(${shadow.origin.x + singlePageOffset - shadowTranslate}px,`,
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
  if (singlePageMedia.matches) {
    return {
      x:
        direction === "forward"
          ? event.clientX - bounds.left
          : bounds.right - event.clientX,
      y: event.clientY - bounds.top,
    };
  }
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
  if (resizeTimer !== undefined) {
    clearTimeout(resizeTimer);
    resizeTimer = undefined;
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
  measure.classList.toggle(
    "v3-sheet-chapter-opening",
    blocks[0]?.chapterStart ?? false,
  );
  measureContent.replaceChildren(
    ...(blocks[0]?.chapterStart
      ? [chapterOpeningLabel(blocks[0].chapterLabel)]
      : []),
    ...cloneNodes(
      blocks.map(({ node }) => node),
      false,
    ),
  );
  return measureContent.scrollHeight <= measureContent.clientHeight + 1;
}

function paragraphFragment(
  block: SemanticBlock,
  start: number,
  end: number,
  first: boolean,
): SemanticBlock {
  const paragraph = cloneTextRange(block.node, start, end, first);
  paragraph.dataset.sourceAnchor = block.anchor;
  return {
    node: paragraph,
    anchor: block.anchor,
    chapterTitle: block.chapterTitle,
    chapterLabel: block.chapterLabel,
    chapterStart: false,
  };
}

function atomicFit(block: SemanticBlock): SemanticBlock[] {
  for (let scale = 0.9; scale >= 0.5; scale -= 0.1) {
    const node = block.node.cloneNode(true) as HTMLElement;
    node.style.fontSize = `${scale.toFixed(1)}em`;
    node.dataset.v3FitScale = scale.toFixed(1);
    const candidate = { ...block, node };
    if (pageFits([candidate])) {
      return [candidate];
    }
  }
  throw new Error(
    `V3 semantic ${block.node.tagName.toLowerCase()} at ${block.anchor} does not fit a page`,
  );
}

function listFragment(
  block: SemanticBlock,
  items: readonly Element[],
  itemOffset: number,
): SemanticBlock {
  const list = block.node.cloneNode(false) as HTMLOListElement | HTMLUListElement;
  if (itemOffset > 0) {
    list.removeAttribute("id");
  }
  if (list instanceof HTMLOListElement) {
    const originalStart = Number(block.node.getAttribute("start") ?? "1");
    list.start =
      (Number.isFinite(originalStart) ? originalStart : 1) + itemOffset;
  }
  list.append(...items.map((item) => item.cloneNode(true)));
  list.dataset.sourceAnchor = block.anchor;
  return { ...block, node: list };
}

function fitListBlock(block: SemanticBlock): SemanticBlock[] {
  const items = Array.from(block.node.children).filter((child) =>
    child.matches("li"),
  );
  if (items.length === 0) {
    return atomicFit(block);
  }

  const fragments: SemanticBlock[] = [];
  let current: Element[] = [];
  let offset = 0;
  for (const item of items) {
    const candidateItems = [...current, item];
    const candidate = listFragment(block, candidateItems, offset);
    if (pageFits([candidate])) {
      current = candidateItems;
      continue;
    }
    if (current.length > 0) {
      fragments.push(listFragment(block, current, offset));
      offset += current.length;
    }
    const single = listFragment(block, [item], offset);
    if (pageFits([single])) {
      current = [item];
    } else {
      fragments.push(...atomicFit(single));
      offset += 1;
      current = [];
    }
  }
  if (current.length > 0) {
    fragments.push(listFragment(block, current, offset));
  }
  return fragments;
}

function fitBlock(block: SemanticBlock): SemanticBlock[] {
  if (pageFits([block])) {
    return [block];
  }
  if (block.node.matches("ul, ol")) {
    return fitListBlock(block);
  }
  if (!block.node.matches("p")) {
    return atomicFit(block);
  }

  const text = block.node.textContent ?? "";
  const boundaries = Array.from(
    text.matchAll(/\S+(?:\s+|$)/g),
    (match) => (match.index ?? 0) + match[0].length,
  );
  if (boundaries.at(-1) !== text.length) {
    boundaries.push(text.length);
  }
  const fragments: SemanticBlock[] = [];
  let start = 0;
  while (start < text.length) {
    let bestEnd = start;
    for (const end of boundaries) {
      if (end <= start) {
        continue;
      }
      const candidate = paragraphFragment(
        block,
        start,
        end,
        fragments.length === 0,
      );
      if (!pageFits([candidate])) {
        break;
      }
      bestEnd = end;
    }
    if (bestEnd === start) {
      throw new Error(
        `V3 word in semantic block ${block.anchor} does not fit a page`,
      );
    }
    fragments.push(
      paragraphFragment(
        block,
        start,
        bestEnd,
        fragments.length === 0,
      ),
    );
    start = bestEnd;
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
    if (block.chapterStart && current.length > 0) {
      result.push(pageFromBlocks(current, result.length + 1));
      current = [];
    }
    const candidate = [...current, block];
    if (pageFits(candidate)) {
      current = candidate;
      continue;
    }

    if (
      current.length > 1 &&
      current.at(-1)?.node.matches("h1, h2, h3, h4, h5, h6")
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
    chapterOpening: false,
    nodes: [createElement("p", "v3-title-kicker", "End of preview")],
  };
}

function rebuildPages(
  preserveAnchor?: string,
  preserveProgress = 0,
): void {
  if (!manifest) {
    return;
  }
  spread.classList.toggle("v3-spread-single", singlePageMedia.matches);
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
  const projectedIndex = Math.round(
    Math.min(1, Math.max(0, preserveProgress)) *
      Math.max(0, pages.length - 1),
  );
  const matchingIndices = preserveAnchor
    ? pages.flatMap(({ anchor }, index) =>
        anchor === preserveAnchor ? [index] : [],
      )
    : [];
  const preservedIndex =
    matchingIndices.length === 0
      ? -1
      : matchingIndices.reduce((closest, candidate) =>
          Math.abs(candidate - projectedIndex) <
          Math.abs(closest - projectedIndex)
            ? candidate
            : closest,
        );
  const step = pageStep();
  const maximumStart = Math.max(0, pages.length - step);
  const targetIndex =
    preservedIndex >= 0 ? preservedIndex : projectedIndex;
  spreadStart =
    Math.floor(Math.min(targetIndex, maximumStart) / step) * step;
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

function finishOpening(): void {
  if (!opening) {
    return;
  }
  opening = false;
  if (openingTimer !== undefined) {
    clearTimeout(openingTimer);
    openingTimer = undefined;
  }
  reader.dataset.v3Opening = "false";
  reportReady();
  renderControls();
}

function startOpening(): void {
  reader.dataset.v3Opening = "true";
  if (reducedMotion.matches) {
    finishOpening();
    return;
  }
  status.textContent = `Opening complete semantic edition · ${loadedChapterCount} chapters`;
  entryCover.addEventListener("animationend", finishOpening, { once: true });
  openingTimer = globalThis.setTimeout(finishOpening, 1_300);
}

async function initialize(): Promise<void> {
  const loaded = await fetchManifest();
  manifest = loaded.manifest;
  if (manifest.bookId !== requestedBookId) {
    throw new Error(
      `V3 requested ${requestedBookId} but loaded ${manifest.bookId}`,
    );
  }
  applyPublicationIdentity(manifest);
  const chapters = loaded.manifest.chapters;
  const blocks = await Promise.all(
    chapters.map((chapter) => fetchChapterBlocks(chapter, loaded.url)),
  );
  contentBlocks = blocks.flat();
  reader.dataset.v3Tables = String(
    contentBlocks.filter(({ node }) => node.matches("table")).length,
  );
  reader.dataset.v3CodeBlocks = String(
    contentBlocks.filter(({ node }) => node.matches("pre")).length,
  );
  reader.dataset.v3NoteLinks = String(
    contentBlocks.reduce(
      (total, { node }) =>
        total + node.querySelectorAll('a[href^="#note-"]').length,
      0,
    ),
  );
  reader.dataset.v3DeepHeadings = String(
    contentBlocks.filter(({ node }) => node.matches("h4, h5, h6")).length,
  );
  reader.dataset.v3FigureLinks = String(
    contentBlocks.reduce(
      (total, { node }) =>
        total + node.querySelectorAll('a[href*="/figs/"]').length,
      0,
    ),
  );
  reader.dataset.v3Blocks = String(contentBlocks.length);
  loadedChapterCount = chapters.length;
  await document.fonts.ready;
  rebuildPages();
  if (requestedChapterId) {
    goToChapter(requestedChapterId);
  }
  reportReady();
  startOpening();
}

for (const corner of corners) {
  corner.addEventListener("pointerdown", onCornerPointerDown);
}
spread.addEventListener("pointermove", onPointerMove);
spread.addEventListener("pointerup", onPointerEnd);
spread.addEventListener("pointercancel", onPointerCancel);
stationary.addEventListener("click", onStationaryClick);
previous.addEventListener("click", () => automaticTurn("backward"));
next.addEventListener("click", () => automaticTurn("forward"));
chapterSelect.addEventListener("change", () =>
  goToChapter(chapterSelect.value),
);

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
  if (openingTimer !== undefined) {
    clearTimeout(openingTimer);
  }
  resizeTimer = globalThis.setTimeout(() => {
    resizeTimer = undefined;
    const anchor = pages[spreadStart]?.anchor;
    const progress =
      pages.length <= 1 ? 0 : spreadStart / (pages.length - 1);
    if (activeTurn) {
      finishTurn(false);
    }
    try {
      rebuildPages(anchor, progress);
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
    stationary.removeEventListener("click", onStationaryClick);
    chapterSelect.replaceChildren();
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
