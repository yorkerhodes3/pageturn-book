import {
  PAGE_TURN_APPEARANCE_PRESETS,
  applyPageTurnAppearance,
  resolvePageTurnAppearance,
} from "./appearance.js";
import type {
  PageTurnAppearanceInput,
  PageTurnAppearancePresetId,
  PageTurnBindingAppearance,
  PageTurnPageFanAppearance,
  PageTurnPaperPattern,
  PageTurnResolvedAppearance,
  PageTurnSemanticChapter,
} from "./publication-types.js";
import {
  solvePageTurn,
  type PageTurnCorner,
  type PageTurnDirection,
  type PageTurnFrame,
  type PageTurnPoint,
} from "./page-turn-geometry.js";
import {
  pageTurnPolygon,
  projectPageTurn,
} from "./page-turn-projection.js";
import {
  normalizeBookFontScale,
  readBookFontScale,
  writeBookFontScale,
} from "./font-scale.js";
import { shareReadingLocation } from "./share.js";
import {
  annotationMarkdown,
  readAnnotations,
  readBookmarks,
  writeAnnotations,
  writeBookmarks,
  type V3Annotation,
  type V3Bookmark,
} from "./personal.js";

type SemanticBlock = Readonly<{
  node: HTMLElement;
  anchor: string;
  chapterTitle: string;
  chapterLabel: string;
  chapterStart: boolean;
}>;

type V3Chapter = Pick<
  PageTurnSemanticChapter,
  "chapterId" | "title" | "href" | "firstAnchor"
>;

type V3TocEntry = Readonly<{
  title: string;
  chapterId: string;
  anchor: string;
  children: readonly V3TocEntry[];
}>;

export type PageTurnBookManifest = Readonly<{
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
  tableOfContents: readonly V3TocEntry[];
}>;

export type PageTurnBookMediaTreatment = "off" | "on" | "popout";

export type PageTurnBookMediaFigure = Readonly<{
  id: string;
  chapterId: string;
  afterAnchor?: string;
  replaceAnchors?: readonly string[];
  src: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
}>;

export type PageTurnBookMedia = Readonly<{
  defaultTreatment: PageTurnBookMediaTreatment;
  figures: readonly PageTurnBookMediaFigure[];
}>;

export type PageTurnBookOptions = Readonly<{
  root: ParentNode;
  bookId: string;
  manifestUrl: string | URL;
  chapterId?: string;
  chaptersStartOnRight?: boolean;
  appearance?: PageTurnAppearanceInput;
  appearancePreset?: PageTurnAppearancePresetId;
  appearanceControls?: boolean;
  media?: PageTurnBookMedia;
  mediaTreatment?: PageTurnBookMediaTreatment;
  fetch?: typeof globalThis.fetch;
  libraryUrl?: string | URL;
  locationUrl?(location: PageTurnBookLocation): string | URL;
  embedded?: boolean;
  keyboardScope?: "root" | "document";
  urlMode?: "managed" | "none";
  updateDocumentTitle?: boolean;
}>;

export type PageTurnBookHandle = Readonly<{
  ready: Promise<void>;
  getAppearance(): PageTurnResolvedAppearance;
  setAppearance(
    appearance: PageTurnAppearanceInput | PageTurnAppearancePresetId,
  ): void;
  destroy(): void;
}>;

type V3SearchRecord = Readonly<{
  chapterId: string;
  chapterTitle: string;
  anchor: string;
  text: string;
}>;

