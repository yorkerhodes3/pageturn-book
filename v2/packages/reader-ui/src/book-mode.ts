import type {
  ChapterId,
  PublicationManifest,
  SemanticChapter,
  SemanticLocation,
} from "@ethical-tech/book-publication-model";
import type { ReaderSession } from "@ethical-tech/book-reader-core";
import {
  applyPublicationAppearance,
  publicationPageFanCount,
} from "./appearance.js";
import { shareReadingLocation } from "./share.js";

type BookPage = {
  kind: "cover" | "front-matter" | "toc" | "content";
  label: string;
  chapterId: ChapterId;
  chapterTitle: string;
  anchor: string;
  sourceAnchors: string[];
  sourceSpans: Array<{
    anchor: string;
    start: number;
    end: number;
  }>;
  syntheticSpan?: {
    section: "inside-cover" | "title" | "thesis" | "toc" | "notes";
    start: number;
    end: number;
  };
  nodes: Node[];
  screenNumber?: number;
  continuation?: boolean;
};

type BookSpreadSlot = {
  side: "left" | "right";
  page?: BookPage;
  blank: "none" | "inside-cover" | "end";
};

type RenderBookOptions = {
  viewIndex?: number;
  slots?: BookSpreadSlot[];
  keepClosed?: boolean;
  showCover?: boolean;
  counterText?: string;
  allowCorner?: boolean;
};

export type SemanticBookModeOptions = {
  navigate(location: SemanticLocation): Promise<boolean>;
  onOpenChange?(open: boolean): void;
  onCoverReached?(): void;
  startAtCover?(): boolean;
  fetch?: typeof globalThis.fetch;
  singlePageQuery?: string;
};

export type SemanticBookMode = {
  open(trigger: HTMLElement): Promise<void>;
  close(): void;
  isOpen(): boolean;
  showCover(): void;
  destroy(): void;
};

export const SEMANTIC_BOOK_SINGLE_PAGE_QUERY = "(max-width: 45rem)";

type PaginationProfile = {
  targetUnits: number;
  maximumBlockCharacters: number;
  maximumListCharacters: number;
  maximumQuoteCharacters: number;
  headingOneCost: number;
  headingTwoCost: number;
};

const SPREAD_PAGINATION: PaginationProfile = {
  targetUnits: 1_100,
  maximumBlockCharacters: 760,
  maximumListCharacters: 520,
  maximumQuoteCharacters: 620,
  headingOneCost: 280,
  headingTwoCost: 210,
};

const SINGLE_PAGE_PAGINATION: PaginationProfile = {
  targetUnits: 570,
  maximumBlockCharacters: 340,
  maximumListCharacters: 260,
  maximumQuoteCharacters: 300,
  headingOneCost: 520,
  headingTwoCost: 430,
};

const SHORT_VIEWPORT_PAGINATION: PaginationProfile = {
  targetUnits: 540,
  maximumBlockCharacters: 320,
  maximumListCharacters: 240,
  maximumQuoteCharacters: 280,
  headingOneCost: 480,
  headingTwoCost: 400,
};

function normalizeFontScale(value: number): number {
  const finite = Number.isFinite(value) ? value : 1;
  return Number(
    (Math.round(Math.min(1.3, Math.max(0.8, finite)) * 10) / 10).toFixed(1),
  );
}

function readFontScale(bookId: string, fallback: number): number {
  try {
    const stored = globalThis.localStorage.getItem(
      `ethical-tech-book-font:${bookId}`,
    );
    return stored === null ? fallback : normalizeFontScale(Number(stored));
  } catch (error) {
    console.warn("Book text size preference could not be read", error);
    return fallback;
  }
}

function writeFontScale(bookId: string, value: number): void {
  try {
    globalThis.localStorage.setItem(
      `ethical-tech-book-font:${bookId}`,
      String(value),
    );
  } catch (error) {
    console.warn("Book text size preference could not be saved", error);
  }
}

function scaledPaginationProfile(
  profile: PaginationProfile,
  fontScale: number,
): PaginationProfile {
  const divisor = Math.pow(fontScale, 1.55);
  return {
    targetUnits: Math.max(320, Math.round(profile.targetUnits / divisor)),
    maximumBlockCharacters: Math.max(
      190,
      Math.round(profile.maximumBlockCharacters / divisor),
    ),
    maximumListCharacters: Math.max(
      160,
      Math.round(profile.maximumListCharacters / divisor),
    ),
    maximumQuoteCharacters: Math.max(
      180,
      Math.round(profile.maximumQuoteCharacters / divisor),
    ),
    headingOneCost: profile.headingOneCost,
    headingTwoCost: profile.headingTwoCost,
  };
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}

const idReferenceAttributes = [
  "aria-controls",
  "aria-describedby",
  "aria-details",
  "aria-errormessage",
  "aria-labelledby",
  "aria-owns",
  "for",
  "headers",
];

function cloneGroupForBook(nodes: Element[], pageKey: string): Node[] {
  const clones = nodes.map((node) => node.cloneNode(true) as Element);
  const idMap = new Map<string, string>();
  const allElements = clones.flatMap((clone) => [
    clone,
    ...Array.from(clone.querySelectorAll("*")),
  ]);

  let idIndex = 0;
  for (const node of allElements) {
    if (!node.id) {
      continue;
    }
    node.setAttribute("data-book-source-anchor", node.id);
    const replacement = `book-mode-${pageKey}-${++idIndex}`;
    idMap.set(node.id, replacement);
    node.id = replacement;
  }

  for (const node of allElements) {
    for (const attribute of idReferenceAttributes) {
      const value = node.getAttribute(attribute);
      if (!value) {
        continue;
      }
      const rewritten = value
        .split(/\s+/)
        .map((id) => idMap.get(id) ?? id)
        .join(" ");
      node.setAttribute(attribute, rewritten);
    }

    const href = node.getAttribute("href");
    if (href?.startsWith("#")) {
      const replacement = idMap.get(decodeURIComponent(href.slice(1)));
      if (replacement) {
        node.setAttribute("href", `#${encodeURIComponent(replacement)}`);
      }
    }
  }

  return clones;
}

function sourceAnchors(nodes: Element[]): string[] {
  return nodes.flatMap((node) => [
    ...(node.id ? [node.id] : []),
    ...Array.from(node.querySelectorAll<HTMLElement>("[id]"), (child) => child.id),
  ]);
}

type PaginatedBlock = {
  node: Element;
  sourceAnchors: string[];
  navigationAnchor?: string;
  sourceStart: number;
  sourceEnd: number;
  units: number;
  startsPage: boolean;
  continuation: boolean;
};

