import type {
  ChapterId,
  PublicationManifest,
  SemanticChapter,
  SemanticLocation,
} from "@ethical-tech/book-publication-model";
import type { ReaderSession } from "@ethical-tech/book-reader-core";
import { applyPublicationAppearance } from "./appearance.js";

type BookPage = {
  kind: "cover" | "content";
  chapterId: ChapterId;
  chapterTitle: string;
  anchor: string;
  sourceAnchors: string[];
  nodes: Node[];
  screenNumber?: number;
};

export type SemanticBookModeOptions = {
  navigate(location: SemanticLocation): Promise<boolean>;
  onOpenChange?(open: boolean): void;
  fetch?: typeof globalThis.fetch;
  singlePageQuery?: string;
};

export type SemanticBookMode = {
  open(trigger: HTMLElement): Promise<void>;
  close(): void;
  isOpen(): boolean;
  destroy(): void;
};

export const SEMANTIC_BOOK_SINGLE_PAGE_QUERY = "(max-width: 45rem)";

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

function pagesFromArticle(
  article: HTMLElement,
  chapter: SemanticChapter,
): BookPage[] {
  const sourceNodes = Array.from(article.children).filter(
    (node) => !node.classList.contains("book-chapter-nav"),
  );
  const groups: Element[][] = [];
  let current: Element[] = [];

  for (const node of sourceNodes) {
    const startsPage = /^H[12]$/.test(node.tagName);
    if (startsPage && current.length > 0) {
      groups.push(current);
      current = [];
    }
    current.push(node);
  }
  if (current.length > 0) {
    groups.push(current);
  }

  return groups.map((nodes, index) => {
    const anchors = sourceAnchors(nodes);
    const anchor =
      anchors[0] ?? (index === 0 ? chapter.firstAnchor : chapter.lastAnchor);
    return {
      kind: "content",
      chapterId: chapter.chapterId,
      chapterTitle: chapter.title,
      anchor,
      sourceAnchors: anchors,
      nodes: cloneGroupForBook(
        nodes,
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
    sourceAnchors: [firstChapter.firstAnchor],
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
    return content;
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

  const close = () => {
    const wasOpen = overlay !== undefined;
    loading?.abort();
    loading = undefined;
    cleanupInteraction?.();
    cleanupInteraction = undefined;
    unsubscribeSession?.();
    unsubscribeSession = undefined;
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
    const closeButton = element("button", "book-mode-close", "Close");
    closeButton.type = "button";
    actions.append(counter, closeButton);
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
      "Use arrows or ← → keys · Screen pages are presentation, not citations",
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

    const pageStarts = () => {
      if (media.matches) {
        return pages.map((_page, index) => index);
      }
      const starts = [0];
      for (let index = 1; index < pages.length; index += 2) {
        starts.push(index);
      }
      return starts;
    };
    const alignedIndex = (index: number) => {
      if (media.matches || index === 0) {
        return index;
      }
      return 1 + Math.floor((index - 1) / 2) * 2;
    };
    const boundedIndex = (index: number) =>
      Math.min(alignedIndex(index), pageStarts().at(-1) ?? 0);

    const decorativeFace = (
      page: BookPage,
      className: string,
    ): HTMLElement => {
      const face = element("div", className);
      const faceContent = element("div", "book-mode-sheet-content");
      faceContent.append(...page.nodes.map((node) => node.cloneNode(true)));
      for (const identified of faceContent.querySelectorAll("[id]")) {
        identified.removeAttribute("id");
      }
      face.append(faceContent);
      return face;
    };

    const animateTurn = (
      direction: -1 | 1,
      target: number,
    ): Promise<void> => {
      const reducedMotion = globalThis.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (reducedMotion) {
        return Promise.resolve();
      }

      const currentCover = pages[pageIndex]?.kind === "cover";
      const currentFaceIndex =
        direction > 0 && !currentCover && !media.matches
          ? Math.min(pageIndex + 1, pages.length - 1)
          : pageIndex;
      const targetCover = pages[target]?.kind === "cover";
      const targetFaceIndex =
        direction < 0 && !targetCover && !media.matches
          ? Math.min(target + 1, pages.length - 1)
          : target;
      const currentPage = pages[currentFaceIndex];
      const targetPage = pages[targetFaceIndex];
      if (!currentPage || !targetPage) {
        return Promise.resolve();
      }

      const leaf = element(
        "div",
        [
          "book-mode-turn-leaf",
          direction > 0
            ? "book-mode-turn-leaf-forward"
            : "book-mode-turn-leaf-backward",
          currentCover ? "book-mode-turn-leaf-from-cover" : "",
          targetCover ? "book-mode-turn-leaf-to-cover" : "",
        ]
          .filter(Boolean)
          .join(" "),
      );
      leaf.setAttribute("aria-hidden", "true");
      leaf.inert = true;
      leaf.append(
        decorativeFace(currentPage, "book-mode-turn-face book-mode-turn-front"),
        decorativeFace(targetPage, "book-mode-turn-face book-mode-turn-back"),
        element("span", "book-mode-turn-shadow"),
        element("span", "book-mode-turn-fold"),
      );
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

    const render = () => {
      if (!overlay) {
        return;
      }
      spread.replaceChildren();
      const coverVisible = pages[pageIndex]?.kind === "cover";
      book.classList.toggle("book-mode-book-closed", coverVisible);
      spread.classList.toggle("book-mode-spread-cover", coverVisible);
      const visibleCount = coverVisible || media.matches ? 1 : 2;
      const end = Math.min(pageIndex + visibleCount, pages.length);
      for (let index = pageIndex; index < end; index += 1) {
        const page = pages[index];
        if (!page) {
          continue;
        }
        const sheet = element(
          "article",
          [
            "book-mode-sheet",
            page.kind === "cover" ? "book-mode-cover" : "",
            index === pageIndex
              ? coverVisible
                ? "book-mode-sheet-cover"
                : "book-mode-sheet-left"
              : "book-mode-sheet-right",
          ]
            .filter(Boolean)
            .join(" "),
        );
        sheet.dataset.bookPage =
          page.kind === "cover"
            ? "cover"
            : String(page.screenNumber ?? index);
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
        sheet.append(contentRoot, folio);
        if (index === end - 1 && index < pages.length - 1) {
          const corner = element("button", "book-mode-corner");
          corner.type = "button";
          corner.setAttribute("aria-label", "Turn page forward");
          corner.addEventListener("click", () => void go(1));
          sheet.append(corner);
        }
        spread.append(sheet);
      }
      if (!media.matches && !coverVisible && end - pageIndex === 1) {
        const blank = element(
          "div",
          "book-mode-sheet book-mode-sheet-right book-mode-sheet-blank",
        );
        blank.setAttribute("aria-hidden", "true");
        spread.append(blank);
      }
      const starts = pageStarts();
      const position = starts.indexOf(pageIndex);
      previous.disabled = position <= 0 || navigating;
      next.disabled = position >= starts.length - 1 || navigating;
      if (coverVisible) {
        counter.textContent = "Front cover";
      } else {
        const visiblePages = pages
          .slice(pageIndex, end)
          .flatMap((page) =>
            page?.screenNumber === undefined ? [] : [page.screenNumber],
          );
        counter.textContent =
          visiblePages.length === 1
            ? `Screen ${visiblePages[0]} / ${pages.length - 1}`
            : `Screens ${visiblePages[0]}–${visiblePages.at(-1)} / ${pages.length - 1}`;
      }
      spread.setAttribute("aria-busy", String(navigating));
    };

    const go = async (direction: -1 | 1) => {
      if (navigating) {
        return;
      }
      const starts = pageStarts();
      const currentPosition = starts.indexOf(pageIndex);
      const target = starts[currentPosition + direction];
      if (target === undefined || target === pageIndex) {
        return;
      }
      const targetPage = pages[target];
      if (!targetPage) {
        return;
      }
      navigating = true;
      render();
      const openingCover =
        direction > 0 && pages[pageIndex]?.kind === "cover";
      if (openingCover) {
        book.classList.add("book-mode-book-opening");
        if (
          !globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches
        ) {
          await new Promise((resolve) => setTimeout(resolve, 360));
        }
        book.classList.add("book-mode-book-positioned");
      }
      const turn = animateTurn(direction, target);
      const current = session.getState().publication;
      if (!current) {
        navigating = false;
        render();
        return;
      }
      const accepted = await options.navigate({
        kind: "semantic",
        bookId: current.bookId,
        editionId: current.editionId,
        chapterId: targetPage.chapterId,
        anchor: targetPage.anchor,
      });
      if (accepted) {
        await turn;
        pageIndex = boundedIndex(target);
      } else {
        await turn;
      }
      navigating = false;
      book.classList.remove(
        "book-mode-book-opening",
        "book-mode-book-positioned",
      );
      const closingCover =
        accepted && pages[pageIndex]?.kind === "cover";
      if (closingCover) {
        book.classList.add("book-mode-book-closing");
      }
      render();
      if (closingCover) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            book.classList.remove("book-mode-book-closing");
          });
        });
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
      pageIndex = boundedIndex(pageIndex);
      render();
    };
    closeButton.addEventListener("click", close);
    previous.addEventListener("click", () => void go(-1));
    next.addEventListener("click", () => void go(1));
    let pointerStart:
      | {
          id: number;
          x: number;
          y: number;
          time: number;
        }
      | undefined;
    const onPointerDown = (event: PointerEvent) => {
      if (
        navigating ||
        !event.isPrimary ||
        event.button !== 0 ||
        event.target instanceof Element &&
          event.target.closest("button, a, input, textarea, select")
      ) {
        return;
      }
      pointerStart = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        time: event.timeStamp,
      };
      book.setPointerCapture(event.pointerId);
      book.classList.add("book-mode-book-grabbing");
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
      const velocity = Math.abs(horizontal) / elapsed;
      if (
        vertical < 80 &&
        (Math.abs(horizontal) >= 70 || velocity >= 0.55)
      ) {
        void go(horizontal < 0 ? 1 : -1);
      }
    };
    const onPointerCancel = (event: PointerEvent) => {
      clearPointer(event);
    };
    book.addEventListener("pointerdown", onPointerDown);
    book.addEventListener("pointerup", onPointerEnd);
    book.addEventListener("pointercancel", onPointerCancel);
    document.addEventListener("keydown", onKey);
    media.addEventListener("change", onMediaChange);
    cleanupInteraction = () => {
      document.removeEventListener("keydown", onKey);
      media.removeEventListener("change", onMediaChange);
      book.removeEventListener("pointerdown", onPointerDown);
      book.removeEventListener("pointerup", onPointerEnd);
      book.removeEventListener("pointercancel", onPointerCancel);
    };
    closeButton.focus();

    try {
      const loadedPages = await loadBookPages(
        publication,
        content,
        fetcher,
        controller.signal,
      );
      if (!overlay || controller.signal.aborted) {
        return;
      }
      loading = undefined;
      pages = loadedPages;
      const current = session.getState().location;
      const currentIndex =
        current?.kind === "semantic"
          ? pages.findIndex(
              (page) =>
                page.chapterId === current.chapterId &&
                page.sourceAnchors.includes(current.anchor),
            )
          : 0;
      pageIndex = boundedIndex(Math.max(0, currentIndex));
      unsubscribeSession = session.subscribe((nextState) => {
        const location = nextState.location;
        if (
          navigating ||
          nextState.status !== "ready" ||
          location?.kind !== "semantic"
        ) {
          return;
        }
        const index = pages.findIndex(
          (page) =>
            page.chapterId === location.chapterId &&
            page.sourceAnchors.includes(location.anchor),
        );
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
        closeButton.focus();
      }
    }
  };

  return {
    open,
    close,
    isOpen: () => overlay !== undefined,
    destroy(): void {
      if (destroyed) {
        return;
      }
      destroyed = true;
      close();
    },
  };
}

async function loadBookPages(
  publication: PublicationManifest,
  content: HTMLElement,
  fetcher: typeof globalThis.fetch,
  signal: AbortSignal,
): Promise<BookPage[]> {
  const pages: BookPage[] = [coverPage(publication)];
  let screenNumber = 0;
  for (const chapter of publication.renditions.semantic.chapters) {
    if (signal.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    const article = await loadArticle(chapter, content, fetcher, signal);
    pages.push(
      ...pagesFromArticle(article, chapter).map((page) => ({
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
