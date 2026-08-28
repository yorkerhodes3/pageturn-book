import type {
  ChapterId,
  PublicationManifest,
  SemanticChapter,
  SemanticLocation,
} from "@ethical-tech/book-publication-model";
import type { ReaderSession } from "@ethical-tech/book-reader-core";

type BookPage = {
  chapterId: ChapterId;
  chapterTitle: string;
  anchor: string;
  sourceAnchors: string[];
  nodes: Node[];
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

  for (const node of allElements) {
    if (!node.id) {
      continue;
    }
    const replacement = `book-mode-${pageKey}-${node.id}`;
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
    options.singlePageQuery ?? "(max-width: 720px)",
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
    const spread = element("div", "book-mode-spread");
    spread.setAttribute("aria-busy", "true");
    const next = element("button", "book-mode-arrow book-mode-arrow-next", "›");
    next.type = "button";
    next.setAttribute("aria-label", "Next screen page");
    stage.append(previous, spread, next);
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

    const step = () => (media.matches ? 1 : 2);
    const maxStart = () => Math.max(0, pages.length - 1);
    const alignedIndex = (index: number) =>
      media.matches ? index : Math.floor(index / 2) * 2;

    const render = () => {
      if (!overlay) {
        return;
      }
      spread.replaceChildren();
      const visibleCount = step();
      const end = Math.min(pageIndex + visibleCount, pages.length);
      for (let index = pageIndex; index < end; index += 1) {
        const page = pages[index];
        if (!page) {
          continue;
        }
        const sheet = element(
          "article",
          `book-mode-sheet ${index === pageIndex ? "book-mode-sheet-left" : "book-mode-sheet-right"}`,
        );
        sheet.dataset.bookPage = String(index + 1);
        sheet.setAttribute(
          "aria-label",
          `${page.chapterTitle}, screen page ${index + 1} of ${pages.length}`,
        );
        const contentRoot = element("div", "book-mode-sheet-content");
        contentRoot.append(...page.nodes.map((node) => node.cloneNode(true)));
        const folio = element("footer", "book-mode-folio", String(index + 1));
        sheet.append(contentRoot, folio);
        spread.append(sheet);
      }
      if (!media.matches && end - pageIndex === 1) {
        const blank = element(
          "div",
          "book-mode-sheet book-mode-sheet-right book-mode-sheet-blank",
        );
        blank.setAttribute("aria-hidden", "true");
        spread.append(blank);
      }
      previous.disabled = pageIndex === 0 || navigating;
      next.disabled = pageIndex >= maxStart() || navigating;
      counter.textContent =
        visibleCount === 1 || end - pageIndex === 1
          ? `Screen ${pageIndex + 1} / ${pages.length}`
          : `Screens ${pageIndex + 1}–${end} / ${pages.length}`;
      spread.setAttribute("aria-busy", String(navigating));
    };

    const go = async (direction: -1 | 1) => {
      if (navigating) {
        return;
      }
      const target = Math.min(
        maxStart(),
        Math.max(0, pageIndex + direction * step()),
      );
      if (target === pageIndex) {
        return;
      }
      const targetPage = pages[target];
      if (!targetPage) {
        return;
      }
      navigating = true;
      spread.classList.add(
        direction > 0 ? "book-mode-turn-forward" : "book-mode-turn-backward",
      );
      render();
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
        const reducedMotion = globalThis.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        if (!reducedMotion) {
          await new Promise((resolve) => setTimeout(resolve, 320));
        }
        pageIndex = Math.min(alignedIndex(target), maxStart());
      }
      navigating = false;
      spread.classList.remove(
        "book-mode-turn-forward",
        "book-mode-turn-backward",
      );
      render();
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
      pageIndex = Math.min(alignedIndex(pageIndex), maxStart());
      render();
    };
    closeButton.addEventListener("click", close);
    previous.addEventListener("click", () => void go(-1));
    next.addEventListener("click", () => void go(1));
    document.addEventListener("keydown", onKey);
    media.addEventListener("change", onMediaChange);
    cleanupInteraction = () => {
      document.removeEventListener("keydown", onKey);
      media.removeEventListener("change", onMediaChange);
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
      pageIndex = alignedIndex(Math.max(0, currentIndex));
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
          pageIndex = Math.min(alignedIndex(index), maxStart());
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
  const pages: BookPage[] = [];
  for (const chapter of publication.renditions.semantic.chapters) {
    if (signal.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    const article = await loadArticle(chapter, content, fetcher, signal);
    pages.push(...pagesFromArticle(article, chapter));
  }
  if (pages.length === 0) {
    throw new Error("Publication contains no semantic screen pages");
  }
  return pages;
}
