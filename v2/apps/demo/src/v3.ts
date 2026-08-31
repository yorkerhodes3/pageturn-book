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
import {
  normalizeBookFontScale,
  readBookFontScale,
  shareReadingLocation,
  writeBookFontScale,
} from "@ethical-tech/book-reader-ui";
import { catalogBook } from "./library-catalog.js";
import {
  publicationMedia,
  type V3MediaFigure,
  type V3MediaTreatment,
} from "./v3-media.js";

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
  kind: "front-matter" | "content" | "placeholder" | "blank";
  chapterOpening: boolean;
  chapterLabel?: string;
  chapterIndex?: number;
  chapterId?: string;
  nodes: readonly HTMLElement[];
}>;

type ChapterState = {
  chapter: V3Chapter;
  index: number;
  status: "idle" | "loading" | "ready" | "error";
  blocks: SemanticBlock[] | undefined;
  pages: PrototypePage[] | undefined;
  promise: Promise<void> | undefined;
  error: Error | undefined;
  pageParity: 1 | 2 | undefined;
};

type V3ReadingLocation = Readonly<{
  bookId: string;
  editionId: string;
  chapterId: string;
  anchor: string;
}>;

type LocationUpdate = "none" | "push" | "replace";

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
const mediaConfig = publicationMedia(requestedBookId);
const maximumSegmentCharacters = 540;
const chaptersStartOnRight = selectedBook?.chaptersStartOnRight ?? true;

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

function mediaTreatmentFrom(
  parameters: URLSearchParams,
): V3MediaTreatment {
  const requested = parameters.get("media");
  if (requested === null) {
    return mediaConfig?.defaultTreatment ?? "off";
  }
  if (requested === "off" || requested === "on" || requested === "popout") {
    if (!mediaConfig && requested !== "off") {
      throw new Error(
        `V3 publication has no configured images: ${requestedBookId}`,
      );
    }
    return requested;
  }
  throw new Error(`V3 image treatment is unavailable: ${requested}`);
}