function textBreaks(
  value: string,
  maximum: number,
): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  let start = 0;
  while (start < value.length) {
    let end = Math.min(value.length, start + maximum);
    if (end < value.length) {
      const candidate = value.slice(start, end);
      const minimum = Math.floor(candidate.length * 0.58);
      const sentenceBreaks = Array.from(
        candidate.matchAll(/[.!?]["'’”)]?\s+/g),
      );
      const sentence = sentenceBreaks.at(-1);
      const sentenceEnd =
        sentence?.index === undefined
          ? -1
          : sentence.index + sentence[0].trimEnd().length;
      if (sentenceEnd >= minimum) {
        end = start + sentenceEnd;
      } else {
        const whitespace = candidate.lastIndexOf(" ");
        if (whitespace >= minimum) {
          end = start + whitespace;
        }
      }
    }
    if (end <= start) {
      end = Math.min(value.length, start + maximum);
    }
    while (end < value.length && /\s/.test(value[end] ?? "")) {
      end += 1;
    }
    ranges.push({ start, end });
    start = end;
  }
  return ranges;
}

function textPoint(
  nodes: Text[],
  offset: number,
  endPoint: boolean,
): { node: Text; offset: number } {
  let consumed = 0;
  for (const [index, node] of nodes.entries()) {
    const next = consumed + node.data.length;
    if (
      offset < next ||
      (endPoint && offset === next) ||
      index === nodes.length - 1
    ) {
      return {
        node,
        offset: Math.min(node.data.length, Math.max(0, offset - consumed)),
      };
    }
    consumed = next;
  }
  const last = nodes.at(-1);
  if (!last) {
    throw new Error("Cannot locate text offset in an empty element");
  }
  return { node: last, offset: last.data.length };
}

function removeContinuationIds(node: Element): void {
  node.removeAttribute("id");
  for (const identified of node.querySelectorAll("[id]")) {
    identified.removeAttribute("id");
  }
}

function splitElementForBook(
  source: Element,
  profile: PaginationProfile,
): Array<{ node: Element; start: number; end: number }> {
  const text = source.textContent ?? "";
  if (
    source.matches(
      "img, picture, video, audio, canvas, svg, iframe, object, embed, input, textarea, select, button, hr, br",
    ) ||
    source.querySelector(
      "img, picture, video, audio, canvas, svg, iframe, object, embed, input, textarea, select, button, hr, br",
    )
  ) {
    return [{ node: source, start: 0, end: text.length }];
  }
  const maximum =
    source.tagName === "UL" || source.tagName === "OL"
      ? profile.maximumListCharacters
      : source.tagName === "BLOCKQUOTE"
        ? profile.maximumQuoteCharacters
        : profile.maximumBlockCharacters;
  if (
    text.length <= maximum ||
    /^H[1-6]$/.test(source.tagName)
  ) {
    return [{ node: source, start: 0, end: text.length }];
  }

  const walker = document.createTreeWalker(source, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    textNodes.push(current as Text);
    current = walker.nextNode();
  }
  if (textNodes.length === 0) {
    return [{ node: source, start: 0, end: text.length }];
  }

  const breaks = textBreaks(text, maximum);
  return breaks.map(({ start, end }, index) => {
    const range = document.createRange();
    const startPoint = textPoint(textNodes, start, false);
    const endPoint = textPoint(textNodes, end, true);
    if (index === 0) {
      range.setStart(source, 0);
    } else {
      range.setStart(startPoint.node, startPoint.offset);
    }
    if (index === breaks.length - 1) {
      range.setEnd(source, source.childNodes.length);
    } else {
      range.setEnd(endPoint.node, endPoint.offset);
    }
    const fragment = source.cloneNode(false) as Element;
    fragment.append(range.cloneContents());
    if (index > 0) {
      removeContinuationIds(fragment);
    }
    return { node: fragment, start, end };
  });
}

function blockUnits(node: Element, profile: PaginationProfile): number {
  const text = node.textContent?.trim().length ?? 0;
  const structuralCost =
    node.tagName === "H1"
      ? profile.headingOneCost
      : node.tagName === "H2"
        ? profile.headingTwoCost
        : node.tagName === "UL" || node.tagName === "OL"
          ? 80
          : node.tagName === "BLOCKQUOTE"
            ? 70
            : 34;
  return text + structuralCost;
}

function pagesFromArticle(
  article: HTMLElement,
  chapter: SemanticChapter,
  profile: PaginationProfile,
): BookPage[] {
  const sourceNodes = Array.from(article.children).filter(
    (node) => !node.classList.contains("book-chapter-nav"),
  );
  const blocks = sourceNodes.flatMap<PaginatedBlock>((source) => {
    const originalAnchors = sourceAnchors([source]);
    return splitElementForBook(source, profile).map(
      ({ node, start, end }, index) => ({
      node,
      sourceAnchors: sourceAnchors([node]),
      ...(originalAnchors[0]
        ? { navigationAnchor: originalAnchors[0] }
        : {}),
      sourceStart: start,
      sourceEnd: end,
      units: blockUnits(node, profile),
      startsPage: index === 0 && /^H[12]$/.test(source.tagName),
      continuation: index > 0,
      }),
    );
  });
  const pages: PaginatedBlock[][] = [];
  let current: PaginatedBlock[] = [];
  let units = 0;
  for (const block of blocks) {
    if (
      current.length > 0 &&
      (block.startsPage || units + block.units > profile.targetUnits)
    ) {
      pages.push(current);
      current = [];
      units = 0;
    }
    current.push(block);
    units += block.units;
  }
  if (current.length > 0) {
    pages.push(current);
  }

  return pages.map((blocksOnPage, index) => {
    const anchors = Array.from(
      new Set(blocksOnPage.flatMap((block) => block.sourceAnchors)),
    );
    const anchor =
      blocksOnPage[0]?.navigationAnchor ??
      anchors[0] ??
      (index === 0 ? chapter.firstAnchor : chapter.lastAnchor);
    return {
      kind: "content",
      label: chapter.title,
      chapterId: chapter.chapterId,
      chapterTitle: chapter.title,
      anchor,
      sourceAnchors: anchors,
      sourceSpans: blocksOnPage.flatMap((block) =>
        block.navigationAnchor
          ? [
              {
                anchor: block.navigationAnchor,
                start: block.sourceStart,
                end: block.sourceEnd,
              },
            ]
          : [],
      ),
      continuation: blocksOnPage[0]?.continuation ?? false,
      nodes: cloneGroupForBook(
        blocksOnPage.map((block) => block.node),
        `${chapter.chapterId}-${index + 1}`,
      ),
    };
  });
}

function coverPage(publication: PublicationManifest): BookPage {
  const firstChapter = publication.renditions.semantic.chapters[0];
  if (!firstChapter) {
    throw new Error("Publication contains no chapter for its cover");
  }
  const cover = document.createElement("div");
  cover.className = "book-mode-cover-content";
  const ornament = element("div", "book-mode-cover-ornament");
  ornament.setAttribute("aria-hidden", "true");
  const title = element("h1", "book-mode-cover-title", publication.title);
  const subtitleText =
    publication.appearance?.cover.subtitle ?? publication.description;
  const subtitle =
    subtitleText === undefined
      ? undefined
      : element("p", "book-mode-cover-subtitle", subtitleText);
  const authors = element(
    "p",
    "book-mode-cover-authors",
    publication.authors.map((author) => author.name).join(", "),
  );
  cover.append(ornament, title);
  if (subtitle) {
    cover.append(subtitle);
  }
  cover.append(authors);
  return {
    kind: "cover",
    label: "Front cover",
    chapterId: firstChapter.chapterId,
    chapterTitle: publication.title,
    anchor: firstChapter.firstAnchor,
    sourceAnchors: [],
    sourceSpans: [],
    nodes: [cover],
  };
}

function syntheticPage(
  publication: PublicationManifest,
  kind: "front-matter" | "toc",
  label: string,
  node: HTMLElement,
  syntheticSpan: NonNullable<BookPage["syntheticSpan"]>,
): BookPage {
  const firstChapter = publication.renditions.semantic.chapters[0];
  if (!firstChapter) {
    throw new Error("Publication contains no chapter for its front matter");
  }
  return {
    kind,
    label,
    chapterId: firstChapter.chapterId,
    chapterTitle: label,
    anchor: firstChapter.firstAnchor,
    sourceAnchors: [],
    sourceSpans: [],
    syntheticSpan,
    nodes: [node],
  };
}

function titlePage(publication: PublicationManifest): BookPage {
  const root = element("div", "book-mode-title-page");
  const kicker = element(
    "p",
    "book-mode-front-kicker",
    publication.frontMatter?.kicker ?? "Research publication",
  );
  const title = element("h1", "book-mode-front-title", publication.title);
  const subtitleText =
    publication.appearance?.cover.subtitle ?? publication.description;
  const subtitle = subtitleText
    ? element("p", "book-mode-front-subtitle", subtitleText)
    : undefined;
  const rule = element("hr", "book-mode-front-rule");
  const authors = element(
    "p",
    "book-mode-front-authors",
    publication.authors.map((author) => author.name).join(", "),
  );
  const date = publication.publicationDate
    ? element(
        "p",
        "book-mode-front-date",
        publicationDateLabel(
          publication.publicationDate,
          publication.language,
        ),
      )
    : undefined;
  root.append(kicker, title);
  if (subtitle) {
    root.append(subtitle);
  }
  root.append(rule, authors);
  if (date) {
    root.append(date);
  }
  return syntheticPage(
    publication,
    "front-matter",
    "Title page",
    root,
    { section: "title", start: 0, end: 1 },
  );
}

function publicationDateLabel(value: string, language: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  let supportedLocale = "en";
  try {
    supportedLocale =
      Intl.DateTimeFormat.supportedLocalesOf([language])[0] ?? "en";
  } catch (error) {
    if (!(error instanceof RangeError)) {
      throw error;
    }
  }
  return new Intl.DateTimeFormat(supportedLocale, {
    year: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(date);
}

function innerCoverPage(publication: PublicationManifest): BookPage {
  const root = element("div", "book-mode-inner-cover");
  root.append(
    element("p", "book-mode-front-kicker", "Publication record"),
    element("h1", "book-mode-inner-title", publication.title),
  );
  if (publication.frontMatter?.credits) {
    root.append(
      element("p", "book-mode-inner-label", "Credits"),
      element("p", "book-mode-inner-credits", publication.frontMatter.credits),
    );
  }
  if (publication.frontMatter?.canonicalUrl) {
    const link = element(
      "a",
      "book-mode-inner-link",
      publication.frontMatter.canonicalUrl,
    );
    link.href = publication.frontMatter.canonicalUrl;
    root.append(element("p", "book-mode-inner-label", "Canonical edition"), link);
  }
  return syntheticPage(
    publication,
    "front-matter",
    "Inside front cover",
    root,
    { section: "inside-cover", start: 0, end: 1 },
  );
}

function publicationPage(
  publication: PublicationManifest,
  thesis: string,
  start: number,
  end: number,
  index: number,
  total: number,
): BookPage {
  const root = element("div", "book-mode-publication-page");
  root.append(
    element("p", "book-mode-front-kicker", "Publication thesis"),
    element(
      "h1",
      "book-mode-inner-title",
      total === 1
        ? "About this publication"
        : `About this publication · ${index + 1}`,
    ),
  );
  root.append(element("p", "book-mode-publication-thesis", thesis));
  return syntheticPage(
    publication,
    "front-matter",
    total === 1
      ? "About this publication"
      : `About this publication ${index + 1}`,
    root,
    { section: "thesis", start, end },
  );
}

function publicationPages(
  publication: PublicationManifest,
  compact: boolean,
  short: boolean,
): BookPage[] {
  const thesis = publication.frontMatter?.thesis;
  if (!thesis) {
    return [];
  }
  const sections = compact
    ? textBreaks(thesis, short ? 280 : 470)
    : [{ start: 0, end: thesis.length }];
  return sections.map(({ start, end }, index) =>
    publicationPage(
      publication,
      thesis.slice(start, end),
      start,
      end,
      index,
      sections.length,
    ),
  );
}

function notesPage(
  publication: PublicationManifest,
  includeDisclaimer: boolean,
  includeNotes: boolean,
): BookPage {
  const root = element("div", "book-mode-publication-page book-mode-notes-page");
  const label =
    includeDisclaimer && includeNotes
      ? "Imprint and notes"
      : includeDisclaimer
        ? "Publication imprint"
        : "Notes and sources";
  root.append(
    element("p", "book-mode-front-kicker", label),
    element("h1", "book-mode-inner-title", label),
  );
  if (includeDisclaimer && publication.frontMatter?.disclaimer) {
    const note = element("aside", "book-mode-publication-disclaimer");
    note.append(
      element("h2", "book-mode-publication-note-title", "Publication note"),
      element("p", "", publication.frontMatter.disclaimer),
    );
    root.append(note);
  }
  if (includeNotes && publication.frontMatter?.notesStatus) {
    const notes = element("aside", "book-mode-notes-status");
    notes.append(
      element("h2", "book-mode-publication-note-title", "Notes and sources"),
      element("p", "", publication.frontMatter.notesStatus),
    );
    root.append(notes);
  }
  const references = includeNotes
    ? publication.renditions.semantic.chapters.find(
    (chapter) => chapter.chapterId === "references",
      )
    : undefined;
  if (references) {
    const link = element(
      "a",
      "book-mode-notes-link book-mode-toc-link",
      "Open the complete Works Cited",
    );
    const url = new URL(references.href, globalThis.location.href);
    url.searchParams.set("view", "book");
    url.hash = references.firstAnchor;
    link.href = url.toString();
    link.dataset.chapterId = references.chapterId;
    link.dataset.anchor = references.firstAnchor;
    root.append(link);
  }
  return syntheticPage(
    publication,
    "front-matter",
    label,
    root,
    {
      section: "notes",
      start: includeDisclaimer ? 0 : 1,
      end: includeNotes ? 2 : 1,
    },
  );
}

function notesPages(
  publication: PublicationManifest,
  compact: boolean,
): BookPage[] {
  const hasDisclaimer = publication.frontMatter?.disclaimer !== undefined;
  const hasNotes = publication.frontMatter?.notesStatus !== undefined;
  if (!hasDisclaimer && !hasNotes) {
    return [];
  }
  if (!compact) {
    return [notesPage(publication, hasDisclaimer, hasNotes)];
  }
  return [
    ...(hasDisclaimer ? [notesPage(publication, true, false)] : []),
    ...(hasNotes ? [notesPage(publication, false, true)] : []),
  ];
}

type TocRow = {
  entry: PublicationManifest["tableOfContents"][number];
  depth: number;
};

function flattenToc(
  entries: PublicationManifest["tableOfContents"],
  depth = 0,
): TocRow[] {
  return entries.flatMap((entry) => [
    { entry, depth },
    ...flattenToc(entry.children ?? [], depth + 1),
  ]);
}

function tocList(
  publication: PublicationManifest,
  rows: TocRow[],
): HTMLOListElement {
  const list = element("ol", "book-mode-toc-list");
  list.setAttribute("role", "tree");
  for (const { entry, depth } of rows) {
    const item = element("li", "book-mode-toc-item");
    item.setAttribute("role", "treeitem");
    item.setAttribute("aria-level", String(depth + 1));
    item.style.setProperty("--book-toc-depth", String(depth));
    item.classList.toggle("book-mode-toc-subitem", depth > 0);
    const chapter = publication.renditions.semantic.chapters.find(
      (candidate) => candidate.chapterId === entry.location.chapterId,
    );
    const link = element("a", "book-mode-toc-link", entry.title);
    if (chapter) {
      const url = new URL(chapter.href, globalThis.location.href);
      url.searchParams.set("view", "book");
      url.hash = entry.location.anchor;
      link.href = url.toString();
      link.dataset.chapterId = entry.location.chapterId;
      link.dataset.anchor = entry.location.anchor;
    }
    item.append(link);
    list.append(item);
  }
  return list;
}

function tocRowWeight({ entry, depth }: TocRow): number {
  return 1 + entry.title.length / 64 + depth * 0.12;
}

function contentsPages(
  publication: PublicationManifest,
  singlePage: boolean,
): BookPage[] {
  const maximumWeight = singlePage ? 7.2 : 12;
  const groups: TocRow[][] = [];
  let group: TocRow[] = [];
  let weight = 0;
  for (const row of flattenToc(publication.tableOfContents)) {
    const entryWeight = tocRowWeight(row);
    if (group.length > 0 && weight + entryWeight > maximumWeight) {
      groups.push(group);
      group = [];
      weight = 0;
    }
    group.push(row);
    weight += entryWeight;
  }
  if (group.length > 0) {
    groups.push(group);
  }
  const pages: BookPage[] = [];
  let rowStart = 0;
  for (const [index, entries] of groups.entries()) {
    const root = element("div", "book-mode-toc-page");
    const navigation = element("nav", "book-mode-toc-navigation");
    navigation.setAttribute(
      "aria-label",
      `Table of contents, part ${index + 1} of ${groups.length}`,
    );
    navigation.append(tocList(publication, entries));
    root.append(
      element(
        "p",
        "book-mode-front-kicker",
        `Contents · ${index + 1}`,
      ),
      element("h1", "book-mode-inner-title", "Contents"),
      navigation,
    );
    pages.push(
      syntheticPage(
        publication,
        "toc",
        `Contents ${index + 1}`,
        root,
        {
          section: "toc",
          start: rowStart,
          end: rowStart + entries.length,
        },
      ),
    );
    rowStart += entries.length;
  }
  return pages;
}

function frontMatterPages(
  publication: PublicationManifest,
  singlePage: boolean,
  short: boolean,
  fontScale: number,
): BookPage[] {
  const compact = singlePage || short || fontScale > 1.1;
  return [
    innerCoverPage(publication),
    titlePage(publication),
    ...publicationPages(publication, compact, short),
    ...contentsPages(publication, compact),
    ...notesPages(publication, compact),
  ];
}

function bindingElement(publication: PublicationManifest): HTMLElement {
  const binding = element("div", "book-mode-binding");
  binding.setAttribute("aria-hidden", "true");
  const leftBoard = element(
    "div",
    "book-mode-binding-board book-mode-binding-board-left",
  );
  const rightBoard = element(
    "div",
    "book-mode-binding-board book-mode-binding-board-right",
  );
  const spine = element("div", "book-mode-binding-spine");
  const shelfLabel = element(
    "span",
    "book-mode-binding-label",
    publication.appearance?.binding.shelfLabel ?? publication.title,
  );
  const hubs = element("span", "book-mode-binding-hubs");
  const hubCount = publication.appearance?.binding.hubs ?? 4;
  for (let index = 0; index < hubCount; index += 1) {
    hubs.append(element("i", "book-mode-binding-hub"));
  }
  spine.append(shelfLabel, hubs);
  const pageBlock = element("div", "book-mode-page-block");
  binding.append(leftBoard, rightBoard, pageBlock, spine);
  return binding;
}

function pageFan(
  side: "left" | "right",
  layerCount: number,
): HTMLElement {
  const fan = element(
    "div",
    `book-mode-page-fan book-mode-page-fan-${side}`,
  );
  fan.setAttribute("aria-hidden", "true");
  for (let index = 0; index < layerCount; index += 1) {
    const edge = element("i", "book-mode-page-fan-edge");
    edge.style.setProperty("--book-fan-index", String(index));
    fan.append(edge);
  }
  return fan;
}

function fitBookSheet(sheet: HTMLElement): void {
  const content = sheet.querySelector<HTMLElement>(".book-mode-sheet-content");
  if (!content) {
    return;
  }
  content.style.removeProperty("transform");
  content.style.removeProperty("width");
  sheet.removeAttribute("data-book-fit-scale");
  const available = content.clientHeight;
  const required = content.scrollHeight;
  if (available <= 0 || required <= available + 1) {
    return;
  }
  const scale = Math.min(1, available / required);
  content.style.width = `${100 / scale}%`;
  content.style.transform = `scale(${scale})`;
  sheet.dataset.bookFitScale = scale.toFixed(3);
}

async function loadArticle(
  chapter: SemanticChapter,
  content: HTMLElement,
  fetcher: typeof globalThis.fetch,
  signal: AbortSignal,
): Promise<HTMLElement> {
  if (
    content.dataset.chapterId === chapter.chapterId &&
    content.hasChildNodes()
  ) {
    return content.cloneNode(true) as HTMLElement;
  }

  const response = await fetcher(chapter.href, { signal });
  if (!response.ok) {
    throw new Error(
      `Book view could not load ${chapter.title} (${response.status})`,
    );
  }
  const parsed = new DOMParser().parseFromString(
    await response.text(),
    "text/html",
  );
  const article = parsed.querySelector<HTMLElement>("[data-reader-content]");
  if (!article) {
    throw new Error(`Book view could not find content for ${chapter.title}`);
  }
  return article;
}

function focusable(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((node) => !node.hidden);
}

export function createSemanticBookMode(
  content: HTMLElement,
  session: ReaderSession,
  options: SemanticBookModeOptions,
): SemanticBookMode {
  const fetcher = options.fetch ?? globalThis.fetch.bind(globalThis);
  const media = globalThis.matchMedia(
    options.singlePageQuery ?? SEMANTIC_BOOK_SINGLE_PAGE_QUERY,
  );
  const shortViewport = globalThis.matchMedia("(max-height: 36rem)");
  let bookFontScale = normalizeFontScale(
    session.getState().preferences.fontScale,
  );
  let fontPreferenceLoaded = false;
  let overlay: HTMLElement | undefined;
  let pages: BookPage[] = [];
  let pageIndex = 0;
  let trigger: HTMLElement | undefined;
  let loading: AbortController | undefined;
  let destroyed = false;
  let inerted: Array<{ node: HTMLElement; inert: boolean }> = [];
  let cleanupInteraction: (() => void) | undefined;
  let unsubscribeSession: (() => void) | undefined;
  let showCoverView: (() => void) | undefined;
  let operationVersion = 0;

  const close = () => {
    const wasOpen = overlay !== undefined;
    operationVersion += 1;
    loading?.abort();
    loading = undefined;
    cleanupInteraction?.();
    cleanupInteraction = undefined;
    unsubscribeSession?.();
    unsubscribeSession = undefined;
    showCoverView = undefined;
    overlay?.remove();
    overlay = undefined;
    for (const item of inerted) {
      item.node.inert = item.inert;
    }
    inerted = [];
    document.body.classList.remove("book-mode-active");
    trigger?.focus({ preventScroll: true });
    trigger = undefined;
    if (wasOpen && !destroyed) {
      options.onOpenChange?.(false);
    }
  };

  const open = async (invoker: HTMLElement) => {
    if (destroyed) {
      throw new Error("Semantic book mode has been destroyed");
    }
    if (overlay) {
      return;
    }
    const state = session.getState();
    const publication = state.publication;
    if (!publication || state.status !== "ready") {
      throw new Error("Semantic reader must be ready before opening book view");
    }
    if (publication.direction === "rtl") {
      throw new Error(
        "Physical book mode is not yet available for right-to-left publications",
      );
    }

    trigger = invoker;
    if (!fontPreferenceLoaded) {
      bookFontScale = readFontScale(publication.bookId, bookFontScale);
      fontPreferenceLoaded = true;
    }
    let fontScale = bookFontScale;
    const controller = new AbortController();
    loading = controller;
    const root = element("section", "book-mode-overlay");
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", "book-mode-title");
    applyPublicationAppearance(root, publication.appearance);
    root.dataset.bookFontSize = String(Math.round(fontScale * 100));

    const chrome = element("header", "book-mode-chrome");
    const identity = element("div", "book-mode-identity");
    const eyebrow = element("p", "book-mode-eyebrow", "Semantic book view");
    const title = element("h2", "book-mode-title", publication.title);
    title.id = "book-mode-title";
    identity.append(eyebrow, title);

    const actions = element("div", "book-mode-actions");
    const counter = element("span", "book-mode-counter", "Preparing pages");
    counter.setAttribute("aria-live", "polite");
    const fontControls = element("div", "book-mode-font-controls");
    fontControls.setAttribute("role", "group");
    fontControls.setAttribute("aria-label", "Book text size");
    const decreaseFont = element("button", "book-mode-font-button", "A−");
    decreaseFont.type = "button";
    decreaseFont.setAttribute("aria-label", "Decrease book text size");
    const fontStatus = element(
      "span",
      "book-mode-font-status",
      `${Math.round(fontScale * 100)}%`,
    );
    const increaseFont = element("button", "book-mode-font-button", "A+");
    increaseFont.type = "button";
    increaseFont.setAttribute("aria-label", "Increase book text size");
    fontControls.append(decreaseFont, fontStatus, increaseFont);
    const shareButton = element("button", "book-mode-share", "Share");
    shareButton.type = "button";
    const closeButton = element("button", "book-mode-close", "Close");
    closeButton.type = "button";
    actions.append(counter, fontControls, shareButton, closeButton);
    chrome.append(identity, actions);

    const stage = element("div", "book-mode-stage");
    const previous = element("button", "book-mode-arrow book-mode-arrow-prev", "‹");
    previous.type = "button";
    previous.setAttribute("aria-label", "Previous screen page");
    const book = element("div", "book-mode-book");
    const binding = bindingElement(publication);
    const spread = element("div", "book-mode-spread");
    spread.setAttribute("aria-busy", "true");
    book.append(binding, spread);
    const next = element("button", "book-mode-arrow book-mode-arrow-next", "›");
    next.type = "button";
    next.setAttribute("aria-label", "Next screen page");
    stage.append(previous, book, next);
    const hint = element(
      "p",
      "book-mode-hint",
      "Drag a page or its corner · Use arrows or ← → keys · Screen pages are not citations",
    );
    root.append(chrome, stage, hint);

    inerted = Array.from(document.body.children)
      .filter((node): node is HTMLElement => node instanceof HTMLElement)
      .map((node) => ({ node, inert: node.inert }));
    for (const item of inerted) {
      item.node.inert = true;
    }
    document.body.append(root);
    root.inert = false;
    document.body.classList.add("book-mode-active");
    overlay = root;
    options.onOpenChange?.(true);

    let navigating = false;
    let deferredLocation: SemanticLocation | undefined;
    let deferredCover = false;
    let loadedArticles: HTMLElement[] | undefined;
    let repaginateAfterNavigation = false;
    let queuedDirection: -1 | 1 | undefined;
    let acceptingTargetLocation = false;
    let paginationReady = false;
    let paginationSinglePage = media.matches;
    const paginationProfile = () =>
      scaledPaginationProfile(
        shortViewport.matches
          ? SHORT_VIEWPORT_PAGINATION
          : media.matches
            ? SINGLE_PAGE_PAGINATION
            : SPREAD_PAGINATION,
        fontScale,
      );

    const pageStarts = () => {
      if (media.matches) {
        return pages.map((_page, index) => index);
      }
      const starts = pages.length > 1 ? [0, 1] : [0];
      for (let index = 3; index < pages.length; index += 2) {
        starts.push(index);
      }
      return starts;
    };
    const alignedIndex = (index: number) => {
      if (media.matches || index <= 1) {
        return index;
      }
      return 1 + Math.floor((index - 1) / 2) * 2;
    };
    const boundedIndex = (index: number) =>
      Math.min(alignedIndex(index), pageStarts().at(-1) ?? 0);
    const fanLayerCount = publicationPageFanCount(publication.appearance);
    const contentPageCount = () =>
      pages.filter((page) => page.kind === "content").length;

    const spreadSlots = (startIndex: number): BookSpreadSlot[] => {
      const page = pages[startIndex];
      if (media.matches) {
        return page
          ? [{ side: "right", page, blank: "none" }]
          : [];
      }
      if (page?.kind === "cover") {
        return [{ side: "right", page, blank: "none" }];
      }
      if (startIndex === 1) {
        const title = pages[startIndex + 1];
        return [
          ...(page
            ? [{ side: "left" as const, page, blank: "inside-cover" as const }]
            : []),
          ...(title
            ? [
                {
                  side: "right" as const,
                  page: title,
                  blank: "none" as const,
                },
              ]
            : []),
        ];
      }
      const rightPage = pages[startIndex + 1];
      return [
        ...(page
          ? [{ side: "left" as const, page, blank: "none" as const }]
          : [{ side: "left" as const, blank: "end" as const }]),
        rightPage
          ? { side: "right", page: rightPage, blank: "none" }
          : { side: "right", blank: "end" },
      ];
    };

    const navigationPageForTarget = (
      target: number,
      direction: -1 | 1,
    ): BookPage | undefined => {
      const slots = spreadSlots(target);
      const contentPages = slots
        .map((slot) => slot.page)
        .filter(
          (page): page is BookPage => page?.kind === "content",
        );
      if (contentPages.length === 1) {
        return contentPages[0];
      }
      const starts = pageStarts();
      const isFinalForwardSpread =
        direction > 0 && starts.indexOf(target) === starts.length - 1;
      if (isFinalForwardSpread) {
        return (
          slots.find((slot) => slot.side === "right")?.page ??
          slots.find((slot) => slot.side === "left")?.page
        );
      }
      return (
        slots.find((slot) => slot.side === "left")?.page ??
        slots.find((slot) => slot.side === "right")?.page
      );
    };

    const turnUnderlaySlots = (
      direction: -1 | 1,
      fromIndex: number,
      target: number,
    ): BookSpreadSlot[] => {
      const current = spreadSlots(fromIndex);
      const destination = spreadSlots(target);
      if (media.matches) {
        return destination;
      }
      if (pages[fromIndex]?.kind === "cover") {
        const right = destination.find((slot) => slot.side === "right");
        return right ? [right] : [];
      }
      if (pages[target]?.kind === "cover") {
        const right = current.find((slot) => slot.side === "right");
        return right ? [right] : [];
      }
      if (direction > 0) {
        return [
          current.find((slot) => slot.side === "left") ?? {
            side: "left",
            blank: "end",
          },
          destination.find((slot) => slot.side === "right") ?? {
            side: "right",
            blank: "end",
          },
        ];
      }
      return [
        destination.find((slot) => slot.side === "left") ?? {
          side: "left",
          blank: "end",
        },
        current.find((slot) => slot.side === "right") ?? {
          side: "right",
          blank: "end",
        },
      ];
    };

    const indexForLocation = (location: SemanticLocation): number =>
      pages.findIndex(
        (page) =>
          page.chapterId === location.chapterId &&
          page.sourceAnchors.includes(location.anchor),
      );

    const applyDeferredLocation = () => {
      if (deferredCover) {
        deferredCover = false;
        deferredLocation = undefined;
        pageIndex = 0;
        return;
      }
      if (!deferredLocation) {
        return;
      }
      const index = indexForLocation(deferredLocation);
      deferredLocation = undefined;
      if (index >= 0) {
        pageIndex = boundedIndex(index);
      }
    };

    const decorativeFace = (
      page: BookPage,
      className: string,
    ): HTMLElement => {
      const face = element("div", className);
      face.classList.add(`book-mode-turn-face-${page.kind}`);
      const pageSlice = element("div", "book-mode-turn-face-page");
      const faceContent = element("div", "book-mode-sheet-content");
      faceContent.append(...page.nodes.map((node) => node.cloneNode(true)));
      for (const identified of faceContent.querySelectorAll("[id]")) {
        identified.removeAttribute("id");
      }
      pageSlice.append(faceContent);
      face.append(pageSlice);
      return face;
    };

    const blankDecorativeFace = (
      className: string,
    ): HTMLElement => {
      const face = element(
        "div",
        `${className} book-mode-turn-face-blank`,
      );
      const pageSlice = element("div", "book-mode-turn-face-page");
      face.append(pageSlice);
      return face;
    };

    const turnPages = (
      direction: -1 | 1,
      target: number,
      fromIndex: number,
    ): {
      front?: BookPage;
      back?: BookPage;
      fromCover: boolean;
      toCover: boolean;
    } => {
      const currentSlots = spreadSlots(fromIndex);
      const targetSlots = spreadSlots(target);
      const fromCover = pages[fromIndex]?.kind === "cover";
      const toCover = pages[target]?.kind === "cover";
      if (media.matches) {
        const front = currentSlots[0]?.page;
        const back = targetSlots[0]?.page;
        return {
          ...(front === undefined ? {} : { front }),
          ...(back === undefined ? {} : { back }),
          fromCover,
          toCover,
        };
      }
      if (direction > 0) {
        const front =
          currentSlots.find((slot) => slot.side === "right")?.page ??
          currentSlots.find((slot) => slot.side === "left")?.page;
        const back = targetSlots.find((slot) => slot.side === "left")?.page;
        return {
          ...(front === undefined ? {} : { front }),
          ...(back === undefined ? {} : { back }),
          fromCover,
          toCover,
        };
      }
      const front = currentSlots.find((slot) => slot.side === "left")?.page;
      const back =
        targetSlots.find((slot) => slot.side === "right")?.page ??
        (toCover ? pages[target] : undefined);
      return {
        ...(front === undefined ? {} : { front }),
        ...(back === undefined ? {} : { back }),
        fromCover,
        toCover,
      };
    };

    const createTurnLeaf = (
      direction: -1 | 1,
      target: number,
      fromIndex: number,
      interactive = false,
    ): HTMLElement | undefined => {
      const turn = turnPages(direction, target, fromIndex);
      if (!turn.front && !turn.back) {
        return undefined;
      }
      const leaf = element(
        "div",
        [
          "book-mode-turn-leaf",
          interactive
            ? "book-mode-turn-leaf-interactive"
            : direction > 0
              ? "book-mode-turn-leaf-forward"
              : "book-mode-turn-leaf-backward",
          direction > 0
            ? "book-mode-turn-direction-forward"
            : "book-mode-turn-direction-backward",
          turn.fromCover ? "book-mode-turn-leaf-from-cover" : "",
          turn.toCover ? "book-mode-turn-leaf-to-cover" : "",
        ]
          .filter(Boolean)
          .join(" "),
      );
      leaf.setAttribute("aria-hidden", "true");
      leaf.inert = true;
      leaf.style.setProperty("--book-peel-origin-y", "9%");
      const surface = element("div", "book-mode-turn-surface");
      surface.append(
        turn.front
          ? decorativeFace(
              turn.front,
              "book-mode-turn-face book-mode-turn-front",
            )
          : blankDecorativeFace(
              "book-mode-turn-face book-mode-turn-front",
            ),
        turn.back
          ? decorativeFace(
              turn.back,
              "book-mode-turn-face book-mode-turn-back",
            )
          : blankDecorativeFace(
              "book-mode-turn-face book-mode-turn-back",
            ),
      );
      leaf.append(surface);
      leaf.append(
        element("span", "book-mode-turn-shadow"),
        element("span", "book-mode-turn-fold"),
      );
      return leaf;
    };

    const animateTurn = (
      direction: -1 | 1,
      target: number,
      fromIndex: number,
    ): Promise<void> => {
      const reducedMotion = globalThis.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (reducedMotion) {
        return Promise.resolve();
      }
      const leaf = createTurnLeaf(direction, target, fromIndex);
      if (!leaf) {
        return Promise.resolve();
      }
      spread.append(leaf);

      return new Promise((resolve) => {
        let settled = false;
        const finish = () => {
          if (settled) {
            return;
          }
          settled = true;
          clearTimeout(fallback);
          leaf.remove();
          resolve();
        };
        const fallback = globalThis.setTimeout(finish, 850);
        leaf.addEventListener("animationend", finish, { once: true });
      });
    };

    const render = (renderOptions: RenderBookOptions = {}) => {
      if (!overlay) {
        return;
      }
      spread.replaceChildren();
      const viewIndex = renderOptions.viewIndex ?? pageIndex;
      book.dataset.bookPageIndex = String(pageIndex);
      book.dataset.bookViewIndex = String(viewIndex);
      book.dataset.bookNavigating = String(navigating);
      const coverVisible =
        renderOptions.showCover ?? pages[viewIndex]?.kind === "cover";
      book.classList.toggle(
        "book-mode-book-closed",
        renderOptions.keepClosed ?? coverVisible,
      );
      spread.classList.toggle("book-mode-spread-cover", coverVisible);
      const slots = renderOptions.slots ?? spreadSlots(viewIndex);
      for (const slot of slots) {
        if (!coverVisible) {
          spread.append(pageFan(slot.side, fanLayerCount));
        }
        const page = slot.page;
        if (!page) {
          const blank = element(
            "div",
            [
              "book-mode-sheet",
              `book-mode-sheet-${slot.side}`,
              "book-mode-sheet-blank",
              `book-mode-sheet-blank-${slot.blank}`,
            ].join(" "),
          );
          blank.setAttribute("aria-hidden", "true");
          spread.append(blank);
          continue;
        }
        const sheet = element(
          "article",
          [
            "book-mode-sheet",
            page.kind === "cover" ? "book-mode-cover" : "",
            page.kind === "front-matter" ? "book-mode-front-matter" : "",
            page.kind === "toc" ? "book-mode-contents" : "",
            coverVisible
              ? "book-mode-sheet-cover"
              : `book-mode-sheet-${slot.side}`,
          ]
            .filter(Boolean)
            .join(" "),
        );
        sheet.dataset.bookPage =
          page.kind === "cover"
            ? "cover"
            : page.screenNumber === undefined
              ? page.label
              : String(page.screenNumber);
        sheet.setAttribute(
          "aria-label",
          page.kind === "cover"
            ? `${publication.title}, front cover`
            : page.kind === "content"
              ? `${page.chapterTitle}, screen page ${page.screenNumber} of ${contentPageCount()}`
              : `${publication.title}, ${page.label}`,
        );
        const contentRoot = element("div", "book-mode-sheet-content");
        contentRoot.append(...page.nodes.map((node) => node.cloneNode(true)));
        const folio = element(
          "footer",
          "book-mode-folio",
          page.kind === "content" ? String(page.screenNumber) : "",
        );
        sheet.append(contentRoot);
        if (page.kind === "content") {
          const runningTitle = element(
            "span",
            "book-mode-folio-title",
            publication.title,
          );
          const number = element(
            "span",
            "book-mode-folio-number",
            String(page.screenNumber),
          );
          folio.replaceChildren(runningTitle, number);
          sheet.append(folio);
        }
        if (
          slot.side === "right" &&
          (renderOptions.allowCorner ?? true) &&
          pageStarts().indexOf(pageIndex) < pageStarts().length - 1
        ) {
          const corner = element("button", "book-mode-corner");
          corner.type = "button";
          corner.setAttribute("aria-label", "Turn page forward");
          corner.addEventListener("click", () => void go(1));
          sheet.append(corner);
        }
        spread.append(sheet);
      }
      const renderedSheets = Array.from(
        spread.querySelectorAll<HTMLElement>(".book-mode-sheet"),
      );
      for (const sheet of renderedSheets) {
        fitBookSheet(sheet);
        for (const mediaElement of sheet.querySelectorAll<
          HTMLImageElement | HTMLVideoElement | HTMLIFrameElement
        >("img, video, iframe")) {
          mediaElement.addEventListener(
            "load",
            () => {
              if (sheet.isConnected) {
                fitBookSheet(sheet);
              }
            },
            { once: true },
          );
        }
      }
      requestAnimationFrame(() => {
        for (const sheet of renderedSheets) {
          if (sheet.isConnected) {
            fitBookSheet(sheet);
          }
        }
      });
      const starts = pageStarts();
      const position = starts.indexOf(pageIndex);
      previous.disabled = position <= 0 || navigating;
      next.disabled = position >= starts.length - 1 || navigating;
      decreaseFont.disabled = navigating || fontScale <= 0.8;
      increaseFont.disabled = navigating || fontScale >= 1.3;
      if (renderOptions.counterText !== undefined) {
        counter.textContent = renderOptions.counterText;
      } else if (coverVisible) {
        counter.textContent = "Front cover";
      } else {
        const visiblePages = slots.flatMap((slot) =>
          slot.page?.screenNumber === undefined
            ? []
            : [slot.page.screenNumber],
        );
        counter.textContent =
          visiblePages.length === 0
            ? slots
                .flatMap((slot) => (slot.page ? [slot.page.label] : []))
                .join(" · ")
            : visiblePages.length === 1
              ? `Screen ${visiblePages[0]} / ${contentPageCount()}`
              : `Screens ${visiblePages[0]}–${visiblePages.at(-1)} / ${contentPageCount()}`;
      }
      spread.setAttribute(
        "aria-busy",
        String(navigating || !paginationReady),
      );
    };
    const repaginate = () => {
      if (!loadedArticles) {
        return;
      }
      const currentLocation = session.getState().location;
      const urlAnchor = decodeURIComponent(globalThis.location.hash.slice(1));
      const canonicalAnchor =
        urlAnchor ||
        (currentLocation?.kind === "semantic"
          ? currentLocation.anchor
          : undefined);
      const firstVisible = pages[pageIndex];
      const visibleSlots =
        paginationSinglePage ||
        firstVisible?.kind === "cover" ||
        pageIndex === 1
          ? firstVisible
            ? [firstVisible]
            : []
          : [firstVisible, pages[pageIndex + 1]].filter(
              (page): page is BookPage => page !== undefined,
            );
      const canonicalVisible =
        currentLocation?.kind === "semantic"
          ? visibleSlots.find(
              (page) =>
                page.chapterId === currentLocation.chapterId &&
                canonicalAnchor !== undefined &&
                page.sourceAnchors.includes(canonicalAnchor),
            ) ??
            visibleSlots.find(
              (page) =>
                page.chapterId === currentLocation.chapterId &&
                canonicalAnchor !== undefined &&
                page.sourceSpans.some(
                  (span) => span.anchor === canonicalAnchor,
                ),
            )
          : undefined;
      const visible = canonicalVisible ?? pages[pageIndex];
      pages = bookPagesFromArticles(
        publication,
        loadedArticles,
        paginationProfile(),
        media.matches,
        shortViewport.matches,
        fontScale,
      );
      paginationSinglePage = media.matches;
      if (visible?.kind === "cover") {
        pageIndex = 0;
      } else if (visible && visible.kind !== "content") {
        const syntheticSpan = visible.syntheticSpan;
        let nextIndex = syntheticSpan
          ? pages.findIndex(
              (page) =>
                page.syntheticSpan?.section === syntheticSpan.section &&
                page.syntheticSpan.start <= syntheticSpan.start &&
                syntheticSpan.start < page.syntheticSpan.end,
            )
          : -1;
        if (nextIndex < 0) {
          nextIndex = pages.findIndex(
            (page) => page.kind === visible.kind && page.label === visible.label,
          );
        }
        if (nextIndex < 0 && visible.kind === "toc") {
          for (let index = pages.length - 1; index >= 0; index -= 1) {
            if (pages[index]?.kind === "toc") {
              nextIndex = index;
              break;
            }
          }
        }
        pageIndex = boundedIndex(Math.max(1, nextIndex));
      } else if (visible) {
        const visibleSpan =
          visible.sourceSpans.find((span) => span.anchor === visible.anchor) ??
          visible.sourceSpans[0];
        const nextIndex = pages.findIndex((page) => {
          if (page.chapterId !== visible.chapterId) {
            return false;
          }
          if (visibleSpan) {
            return page.sourceSpans.some(
              (span) =>
                span.anchor === visibleSpan.anchor &&
                span.start <= visibleSpan.start &&
                visibleSpan.start < span.end,
            );
          }
          return (
            page.sourceAnchors.includes(visible.anchor) ||
            page.anchor === visible.anchor
          );
        });
        pageIndex = boundedIndex(Math.max(1, nextIndex));
      } else {
        pageIndex = boundedIndex(pageIndex);
      }
      render();
    };
    const acceptTargetPage = async (
      targetPage: BookPage,
      activePublication: PublicationManifest,
    ): Promise<boolean> => {
      if (targetPage.kind === "cover") {
        return true;
      }
      if (targetPage.kind !== "content") {
        return true;
      }
      const currentLocation = session.getState().location;
      if (
        currentLocation?.kind === "semantic" &&
        currentLocation.chapterId === targetPage.chapterId &&
        currentLocation.anchor === targetPage.anchor &&
        (targetPage.continuation ||
          decodeURIComponent(globalThis.location.hash.slice(1)) ===
            targetPage.anchor)
      ) {
        return true;
      }
      acceptingTargetLocation = true;
      try {
        return await options.navigate({
          kind: "semantic",
          bookId: activePublication.bookId,
          editionId: activePublication.editionId,
          chapterId: targetPage.chapterId,
          anchor: targetPage.anchor,
        });
      } finally {
        acceptingTargetLocation = false;
      }
    };
    showCoverView = () => {
      if (navigating) {
        operationVersion += 1;
        navigating = false;
        queuedDirection = undefined;
        deferredLocation = undefined;
        deferredCover = false;
        pageIndex = 0;
        book.classList.remove(
          "book-mode-book-sliding",
          "book-mode-book-opening",
          "book-mode-book-positioned",
        );
        render();
        return;
      }
      deferredCover = false;
      deferredLocation = undefined;
      pageIndex = 0;
      render();
    };

    const go = async (direction: -1 | 1) => {
      if (navigating) {
        queuedDirection = direction;
        return;
      }
      const starts = pageStarts();
      const currentPosition = starts.indexOf(pageIndex);
      const target = starts[currentPosition + direction];
      if (target === undefined || target === pageIndex) {
        return;
      }
      const targetPage = navigationPageForTarget(target, direction);
      if (!targetPage) {
        return;
      }
      const fromIndex = pageIndex;
      const operation = ++operationVersion;
      const operationActive = () =>
        overlay === root && operation === operationVersion;
      navigating = true;
      render();
      const openingCover =
        direction > 0 && pages[pageIndex]?.kind === "cover";
      const closingCover = direction < 0 && targetPage.kind === "cover";
      if (openingCover) {
        book.classList.add("book-mode-book-sliding");
        if (
          !globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches
        ) {
          await new Promise((resolve) => setTimeout(resolve, 360));
        }
        if (!operationActive()) {
          return;
        }
        book.classList.add("book-mode-book-positioned");
        book.classList.remove("book-mode-book-sliding");
      }
      const current = session.getState().publication;
      if (!current) {
        navigating = false;
        render();
        return;
      }
      if (openingCover) {
        const rightPage = spreadSlots(target).find(
          (slot) => slot.side === "right",
        );
        render({
          viewIndex: target,
          slots: rightPage ? [rightPage] : [],
          keepClosed: true,
          showCover: false,
          counterText: "Opening cover",
          allowCorner: false,
        });
      } else if (closingCover) {
        render({
          viewIndex: fromIndex,
          slots: turnUnderlaySlots(direction, fromIndex, target),
          counterText: "Closing cover",
          allowCorner: false,
        });
      } else {
        render({
          viewIndex: fromIndex,
          slots: turnUnderlaySlots(direction, fromIndex, target),
          counterText: "Turning page",
          allowCorner: false,
        });
      }
      const turn = animateTurn(direction, target, fromIndex);
      await turn;
      if (!operationActive()) {
        return;
      }
      const accepted = await acceptTargetPage(targetPage, current);
      if (!operationActive()) {
        return;
      }
      if (!accepted) {
        pageIndex = fromIndex;
      } else {
        pageIndex = boundedIndex(target);
        if (
          deferredLocation?.chapterId === targetPage.chapterId &&
          deferredLocation.anchor === targetPage.anchor
        ) {
          deferredLocation = undefined;
        }
        if (targetPage.kind === "cover") {
          options.onCoverReached?.();
        }
      }
      navigating = false;
      book.classList.remove(
        "book-mode-book-sliding",
        "book-mode-book-opening",
        "book-mode-book-positioned",
      );
      if (repaginateAfterNavigation) {
        repaginateAfterNavigation = false;
        repaginate();
      }
      applyDeferredLocation();
      const completedCoverClose =
        accepted && pages[pageIndex]?.kind === "cover";
      if (completedCoverClose) {
        book.classList.add("book-mode-book-closing");
      }
      render();
      if (completedCoverClose) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            book.classList.remove("book-mode-book-closing");
          });
        });
      }
      const queued = queuedDirection;
      queuedDirection = undefined;
      if (queued !== undefined && overlay === root) {
        void go(queued);
      }
    };

    const onKey = (event: KeyboardEvent) => {
      if (!overlay) {
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        void go(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        void go(1);
      } else if (event.key === "Tab") {
        const available = focusable(root);
        const first = available[0];
        const last = available.at(-1);
        if (!first || !last) {
          return;
        }
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    const onMediaChange = () => {
      if (navigating) {
        repaginateAfterNavigation = true;
        return;
      }
      repaginate();
    };
    const onShortViewportChange = () => {
      if (navigating) {
        repaginateAfterNavigation = true;
        return;
      }
      repaginate();
    };
    const onShare = async () => {
      counter.textContent = await shareReadingLocation(
        publication.title,
        globalThis.location.href,
      );
    };
    const updateFontControls = () => {
      decreaseFont.disabled = navigating || fontScale <= 0.8;
      increaseFont.disabled = navigating || fontScale >= 1.3;
      fontStatus.textContent = `${Math.round(fontScale * 100)}%`;
      root.dataset.bookFontSize = String(Math.round(fontScale * 100));
    };
    const setFontScale = (next: number) => {
      const bounded = normalizeFontScale(next);
      if (bounded === fontScale) {
        return;
      }
      fontScale = bounded;
      bookFontScale = fontScale;
      writeFontScale(publication.bookId, fontScale);
      updateFontControls();
      if (navigating) {
        repaginateAfterNavigation = true;
        return;
      }
      repaginate();
    };
    const onRootClick = (event: MouseEvent) => {
      const link =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>(".book-mode-toc-link")
          : null;
      const chapterId = link?.dataset.chapterId;
      const anchor = link?.dataset.anchor;
      if (!link || !chapterId || !anchor) {
        return;
      }
      const targetIndex = pages.findIndex(
        (page) =>
          page.kind === "content" &&
          page.chapterId === chapterId &&
          page.sourceAnchors.includes(anchor),
      );
      const targetPage = pages[targetIndex];
      if (!targetPage || targetIndex < 0 || navigating) {
        return;
      }
      event.preventDefault();
      const operation = ++operationVersion;
      navigating = true;
      render({ counterText: "Opening section", allowCorner: false });
      void acceptTargetPage(targetPage, publication).then((accepted) => {
        if (overlay !== root || operation !== operationVersion) {
          return;
        }
        navigating = false;
        if (accepted) {
          pageIndex = boundedIndex(targetIndex);
          deferredLocation = undefined;
        }
        render();
        const targetSheet =
          targetPage.screenNumber === undefined
            ? undefined
            : Array.from(
                spread.querySelectorAll<HTMLElement>(".book-mode-sheet"),
              ).find(
                (sheet) =>
                  sheet.dataset.bookPage === String(targetPage.screenNumber),
              );
        const anchoredTarget = targetSheet
          ? Array.from(
              targetSheet.querySelectorAll<HTMLElement>(
                "[data-book-source-anchor]",
              ),
            ).find(
              (node) => node.dataset.bookSourceAnchor === anchor,
            )
          : undefined;
        const focusTarget =
          anchoredTarget ??
          targetSheet?.querySelector<HTMLElement>(
            ".book-mode-sheet-content h1, .book-mode-sheet-content h2, .book-mode-sheet-content p",
          );
        if (focusTarget) {
          focusTarget.tabIndex = -1;
          focusTarget.focus({ preventScroll: true });
        }
      });
    };
    closeButton.addEventListener("click", close);
    decreaseFont.addEventListener("click", () => setFontScale(fontScale - 0.1));
    increaseFont.addEventListener("click", () => setFontScale(fontScale + 0.1));
    shareButton.addEventListener("click", () => void onShare());
    root.addEventListener("click", onRootClick);
    previous.addEventListener("click", () => void go(-1));
    next.addEventListener("click", () => void go(1));
    let pointerStart:
      | {
          id: number;
          x: number;
          y: number;
          time: number;
          direction?: -1 | 1;
          fromIndex?: number;
          target?: number;
          progress: number;
          operation?: number;
          leaf?: HTMLElement;
        }
      | undefined;
    const onPointerDown = (event: PointerEvent) => {
      if (
        navigating ||
        !event.isPrimary ||
        event.button !== 0 ||
        pages[pageIndex]?.kind === "cover" ||
        (event.target instanceof Element &&
          event.target.closest(
            "a, input, textarea, select, button:not(.book-mode-corner)",
          ))
      ) {
        return;
      }
      const bookRect = book.getBoundingClientRect();
      const relativeX = (event.clientX - bookRect.left) / bookRect.width;
      const fromCorner =
        event.target instanceof Element &&
        event.target.closest(".book-mode-corner") !== null;
      if (!fromCorner && relativeX > 0.2 && relativeX < 0.8) {
        return;
      }
      pointerStart = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        time: event.timeStamp,
        progress: 0,
      };
      event.preventDefault();
      book.setPointerCapture(event.pointerId);
      book.classList.add("book-mode-book-grabbing");
    };
    const startInteractiveTurn = (
      start: NonNullable<typeof pointerStart>,
      direction: -1 | 1,
    ): boolean => {
      const starts = pageStarts();
      const position = starts.indexOf(pageIndex);
      const target = starts[position + direction];
      const fromIndex = pageIndex;
      if (
        target === undefined ||
        pages[fromIndex]?.kind === "cover" ||
        pages[target]?.kind === "cover"
      ) {
        return false;
      }
      start.direction = direction;
      start.fromIndex = fromIndex;
      start.target = target;
      start.operation = ++operationVersion;
      navigating = true;
      render({
        viewIndex: fromIndex,
        slots: turnUnderlaySlots(direction, fromIndex, target),
        counterText: "Turning page",
        allowCorner: false,
      });
      const leaf = createTurnLeaf(direction, target, fromIndex, true);
      if (!leaf) {
        pageIndex = fromIndex;
        navigating = false;
        render();
        return false;
      }
      start.leaf = leaf;
      const bookRect = book.getBoundingClientRect();
      const originY = Math.min(
        100,
        Math.max(0, ((start.y - bookRect.top) / bookRect.height) * 100),
      );
      leaf.style.setProperty("--book-peel-origin-y", `${originY}%`);
      spread.append(leaf);
      return true;
    };
    const updateInteractiveTurn = (
      start: NonNullable<typeof pointerStart>,
      event: PointerEvent,
    ) => {
      const horizontal = event.clientX - start.x;
      if (
        start.direction === undefined &&
        Math.abs(horizontal) >= 8 &&
        !startInteractiveTurn(start, horizontal < 0 ? 1 : -1)
      ) {
        return;
      }
      if (start.direction === undefined || !start.leaf) {
        return;
      }
      const halfWidth = Math.max(1, book.getBoundingClientRect().width / 2);
      const directedDistance =
        start.direction > 0 ? -horizontal : horizontal;
      const progress = Math.min(1, Math.max(0, directedDistance / halfWidth));
      start.progress = progress;
      const pastHalf = progress >= 0.5;
      const phase = pastHalf ? (progress - 0.5) * 2 : progress * 2;
      const eased = Math.sin((phase * Math.PI) / 2);
      const angleMagnitude = pastHalf ? 74 * (1 - eased) : 74 * eased;
      const angle =
        start.direction > 0
          ? pastHalf
            ? angleMagnitude
            : -angleMagnitude
          : pastHalf
            ? -angleMagnitude
            : angleMagnitude;
      const verticalDelta = event.clientY - start.y;
      const skew = Math.min(7, Math.max(-7, verticalDelta / 20));
      const curve = Math.sin(Math.PI * progress);
      const originFraction = Math.min(
        1,
        Math.max(0, (start.y - book.getBoundingClientRect().top) / book.getBoundingClientRect().height),
      );
      const originY = originFraction * 100;
      const foldTop = 100 - progress * (42 + (1 - originFraction) * 25);
      const foldBottom = 100 - progress * (42 + originFraction * 25);
      const tip = Math.max(0, 100 - progress * 128);
      start.leaf.style.setProperty("--book-peel-angle", `${angle}deg`);
      start.leaf.style.setProperty(
        "--book-peel-progress",
        String(progress),
      );
      start.leaf.style.setProperty("--book-peel-skew", `${skew}deg`);
      if (start.direction > 0) {
        start.leaf.style.left = pastHalf ? "0" : "50%";
        start.leaf.style.transformOrigin = pastHalf
          ? `right ${originY}%`
          : `left ${originY}%`;
      } else {
        start.leaf.style.left = pastHalf ? "50%" : "0";
        start.leaf.style.transformOrigin = pastHalf
          ? `left ${originY}%`
          : `right ${originY}%`;
      }
      start.leaf.style.setProperty(
        "--book-peel-curl",
        `${curve * start.direction * -8}deg`,
      );
      start.leaf.style.setProperty(
        "--book-peel-lift",
        `${curve * 22}px`,
      );
      start.leaf.style.setProperty(
        "--book-peel-radius",
        `${curve * 48}%`,
      );
      start.leaf.style.setProperty("--book-peel-fold-top", `${foldTop}%`);
      start.leaf.style.setProperty(
        "--book-peel-fold-bottom",
        `${foldBottom}%`,
      );
      start.leaf.style.setProperty("--book-peel-tip-x", `${tip}%`);
      start.leaf.classList.toggle(
        "book-mode-turn-past-half",
        pastHalf,
      );
    };
    const settleInteractiveTurn = async (
      start: NonNullable<typeof pointerStart>,
      commit: boolean,
    ) => {
      const {
        leaf,
        direction,
        target,
        fromIndex,
        operation,
      } = start;
      if (
        !leaf ||
        direction === undefined ||
        target === undefined ||
        fromIndex === undefined ||
        operation === undefined
      ) {
        return;
      }
      leaf.classList.add("book-mode-turn-leaf-settling");
      if (commit) {
        leaf.style.left = direction > 0 ? "0" : "50%";
        leaf.style.transformOrigin =
          direction > 0
            ? "right var(--book-peel-origin-y, 50%)"
            : "left var(--book-peel-origin-y, 50%)";
      } else {
        leaf.style.left = direction > 0 ? "50%" : "0";
        leaf.style.transformOrigin =
          direction > 0
            ? "left var(--book-peel-origin-y, 50%)"
            : "right var(--book-peel-origin-y, 50%)";
      }
      leaf.style.setProperty(
        "--book-peel-angle",
        "0deg",
      );
      leaf.style.setProperty("--book-peel-skew", "0deg");
      leaf.classList.toggle("book-mode-turn-past-half", commit);
      leaf.style.setProperty("--book-peel-curl", "0deg");
      leaf.style.setProperty("--book-peel-lift", "0px");
      leaf.style.setProperty("--book-peel-radius", "0%");
      await new Promise<void>((resolve) => {
        let settled = false;
        const finish = () => {
          if (settled) {
            return;
          }
          settled = true;
          clearTimeout(fallback);
          resolve();
        };
        const fallback = globalThis.setTimeout(finish, 380);
        leaf.addEventListener("transitionend", finish, { once: true });
      });
      if (overlay !== root || operation !== operationVersion) {
        leaf.remove();
        return;
      }

      let accepted = false;
      let targetPage: BookPage | undefined;
      if (commit) {
        const activePublication = session.getState().publication;
        targetPage = navigationPageForTarget(target, direction);
        if (activePublication && targetPage) {
          accepted = await acceptTargetPage(targetPage, activePublication);
        }
      }
      if (overlay !== root || operation !== operationVersion) {
        leaf.remove();
        return;
      }
      leaf.remove();
      if (!commit || !accepted) {
        pageIndex = fromIndex;
      } else {
        pageIndex = boundedIndex(target);
        if (
          targetPage &&
          deferredLocation?.chapterId === targetPage.chapterId &&
          deferredLocation.anchor === targetPage.anchor
        ) {
          deferredLocation = undefined;
        }
        if (targetPage?.kind === "cover") {
          options.onCoverReached?.();
        }
      }
      navigating = false;
      if (repaginateAfterNavigation) {
        repaginateAfterNavigation = false;
        repaginate();
      }
      applyDeferredLocation();
      render();
      const queued = queuedDirection;
      queuedDirection = undefined;
      if (queued !== undefined && overlay === root) {
        void go(queued);
      }
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!pointerStart || event.pointerId !== pointerStart.id) {
        return;
      }
      updateInteractiveTurn(pointerStart, event);
    };
    const clearPointer = (event: PointerEvent) => {
      if (!pointerStart || event.pointerId !== pointerStart.id) {
        return undefined;
      }
      const start = pointerStart;
      pointerStart = undefined;
      if (book.hasPointerCapture(event.pointerId)) {
        book.releasePointerCapture(event.pointerId);
      }
      book.classList.remove("book-mode-book-grabbing");
      return start;
    };
    const onPointerEnd = (event: PointerEvent) => {
      const start = clearPointer(event);
      if (!start) {
        return;
      }
      const horizontal = event.clientX - start.x;
      const vertical = Math.abs(event.clientY - start.y);
      const elapsed = Math.max(1, event.timeStamp - start.time);
      const directedDistance =
        start.direction === undefined
          ? 0
          : start.direction > 0
            ? -horizontal
            : horizontal;
      const directedVelocity = directedDistance / elapsed;
      const commit =
        vertical < 80 &&
        (start.progress >= 0.35 ||
          directedDistance >= 70 ||
          directedVelocity >= 0.55);
      if (start.leaf) {
        void settleInteractiveTurn(start, commit);
      }
    };
    const onPointerCancel = (event: PointerEvent) => {
      const start = clearPointer(event);
      if (start?.leaf) {
        void settleInteractiveTurn(start, false);
      }
    };
    book.addEventListener("pointerdown", onPointerDown);
    book.addEventListener("pointermove", onPointerMove);
    book.addEventListener("pointerup", onPointerEnd);
    book.addEventListener("pointercancel", onPointerCancel);
    document.addEventListener("keydown", onKey);
    media.addEventListener("change", onMediaChange);
    shortViewport.addEventListener("change", onShortViewportChange);
    updateFontControls();
    cleanupInteraction = () => {
      document.removeEventListener("keydown", onKey);
      media.removeEventListener("change", onMediaChange);
      shortViewport.removeEventListener("change", onShortViewportChange);
      book.removeEventListener("pointerdown", onPointerDown);
      book.removeEventListener("pointermove", onPointerMove);
      book.removeEventListener("pointerup", onPointerEnd);
      book.removeEventListener("pointercancel", onPointerCancel);
      root.removeEventListener("click", onRootClick);
    };
    closeButton.focus();

    try {
      pages = [
        coverPage(publication),
        ...frontMatterPages(
          publication,
          media.matches,
          shortViewport.matches,
          fontScale,
        ),
      ];
      pageIndex = 0;
      spread.setAttribute("aria-busy", "true");
      render();
      loadedArticles = await loadBookArticles(
        publication,
        content,
        fetcher,
        controller.signal,
      );
      if (!overlay || controller.signal.aborted) {
        return;
      }
      loading = undefined;
      pages = bookPagesFromArticles(
        publication,
        loadedArticles,
        paginationProfile(),
        media.matches,
        shortViewport.matches,
        fontScale,
      );
      paginationSinglePage = media.matches;
      const stagedFrontMatterIndex = pageIndex;
      const current = session.getState().location;
      const currentIndex =
        current?.kind === "semantic"
          ? pages.findIndex(
              (page) =>
                page.chapterId === current.chapterId &&
                page.sourceAnchors.includes(current.anchor),
            )
          : 0;
      pageIndex =
        stagedFrontMatterIndex > 0
          ? boundedIndex(stagedFrontMatterIndex)
          : options.startAtCover?.()
            ? 0
            : boundedIndex(Math.max(1, currentIndex));
      paginationReady = true;
      let initialSubscription = true;
      unsubscribeSession = session.subscribe((nextState) => {
        if (initialSubscription) {
          initialSubscription = false;
          return;
        }
        const location = nextState.location;
        if (
          nextState.status !== "ready" ||
          location?.kind !== "semantic"
        ) {
          return;
        }
        if (navigating) {
          if (!acceptingTargetLocation) {
            operationVersion += 1;
            navigating = false;
            queuedDirection = undefined;
            deferredLocation = undefined;
            const index = indexForLocation(location);
            if (index >= 0) {
              pageIndex = boundedIndex(index);
            }
            book.classList.remove(
              "book-mode-book-sliding",
              "book-mode-book-opening",
              "book-mode-book-positioned",
            );
            render();
            return;
          }
          deferredLocation = location;
          return;
        }
        const index = indexForLocation(location);
        if (index >= 0) {
          pageIndex = boundedIndex(index);
          render();
        }
      });
      spread.setAttribute("aria-busy", "false");
      render();
    } catch (error) {
      if (!controller.signal.aborted && overlay) {
        loading = undefined;
        paginationReady = true;
        spread.replaceChildren(
          element(
            "p",
            "book-mode-error",
            error instanceof Error
              ? error.message
              : "Unable to prepare semantic book view",
          ),
        );
        counter.textContent = "Book view unavailable";
        spread.setAttribute("aria-busy", "false");
        closeButton.focus();
      }
    }
  };

  return {
    open,
    close,
    isOpen: () => overlay !== undefined,
    showCover(): void {
      showCoverView?.();
    },
    destroy(): void {
      if (destroyed) {
        return;
      }
      destroyed = true;
      close();
    },
  };
}

