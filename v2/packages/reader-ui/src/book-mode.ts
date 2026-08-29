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
  kind: "cover" | "content";
  chapterId: ChapterId;
  chapterTitle: string;
  anchor: string;
  sourceAnchors: string[];
  sourceSpans: Array<{
    anchor: string;
    start: number;
    end: number;
  }>;
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
    chapterId: firstChapter.chapterId,
    chapterTitle: publication.title,
    anchor: firstChapter.firstAnchor,
    sourceAnchors: [],
    sourceSpans: [],
    nodes: [cover],
  };
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

    trigger = invoker;
    const controller = new AbortController();
    loading = controller;
    const root = element("section", "book-mode-overlay");
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", "book-mode-title");
    applyPublicationAppearance(root, publication.appearance);

    const chrome = element("header", "book-mode-chrome");
    const identity = element("div", "book-mode-identity");
    const eyebrow = element("p", "book-mode-eyebrow", "Semantic book view");
    const title = element("h2", "book-mode-title", publication.title);
    title.id = "book-mode-title";
    identity.append(eyebrow, title);

    const actions = element("div", "book-mode-actions");
    const counter = element("span", "book-mode-counter", "Preparing pages");
    counter.setAttribute("aria-live", "polite");
    const shareButton = element("button", "book-mode-share", "Share");
    shareButton.type = "button";
    const closeButton = element("button", "book-mode-close", "Close");
    closeButton.type = "button";
    actions.append(counter, shareButton, closeButton);
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

    const pageStarts = () => {
      if (media.matches) {
        return pages.map((_page, index) => index);
      }
      const starts = pages.length > 1 ? [0, 1] : [0];
      for (let index = 2; index < pages.length; index += 2) {
        starts.push(index);
      }
      return starts;
    };
    const alignedIndex = (index: number) => {
      if (media.matches || index <= 1) {
        return index;
      }
      return 2 + Math.floor((index - 2) / 2) * 2;
    };
    const boundedIndex = (index: number) =>
      Math.min(alignedIndex(index), pageStarts().at(-1) ?? 0);
    const fanLayerCount = publicationPageFanCount(publication.appearance);

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
        return [
          { side: "left", blank: "inside-cover" },
          ...(page
            ? [{ side: "right" as const, page, blank: "none" as const }]
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
            : String(page.screenNumber ?? pageIndex);
        sheet.setAttribute(
          "aria-label",
          page.kind === "cover"
            ? `${publication.title}, front cover`
            : `${page.chapterTitle}, screen page ${page.screenNumber} of ${pages.length - 1}`,
        );
        const contentRoot = element("div", "book-mode-sheet-content");
        contentRoot.append(...page.nodes.map((node) => node.cloneNode(true)));
        const folio = element(
          "footer",
          "book-mode-folio",
          page.kind === "cover" ? "" : String(page.screenNumber),
        );
        sheet.append(contentRoot);
        if (page.kind !== "cover") {
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
      const starts = pageStarts();
      const position = starts.indexOf(pageIndex);
      previous.disabled = position <= 0 || navigating;
      next.disabled = position >= starts.length - 1 || navigating;
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
          visiblePages.length === 1
            ? `Screen ${visiblePages[0]} / ${pages.length - 1}`
            : `Screens ${visiblePages[0]}–${visiblePages.at(-1)} / ${pages.length - 1}`;
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
        media.matches ? SINGLE_PAGE_PAGINATION : SPREAD_PAGINATION,
      );
      paginationSinglePage = media.matches;
      if (visible?.kind === "cover") {
        pageIndex = 0;
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
    const onShare = async () => {
      counter.textContent = await shareReadingLocation(
        publication.title,
        globalThis.location.href,
      );
    };
    closeButton.addEventListener("click", close);
    shareButton.addEventListener("click", () => void onShare());
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
      const angle = 180 * progress * start.direction * -1;
      const verticalDelta = event.clientY - start.y;
      const skew = Math.min(7, Math.max(-7, verticalDelta / 20));
      const curve = Math.sin(Math.PI * progress);
      start.leaf.style.setProperty("--book-peel-angle", `${angle}deg`);
      start.leaf.style.setProperty(
        "--book-peel-progress",
        String(progress),
      );
      start.leaf.style.setProperty("--book-peel-skew", `${skew}deg`);
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
      start.leaf.classList.toggle(
        "book-mode-turn-past-half",
        progress >= 0.5,
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
      leaf.style.setProperty(
        "--book-peel-angle",
        `${commit ? direction * -180 : 0}deg`,
      );
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
    cleanupInteraction = () => {
      document.removeEventListener("keydown", onKey);
      media.removeEventListener("change", onMediaChange);
      book.removeEventListener("pointerdown", onPointerDown);
      book.removeEventListener("pointermove", onPointerMove);
      book.removeEventListener("pointerup", onPointerEnd);
      book.removeEventListener("pointercancel", onPointerCancel);
    };
    closeButton.focus();

    try {
      pages = [coverPage(publication)];
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
        media.matches ? SINGLE_PAGE_PAGINATION : SPREAD_PAGINATION,
      );
      paginationSinglePage = media.matches;
      const current = session.getState().location;
      const currentIndex =
        current?.kind === "semantic"
          ? pages.findIndex(
              (page) =>
                page.chapterId === current.chapterId &&
                page.sourceAnchors.includes(current.anchor),
            )
          : 0;
      pageIndex = options.startAtCover?.()
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
): BookPage[] {
  const pages: BookPage[] = [coverPage(publication)];
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