function applyPublicationIdentity(publication: V3Manifest): void {
  publicationTitle.textContent = publication.title;
  coverKicker.textContent =
    publication.authors[0]?.name ?? "Semantic publication";
  coverTitle.textContent = publication.title;
  coverSubtitle.textContent =
    publication.cover?.subtitle ?? "Complete semantic edition";
  document.title = `${publication.title} - Semantic book reader`;
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
  mediaPicker.hidden = mediaConfig === undefined;
  mediaSelect.disabled = mediaConfig === undefined;
  mediaSelect.value = mediaTreatment;
  reader.classList.toggle("v3-has-media", mediaConfig !== undefined);
  reader.dataset.v3MediaMode = mediaTreatment;
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

function mediaFigureBlock(
  figure: V3MediaFigure,
  chapterState: ChapterState,
): SemanticBlock {
  const node = createElement(
    "figure",
    `v3-media-figure v3-media-${mediaTreatment}`,
  );
  const anchor = `v3-media-${figure.id}`;
  node.id = anchor;
  node.dataset.v3MediaId = figure.id;
  node.style.setProperty(
    "--v3-media-aspect",
    `${figure.width} / ${figure.height}`,
  );
  if (mediaTreatment === "on") {
    const image = document.createElement("img");
    image.alt = figure.alt;
    image.width = figure.width;
    image.height = figure.height;
    image.loading = "lazy";
    image.decoding = "async";
    image.dataset.v3MediaSrc = new URL(
      figure.src,
      globalThis.location.href,
    ).href;
    node.append(image);
  } else {
    const open = createElement("button", undefined, "Open figure");
    open.type = "button";
    open.dataset.v3MediaOpen = figure.id;
    open.setAttribute("aria-haspopup", "dialog");
    open.setAttribute("aria-label", `Open ${figure.caption}`);
    node.append(open);
  }
  node.append(createElement("figcaption", undefined, figure.caption));
  return {
    node,
    anchor,
    chapterTitle: chapterState.chapter.title,
    chapterLabel: chapterLabelForChapter(chapterState.chapter),
    chapterStart: false,
  };
}

function blocksWithMedia(chapterState: ChapterState): readonly SemanticBlock[] {
  const blocks = chapterState.blocks ?? [];
  if (mediaTreatment === "off" || !mediaConfig) {
    return blocks;
  }
  const result = [...blocks];
  for (const figure of mediaConfig.figures.filter(
    ({ chapterId }) => chapterId === String(chapterState.chapter.chapterId),
  )) {
    let anchorIndex = -1;
    for (let index = result.length - 1; index >= 0; index -= 1) {
      if (result[index]?.anchor === figure.afterAnchor) {
        anchorIndex = index;
        break;
      }
    }
    if (anchorIndex < 0) {
      throw new Error(
        `V3 figure ${figure.id} cannot find anchor ${figure.afterAnchor}`,
      );
    }
    result.splice(anchorIndex + 1, 0, mediaFigureBlock(figure, chapterState));
  }
  return result;
}

function activateMediaImages(root: ParentNode): void {
  for (const image of root.querySelectorAll<HTMLImageElement>(
    "img[data-v3-media-src]",
  )) {
    const src = image.dataset.v3MediaSrc;
    if (src) {
      image.src = src;
    }
  }
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

function chapterNumberForChapter(
  chapter: V3Chapter,
  displayedHeading?: string,
): string | undefined {
  const displayedNumber = displayedHeading
    ? /^(\d+(?:[-.]\d+)*)[.)]?\s+/.exec(displayedHeading)?.[1]
    : undefined;
  const chapterId = String(chapter.chapterId);
  const sourceNumber =
    displayedNumber ??
    (/^\d+(?:-\d+)*$/.test(chapterId) ? chapterId : undefined);
  return sourceNumber
    ?.split("-")
    .map((part) => String(Number(part)))
    .join("-");
}

function chapterLabelForChapter(
  chapter: V3Chapter,
  displayedHeading?: string,
): string {
  const chapterNumber = chapterNumberForChapter(chapter, displayedHeading);
  return chapterNumber ? `Chapter ${chapterNumber}` : "Chapter";
}

function isReferenceSection(
  chapterId: string | undefined,
  title: string | undefined,
): boolean {
  return /\b(references|works cited|bibliography|endnotes|end notes)\b/i.test(
    `${chapterId ?? ""} ${title ?? ""}`,
  );
}

function markLeadingReferenceMarker(node: HTMLElement): void {
  if (
    node.matches("p") &&
    /^\s*\[\s*0*\d+\s*\]\s*/.test(node.textContent ?? "")
  ) {
    node.dataset.v3LeadingMarker = "reference";
  }
}

function semanticBlocks(
  article: HTMLElement,
  chapter: V3Chapter,
): SemanticBlock[] {
  const blocks: SemanticBlock[] = [];
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
    const chapterLabel = chapterLabelForChapter(chapter, headingText);
    if (child.matches("p") && (child.textContent?.length ?? 0) > 680) {
      sentenceRanges(child.textContent ?? "").forEach((range, index) => {
        const paragraph = cloneTextRange(
          child,
          range.start,
          range.end,
          index === 0,
        );
        paragraph.dataset.sourceAnchor = anchor;
        markLeadingReferenceMarker(paragraph);
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
    markLeadingReferenceMarker(clone);
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
  chapterState: ChapterState,
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
    chapterIndex: chapterState.index,
    chapterId: String(chapterState.chapter.chapterId),
    ...(first.chapterStart
      ? { chapterLabel: first.chapterLabel }
      : {}),
    nodes: blocks.map(({ node }) => node),
  };
}

function placeholderPage(chapterState: ChapterState): PrototypePage {
  const heading = createElement("h1", undefined, chapterState.chapter.title);
  heading.id = chapterState.chapter.firstAnchor;
  const loading = createElement(
    "p",
    "v3-placeholder-status",
    chapterState.status === "error"
      ? `Chapter unavailable: ${chapterState.error?.message ?? "unknown error"}`
      : "Chapter content is loading",
  );
  const retry =
    chapterState.status === "error"
      ? createElement("button", "v3-placeholder-retry", "Retry chapter")
      : undefined;
  if (retry) {
    retry.type = "button";
    retry.dataset.v3RetryChapter = String(chapterState.chapter.chapterId);
  }
  return {
    label: `${chapterState.chapter.title}, unloaded chapter`,
    runningTitle: chapterState.chapter.title,
    anchor: chapterState.chapter.firstAnchor,
    kind: "placeholder",
    chapterOpening: true,
    chapterIndex: chapterState.index,
    chapterId: String(chapterState.chapter.chapterId),
    chapterLabel: chapterLabelForChapter(chapterState.chapter),
    nodes: [heading, loading, ...(retry ? [retry] : [])],
  };
}

function blankChapterPage(chapterState: ChapterState): PrototypePage {
  return {
    label: `Blank verso after ${chapterState.chapter.title}`,
    runningTitle: chapterState.chapter.title,
    anchor: `v3-blank-${String(chapterState.chapter.chapterId)}`,
    kind: "blank",
    chapterOpening: false,
    chapterIndex: chapterState.index,
    chapterId: String(chapterState.chapter.chapterId),
    nodes: [],
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
      page.kind === "placeholder" ? "v3-sheet-placeholder" : "",
      page.kind === "blank" ? "v3-sheet-blank" : "",
      page.chapterOpening ? "v3-sheet-chapter-opening" : "",
    ]
      .filter(Boolean)
      .join(" "),
  );
  sheet.setAttribute("aria-label", page.label);
  sheet.dataset.v3Anchor = page.anchor;
  if (page.chapterId) {
    sheet.dataset.v3Chapter = page.chapterId;
  }
  if (isReferenceSection(page.chapterId, page.runningTitle)) {
    sheet.dataset.v3ChapterRole = "references";
  }
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
  activateMediaImages(content);
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
const decreaseFont = requiredElement<HTMLButtonElement>(
  "[data-v3-font-decrease]",
);
const increaseFont = requiredElement<HTMLButtonElement>(
  "[data-v3-font-increase]",
);
const fontStatus = requiredElement<HTMLOutputElement>(
  "[data-v3-font-status]",
);
const shareButton = requiredElement<HTMLButtonElement>("[data-v3-share]");
const shareStatus = requiredElement<HTMLOutputElement>(
  "[data-v3-share-status]",
);
const mediaPicker = requiredElement<HTMLElement>("[data-v3-media-picker]");
const mediaSelect = requiredElement<HTMLSelectElement>(
  "[data-v3-media-treatment]",
);
const mediaDialog = requiredElement<HTMLDialogElement>(
  "[data-v3-media-dialog]",
);
const mediaDialogTitle = requiredElement<HTMLElement>(
  "[data-v3-media-dialog-title]",
);
const mediaDialogImage = requiredElement<HTMLImageElement>(
  "[data-v3-media-dialog-image]",
);
const mediaDialogCaption = requiredElement<HTMLElement>(
  "[data-v3-media-dialog-caption]",
);
const backLink = requiredElement<HTMLAnchorElement>("[data-v3-back]");
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
let manifestUrl: URL | undefined;
let chapterStates: ChapterState[] = [];
let pages: PrototypePage[] = [];
let spreadStart = 0;
let activeTurn: ActiveTurn | undefined;
let resizeTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
let openingTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
let chapterWindowVersion = 0;
let retainedChapterIndices: number[] = [];
let opening = true;
let fontScale = 1;
let mediaTreatment: V3MediaTreatment = mediaConfig?.defaultTreatment ?? "off";
let locationTrackingReady = false;
let applyingHistory = false;
let sharing = false;
let preferredAnchor:
  | Readonly<{ chapterId: string; anchor: string }>
  | undefined;
let locationNavigationVersion = 0;
let failureReported = false;
let pendingTurn = false;
let mediaReturnFocus: HTMLElement | undefined;

if (query.get("embed") === "1") {
  document.body.classList.add("v3-page-embedded");
}

function configureBackNavigation(): void {
  const fallback = new URL("../shelf/", globalThis.location.href);
  let destination = fallback;
  let label = "Library";
  try {
    if (document.referrer) {
      const referrer = new URL(document.referrer);
      const current = new URL(globalThis.location.href);
      if (
        (referrer.protocol === "http:" || referrer.protocol === "https:") &&
        referrer.href !== current.href
      ) {
        destination = referrer;
        label = "Back";
      }
    }
  } catch (error) {
    console.warn("V3 could not restore the referring location", error);
  }
  backLink.href = destination.href;
  backLink.textContent = label;
  backLink.dataset.v3BackMode = label === "Back" ? "referrer" : "library";
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

function waitForPageLayout(timeoutMs = 10_000): Promise<void> {
  if (spread.clientWidth > 0 && spread.clientHeight > 0) {
    return Promise.resolve();
  }
  return new Promise((resolveLayout, rejectLayout) => {
    const observer = new ResizeObserver(() => {
      if (spread.clientWidth > 0 && spread.clientHeight > 0) {
        clearTimeout(timeout);
        observer.disconnect();
        resolveLayout();
      }
    });
    const timeout = globalThis.setTimeout(() => {
      observer.disconnect();
      rejectLayout(
        new Error("V3 book did not receive a measurable layout"),
      );
    }, timeoutMs);
    observer.observe(spread);
  });
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

function turnTargetReady(direction: PageTurnDirection): boolean {
  const target = targetSpread(direction);
  return pages
    .slice(target, target + pageStep())
    .every((page) => page?.kind !== "placeholder");
}

function activePage(): PrototypePage | undefined {
  const visiblePages = pages.slice(spreadStart, spreadStart + pageStep());
  const pinnedAnchor = preferredAnchor;
  const preferredPage = pinnedAnchor
    ? visiblePages.find(
        (page) =>
          page?.chapterId === pinnedAnchor.chapterId &&
          pageContainsAnchor(page, pinnedAnchor.anchor),
      )
    : undefined;
  const contentPages = visiblePages.filter(
    (page) => page?.kind === "content",
  );
  return (
    preferredPage ??
    contentPages.at(-1) ??
    visiblePages
      .filter((page) => page?.chapterIndex !== undefined)
      .at(-1) ??
    visiblePages[0]
  );
}

function activeChapterIndex(): number {
  return activePage()?.chapterIndex ?? 0;
}

function loadedChapterCount(): number {
  return chapterStates.filter(({ status }) => status === "ready").length;
}

function decodeLocationHash(hash = globalThis.location.hash): string | undefined {
  const encoded = hash.startsWith("#") ? hash.slice(1) : hash;
  if (encoded === "") {
    return undefined;
  }
  try {
    return decodeURIComponent(encoded);
  } catch {
    throw new Error("V3 location contains a malformed source anchor");
  }
}

function resumeStorageKey(bookId: string): string {
  return `ethical-tech-book-v3-location:${bookId}`;
}

function readResumeLocation(
  publication: V3Manifest,
): V3ReadingLocation | undefined {
  try {
    const raw = globalThis.localStorage.getItem(
      resumeStorageKey(publication.bookId),
    );
    if (raw === null) {
      return undefined;
    }
    const parsed: unknown = JSON.parse(raw);
    const saved = record(parsed, "saved reading location");
    const location = {
      bookId: stringValue(saved.bookId, "saved location.bookId"),
      editionId: stringValue(saved.editionId, "saved location.editionId"),
      chapterId: stringValue(saved.chapterId, "saved location.chapterId"),
      anchor: stringValue(saved.anchor, "saved location.anchor"),
    };
    if (
      location.bookId !== publication.bookId ||
      location.editionId !== publication.editionId ||
      !publication.chapters.some(
        ({ chapterId }) => String(chapterId) === location.chapterId,
      )
    ) {
      return undefined;
    }
    return location;
  } catch (error) {
    console.warn("V3 reading location could not be restored", error);
    return undefined;
  }
}

function writeResumeLocation(location: V3ReadingLocation): void {
  try {
    globalThis.localStorage.setItem(
      resumeStorageKey(location.bookId),
      JSON.stringify(location),
    );
  } catch (error) {
    console.warn("V3 reading location could not be saved", error);
  }
}

function currentReadingLocation(): V3ReadingLocation | undefined {
  const page = activePage();
  if (
    !manifest ||
    page?.kind !== "content" ||
    page.chapterIndex === undefined ||
    page.chapterId === undefined
  ) {
    return undefined;
  }
  return {
    bookId: manifest.bookId,
    editionId: manifest.editionId,
    chapterId: page.chapterId,
    anchor:
      preferredAnchor?.chapterId === page.chapterId &&
      pageContainsAnchor(page, preferredAnchor.anchor)
        ? preferredAnchor.anchor
        : page.anchor,
  };
}

function readingLocationUrl(
  location: V3ReadingLocation | undefined,
  preserveContext: boolean,
): URL {
  if (!manifest) {
    throw new Error("V3 cannot create a location before loading a publication");
  }
  const url = new URL(globalThis.location.href);
  if (!preserveContext) {
    url.search = "";
  }
  url.searchParams.set("book", manifest.bookId);
  if (location) {
    url.searchParams.set("chapter", location.chapterId);
    url.hash = location.anchor;
  } else {
    url.searchParams.delete("chapter");
    url.hash = "";
  }
  return url;
}

function syncCurrentLocation(update: LocationUpdate): void {
  if (
    update === "none" ||
    !locationTrackingReady ||
    applyingHistory ||
    !manifest
  ) {
    return;
  }
  const location = currentReadingLocation();
  const url = readingLocationUrl(location, true);
  if (url.href !== globalThis.location.href) {
    if (update === "push") {
      globalThis.history.pushState({ v3Location: true }, "", url);
    } else {
      globalThis.history.replaceState({ v3Location: true }, "", url);
    }
  }
  if (location) {
    writeResumeLocation(location);
  }
}

function renderFontControls(): void {
  const percent = Math.round(fontScale * 100);
  fontStatus.value = `${percent}%`;
  reader.dataset.v3FontSize = String(percent);
  increaseFont.disabled =
    opening || pendingTurn || activeTurn !== undefined || fontScale >= 1.3;
  decreaseFont.disabled =
    opening || pendingTurn || activeTurn !== undefined || fontScale <= 0.8;
}

function applyFontScale(value: number): void {
  fontScale = normalizeBookFontScale(value);
  reader.style.setProperty("--v3-font-scale", String(fontScale));
  renderFontControls();
}

function renderControls(): void {
  previous.disabled =
    opening ||
    pendingTurn ||
    !canTurn("backward") ||
    activeTurn !== undefined;
  next.disabled =
    opening ||
    pendingTurn ||
    !canTurn("forward") ||
    activeTurn !== undefined;
  for (const corner of corners) {
    const direction = corner.dataset.v3Direction;
    corner.disabled =
      opening ||
      pendingTurn ||
      activeTurn !== undefined ||
      (direction !== "forward" && direction !== "backward") ||
      !canTurn(direction) ||
      !turnTargetReady(direction);
  }
  shareButton.disabled =
    opening ||
    pendingTurn ||
    activeTurn !== undefined ||
    sharing ||
    manifest === undefined;
  renderFontControls();
}

function renderStationary(locationUpdate: LocationUpdate = "replace"): void {
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
  const visiblePages = pages.slice(spreadStart, spreadStart + pageStep());
  const focusedPage =
    visiblePages.filter((page) => page?.kind === "content").at(-1) ??
    visiblePages.find((page) => page?.chapterIndex !== undefined);
  if (focusedPage?.chapterIndex !== undefined) {
    const chapterState = chapterStates[focusedPage.chapterIndex];
    const chapterPages = chapterState?.pages ?? [];
    const localIndices = visiblePages.flatMap((page) => {
      const localIndex = chapterPages.indexOf(page);
      return localIndex >= 0 ? [localIndex + 1] : [];
    });
    const pageLabel =
      localIndices.length > 1
        ? `pages ${localIndices[0]}–${localIndices.at(-1)}`
        : `page ${localIndices[0] ?? 1}`;
    counter.value =
      `Chapter ${focusedPage.chapterIndex + 1}/${chapterStates.length}` +
      ` · ${pageLabel}/${Math.max(1, chapterPages.length)}` +
      (singlePage
        ? ` · Page ${spreadStart + 1} of ${pages.length}`
        : ` · Spread ${spreadStart / 2 + 1} of ${Math.ceil(pages.length / 2)}`);
  } else {
    counter.value = singlePage
      ? `Front matter · Page ${spreadStart + 1} of ${pages.length}`
      : `Front matter · Spread ${spreadStart / 2 + 1} of ${Math.ceil(pages.length / 2)}`;
  }
  reader.dataset.v3Turning = "false";
  reader.dataset.v3PageIndex = String(spreadStart);
  reader.dataset.v3PageCount = String(pages.length);
  reader.dataset.v3AtEnd = String(!canTurn("forward"));
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
  syncCurrentLocation(locationUpdate);
  if (preferredAnchor) {
    const target = stationary.querySelector<HTMLElement>(
      `#${CSS.escape(preferredAnchor.anchor)}`,
    );
    if (target) {
      target.tabIndex = -1;
      target.focus({ preventScroll: true });
    }
  }
}

function setFontScale(value: number): void {
  if (!manifest) {
    return;
  }
  const nextScale = normalizeBookFontScale(value);
  if (nextScale === fontScale) {
    return;
  }
  const preservation = currentPreservation();
  if (activeTurn) {
    finishTurn(false);
  }
  reader.setAttribute("aria-busy", "true");
  status.textContent = "Repaginating the loaded chapter window";
  applyFontScale(nextScale);
  writeBookFontScale(manifest.bookId, fontScale);
  try {
    rebuildPages(
      preservation.anchor,
      preservation.progress,
      preservation.chapterIndex,
      preservation.chapterPageOffset,
    );
    reportReadyIfHealthy();
  } catch (error: unknown) {
    reportFailure("V3 could not resize the book text", error);
  }
}

function setMediaTreatment(value: string): void {
  if (!mediaConfig) {
    throw new Error("V3 publication has no configured image treatment");
  }
  if (value !== "off" && value !== "on" && value !== "popout") {
    throw new Error(`V3 image treatment is unavailable: ${value}`);
  }
  if (value === mediaTreatment) {
    return;
  }
  const preservation = currentPreservation();
  if (activeTurn) {
    finishTurn(false);
  }
  if (mediaDialog.open) {
    mediaDialog.close();
  }
  mediaTreatment = value;
  mediaSelect.value = value;
  reader.dataset.v3MediaMode = value;
  if (!applyingHistory) {
    const url = new URL(globalThis.location.href);
    url.searchParams.set("media", value);
    globalThis.history.replaceState({ v3Location: true }, "", url);
  }
  reader.setAttribute("aria-busy", "true");
  status.textContent = "Applying image treatment";
  try {
    rebuildPages(
      preservation.anchor,
      preservation.progress,
      preservation.chapterIndex,
      preservation.chapterPageOffset,
    );
    reportReadyIfHealthy();
  } catch (error: unknown) {
    reportFailure("V3 could not apply the image treatment", error);
  }
}

function openMediaFigure(id: string, trigger: HTMLElement): void {
  const figure = mediaConfig?.figures.find((candidate) => candidate.id === id);
  if (!figure) {
    throw new Error(`V3 publication figure is unavailable: ${id}`);
  }
  mediaReturnFocus = trigger;
  mediaDialogTitle.textContent = figure.caption;
  mediaDialogCaption.textContent =
    `${figure.caption} Extracted from the immutable designed publication.`;
  mediaDialogImage.alt = figure.alt;
  mediaDialogImage.width = figure.width;
  mediaDialogImage.height = figure.height;
  mediaDialogImage.src = new URL(figure.src, globalThis.location.href).href;
  mediaDialog.showModal();
}

function onMediaDialogClose(): void {
  mediaDialogImage.removeAttribute("src");
  mediaDialogImage.alt = "";
  if (mediaReturnFocus?.isConnected) {
    mediaReturnFocus.focus();
  }
  mediaReturnFocus = undefined;
}

async function shareCurrentLocation(): Promise<void> {
  if (!manifest || sharing) {
    return;
  }
  sharing = true;
  shareStatus.value = "Preparing reading link";
  renderControls();
  const location = currentReadingLocation();
  const chapter = location
    ? manifest.chapters.find(
        ({ chapterId }) => String(chapterId) === location.chapterId,
      )
    : undefined;
  const title = chapter
    ? `${manifest.title}: ${chapter.title}`
    : manifest.title;
  const url = readingLocationUrl(location, false);
  shareStatus.value = await shareReadingLocation(title, url.href);
  sharing = false;
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
  const mediaOpen = event.target.closest<HTMLButtonElement>(
    "[data-v3-media-open]",
  );
  const mediaId = mediaOpen?.dataset.v3MediaOpen;
  if (mediaOpen && mediaId) {
    event.preventDefault();
    try {
      openMediaFigure(mediaId, mediaOpen);
    } catch (error: unknown) {
      reportFailure("V3 could not open the publication figure", error);
    }
    return;
  }
  const retry = event.target.closest<HTMLButtonElement>(
    "[data-v3-retry-chapter]",
  );
  const retryChapterId = retry?.dataset.v3RetryChapter;
  if (retry && retryChapterId) {
    event.preventDefault();
    void goToChapter(retryChapterId, "replace").catch((error: unknown) => {
      reportFailure("V3 could not retry the requested chapter", error);
    });
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
  const chapterId = pages[pageIndex]?.chapterId;
  if (!chapterId) {
    console.warn(`V3 internal anchor has no chapter: ${anchor}`);
    return;
  }
  event.preventDefault();
  void goToLocation(chapterId, anchor, "push").catch((error: unknown) => {
    reportFailure("V3 could not open the linked passage", error);
  });
}

function positionAtLocation(
  chapterId: string,
  anchor: string | undefined,
  locationUpdate: LocationUpdate,
): void {
  if (!manifest) {
    return;
  }
  if (chapterId === "") {
    preferredAnchor = undefined;
    spreadStart = 0;
    renderStationary(locationUpdate);
    return;
  }
  const chapter = manifest.chapters.find(
    ({ chapterId: candidate }) => String(candidate) === chapterId,
  );
  if (!chapter) {
    throw new Error(`V3 chapter is unavailable: ${chapterId}`);
  }
  const targetAnchor = anchor ?? chapter.firstAnchor;
  const pageIndex = pages.findIndex((page) =>
    page.kind === "content" &&
    page.chapterId === chapterId &&
    pageContainsAnchor(page, targetAnchor),
  );
  if (pageIndex < 0) {
    throw new Error(
      `V3 could not locate ${targetAnchor} in ${chapter.title}`,
    );
  }
  const step = pageStep();
  preferredAnchor = { chapterId, anchor: targetAnchor };
  spreadStart = Math.floor(pageIndex / step) * step;
  renderStationary(locationUpdate);
  const heading = stationary.querySelector<HTMLElement>(
    `#${CSS.escape(targetAnchor)}`,
  );
  if (heading) {
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }
}

async function goToLocation(
  chapterId: string,
  anchor: string | undefined,
  locationUpdate: LocationUpdate,
): Promise<void> {
  const navigationVersion = ++locationNavigationVersion;
  if (!manifest || chapterId === "") {
    if (navigationVersion === locationNavigationVersion) {
      positionAtLocation(chapterId, anchor, locationUpdate);
    }
    return;
  }
  const chapterIndex = chapterStates.findIndex(
    ({ chapter }) => String(chapter.chapterId) === chapterId,
  );
  if (chapterIndex < 0) {
    throw new Error(`V3 chapter is unavailable: ${chapterId}`);
  }
  const chapter = chapterStates[chapterIndex]?.chapter;
  if (!chapter) {
    throw new Error(`V3 chapter is unavailable: ${chapterId}`);
  }
  const preservation = {
    anchor: anchor ?? chapter.firstAnchor,
    progress:
      chapterStates.length <= 1 ? 0 : chapterIndex / (chapterStates.length - 1),
  };
  while (navigationVersion === locationNavigationVersion) {
    const result = await ensureChapterWindow(
      chapterIndex,
      preservation,
      "none",
    );
    if (navigationVersion !== locationNavigationVersion) {
      return;
    }
    if (result) {
      positionAtLocation(chapterId, anchor, locationUpdate);
      return;
    }
  }
}

async function goToChapter(
  chapterId: string,
  locationUpdate: LocationUpdate = "push",
): Promise<void> {
  const chapter = chapterStates.find(
    ({ chapter: candidate }) => String(candidate.chapterId) === chapterId,
  )?.chapter;
  await goToLocation(
    chapterId,
    chapter?.firstAnchor,
    locationUpdate,
  );
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
  if (
    selected.moving.kind === "placeholder" ||
    selected.revealed.kind === "placeholder"
  ) {
    return undefined;
  }
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
    preferredAnchor = undefined;
    spreadStart = turn.targetSpread;
  }
  activeTurn = undefined;
  turnLayer.replaceChildren();
  renderStationary();
  if (commit) {
    queueChapterWindow();
  }
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
      preferredAnchor = undefined;
      spreadStart = targetSpread(direction);
      renderStationary();
      queueChapterWindow();
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

async function performAutomaticTurn(
  direction: PageTurnDirection,
): Promise<void> {
  if (!canTurn(direction) || activeTurn) {
    return;
  }
  const target = targetSpread(direction);
  const destinationPages = pages.slice(target, target + pageStep());
  if (destinationPages.some((page) => page?.kind === "placeholder")) {
    const retainedForTurn = [
      ...pages.slice(spreadStart, spreadStart + pageStep()),
      ...destinationPages,
    ].flatMap((page) =>
      page?.chapterIndex === undefined ? [] : [page.chapterIndex],
    );
    await ensureChapterSet(
      retainedForTurn,
      currentPreservation(),
    );
    if (!canTurn(direction) || !turnTargetReady(direction)) {
      return;
    }
  }
  if (reducedMotion.matches) {
    preferredAnchor = undefined;
    spreadStart = targetSpread(direction);
    renderStationary();
    queueChapterWindow();
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

async function automaticTurn(direction: PageTurnDirection): Promise<void> {
  if (pendingTurn) {
    return;
  }
  pendingTurn = true;
  renderControls();
  try {
    await performAutomaticTurn(direction);
  } catch (error: unknown) {
    reportFailure("V3 could not turn to the requested chapter", error);
  } finally {
    pendingTurn = false;
    renderControls();
  }
}

function pageFits(blocks: readonly SemanticBlock[]): boolean {
  measure.classList.toggle(
    "v3-sheet-chapter-opening",
    blocks[0]?.chapterStart ?? false,
  );
  if (isReferenceSection(undefined, blocks[0]?.chapterTitle)) {
    measure.dataset.v3ChapterRole = "references";
  } else {
    delete measure.dataset.v3ChapterRole;
  }
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

function paginateContent(
  blocks: readonly SemanticBlock[],
  chapterState: ChapterState,
): PrototypePage[] {
  if (measureContent.clientHeight <= 0) {
    throw new Error("V3 pagination measure has no usable height");
  }
  const result: PrototypePage[] = [];
  let current: SemanticBlock[] = [];
  const fittedBlocks = blocks.flatMap((block) => fitBlock(block));

  for (const block of fittedBlocks) {
    if (block.node.matches(".v3-media-on")) {
      if (current.length > 0) {
        result.push(
          pageFromBlocks(current, result.length + 1, chapterState),
        );
        current = [];
      }
      result.push(
        pageFromBlocks([block], result.length + 1, chapterState),
      );
      continue;
    }
    if (block.chapterStart && current.length > 0) {
      result.push(
        pageFromBlocks(current, result.length + 1, chapterState),
      );
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
        result.push(
          pageFromBlocks(current, result.length + 1, chapterState),
        );
      }
      const headingWithBlock = heading ? [heading, block] : [block];
      if (pageFits(headingWithBlock)) {
        current = headingWithBlock;
      } else {
        if (heading) {
          result.push(
            pageFromBlocks([heading], result.length + 1, chapterState),
          );
        }
        current = [block];
      }
    } else {
      if (current.length > 0) {
        result.push(
          pageFromBlocks(current, result.length + 1, chapterState),
        );
      }
      current = [block];
    }

    if (!pageFits(current)) {
      throw new Error(`V3 pagination failed at ${block.anchor}`);
    }
  }

  if (current.length > 0) {
    result.push(
      pageFromBlocks(current, result.length + 1, chapterState),
    );
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

function updateLoadedDiagnostics(): void {
  const blocks = chapterStates.flatMap(({ blocks }) => blocks ?? []);
  reader.dataset.v3LoadedChapterIds = chapterStates
    .filter(({ status }) => status === "ready")
    .map(({ chapter }) => String(chapter.chapterId))
    .join(",");
  reader.dataset.v3LoadedChapters = String(loadedChapterCount());
  reader.dataset.v3ChapterCount = String(chapterStates.length);
  reader.dataset.v3Tables = String(
    blocks.filter(({ node }) => node.matches("table")).length,
  );
  reader.dataset.v3CodeBlocks = String(
    blocks.filter(({ node }) => node.matches("pre")).length,
  );
  reader.dataset.v3NoteLinks = String(
    blocks.reduce(
      (total, { node }) =>
        total + node.querySelectorAll('a[href^="#note-"]').length,
      0,
    ),
  );
  reader.dataset.v3DeepHeadings = String(
    blocks.filter(({ node }) => node.matches("h4, h5, h6")).length,
  );
  reader.dataset.v3FigureLinks = String(
    blocks.reduce(
      (total, { node }) =>
        total + node.querySelectorAll('a[href*="/figs/"]').length,
      0,
    ),
  );
  reader.dataset.v3Blocks = String(blocks.length);
}

function repaginateLoadedChapters(): void {
  for (const chapterState of chapterStates) {
    if (chapterState.status === "ready" && chapterState.blocks) {
      const chapterPages = paginateContent(
        blocksWithMedia(chapterState),
        chapterState,
      );
      const physicalPages =
        chaptersStartOnRight && chapterPages.length % 2 !== 0
          ? [...chapterPages, blankChapterPage(chapterState)]
          : chapterPages;
      chapterState.pageParity = physicalPages.length % 2 === 0 ? 2 : 1;
      chapterState.pages = physicalPages;
    }
  }
}

function composedPublicationPages(): PrototypePage[] {
  return chapterStates.flatMap((chapterState) =>
    chapterState.status === "ready" && chapterState.pages
      ? chapterState.pages
      : chaptersStartOnRight || chapterState.pageParity === 2
        ? [placeholderPage(chapterState), blankChapterPage(chapterState)]
        : [placeholderPage(chapterState)],
  );
}

function rebuildPages(
  preserveAnchor?: string,
  preserveProgress = 0,
  preserveChapterIndex?: number,
  preserveChapterPageOffset?: number,
  locationUpdate: LocationUpdate = "replace",
): void {
  if (!manifest) {
    return;
  }
  spread.classList.toggle("v3-spread-single", singlePageMedia.matches);
  measure.hidden = false;
  repaginateLoadedChapters();
  const built = [
    ...frontMatterPages(manifest),
    ...composedPublicationPages(),
  ];
  if (built.length % 2 !== 0) {
    built.push(blankPage(manifest.title));
  }
  pages = built;
  measure.hidden = true;
  updateLoadedDiagnostics();
  const projectedIndex = Math.round(
    Math.min(1, Math.max(0, preserveProgress)) *
      Math.max(0, pages.length - 1),
  );
  const matchingIndices = preserveAnchor
    ? pages.flatMap((page, index) =>
        pageContainsAnchor(page, preserveAnchor) ? [index] : [],
      )
    : [];
  const chapterPageIndices =
    preserveChapterIndex === undefined
      ? []
      : pages.flatMap((page, index) =>
          page.chapterIndex === preserveChapterIndex &&
          page.kind === "content"
            ? [index]
            : [],
        );
  const chapterPreservedIndex =
    preserveChapterPageOffset === undefined ||
    chapterPageIndices.length === 0
      ? -1
      : chapterPageIndices[
          Math.min(
            chapterPageIndices.length - 1,
            Math.max(0, preserveChapterPageOffset),
          )
        ] ?? -1;
  const anchorPreservedIndex =
    matchingIndices.length === 0
      ? -1
      : matchingIndices.reduce((closest, candidate) =>
          Math.abs(candidate - projectedIndex) <
          Math.abs(closest - projectedIndex)
            ? candidate
            : closest,
        );
  const preservedIndex =
    anchorPreservedIndex >= 0
      ? anchorPreservedIndex
      : chapterPreservedIndex;
  const step = pageStep();
  const maximumStart = Math.max(0, pages.length - step);
  const targetIndex =
    preservedIndex >= 0 ? preservedIndex : projectedIndex;
  spreadStart =
    Math.floor(Math.min(targetIndex, maximumStart) / step) * step;
  renderStationary(locationUpdate);
}

function currentPreservation(): Readonly<{
  anchor?: string;
  progress: number;
  chapterIndex?: number;
  chapterPageOffset?: number;
}> {
  const page = activePage();
  const preservedAnchor = preferredAnchor?.anchor ?? page?.anchor;
  const pageIndex = page ? pages.indexOf(page) : -1;
  const chapterPageIndices =
    page?.chapterIndex === undefined
      ? []
      : pages.flatMap((candidate, index) =>
          candidate.kind === "content" &&
          candidate.chapterIndex === page.chapterIndex
            ? [index]
            : [],
        );
  const chapterPageOffset =
    pageIndex < 0 ? -1 : chapterPageIndices.indexOf(pageIndex);
  return {
    ...(preservedAnchor ? { anchor: preservedAnchor } : {}),
    ...(page?.chapterIndex === undefined
      ? {}
      : { chapterIndex: page.chapterIndex }),
    ...(chapterPageOffset < 0 ? {} : { chapterPageOffset }),
    progress:
      pages.length <= 1 ? 0 : spreadStart / Math.max(1, pages.length - 1),
  };
}

function releaseChapter(chapterState: ChapterState): void {
  if (chapterState.status === "loading") {
    return;
  }
  chapterState.status = "idle";
  chapterState.blocks = undefined;
  chapterState.pages = undefined;
  chapterState.promise = undefined;
  chapterState.error = undefined;
}

function chapterInWindow(index: number): boolean {
  return retainedChapterIndices.includes(index);
}

function releaseChaptersOutside(indices: readonly number[]): void {
  for (const chapterState of chapterStates) {
    if (!indices.includes(chapterState.index)) {
      releaseChapter(chapterState);
    }
  }
}

function rebuildChapterSet(
  indices: readonly number[],
  preservation: ReturnType<typeof currentPreservation>,
  locationUpdate: LocationUpdate,
): void {
  releaseChaptersOutside(indices);
  if (activeTurn) {
    finishTurn(false);
  }
  rebuildPages(
    preservation.anchor,
    preservation.progress,
    preservation.chapterIndex,
    preservation.chapterPageOffset,
    locationUpdate,
  );
}

async function ensureChapterLoaded(index: number): Promise<void> {
  const chapterState = chapterStates[index];
  if (!chapterState) {
    throw new RangeError(`V3 chapter index is unavailable: ${index}`);
  }
  if (chapterState.status === "ready") {
    return;
  }
  if (chapterState.status === "loading" && chapterState.promise) {
    return chapterState.promise;
  }
  if (!manifestUrl) {
    throw new Error("V3 publication manifest URL is unavailable");
  }

  chapterState.status = "loading";
  chapterState.error = undefined;
  updateLoadedDiagnostics();
  const promise = fetchChapterBlocks(chapterState.chapter, manifestUrl)
    .then((blocks) => {
      chapterState.blocks = blocks;
      chapterState.status = "ready";
      chapterState.pages = undefined;
      chapterState.promise = undefined;
      if (!chapterInWindow(index)) {
        releaseChapter(chapterState);
      }
      updateLoadedDiagnostics();
    })
    .catch((error: unknown) => {
      const failure =
        error instanceof Error
          ? error
          : new Error(`Unknown chapter loading failure: ${String(error)}`);
      chapterState.status = "error";
      chapterState.error = failure;
      chapterState.promise = undefined;
      updateLoadedDiagnostics();
      throw failure;
    });
  chapterState.promise = promise;
  return promise;
}

async function ensureChapterSet(
  requestedIndices: readonly number[],
  preservation: ReturnType<typeof currentPreservation>,
  locationUpdate: LocationUpdate = "replace",
): Promise<boolean> {
  const desired = [...new Set(requestedIndices)]
    .filter((index) => index >= 0 && index < chapterStates.length)
    .sort((left, right) => left - right);
  const windowIsReady =
    desired.every(
      (index) => chapterStates[index]?.status === "ready",
    ) &&
    chapterStates.every(
      ({ index, status }) => desired.includes(index) || status === "idle",
    );
  if (windowIsReady) {
    retainedChapterIndices = desired;
    return true;
  }
  const version = ++chapterWindowVersion;
  retainedChapterIndices = desired;
  status.textContent = `Loading chapter window · ${desired.length} chapters`;
  try {
    await Promise.all(desired.map((index) => ensureChapterLoaded(index)));
  } catch (error: unknown) {
    if (version !== chapterWindowVersion) {
      releaseChaptersOutside(retainedChapterIndices);
      console.warn("V3 ignored a failure from an obsolete chapter window", error);
      return false;
    }
    rebuildChapterSet(desired, preservation, locationUpdate);
    throw error;
  }
  if (version !== chapterWindowVersion) {
    releaseChaptersOutside(retainedChapterIndices);
    return false;
  }

  rebuildChapterSet(desired, preservation, locationUpdate);
  if (!opening) {
    reportReady();
  } else {
    failureReported = false;
  }
  return true;
}

async function ensureChapterWindow(
  centerIndex: number,
  preservation = currentPreservation(),
  locationUpdate: LocationUpdate = "replace",
): Promise<boolean> {
  const boundedCenter = Math.min(
    chapterStates.length - 1,
    Math.max(0, centerIndex),
  );
  return ensureChapterSet(
    [boundedCenter - 1, boundedCenter, boundedCenter + 1],
    preservation,
    locationUpdate,
  );
}

function queueChapterWindow(centerIndex = activeChapterIndex()): void {
  void ensureChapterWindow(centerIndex).catch((error: unknown) => {
    reportFailure("V3 could not load the chapter window", error);
  });
}

function prototypeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown V3 reader error";
}

function reportReady(): void {
  failureReported = false;
  reader.dataset.v3Ready = "true";
  reader.setAttribute("aria-busy", "false");
  status.textContent =
    `Geometry ready · ${loadedChapterCount()}/${chapterStates.length} chapters loaded` +
    ` · ${pages.length} composed pages`;
}

function reportFailure(context: string, error: unknown): void {
  failureReported = true;
  reader.dataset.v3Ready = "false";
  reader.setAttribute("aria-busy", "false");
  status.textContent = `${context}: ${prototypeErrorMessage(error)}`;
  console.error(error);
}

function reportReadyIfHealthy(): void {
  if (failureReported) {
    reader.setAttribute("aria-busy", "false");
    return;
  }
  reportReady();
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
  reportReadyIfHealthy();
  renderControls();
}

function startOpening(): void {
  reader.dataset.v3Opening = "true";
  if (reducedMotion.matches) {
    finishOpening();
    return;
  }
  status.textContent =
    `Opening semantic edition · ${loadedChapterCount()}/${chapterStates.length} chapters loaded`;
  entryCover.addEventListener("animationend", finishOpening, { once: true });
  openingTimer = globalThis.setTimeout(finishOpening, 1_300);
}

type InitialReadingLocation = Readonly<{
  location: V3ReadingLocation;
  source: "resume" | "url";
}>;

function initialReadingLocation(
  publication: V3Manifest,
): InitialReadingLocation | undefined {
  const anchor = decodeLocationHash();
  let chapterId = requestedChapterId;
  if (anchor && chapterId === null) {
    chapterId =
      publication.chapters.find(
        ({ firstAnchor }) => firstAnchor === anchor,
      )?.chapterId.toString() ?? null;
    if (chapterId === null) {
      throw new Error(
        "V3 source-anchor URLs must include their chapter parameter",
      );
    }
  }
  if (chapterId !== null) {
    const chapter = publication.chapters.find(
      ({ chapterId: candidate }) => String(candidate) === chapterId,
    );
    if (!chapter) {
      throw new Error(`V3 chapter is unavailable: ${chapterId}`);
    }
    return {
      source: "url",
      location: {
        bookId: publication.bookId,
        editionId: publication.editionId,
        chapterId,
        anchor: anchor ?? chapter.firstAnchor,
      },
    };
  }
  const resumed = readResumeLocation(publication);
  return resumed ? { source: "resume", location: resumed } : undefined;
}

async function restoreHistoryLocation(): Promise<void> {
  if (!manifest) {
    return;
  }
  const params = new URLSearchParams(globalThis.location.search);
  const historyBookId = params.get("book") ?? "what-is-ethical-ai";
  if (historyBookId !== manifest.bookId) {
    globalThis.location.reload();
    return;
  }
  const chapterId = params.get("chapter");
  const anchor = decodeLocationHash();
  const restoredMediaTreatment = mediaTreatmentFrom(params);
  if (anchor && chapterId === null) {
    throw new Error(
      "V3 source-anchor URLs must include their chapter parameter",
    );
  }
  applyingHistory = true;
  try {
    if (restoredMediaTreatment !== mediaTreatment) {
      setMediaTreatment(restoredMediaTreatment);
    }
    await goToLocation(chapterId ?? "", anchor, "none");
    const restored = currentReadingLocation();
    if (restored) {
      writeResumeLocation(restored);
    }
  } finally {
    applyingHistory = false;
  }
}

function onPopState(): void {
  void restoreHistoryLocation().catch((error: unknown) => {
    reportFailure("V3 could not restore the browser location", error);
  });
}

async function initialize(): Promise<void> {
  const loaded = await fetchManifest();
  manifest = loaded.manifest;
  manifestUrl = loaded.url;
  if (manifest.bookId !== requestedBookId) {
    throw new Error(
      `V3 requested ${requestedBookId} but loaded ${manifest.bookId}`,
    );
  }
  mediaTreatment = mediaTreatmentFrom(query);
  applyPublicationIdentity(manifest);
  applyFontScale(readBookFontScale(manifest.bookId, 1));
  chapterStates = manifest.chapters.map((chapter, index) => ({
    chapter,
    index,
    status: "idle",
    blocks: undefined,
    pages: undefined,
    promise: undefined,
    error: undefined,
    pageParity: undefined,
  }));
  const initialLocation = initialReadingLocation(manifest);
  const initialChapterIndex = initialLocation
    ? chapterStates.findIndex(
        ({ chapter }) =>
          String(chapter.chapterId) === initialLocation.location.chapterId,
      )
    : 0;
  const initialWindowCenter = Math.max(0, initialChapterIndex);
  retainedChapterIndices = [initialWindowCenter];
  await document.fonts.ready;
  await waitForPageLayout();
  rebuildPages();
  try {
    await ensureChapterLoaded(initialWindowCenter);
  } catch (error: unknown) {
    rebuildPages();
    const placeholderIndex = pages.findIndex(
      (page) =>
        page.kind === "placeholder" &&
        page.chapterIndex === initialWindowCenter,
    );
    if (placeholderIndex >= 0) {
      const step = pageStep();
      spreadStart = Math.floor(placeholderIndex / step) * step;
      const failedChapter = chapterStates[initialWindowCenter]?.chapter;
      chapterSelect.value = failedChapter
        ? String(failedChapter.chapterId)
        : "";
      renderStationary("none");
    }
    locationTrackingReady = true;
    opening = false;
    reader.dataset.v3Opening = "false";
    renderControls();
    throw error;
  }
  rebuildPages();
  if (initialLocation) {
    try {
      positionAtLocation(
        initialLocation.location.chapterId,
        initialLocation.location.anchor,
        "none",
      );
    } catch (error: unknown) {
      if (initialLocation.source !== "resume") {
        throw error;
      }
      console.warn("V3 saved source anchor could not be restored", error);
      positionAtLocation(
        initialLocation.location.chapterId,
        undefined,
        "none",
      );
    }
  }
  locationTrackingReady = true;
  syncCurrentLocation("replace");
  reportReady();
  startOpening();
  queueChapterWindow(initialWindowCenter);
}

for (const corner of corners) {
  corner.addEventListener("pointerdown", onCornerPointerDown);
}
spread.addEventListener("pointermove", onPointerMove);
spread.addEventListener("pointerup", onPointerEnd);
spread.addEventListener("pointercancel", onPointerCancel);
stationary.addEventListener("click", onStationaryClick);
previous.addEventListener("click", () => void automaticTurn("backward"));
next.addEventListener("click", () => void automaticTurn("forward"));
decreaseFont.addEventListener("click", () => setFontScale(fontScale - 0.1));
increaseFont.addEventListener("click", () => setFontScale(fontScale + 0.1));
shareButton.addEventListener("click", () => void shareCurrentLocation());
mediaSelect.addEventListener("change", () => {
  try {
    setMediaTreatment(mediaSelect.value);
  } catch (error: unknown) {
    reportFailure("V3 could not change the image treatment", error);
  }
});
mediaDialog.addEventListener("close", onMediaDialogClose);
chapterSelect.addEventListener("change", () =>
  void goToChapter(chapterSelect.value).catch((error: unknown) => {
    reportFailure("V3 could not open the selected chapter", error);
  }),
);

const onKeyDown = (event: KeyboardEvent) => {
  if (
    mediaDialog.open ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    (event.target instanceof Element &&
      event.target.closest("a, button, input, select, textarea") !== null)
  ) {
    return;
  }
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    void automaticTurn("backward");
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    void automaticTurn("forward");
  }
};
document.addEventListener("keydown", onKeyDown);
globalThis.addEventListener("popstate", onPopState);

const observer = new ResizeObserver(() => {
  if (!manifest || pages.length === 0) {
    return;
  }
  if (resizeTimer !== undefined) {
    clearTimeout(resizeTimer);
  }
  resizeTimer = globalThis.setTimeout(() => {
    resizeTimer = undefined;
    const preservation = currentPreservation();
    if (activeTurn) {
      finishTurn(false);
    }
    try {
      rebuildPages(
        preservation.anchor,
        preservation.progress,
        preservation.chapterIndex,
        preservation.chapterPageOffset,
      );
      reportReadyIfHealthy();
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
    globalThis.removeEventListener("popstate", onPopState);
    stationary.removeEventListener("click", onStationaryClick);
    mediaDialog.removeEventListener("close", onMediaDialogClose);
    mediaDialogImage.removeAttribute("src");
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

configureBackNavigation();
void initialize().catch((error: unknown) => {
  reportFailure("V3 could not initialize", error);
});