function bookPagesFromArticles(
  publication: PublicationManifest,
  articles: HTMLElement[],
  profile: PaginationProfile,
  singlePage: boolean,
  short: boolean,
  fontScale: number,
): BookPage[] {
  const pages: BookPage[] = [
    coverPage(publication),
    ...frontMatterPages(publication, singlePage, short, fontScale),
  ];
  let screenNumber = 0;
  for (const [index, chapter] of publication.renditions.semantic.chapters.entries()) {
    const article = articles[index];
    if (!article) {
      throw new Error(`Book view did not load ${chapter.title}`);
    }
    pages.push(
      ...pagesFromArticle(article, chapter, profile).map((page) => ({
        ...page,
        screenNumber: ++screenNumber,
      })),
    );
  }
  if (pages.length === 1) {
    throw new Error("Publication contains no semantic screen pages");
  }
  return pages;
}

async function loadBookArticles(
  publication: PublicationManifest,
  content: HTMLElement,
  fetcher: typeof globalThis.fetch,
  signal: AbortSignal,
): Promise<HTMLElement[]> {
  const chapters = publication.renditions.semantic.chapters;
  const articles = new Array<HTMLElement>(chapters.length);
  let nextChapter = 0;
  const loadNext = async () => {
    while (nextChapter < chapters.length) {
      const index = nextChapter++;
      const chapter = chapters[index];
      if (!chapter) {
        continue;
      }
      if (signal.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }
      articles[index] = await loadArticle(
        chapter,
        content,
        fetcher,
        signal,
      );
    }
  };
  await Promise.all(
    Array.from(
      { length: Math.min(4, Math.max(1, chapters.length)) },
      () => loadNext(),
    ),
  );

  return articles;
}