type V3Selection = Readonly<{
  chapterId: string;
  anchor: string;
  quote: string;
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

export type PageTurnBookLocation = Readonly<{
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
  pointerFrame?: number;
  pendingPointer?: PageTurnPoint;
  moving: HTMLElement;
  revealed: HTMLElement;
  curve: HTMLElement;
  shadow: HTMLElement;
};

export function attachPageTurnBook(
  options: PageTurnBookOptions,
): PageTurnBookHandle {
const root = options.root;
const managesUrl = options.urlMode === "managed";
const query = managesUrl
  ? new URLSearchParams(globalThis.location.search)
  : new URLSearchParams();
const requestedBookId = options.bookId;
const requestedChapterId = options.chapterId ?? query.get("chapter");
const mediaConfig = options.media;
const fetcher = options.fetch ?? globalThis.fetch;
const requestController = new AbortController();
const maximumSegmentCharacters = 540;
const chaptersStartOnRight = options.chaptersStartOnRight ?? true;
const canCreateDurableLinks =
  managesUrl || options.locationUrl !== undefined;
const originalDocumentTitle = document.title;
const managesDocumentTitle = options.updateDocumentTitle ?? managesUrl;
let assignedDocumentTitle: string | undefined;
let baseAppearance: PageTurnAppearanceInput = options.appearance ?? {};
let requestedAppearancePreset: PageTurnAppearancePresetId =
  options.appearancePreset ?? baseAppearance.preset ?? "default";
let requestedAppearanceOverrides: PageTurnAppearanceInput | undefined;
let currentAppearance = resolvePageTurnAppearance(
  baseAppearance,
  requestedAppearancePreset,
);

function requiredElement<T extends Element>(
  selector: string,
  searchRoot: ParentNode = root,
): T {
  const node = searchRoot.querySelector<T>(selector);
  if (!node) {
    throw new Error(`PageTurn is missing required shell element: ${selector}`);
  }
  return node;
}

function mediaTreatmentFrom(
  parameters: URLSearchParams,
): PageTurnBookMediaTreatment {
  const requested = parameters.get("media");
  if (requested === null) {
    return options.mediaTreatment ?? mediaConfig?.defaultTreatment ?? "off";
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

function applyPublicationIdentity(publication: PageTurnBookManifest): void {
  publicationTitle.textContent = publication.title;
  coverKicker.textContent =
    publication.authors[0]?.name ?? "Semantic publication";
  coverTitle.textContent = publication.title;
  coverSubtitle.textContent =
    publication.cover?.subtitle ?? "Complete semantic edition";
  if (managesDocumentTitle) {
    assignedDocumentTitle = `${publication.title} - Semantic book reader`;
    document.title = assignedDocumentTitle;
  }
  baseAppearance = {
    ...options.appearance,
    cover: {
      ...(publication.cover?.background
        ? { background: publication.cover.background }
        : {}),
      ...(publication.cover?.foreground
        ? { foreground: publication.cover.foreground }
        : {}),
      ...(publication.cover?.accent
        ? { accent: publication.cover.accent }
        : {}),
      ...options.appearance?.cover,
    },
  };
  currentAppearance = resolvePageTurnAppearance(
    baseAppearance,
    requestedAppearancePreset,
    requestedAppearanceOverrides
      ? { ...requestedAppearanceOverrides, preset: "custom" }
      : undefined,
  );
  applyPageTurnAppearance(reader, currentAppearance);
  renderAppearanceControls();
  mediaPicker.hidden = mediaConfig === undefined;
  mediaSelect.disabled = mediaConfig === undefined;
  mediaSelect.value = mediaTreatment;
  reader.classList.toggle("v3-has-media", mediaConfig !== undefined);
  reader.dataset.v3MediaMode = mediaTreatment;
  exploreButton.disabled = false;
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
  figure: PageTurnBookMediaFigure,
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
    const replacementAnchors = figure.replaceAnchors ?? [];
    if (replacementAnchors.length > 0) {
      const replacementIndex = result.findIndex(({ anchor }) =>
        replacementAnchors.includes(anchor),
      );
      if (replacementIndex < 0) {
        throw new Error(
          `V3 figure ${figure.id} cannot find replacement anchors`,
        );
      }
      const remaining = result.filter(
        ({ anchor }) => !replacementAnchors.includes(anchor),
      );
      result.splice(0, result.length, ...remaining);
      result.splice(
        Math.min(replacementIndex, result.length),
        0,
        mediaFigureBlock(figure, chapterState),
      );
      continue;
    }
    if (!figure.afterAnchor) {
      throw new Error(`V3 figure ${figure.id} has no insertion anchor`);
    }
    let anchorIndex = result.length - 1;
    while (
      anchorIndex >= 0 &&
      result[anchorIndex]?.anchor !== figure.afterAnchor
    ) {
      anchorIndex -= 1;
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

function parseTocEntry(value: unknown, path: string): V3TocEntry {
  const entry = record(value, path);
  const location = record(entry.location, `${path}.location`);
  const childrenValue = entry.children ?? [];
  if (!Array.isArray(childrenValue)) {
    throw new Error(`V3 manifest ${path}.children must be an array`);
  }
  return {
    title: stringValue(entry.title, `${path}.title`),
    chapterId: stringValue(
      location.chapterId,
      `${path}.location.chapterId`,
    ),
    anchor: stringValue(location.anchor, `${path}.location.anchor`),
    children: childrenValue.map((child, index) =>
      parseTocEntry(child, `${path}.children[${index}]`),
    ),
  };
}

function parseV3Manifest(value: unknown): PageTurnBookManifest {
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
      ),
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
  const tocValue = root.tableOfContents;
  if (!Array.isArray(tocValue) || tocValue.length === 0) {
    throw new Error("V3 manifest tableOfContents must be a non-empty array");
  }
  const tableOfContents = tocValue.map((entry, index) =>
    parseTocEntry(entry, `tableOfContents[${index}]`),
  );
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
    tableOfContents,
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

function markLocalChapterLinks(node: HTMLElement): void {
  if (!manifest) {
    return;
  }
  for (const link of node.querySelectorAll<HTMLAnchorElement>("a[href]")) {
    const href = link.getAttribute("href");
    const match = href
      ? /^\.\.\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?(?:#([^?]+))?$/.exec(href)
      : null;
    const chapterId = match?.[1];
    if (
      !chapterId ||
      !manifest.chapters.some(
        ({ chapterId: candidate }) => String(candidate) === chapterId,
      )
    ) {
      continue;
    }
    link.dataset.v3ChapterLink = chapterId;
    if (match?.[2]) {
      link.dataset.v3ChapterAnchor = decodeURIComponent(match[2]);
    }
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
        markLocalChapterLinks(paragraph);
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
    markLocalChapterLinks(clone);
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
  manifest: PageTurnBookManifest;
  url: URL;
}> {
  const url = new URL(options.manifestUrl.toString(), globalThis.location.href);
  const response = await fetcher(url, { signal: requestController.signal });
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
  const response = await fetcher(new URL(chapter.href, manifestUrl), {
    signal: requestController.signal,
  });
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

function frontMatterPages(manifest: PageTurnBookManifest): PrototypePage[] {
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

function numberedChapterPages(chapterIndex: number): PrototypePage[] {
  return (
    chapterStates[chapterIndex]?.pages?.filter(
      (chapterPage) => chapterPage.kind === "content",
    ) ?? []
  );
}

function folioLabel(
  page: PrototypePage,
  composedFolio: number,
): Readonly<{ text: string; ariaLabel: string }> | undefined {
  if (page.kind === "front-matter") {
    const roman = ["i", "ii", "iii"][composedFolio - 1];
    return roman
      ? { text: roman, ariaLabel: `Front matter page ${composedFolio} of 3` }
      : undefined;
  }
  if (page.kind !== "content" || page.chapterIndex === undefined) {
    return undefined;
  }
  const contentPages = numberedChapterPages(page.chapterIndex);
  const chapterPageIndex = contentPages.indexOf(page);
  if (chapterPageIndex < 0) {
    return undefined;
  }
  return {
    text: `${chapterPageIndex + 1} / ${contentPages.length}`,
    ariaLabel:
      `Chapter page ${chapterPageIndex + 1} of ${contentPages.length}`,
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
  if (!decorative) {
    applyAnnotationMarkers(content);
  }
  const pageFolio = createElement("div", "v3-sheet-folio");
  const displayedFolio = folioLabel(page, folio);
  if (displayedFolio) {
    pageFolio.textContent = displayedFolio.text;
    pageFolio.setAttribute("aria-label", displayedFolio.ariaLabel);
    pageFolio.dataset.v3FolioScope =
      page.kind === "content" ? "chapter" : "front-matter";
  } else {
    pageFolio.hidden = true;
  }
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
const exploreButton = requiredElement<HTMLButtonElement>("[data-v3-explore]");
const appearanceButton = requiredElement<HTMLButtonElement>(
  "[data-v3-appearance]",
);
const appearanceDialog = requiredElement<HTMLDialogElement>(
  "[data-v3-appearance-dialog]",
);
const appearanceForm = requiredElement<HTMLFormElement>(
  "[data-v3-appearance-form]",
);
const closeAppearance = requiredElement<HTMLButtonElement>(
  "[data-v3-close-appearance]",
);
const appearancePreset = requiredElement<HTMLSelectElement>(
  "[data-v3-appearance-preset]",
);
const paperColor = requiredElement<HTMLInputElement>("[data-v3-paper-color]");
const inkColor = requiredElement<HTMLInputElement>("[data-v3-ink-color]");
const paperHighlight = requiredElement<HTMLInputElement>(
  "[data-v3-paper-highlight]",
);
const pageEdgeColor = requiredElement<HTMLInputElement>(
  "[data-v3-page-edge-color]",
);
const pageEdgeStyle = requiredElement<HTMLSelectElement>(
  "[data-v3-page-edge-style]",
);
const pagePattern = requiredElement<HTMLSelectElement>("[data-v3-page-pattern]");
const ruleColor = requiredElement<HTMLInputElement>("[data-v3-rule-color]");
const ruleSpacing = requiredElement<HTMLInputElement>(
  "[data-v3-rule-spacing]",
);
const paperAge = requiredElement<HTMLInputElement>("[data-v3-paper-age]");
const paperTexture = requiredElement<HTMLInputElement>(
  "[data-v3-paper-texture]",
);
const typeface = requiredElement<HTMLSelectElement>("[data-v3-typeface]");
const appearanceLineHeight = requiredElement<HTMLInputElement>(
  "[data-v3-line-height]",
);
const baseTypeScale = requiredElement<HTMLInputElement>(
  "[data-v3-base-type-scale]",
);
const dropCap = requiredElement<HTMLInputElement>("[data-v3-drop-cap]");
const gutterLift = requiredElement<HTMLInputElement>("[data-v3-gutter-lift]");
const bottomLift = requiredElement<HTMLInputElement>("[data-v3-bottom-lift]");
const foreEdgeLift = requiredElement<HTMLInputElement>(
  "[data-v3-fore-edge-lift]",
);
const cornerRoundness = requiredElement<HTMLInputElement>(
  "[data-v3-corner-roundness]",
);
const foldRadius = requiredElement<HTMLInputElement>("[data-v3-fold-radius]");
const foldShadow = requiredElement<HTMLInputElement>("[data-v3-fold-shadow]");
const boardOverhang = requiredElement<HTMLInputElement>(
  "[data-v3-board-overhang]",
);
const bindingMaterial = requiredElement<HTMLSelectElement>(
  "[data-v3-binding-material]",
);
const bindingDepth = requiredElement<HTMLSelectElement>(
  "[data-v3-binding-depth]",
);
const spineStyle = requiredElement<HTMLSelectElement>(
  "[data-v3-spine-style]",
);
const appearancePageCount = requiredElement<HTMLInputElement>(
  "[data-v3-page-count]",
);
const bindingHubs = requiredElement<HTMLInputElement>(
  "[data-v3-binding-hubs]",
);
const coverColor = requiredElement<HTMLInputElement>("[data-v3-cover-color]");
const coverForeground = requiredElement<HTMLInputElement>(
  "[data-v3-cover-foreground]",
);
const bindingColor = requiredElement<HTMLInputElement>(
  "[data-v3-binding-color]",
);
const accentColor = requiredElement<HTMLInputElement>(
  "[data-v3-accent-color]",
);
const resetAppearance = requiredElement<HTMLButtonElement>(
  "[data-v3-reset-appearance]",
);
const appearanceStatus = requiredElement<HTMLOutputElement>(
  "[data-v3-appearance-status]",
);
const exploreDialog = requiredElement<HTMLDialogElement>(
  "[data-v3-explore-dialog]",
);
const contents = requiredElement<HTMLElement>("[data-v3-contents]");
const searchForm = requiredElement<HTMLFormElement>("[data-v3-search-form]");
const searchInput = requiredElement<HTMLInputElement>("[data-v3-search-input]");
const searchStatus = requiredElement<HTMLElement>("[data-v3-search-status]");
const searchResults = requiredElement<HTMLOListElement>(
  "[data-v3-search-results]",
);
const bookmarkCurrent = requiredElement<HTMLButtonElement>(
  "[data-v3-bookmark-current]",
);
const bookmarkList = requiredElement<HTMLOListElement>(
  "[data-v3-bookmark-list]",
);
const selectionPreview = requiredElement<HTMLElement>(
  "[data-v3-selection-preview]",
);
const annotationNote = requiredElement<HTMLTextAreaElement>(
  "[data-v3-annotation-note]",
);
const saveAnnotation = requiredElement<HTMLButtonElement>(
  "[data-v3-save-annotation]",
);
const annotationList = requiredElement<HTMLOListElement>(
  "[data-v3-annotation-list]",
);
const exportAnnotations = requiredElement<HTMLButtonElement>(
  "[data-v3-export-annotations]",
);
const resumeNotice = requiredElement<HTMLElement>("[data-v3-resume-notice]");
const resumeLabel = requiredElement<HTMLElement>("[data-v3-resume-label]");
const startOver = requiredElement<HTMLButtonElement>("[data-v3-start-over]");
const backLink = requiredElement<HTMLAnchorElement>("[data-v3-back]");
const previous = requiredElement<HTMLButtonElement>("[data-v3-previous]");
const next = requiredElement<HTMLButtonElement>("[data-v3-next]");
const corners = Array.from(
  root.querySelectorAll<HTMLButtonElement>("[data-v3-direction]"),
);
shareButton.hidden = !canCreateDurableLinks;
appearanceButton.hidden = !(options.appearanceControls ?? managesUrl);
const singlePageMedia = globalThis.matchMedia("(max-width: 48rem)");
const reducedMotion = globalThis.matchMedia(
  "(prefers-reduced-motion: reduce)",
);

let manifest: PageTurnBookManifest | undefined;
let manifestUrl: URL | undefined;
let chapterStates: ChapterState[] = [];
let pages: PrototypePage[] = [];
let paginationVersion = 0;
let spreadStart = 0;
let activeTurn: ActiveTurn | undefined;
let resizeTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
let appearanceTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
let openingTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
let chapterWindowVersion = 0;
let retainedChapterIndices: number[] = [];
let opening = true;
let fontScale = 1;
let mediaTreatment: PageTurnBookMediaTreatment =
  mediaConfig?.defaultTreatment ?? "off";
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
let bookmarks: V3Bookmark[] = [];
let annotations: V3Annotation[] = [];
let pendingSelection: V3Selection | undefined;
let searchRecordsPromise: Promise<readonly V3SearchRecord[]> | undefined;
let searchController: AbortController | undefined;
let resumedFromStorage = false;
let destroyed = false;

if (options.embedded === true) {
  const embeddedRoot =
    root instanceof HTMLElement ? root : document.body;
  embeddedRoot.classList.add("v3-page-embedded");
}

function configureBackNavigation(): void {
  let destination = options.libraryUrl
    ? new URL(options.libraryUrl.toString(), globalThis.location.href)
    : undefined;
  let label = "Library";
  try {
    if (managesUrl && document.referrer) {
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
  if (!destination) {
    backLink.hidden = true;
    backLink.removeAttribute("href");
    return;
  }
  backLink.hidden = false;
  backLink.href = destination.href;
  backLink.textContent = label;
  backLink.dataset.v3BackMode = label === "Back" ? "referrer" : "library";
}

function tocList(entries: readonly V3TocEntry[]): HTMLOListElement {
  const list = createElement("ol", "v3-contents-list");
  for (const entry of entries) {
    const item = createElement("li");
    const link = createElement("button", undefined, entry.title);
    link.type = "button";
    link.dataset.v3GoChapter = entry.chapterId;
    link.dataset.v3GoAnchor = entry.anchor;
    item.append(link);
    if (entry.children.length > 0) {
      item.append(tocList(entry.children));
    }
    list.append(item);
  }
  return list;
}

function renderContents(): void {
  contents.replaceChildren(
    ...(manifest ? [tocList(manifest.tableOfContents)] : []),
  );
}

function searchRecordElements(
  article: HTMLElement,
  chapter: V3Chapter,
): V3SearchRecord[] {
  return Array.from(article.children).flatMap((child) => {
    if (
      !(child instanceof HTMLElement) ||
      !child.id ||
      !child.matches(
        "h1, h2, h3, h4, h5, h6, p, blockquote, ul, ol, table, pre, figure",
      )
    ) {
      return [];
    }
    const text = child.textContent?.replace(/\s+/g, " ").trim() ?? "";
    return text.length < 2
      ? []
      : [
          {
            chapterId: String(chapter.chapterId),
            chapterTitle: chapter.title,
            anchor: child.id,
            text,
          },
        ];
  });
}

async function loadSearchRecords(): Promise<readonly V3SearchRecord[]> {
  if (searchRecordsPromise) {
    return searchRecordsPromise;
  }
  if (!manifest || !manifestUrl) {
    throw new Error("V3 cannot search before loading the publication");
  }
  const publication = manifest;
  const publicationUrl = manifestUrl;
  const controller = new AbortController();
  searchController = controller;
  searchRecordsPromise = (async () => {
    const records: V3SearchRecord[][] = Array.from(
      { length: publication.chapters.length },
      () => [],
    );
    let nextIndex = 0;
    const worker = async () => {
      while (nextIndex < publication.chapters.length) {
        const index = nextIndex;
        nextIndex += 1;
        const chapter = publication.chapters[index];
        if (!chapter) {
          continue;
        }
        const response = await fetcher(new URL(chapter.href, publicationUrl), {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(
            `V3 search could not load ${chapter.title} (${response.status})`,
          );
        }
        const parsed = new DOMParser().parseFromString(
          await response.text(),
          "text/html",
        );
        const article =
          parsed.querySelector<HTMLElement>("[data-reader-content]");
        if (!article) {
          throw new Error(
            `V3 search could not find content for ${chapter.title}`,
          );
        }
        records[index] = searchRecordElements(article, chapter);
      }
    };
    await Promise.all(
      Array.from(
        { length: Math.min(4, publication.chapters.length) },
        () => worker(),
      ),
    );
    return records.flat();
  })()
    .then((records) => {
      if (searchController === controller) {
        searchController = undefined;
      }
      return records;
    })
    .catch((error: unknown) => {
      if (searchController === controller) {
        searchController = undefined;
      }
      searchRecordsPromise = undefined;
      throw error;
    });
  return searchRecordsPromise;
}

function searchSnippet(text: string, matchIndex: number, length: number): string {
  const start = Math.max(0, matchIndex - 55);
  const end = Math.min(text.length, matchIndex + length + 95);
  return `${start > 0 ? "..." : ""}${text.slice(start, end)}${
    end < text.length ? "..." : ""
  }`;
}

async function runSearch(queryText: string): Promise<void> {
  const queryValue = queryText.replace(/\s+/g, " ").trim();
  if (queryValue.length < 2) {
    searchStatus.textContent = "Enter at least two characters.";
    searchResults.replaceChildren();
    return;
  }
  searchStatus.textContent = "Building the on-demand text index...";
  searchInput.disabled = true;
  try {
    const queryLower = queryValue.toLocaleLowerCase();
    const matches = (await loadSearchRecords())
      .flatMap((entry) => {
        const index = entry.text.toLocaleLowerCase().indexOf(queryLower);
        return index < 0 ? [] : [{ entry, index }];
      })
      .slice(0, 50);
    searchResults.replaceChildren(
      ...matches.map(({ entry, index }) => {
        const item = createElement("li");
        const open = createElement(
          "button",
          undefined,
          `${entry.chapterTitle}: ${searchSnippet(
            entry.text,
            index,
            queryValue.length,
          )}`,
        );
        open.type = "button";
        open.dataset.v3GoChapter = entry.chapterId;
        open.dataset.v3GoAnchor = entry.anchor;
        item.append(open);
        return item;
      }),
    );
    searchStatus.textContent =
      matches.length === 0
        ? `No results for "${queryValue}".`
        : `${matches.length} result${matches.length === 1 ? "" : "s"} for "${queryValue}".`;
  } finally {
    searchInput.disabled = false;
  }
}

function personalLocationUrl(
  chapterId: string,
  anchor: string,
): string {
  if (!manifest) {
    throw new Error("V3 publication is unavailable");
  }
  return readingLocationUrl(
    {
      bookId: manifest.bookId,
      editionId: manifest.editionId,
      chapterId,
      anchor,
    },
    false,
  ).href;
}

function toolLocationButton(
  label: string,
  chapterId: string,
  anchor: string,
): HTMLButtonElement {
  const open = createElement("button", undefined, label);
  open.type = "button";
  open.dataset.v3GoChapter = chapterId;
  open.dataset.v3GoAnchor = anchor;
  return open;
}

function renderBookmarks(): void {
  const location = currentReadingLocation();
  const currentBookmark = location
    ? bookmarks.find(
        ({ chapterId, anchor }) =>
          chapterId === location.chapterId && anchor === location.anchor,
      )
    : undefined;
  bookmarkCurrent.disabled = location === undefined;
  bookmarkCurrent.setAttribute(
    "aria-pressed",
    String(currentBookmark !== undefined),
  );
  bookmarkCurrent.textContent = currentBookmark
    ? "Remove current bookmark"
    : "Bookmark current passage";
  bookmarkList.replaceChildren(
    ...bookmarks.map((bookmark, index) => {
      const item = createElement("li");
      item.append(
        toolLocationButton(
          bookmark.label,
          bookmark.chapterId,
          bookmark.anchor,
        ),
      );
      const remove = createElement("button", undefined, "Remove");
      remove.type = "button";
      remove.dataset.v3RemoveBookmark = String(index);
      remove.setAttribute("aria-label", `Remove bookmark: ${bookmark.label}`);
      item.append(remove);
      return item;
    }),
  );
}

function renderAnnotations(): void {
  selectionPreview.hidden = pendingSelection === undefined;
  selectionPreview.textContent = pendingSelection?.quote ?? "";
  annotationNote.disabled = pendingSelection === undefined;
  saveAnnotation.disabled = pendingSelection === undefined;
  exportAnnotations.disabled =
    annotations.length === 0 || !canCreateDurableLinks;
  annotationList.replaceChildren(
    ...annotations.map((annotation) => {
      const item = createElement("li");
      const quote = createElement(
        "blockquote",
        undefined,
        annotation.quote,
      );
      item.append(
        toolLocationButton(
          annotation.note.trim() || annotation.quote.slice(0, 80),
          annotation.chapterId,
          annotation.anchor,
        ),
        quote,
      );
      if (annotation.note.trim()) {
        item.append(createElement("p", undefined, annotation.note));
      }
      const remove = createElement("button", undefined, "Delete");
      remove.type = "button";
      remove.dataset.v3RemoveAnnotation = annotation.id;
      remove.setAttribute("aria-label", "Delete private annotation");
      item.append(remove);
      return item;
    }),
  );
}

function renderPersonalTools(): void {
  renderBookmarks();
  renderAnnotations();
}

function selectionElement(node: Node | null): Element | undefined {
  return node instanceof Element
    ? node
    : node?.parentElement ?? undefined;
}

function currentTextSelection(): V3Selection | undefined {
  const selection = document.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    return undefined;
  }
  const range = selection.getRangeAt(0);
  const start = selectionElement(range.startContainer);
  const end = selectionElement(range.endContainer);
  const startSheet = start?.closest<HTMLElement>(
    "[data-v3-stationary] .v3-sheet",
  );
  const endSheet = end?.closest<HTMLElement>(
    "[data-v3-stationary] .v3-sheet",
  );
  if (!startSheet || startSheet !== endSheet) {
    return undefined;
  }
  const quote = selection.toString().replace(/\s+/g, " ").trim();
  if (quote.length < 2 || quote.length > 2_000) {
    return undefined;
  }
  const source = start?.closest<HTMLElement>("[data-source-anchor]");
  const anchor = source?.dataset.sourceAnchor ?? startSheet.dataset.v3Anchor;
  const chapterId = startSheet.dataset.v3Chapter;
  return anchor && chapterId ? { chapterId, anchor, quote } : undefined;
}

function onSelectionChange(): void {
  const selection = currentTextSelection();
  if (selection) {
    pendingSelection = selection;
  }
  renderSelectionControls();
  if (exploreDialog.open) {
    renderAnnotations();
  }
}

function toggleCurrentBookmark(): void {
  if (!manifest) {
    return;
  }
  const location = currentReadingLocation();
  if (!location) {
    return;
  }
  const index = bookmarks.findIndex(
    ({ chapterId, anchor }) =>
      chapterId === location.chapterId && anchor === location.anchor,
  );
  if (index >= 0) {
    bookmarks.splice(index, 1);
  } else {
    const chapter = manifest.chapters.find(
      ({ chapterId }) => String(chapterId) === location.chapterId,
    );
    bookmarks.push({
      chapterId: location.chapterId,
      anchor: location.anchor,
      label: chapter?.title ?? activePage()?.runningTitle ?? "Saved passage",
      createdAt: new Date().toISOString(),
    });
  }
  writeBookmarks(manifest.bookId, manifest.editionId, bookmarks);
  renderBookmarks();
}

function saveCurrentAnnotation(): void {
  if (!manifest || !pendingSelection) {
    return;
  }
  annotations.push({
    id: crypto.randomUUID(),
    chapterId: pendingSelection.chapterId,
    anchor: pendingSelection.anchor,
    quote: pendingSelection.quote,
    note: annotationNote.value.trim(),
    createdAt: new Date().toISOString(),
  });
  writeAnnotations(manifest.bookId, manifest.editionId, annotations);
  annotationNote.value = "";
  pendingSelection = undefined;
  document.getSelection()?.removeAllRanges();
  renderAnnotations();
  renderStationary("none");
}

function exportPrivateAnnotations(): void {
  if (!manifest || annotations.length === 0 || !canCreateDurableLinks) {
    return;
  }
  const markdown = annotationMarkdown(
    manifest.title,
    annotations,
    ({ chapterId, anchor }) => personalLocationUrl(chapterId, anchor),
  );
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const download = createElement("a");
  download.href = url;
  download.download = `${manifest.bookId}-annotations.md`;
  download.click();
  globalThis.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function applyAnnotationMarkers(root: ParentNode): void {
  const anchors = new Set(annotations.map(({ anchor }) => anchor));
  for (const node of root.querySelectorAll<HTMLElement>(
    "[data-source-anchor]",
  )) {
    if (node.dataset.sourceAnchor && anchors.has(node.dataset.sourceAnchor)) {
      node.classList.add("v3-annotated");
    }
  }
}

function openExploreDialog(): void {
  renderPersonalTools();
  exploreDialog.showModal();
}

function onExploreDialogClose(): void {
  searchController?.abort();
  searchController = undefined;
}

function onExploreDialogClick(event: MouseEvent): void {
  if (!(event.target instanceof Element)) {
    return;
  }
  const location = event.target.closest<HTMLElement>(
    "[data-v3-go-chapter]",
  );
  const chapterId = location?.dataset.v3GoChapter;
  const anchor = location?.dataset.v3GoAnchor;
  if (location && chapterId && anchor) {
    exploreDialog.close();
    void goToLocation(chapterId, anchor, "push").catch((error: unknown) => {
      reportFailure("V3 could not open the selected book location", error);
    });
    return;
  }
  const bookmarkRemoval = event.target.closest<HTMLElement>(
    "[data-v3-remove-bookmark]",
  )?.dataset.v3RemoveBookmark;
  if (bookmarkRemoval !== undefined && manifest) {
    const index = Number(bookmarkRemoval);
    if (!Number.isInteger(index) || index < 0 || index >= bookmarks.length) {
      throw new Error(`V3 bookmark index is unavailable: ${bookmarkRemoval}`);
    }
    bookmarks.splice(index, 1);
    writeBookmarks(manifest.bookId, manifest.editionId, bookmarks);
    renderBookmarks();
    return;
  }
  const annotationRemoval = event.target.closest<HTMLElement>(
    "[data-v3-remove-annotation]",
  )?.dataset.v3RemoveAnnotation;
  if (annotationRemoval && manifest) {
    annotations = annotations.filter(({ id }) => id !== annotationRemoval);
    writeAnnotations(manifest.bookId, manifest.editionId, annotations);
    renderAnnotations();
    renderStationary("none");
  }
}

function startFromBeginning(): void {
  clearResumeLocation();
  resumedFromStorage = false;
  resumeNotice.hidden = true;
  void goToLocation("", undefined, "push").catch((error: unknown) => {
    reportFailure("V3 could not restart the publication", error);
  });
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
  if (lifecycle.signal.aborted) {
    return Promise.reject(new DOMException("Aborted", "AbortError"));
  }
  if (spread.clientWidth > 0 && spread.clientHeight > 0) {
    return Promise.resolve();
  }
  return new Promise((resolveLayout, rejectLayout) => {
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      observer.disconnect();
      lifecycle.signal.removeEventListener("abort", abort);
      if (error) {
        rejectLayout(error);
      } else {
        resolveLayout();
      }
    };
    const abort = () => {
      finish(new DOMException("Aborted", "AbortError"));
    };
    const observer = new ResizeObserver(() => {
      if (spread.clientWidth > 0 && spread.clientHeight > 0) {
        finish();
      }
    });
    const timeout = globalThis.setTimeout(() => {
      finish(
        new Error("V3 book did not receive a measurable layout"),
      );
    }, timeoutMs);
    lifecycle.signal.addEventListener("abort", abort, { once: true });
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
  publication: PageTurnBookManifest,
): PageTurnBookLocation | undefined {
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

function writeResumeLocation(location: PageTurnBookLocation): void {
  try {
    globalThis.localStorage.setItem(
      resumeStorageKey(location.bookId),
      JSON.stringify(location),
    );
  } catch (error) {
    console.warn("V3 reading location could not be saved", error);
  }
}

function clearResumeLocation(): void {
  if (!manifest) {
    return;
  }
  try {
    globalThis.localStorage.removeItem(resumeStorageKey(manifest.bookId));
  } catch (error) {
    console.warn("V3 reading location could not be cleared", error);
  }
}

function currentReadingLocation(): PageTurnBookLocation | undefined {
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
  location: PageTurnBookLocation | undefined,
  preserveContext: boolean,
): URL {
  if (!manifest) {
    throw new Error("V3 cannot create a location before loading a publication");
  }
  if (!managesUrl && location && options.locationUrl) {
    return new URL(
      options.locationUrl(location).toString(),
      globalThis.location.href,
    );
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
  if (managesUrl) {
    const url = readingLocationUrl(location, true);
    if (url.href !== globalThis.location.href) {
      if (update === "push") {
        globalThis.history.pushState({ v3Location: true }, "", url);
      } else {
        globalThis.history.replaceState({ v3Location: true }, "", url);
      }
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

function renderSelectionControls(): void {
  shareButton.textContent = pendingSelection ? "Share selection" : "Share";
  shareButton.setAttribute(
    "aria-label",
    pendingSelection ? "Share selected text and location" : "Share location",
  );
}

function applyFontScale(value: number): void {
  fontScale = normalizeBookFontScale(value);
  reader.style.setProperty(
    "--v3-font-scale",
    String(fontScale * currentAppearance.typography.baseScale),
  );
  renderFontControls();
}

const typefaceOptions = {
  classic: {
    bodyFamily: 'Georgia, "Times New Roman", serif',
    headingFamily: 'Georgia, "Times New Roman", serif',
  },
  antique: {
    bodyFamily: 'Palatino Linotype, Book Antiqua, Georgia, serif',
    headingFamily: 'Palatino Linotype, Book Antiqua, Georgia, serif',
  },
  modern: {
    bodyFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    headingFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
  },
  technical: {
    bodyFamily: 'IBM Plex Mono, Consolas, "Courier New", monospace',
    headingFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
  },
  handwritten: {
    bodyFamily: '"Segoe Print", "Bradley Hand", cursive',
    headingFamily: '"Segoe Print", "Bradley Hand", cursive',
  },
} as const;

type TypefaceId = keyof typeof typefaceOptions;

function currentTypeface(): TypefaceId {
  const entry = Object.entries(typefaceOptions).find(
    ([, fonts]) =>
      fonts.bodyFamily === currentAppearance.typography.bodyFamily &&
      fonts.headingFamily === currentAppearance.typography.headingFamily,
  );
  return (entry?.[0] as TypefaceId | undefined) ?? "classic";
}

function selectedPaperPattern(value: string): PageTurnPaperPattern {
  return value === "lined" || value === "grid" ? value : "plain";
}

function selectedPageEdgeStyle(
  value: string,
): PageTurnPageFanAppearance["edgeStyle"] {
  return value === "gold" || value === "red" || value === "marbled"
    ? value
    : "plain";
}

function fanForStyle(
  edgeStyle: PageTurnPageFanAppearance["edgeStyle"],
): Partial<PageTurnPageFanAppearance> {
  if (edgeStyle === "gold") {
    return {
      edgeStyle,
      stripeDark: "#8d6427",
      stripeLight: "#e0bd67",
      stripeMid: "#b98a35",
    };
  }
  if (edgeStyle === "red") {
    return {
      edgeStyle,
      stripeDark: "#71332f",
      stripeLight: "#d6b4a6",
      stripeMid: "#a9574e",
    };
  }
  if (edgeStyle === "marbled") {
    return {
      edgeStyle,
      stripeDark: "#6f4729",
      stripeLight: "#d3ad65",
      stripeMid: "#98683d",
    };
  }
  return {
    edgeStyle,
    stripeDark: "#b9ab91",
    stripeLight: "#f2eadc",
    stripeMid: "#d8cbb6",
  };
}

function selectedBindingMaterial(
  value: string,
): PageTurnBindingAppearance["material"] {
  return value === "cloth" || value === "paper" ? value : "leather";
}

function selectedBindingDepth(
  value: string,
): PageTurnBindingAppearance["depth"] {
  return value === "slim" || value === "thick" ? value : "standard";
}

function selectedSpineStyle(
  value: string,
): Required<PageTurnBindingAppearance>["spineStyle"] {
  return value === "flat" || value === "exposed-stitch"
    ? value
    : "raised-hubs";
}

function selectedTypeface(value: string): TypefaceId {
  return value in typefaceOptions ? (value as TypefaceId) : "classic";
}

function presetLabel(presetId: PageTurnAppearancePresetId): string {
  return (
    PAGE_TURN_APPEARANCE_PRESETS.find(({ id }) => id === presetId)?.label ??
    "Custom"
  );
}

function presetDescription(presetId: PageTurnAppearancePresetId): string {
  return (
    PAGE_TURN_APPEARANCE_PRESETS.find(({ id }) => id === presetId)
      ?.description ?? "Custom appearance combination"
  );
}

function renderAppearanceControls(): void {
  if (appearancePreset.options.length === 0) {
    appearancePreset.append(
      ...PAGE_TURN_APPEARANCE_PRESETS.map(
        ({ id, label }) => new Option(label, id),
      ),
      new Option("Custom", "custom"),
    );
  }
  appearancePreset.value = currentAppearance.preset;
  paperColor.value = currentAppearance.paper.color;
  inkColor.value = currentAppearance.paper.inkColor;
  paperHighlight.value = currentAppearance.paper.highlight;
  pageEdgeColor.value = currentAppearance.paper.edgeColor;
  pageEdgeStyle.value = currentAppearance.fan.edgeStyle;
  pagePattern.value = currentAppearance.paper.pattern;
  ruleColor.value = currentAppearance.paper.ruleColor;
  ruleSpacing.value = String(currentAppearance.paper.ruleSpacingRem);
  paperAge.value = String(currentAppearance.paper.age);
  paperTexture.value = String(currentAppearance.paper.texture);
  typeface.value = currentTypeface();
  appearanceLineHeight.value = String(
    currentAppearance.typography.lineHeight,
  );
  baseTypeScale.value = String(currentAppearance.typography.baseScale);
  dropCap.checked = currentAppearance.typography.dropCap;
  gutterLift.value = String(currentAppearance.geometry.gutterLift);
  bottomLift.value = String(currentAppearance.geometry.bottomLift);
  foreEdgeLift.value = String(currentAppearance.geometry.foreEdgeLift);
  cornerRoundness.value = String(
    currentAppearance.geometry.cornerRoundness,
  );
  foldRadius.value = String(currentAppearance.geometry.foldRadius);
  foldShadow.value = String(currentAppearance.geometry.foldShadow);
  boardOverhang.value = String(currentAppearance.geometry.boardOverhang);
  bindingMaterial.value = currentAppearance.binding.material;
  bindingDepth.value = currentAppearance.binding.depth;
  spineStyle.value = currentAppearance.binding.spineStyle;
  appearancePageCount.value = String(currentAppearance.binding.pageCount);
  bindingHubs.value = String(currentAppearance.binding.hubs);
  coverColor.value = currentAppearance.cover.background;
  coverForeground.value = currentAppearance.cover.foreground;
  bindingColor.value = currentAppearance.binding.color;
  accentColor.value = currentAppearance.binding.accent;
  appearanceStatus.value =
    `${presetLabel(currentAppearance.preset)} — ` +
    presetDescription(currentAppearance.preset);
}

function scheduleAppearanceRepagination(): void {
  if (!manifest || pages.length === 0) {
    return;
  }
  if (appearanceTimer !== undefined) {
    clearTimeout(appearanceTimer);
  }
  appearanceTimer = globalThis.setTimeout(() => {
    appearanceTimer = undefined;
    if (destroyed) {
      return;
    }
    const preservation = currentPreservation();
    if (activeTurn) {
      finishTurn(false);
    }
    reader.setAttribute("aria-busy", "true");
    status.textContent = "Applying book appearance";
    void document.fonts.ready
      .then(() => {
        if (destroyed) {
          return;
        }
        rebuildPages(
          preservation.anchor,
          preservation.progress,
          preservation.chapterIndex,
          preservation.chapterPageOffset,
        );
        reportReadyIfHealthy();
      })
      .catch((error: unknown) => {
        reportFailure("V3 could not apply the book appearance", error);
      });
  }, 140);
}

function applyAppearance(
  appearance: PageTurnResolvedAppearance,
  repaginate: boolean,
): void {
  currentAppearance = appearance;
  applyPageTurnAppearance(reader, currentAppearance);
  applyFontScale(fontScale);
  renderAppearanceControls();
  if (repaginate) {
    scheduleAppearanceRepagination();
  }
}

function mergeAppearanceInputs(
  previous: PageTurnAppearanceInput | undefined,
  next: PageTurnAppearanceInput,
): PageTurnAppearanceInput {
  return {
    ...previous,
    ...next,
    cover: { ...previous?.cover, ...next.cover },
    binding: { ...previous?.binding, ...next.binding },
    paper: { ...previous?.paper, ...next.paper },
    fan: { ...previous?.fan, ...next.fan },
    typography: { ...previous?.typography, ...next.typography },
    geometry: { ...previous?.geometry, ...next.geometry },
  };
}

function requiresAppearanceRepagination(
  previous: PageTurnResolvedAppearance,
  next: PageTurnResolvedAppearance,
): boolean {
  return (
    previous.typography.bodyFamily !== next.typography.bodyFamily ||
    previous.typography.headingFamily !== next.typography.headingFamily ||
    previous.typography.lineHeight !== next.typography.lineHeight ||
    previous.typography.baseScale !== next.typography.baseScale ||
    previous.typography.dropCap !== next.typography.dropCap
  );
}

function setBookAppearance(
  appearance: PageTurnAppearanceInput | PageTurnAppearancePresetId,
): void {
  if (typeof appearance === "string") {
    requestedAppearancePreset = appearance;
    requestedAppearanceOverrides = undefined;
    const next = resolvePageTurnAppearance(baseAppearance, appearance);
    applyAppearance(
      next,
      requiresAppearanceRepagination(currentAppearance, next),
    );
    return;
  }
  if (appearance.preset && appearance.preset !== "custom") {
    requestedAppearancePreset = appearance.preset;
  }
  requestedAppearanceOverrides = mergeAppearanceInputs(
    requestedAppearanceOverrides,
    appearance,
  );
  const next = resolvePageTurnAppearance(
    baseAppearance,
    requestedAppearancePreset,
    { ...requestedAppearanceOverrides, preset: "custom" },
  );
  applyAppearance(
    next,
    requiresAppearanceRepagination(currentAppearance, next),
  );
}

function appearanceFromControls(): PageTurnAppearanceInput {
  const selectedFonts = typefaceOptions[selectedTypeface(typeface.value)];
  const depth = selectedBindingDepth(bindingDepth.value);
  return {
    preset: "custom",
    cover: {
      background: coverColor.value,
      foreground: coverForeground.value,
      accent: accentColor.value,
    },
    binding: {
      material: selectedBindingMaterial(bindingMaterial.value),
      color: bindingColor.value,
      accent: accentColor.value,
      depth,
      boardThickness: depth,
      spineStyle: selectedSpineStyle(spineStyle.value),
      pageCount: Number(appearancePageCount.value),
      hubs: Number(bindingHubs.value),
    },
    paper: {
      color: paperColor.value,
      highlight: paperHighlight.value,
      edgeColor: pageEdgeColor.value,
      inkColor: inkColor.value,
      pattern: selectedPaperPattern(pagePattern.value),
      ruleColor: ruleColor.value,
      ruleSpacingRem: Number(ruleSpacing.value),
      age: Number(paperAge.value),
      texture: Number(paperTexture.value),
    },
    fan: fanForStyle(selectedPageEdgeStyle(pageEdgeStyle.value)),
    typography: {
      ...selectedFonts,
      lineHeight: Number(appearanceLineHeight.value),
      baseScale: Number(baseTypeScale.value),
      dropCap: dropCap.checked,
    },
    geometry: {
      gutterLift: Number(gutterLift.value),
      bottomLift: Number(bottomLift.value),
      foreEdgeLift: Number(foreEdgeLift.value),
      cornerRoundness: Number(cornerRoundness.value),
      foldRadius: Number(foldRadius.value),
      foldShadow: Number(foldShadow.value),
      boardOverhang: Number(boardOverhang.value),
    },
  };
}

function openAppearanceDialog(): void {
  renderAppearanceControls();
  appearanceDialog.showModal();
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
    !canCreateDurableLinks ||
    opening ||
    pendingTurn ||
    activeTurn !== undefined ||
    sharing ||
    manifest === undefined;
  renderFontControls();
  renderSelectionControls();
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
    const chapterPages = numberedChapterPages(focusedPage.chapterIndex);
    const localIndices = visiblePages.flatMap((page) => {
      const localIndex = chapterPages.indexOf(page);
      return localIndex >= 0 ? [localIndex + 1] : [];
    });
    const pageLabel =
      localIndices.length > 1
        ? `pages ${localIndices[0]}–${localIndices.at(-1)}`
        : localIndices.length === 1
          ? `page ${localIndices[0]}`
          : focusedPage.kind === "blank"
            ? "blank verso"
            : "chapter loading";
    counter.value =
      `Chapter ${focusedPage.chapterIndex + 1}/${chapterStates.length}` +
      ` · ${pageLabel}` +
      (localIndices.length > 0
        ? `/${Math.max(1, chapterPages.length)}`
        : "") +
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
  if (
    pendingSelection &&
    stationary.querySelector(
      `[data-source-anchor="${CSS.escape(pendingSelection.anchor)}"]`,
    ) === null
  ) {
    pendingSelection = undefined;
  }
  if (exploreDialog.open) {
    renderPersonalTools();
  }
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
  if (managesUrl && !applyingHistory) {
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
  if (!manifest || sharing || !canCreateDurableLinks) {
    return;
  }
  sharing = true;
  shareStatus.value = "Preparing reading link";
  renderControls();
  const selectedText = pendingSelection;
  const currentLocation = currentReadingLocation();
  const location =
    selectedText && currentLocation
      ? {
          ...currentLocation,
          chapterId: selectedText.chapterId,
          anchor: selectedText.anchor,
        }
      : currentLocation;
  const chapter = location
    ? manifest.chapters.find(
        ({ chapterId }) => String(chapterId) === location.chapterId,
      )
    : undefined;
  const title = chapter
    ? `${manifest.title}: ${chapter.title}`
    : manifest.title;
  const url = readingLocationUrl(location, false);
  shareStatus.value = await shareReadingLocation(
    title,
    url.href,
    selectedText?.quote,
  );
  if (selectedText) {
    pendingSelection = undefined;
    document.getSelection()?.removeAllRanges();
  }
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
  const chapterLink = event.target.closest<HTMLAnchorElement>(
    "[data-v3-chapter-link]",
  );
  const chapterLinkId = chapterLink?.dataset.v3ChapterLink;
  if (chapterLink && chapterLinkId) {
    event.preventDefault();
    const chapter = manifest?.chapters.find(
      ({ chapterId }) => String(chapterId) === chapterLinkId,
    );
    void goToLocation(
      chapterLinkId,
      chapterLink.dataset.v3ChapterAnchor ?? chapter?.firstAnchor,
      "push",
    ).catch((error: unknown) => {
      reportFailure("V3 could not open the linked chapter", error);
    });
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
    createElement("div", "v3-paper-occluder"),
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
    createElement("div", "v3-paper-occluder"),
    createSheet(
      selected.revealed,
      selected.revealedSide,
      selected.revealedIndex + 1,
      true,
    ),
  );
  const shadow = createElement("div", "v3-fold-shadow");
  shadow.setAttribute("aria-hidden", "true");
  const curve = createElement("div", "v3-fold-curve");
  curve.setAttribute("aria-hidden", "true");
  turnLayer.replaceChildren(revealed, moving, shadow, curve);

  activeTurn = {
    direction,
    corner,
    targetSpread: target,
    pointer,
    progress: 0,
    moving,
    revealed,
    curve,
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
  const projection = projectPageTurn(frame, {
    foldCurvature: currentAppearance.geometry.foldRadius,
  });
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
  const shadowScale =
    0.55 + currentAppearance.geometry.foldShadow * 0.75;
  const shadowWidth = Math.max(3, shadow.width * shadowScale);
  const curveWidth = Math.min(
    frame.page.width * 0.26,
    Math.max(
      frame.page.width *
        (0.08 + currentAppearance.geometry.foldRadius * 0.12),
      shadow.width * 1.35,
    ),
  );
  const normalX = Math.cos(shadow.angleRadians);
  const normalY = Math.sin(shadow.angleRadians);
  const shadowOffset =
    shadow.gradient === "to-left" ? -shadowWidth : 0;
  const curveOffset =
    shadow.gradient === "to-right" ? -curveWidth : 0;
  turn.shadow.style.width = `${shadowWidth}px`;
  turn.shadow.style.height = `${shadow.length}px`;
  turn.shadow.style.opacity = String(
    Math.min(
      0.42,
      Math.max(
        0,
        shadow.opacity *
          (0.28 + currentAppearance.geometry.foldShadow * 0.42),
      ),
    ),
  );
  turn.shadow.style.background =
    shadow.gradient === "to-right"
      ? "linear-gradient(to right, rgb(38 27 16 / 58%), transparent)"
      : "linear-gradient(to left, rgb(38 27 16 / 58%), transparent)";
  turn.shadow.style.transformOrigin = "0 0";
  turn.shadow.style.transform = [
    `translate3d(${shadow.origin.x + singlePageOffset + normalX * shadowOffset}px,`,
    `${shadow.origin.y + normalY * shadowOffset}px, 0)`,
    `rotate(${shadow.angleRadians}rad)`,
  ].join(" ");
  turn.curve.style.width = `${curveWidth}px`;
  turn.curve.style.height = `${shadow.length}px`;
  turn.curve.style.opacity = String(
    Math.min(
      0.62,
      0.22 +
        shadow.opacity *
          (0.25 + currentAppearance.geometry.foldRadius * 0.28),
    ),
  );
  turn.curve.style.setProperty(
    "--v3-fold-curve-direction",
    shadow.gradient === "to-right" ? "90deg" : "270deg",
  );
  turn.curve.style.transformOrigin = "0 0";
  turn.curve.style.transform = [
    `translate3d(${shadow.origin.x + singlePageOffset + normalX * curveOffset}px,`,
    `${shadow.origin.y + normalY * curveOffset}px, 0)`,
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
  if (turn.pointerFrame !== undefined) {
    cancelAnimationFrame(turn.pointerFrame);
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
  if (turn.pointerFrame !== undefined) {
    cancelAnimationFrame(turn.pointerFrame);
    delete turn.pointerFrame;
  }
  delete turn.pendingPointer;
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
  turn.pendingPointer = pointerForEvent(event, turn.direction);
  if (turn.pointerFrame === undefined) {
    turn.pointerFrame = requestAnimationFrame(() => {
      delete turn.pointerFrame;
      if (activeTurn === turn && turn.pendingPointer) {
        const pointer = turn.pendingPointer;
        delete turn.pendingPointer;
        applyTurn(pointer);
      }
    });
  }
}

function onPointerEnd(event: PointerEvent): void {
  const turn = activeTurn;
  if (!turn || turn.pointerId !== event.pointerId) {
    return;
  }
  event.preventDefault();
  if (turn.pointerFrame !== undefined) {
    cancelAnimationFrame(turn.pointerFrame);
    delete turn.pointerFrame;
  }
  if (turn.pendingPointer) {
    const pointer = turn.pendingPointer;
    delete turn.pendingPointer;
    applyTurn(pointer);
  }
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
  paginationVersion += 1;
  reader.dataset.v3PaginationVersion = String(paginationVersion);
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
  if (destroyed) {
    return;
  }
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
  location: PageTurnBookLocation;
  source: "resume" | "url";
}>;

function initialReadingLocation(
  publication: PageTurnBookManifest,
): InitialReadingLocation | undefined {
  const anchor = managesUrl ? decodeLocationHash() : undefined;
  let chapterId = requestedChapterId ?? null;
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
  const historyBookId = params.get("book") ?? requestedBookId;
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
  bookmarks = readBookmarks(manifest.bookId, manifest.editionId);
  annotations = readAnnotations(manifest.bookId, manifest.editionId);
  renderContents();
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
  resumedFromStorage = initialLocation?.source === "resume";
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
  if (resumedFromStorage) {
    const chapter = manifest.chapters.find(
      ({ chapterId }) =>
        String(chapterId) === initialLocation?.location.chapterId,
    );
    resumeLabel.textContent =
      `Resumed at ${chapter?.title ?? "your last reading location"}.`;
    resumeNotice.hidden = false;
  }
  locationTrackingReady = true;
  syncCurrentLocation("replace");
  reportReady();
  startOpening();
  queueChapterWindow(initialWindowCenter);
}

const lifecycle = new AbortController();
const listenerOptions = { signal: lifecycle.signal };

for (const corner of corners) {
  corner.addEventListener("pointerdown", onCornerPointerDown, listenerOptions);
}
spread.addEventListener("pointermove", onPointerMove, listenerOptions);
spread.addEventListener("pointerup", onPointerEnd, listenerOptions);
spread.addEventListener("pointercancel", onPointerCancel, listenerOptions);
stationary.addEventListener("click", onStationaryClick, listenerOptions);
previous.addEventListener(
  "click",
  () => void automaticTurn("backward"),
  listenerOptions,
);
next.addEventListener(
  "click",
  () => void automaticTurn("forward"),
  listenerOptions,
);
decreaseFont.addEventListener(
  "click",
  () => setFontScale(fontScale - 0.1),
  listenerOptions,
);
increaseFont.addEventListener(
  "click",
  () => setFontScale(fontScale + 0.1),
  listenerOptions,
);
shareButton.addEventListener(
  "click",
  () => void shareCurrentLocation(),
  listenerOptions,
);
appearanceButton.addEventListener(
  "click",
  openAppearanceDialog,
  listenerOptions,
);
closeAppearance.addEventListener(
  "click",
  () => appearanceDialog.close(),
  listenerOptions,
);
appearancePreset.addEventListener(
  "change",
  () =>
    setBookAppearance(
      appearancePreset.value as PageTurnAppearancePresetId,
    ),
  listenerOptions,
);
appearanceForm.addEventListener(
  "input",
  (event) => {
    if (
      event.target === appearancePreset ||
      (event.target instanceof HTMLInputElement &&
        event.target.type === "number")
    ) {
      return;
    }
    setBookAppearance(appearanceFromControls());
  },
  listenerOptions,
);
appearanceForm.addEventListener(
  "change",
  (event) => {
    if (
      event.target instanceof HTMLInputElement &&
      event.target.type === "number"
    ) {
      setBookAppearance(appearanceFromControls());
    }
  },
  listenerOptions,
);
resetAppearance.addEventListener(
  "click",
  () =>
    setBookAppearance(
      options.appearancePreset ?? baseAppearance.preset ?? "default",
    ),
  listenerOptions,
);
exploreButton.addEventListener("click", openExploreDialog, listenerOptions);
exploreDialog.addEventListener("click", onExploreDialogClick, listenerOptions);
exploreDialog.addEventListener("close", onExploreDialogClose, listenerOptions);
searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void runSearch(searchInput.value).catch((error: unknown) => {
    searchStatus.textContent =
      error instanceof DOMException && error.name === "AbortError"
        ? "Search cancelled."
        : `Search failed: ${prototypeErrorMessage(error)}`;
  });
}, listenerOptions);
bookmarkCurrent.addEventListener("click", toggleCurrentBookmark, listenerOptions);
saveAnnotation.addEventListener("click", saveCurrentAnnotation, listenerOptions);
exportAnnotations.addEventListener(
  "click",
  exportPrivateAnnotations,
  listenerOptions,
);
startOver.addEventListener("click", startFromBeginning, listenerOptions);
mediaSelect.addEventListener("change", () => {
  try {
    setMediaTreatment(mediaSelect.value);
  } catch (error: unknown) {
    reportFailure("V3 could not change the image treatment", error);
  }
}, listenerOptions);
mediaDialog.addEventListener("close", onMediaDialogClose, listenerOptions);
chapterSelect.addEventListener("change", () =>
  void goToChapter(chapterSelect.value).catch((error: unknown) => {
    reportFailure("V3 could not open the selected chapter", error);
  }),
  listenerOptions,
);

const onKeyDown = (event: KeyboardEvent) => {
  if (
    options.keyboardScope !== "document" &&
    root instanceof Element &&
    (!(event.target instanceof Node) || !root.contains(event.target))
  ) {
    return;
  }
  if (
    mediaDialog.open ||
    appearanceDialog.open ||
    exploreDialog.open ||
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
document.addEventListener("keydown", onKeyDown, listenerOptions);
document.addEventListener("selectionchange", onSelectionChange, listenerOptions);
if (managesUrl) {
  globalThis.addEventListener("popstate", onPopState, listenerOptions);
}

const observer = new ResizeObserver(() => {
  if (!manifest || pages.length === 0) {
    return;
  }
  if (resizeTimer !== undefined) {
    clearTimeout(resizeTimer);
  }
  if (appearanceTimer !== undefined) {
    clearTimeout(appearanceTimer);
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

function destroy(): void {
  if (destroyed) {
    return;
  }
  destroyed = true;
  lifecycle.abort();
  requestController.abort();
  observer.disconnect();
  searchController?.abort();
  mediaDialogImage.removeAttribute("src");
  chapterSelect.replaceChildren();
  if (resizeTimer !== undefined) {
    clearTimeout(resizeTimer);
  }
  if (appearanceTimer !== undefined) {
    clearTimeout(appearanceTimer);
  }
  if (openingTimer !== undefined) {
    clearTimeout(openingTimer);
  }
  if (activeTurn?.animationFrame !== undefined) {
    cancelAnimationFrame(activeTurn.animationFrame);
  }
  if (activeTurn?.pointerFrame !== undefined) {
    cancelAnimationFrame(activeTurn.pointerFrame);
  }
  if (
    assignedDocumentTitle &&
    document.title === assignedDocumentTitle
  ) {
    document.title = originalDocumentTitle;
  }
  const embeddedRoot = root instanceof HTMLElement ? root : document.body;
  embeddedRoot.classList.remove("v3-page-embedded");
}

globalThis.addEventListener("pagehide", destroy, {
  once: true,
  signal: lifecycle.signal,
});

configureBackNavigation();
const ready = initialize().catch((error: unknown) => {
  if (
    destroyed &&
    error instanceof DOMException &&
    error.name === "AbortError"
  ) {
    return;
  }
  reportFailure("V3 could not initialize", error);
  throw error;
});

return {
  ready,
  getAppearance: () => currentAppearance,
  setAppearance: setBookAppearance,
  destroy,
};
}
