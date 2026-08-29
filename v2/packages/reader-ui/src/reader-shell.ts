import type {
  PublicationManifest,
  SemanticLocation,
  TocEntry,
} from "@ethical-tech/book-publication-model";
import type {
  ReaderCommandResult,
  ReaderSession,
  ReaderSessionState,
} from "@ethical-tech/book-reader-core";
import { createSemanticBookMode } from "./book-mode.js";
import { shareReadingLocation } from "./share.js";

export type ReaderShellOptions = {
  history?: History;
  location?: Location;
};

export type ReaderShellHandle = {
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

function chapterFor(
  publication: PublicationManifest,
  chapterId: string,
) {
  return publication.renditions.semantic.chapters.find(
    (chapter) => chapter.chapterId === chapterId,
  );
}

function locationUrl(
  publication: PublicationManifest,
  location: SemanticLocation,
  fallbackBase: string,
): URL {
  const chapter = chapterFor(publication, location.chapterId);
  if (!chapter) {
    throw new Error(`Chapter ${location.chapterId} is not in the publication`);
  }
  const url = new URL(chapter.href, fallbackBase);
  if (
    (url.protocol === "http:" || url.protocol === "https:") &&
    url.pathname.endsWith("/index.html")
  ) {
    url.pathname = url.pathname.slice(0, -"index.html".length);
  }
  if (new URL(fallbackBase).searchParams.get("view") === "book") {
    url.searchParams.set("view", "book");
  }
  url.hash = encodeURIComponent(location.anchor);
  return url;
}

function normalizedPath(path: string): string {
  return path
    .replace(/\/index\.html$/, "/")
    .replace(/\/+$/, "");
}

function locationFromUrl(
  publication: PublicationManifest,
  url: URL,
): SemanticLocation | undefined {
  const chapter = publication.renditions.semantic.chapters.find((candidate) => {
    const chapterUrl = new URL(candidate.href, url);
    return normalizedPath(chapterUrl.pathname) === normalizedPath(url.pathname);
  });
  if (!chapter) {
    return undefined;
  }
  return {
    kind: "semantic",
    bookId: publication.bookId,
    editionId: publication.editionId,
    chapterId: chapter.chapterId,
    anchor: decodeURIComponent(url.hash.slice(1)) || chapter.firstAnchor,
  };
}

function navigationError(result: ReaderCommandResult): string | undefined {
  return !result.ok && "error" in result ? result.error.message : undefined;
}

function tocList(
  entries: TocEntry[],
  publication: PublicationManifest,
  fallbackBase: string,
  navigate: (location: SemanticLocation) => void,
): HTMLUListElement {
  const list = element("ul", "book-toc-list");
  for (const entry of entries) {
    const item = element("li", "book-toc-item");
    const link = element("a", "book-toc-link", entry.title);
    link.href = locationUrl(publication, entry.location, fallbackBase).toString();
    link.dataset.chapterId = entry.location.chapterId;
    link.dataset.anchor = entry.location.anchor;
    link.addEventListener("click", (event) => {
      event.preventDefault();
      navigate(entry.location);
    });
    item.append(link);
    if (entry.children?.length) {
      item.append(
        tocList(entry.children, publication, fallbackBase, navigate),
      );
    }
    list.append(item);
  }
  return list;
}

export function mountReaderShell(
  content: HTMLElement,
  session: ReaderSession,
  options: ReaderShellOptions = {},
): ReaderShellHandle {
  const layout = content.closest<HTMLElement>(".book-layout");
  if (!layout) {
    throw new Error("Reader content must be inside .book-layout");
  }
  const browserHistory = options.history ?? globalThis.history;
  const browserLocation = options.location ?? globalThis.location;
  const sidebar = element("aside", "book-reader-sidebar");
  const toc = element("nav", "book-reader-toc");
  toc.setAttribute("aria-label", "Table of contents");
  toc.append(element("h2", "book-reader-toc-heading", "Contents"));
  sidebar.append(toc);

  const toolbar = element("div", "book-reader-toolbar");
  toolbar.setAttribute("aria-label", "Reading controls");
  const previous = element("button", "book-reader-control", "Previous");
  previous.type = "button";
  const progress = element("span", "book-reader-progress", "Loading");
  progress.setAttribute("role", "status");
  const next = element("button", "book-reader-control", "Next");
  next.type = "button";
  const share = element("button", "book-reader-control", "Share");
  share.type = "button";
  share.title = "Share the current canonical reading location";
  const bookView = element(
    "button",
    "book-reader-control book-reader-book-view",
    "Book view",
  );
  bookView.type = "button";
  bookView.disabled = true;
  toolbar.append(previous, progress, next, share, bookView);

  layout.classList.add("book-layout-enhanced");
  layout.prepend(toolbar, sidebar);

  let publication: PublicationManifest | undefined;
  let destroyed = false;
  let tocReady = false;

  const writeLocation = (
    location: SemanticLocation,
    mode: "push" | "replace",
  ) => {
    if (!publication) {
      return;
    }
    const url = locationUrl(
      publication,
      location,
      browserLocation.href,
    );
    const state = {
      bookReader: true,
      bookId: location.bookId,
      editionId: location.editionId,
      chapterId: location.chapterId,
      anchor: location.anchor,
    };
    if (mode === "push") {
      browserHistory.pushState(state, "", url);
    } else {
      browserHistory.replaceState(state, "", url);
    }
  };

  const navigate = async (
    location: SemanticLocation,
    historyMode: "push" | "none" = "push",
  ): Promise<boolean> => {
    const result = await session.dispatch({ type: "go-to", location });
    if (destroyed) {
      return false;
    }
    const error = navigationError(result);
    if (error) {
      progress.textContent = error;
      return false;
    }
    if (result.ok && historyMode === "push") {
      writeLocation(location, "push");
    }
    return result.ok;
  };

  const runRelative = async (direction: "previous" | "next") => {
    const result = await session.dispatch({ type: direction });
    if (destroyed) {
      return;
    }
    const error = navigationError(result);
    if (error) {
      progress.textContent = error;
      return;
    }
    const current = session.getState().location;
    if (result.ok && current?.kind === "semantic") {
      writeLocation(current, "push");
    }
  };

  const updateBookViewUrl = (open: boolean) => {
    const url = new URL(browserLocation.href);
    const isBookView = url.searchParams.get("view") === "book";
    if (open && !isBookView) {
      url.searchParams.set("view", "book");
      browserHistory.pushState(
        { ...browserHistory.state, bookReaderView: "book" },
        "",
        url,
      );
    } else if (!open && isBookView) {
      url.searchParams.delete("view");
      browserHistory.replaceState(
        { ...browserHistory.state, bookReaderView: undefined },
        "",
        url,
      );
    }
  };

  const pushCoverUrl = () => {
    const url = new URL(browserLocation.href);
    url.searchParams.set("view", "book");
    url.hash = "";
    browserHistory.pushState(
      { ...browserHistory.state, bookReaderView: "cover" },
      "",
      url,
    );
  };

  const bookMode = createSemanticBookMode(content, session, {
    navigate: (location) => navigate(location),
    onOpenChange: updateBookViewUrl,
    onCoverReached: pushCoverUrl,
    startAtCover: () => new URL(browserLocation.href).hash.length === 0,
  });

  const onContentClick = (event: MouseEvent) => {
    const target =
      event.target instanceof Element
        ? event.target.closest<HTMLAnchorElement>("a[href]")
        : null;
    if (!target || !publication) {
      return;
    }
    const targetUrl = new URL(target.href, browserLocation.href);
    const targetLocation = locationFromUrl(publication, targetUrl);
    if (!targetLocation) {
      return;
    }
    event.preventDefault();
    void navigate(targetLocation);
  };

  const onPopState = async () => {
    if (!publication) {
      return;
    }
    const url = new URL(browserLocation.href);
    const wantsBookView = url.searchParams.get("view") === "book";
    if (!wantsBookView && bookMode.isOpen()) {
      bookMode.close();
    }
    if (wantsBookView && url.hash.length === 0 && bookMode.isOpen()) {
      bookMode.showCover();
      return;
    }
    const target = locationFromUrl(
      publication,
      url,
    );
    if (target) {
      const accepted = await navigate(target, "none");
      if (accepted && wantsBookView && !bookMode.isOpen()) {
        await bookMode.open(bookView);
      }
    }
  };
  const onPopStateEvent = () => {
    void onPopState().catch((error: unknown) => {
      progress.textContent =
        error instanceof Error
          ? error.message
          : "Unable to restore reader history";
    });
  };

  const onShare = async () => {
    progress.textContent = await shareReadingLocation(
      publication?.title ?? document.title,
      browserLocation.href,
    );
  };

  previous.addEventListener("click", () => void runRelative("previous"));
  next.addEventListener("click", () => void runRelative("next"));
  share.addEventListener("click", () => void onShare());
  bookView.addEventListener("click", () => {
    void bookMode.open(bookView).catch((error: unknown) => {
      progress.textContent =
        error instanceof Error ? error.message : "Book view failed to open";
    });
  });
  content.addEventListener("click", onContentClick);
  globalThis.addEventListener("popstate", onPopStateEvent);

  const update = (state: ReaderSessionState) => {
    publication = state.publication;
    if (!publication) {
      return;
    }
    if (!tocReady) {
      toc.append(
        tocList(
          publication.tableOfContents,
          publication,
          browserLocation.href,
          (location) => void navigate(location),
        ),
      );
      tocReady = true;
    }

    const current = state.location;
    const semantic = current?.kind === "semantic" ? current : undefined;
    const chapters = publication.renditions.semantic.chapters;
    const chapterIndex = semantic
      ? chapters.findIndex(
          (chapter) => chapter.chapterId === semantic.chapterId,
        )
      : -1;
    previous.disabled = chapterIndex <= 0 || state.status !== "ready";
    next.disabled =
      chapterIndex < 0 ||
      chapterIndex >= chapters.length - 1 ||
      state.status !== "ready";
    const rtlBook = publication.direction === "rtl";
    bookView.disabled = state.status !== "ready" || rtlBook;
    bookView.title = rtlBook
      ? "Physical book mode is not yet available for right-to-left publications"
      : "Open physical book view";
    progress.textContent =
      state.status === "error"
        ? (state.error?.message ?? "Reader error")
        : chapterIndex >= 0
          ? `Chapter ${chapterIndex + 1} of ${chapters.length}`
          : "Loading";

    for (const link of toc.querySelectorAll<HTMLAnchorElement>(
      ".book-toc-link",
    )) {
      const active =
        semantic !== undefined &&
        link.dataset.chapterId === semantic.chapterId &&
        link.dataset.anchor === semantic.anchor;
      if (active) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    }

    if (semantic && chapterIndex >= 0) {
      const chapter = chapters[chapterIndex];
      if (chapter) {
        const chapterLabel = document.querySelector<HTMLElement>(
          ".book-site-header > span",
        );
        if (chapterLabel) {
          chapterLabel.textContent = chapter.title;
        }
        document.title = `${chapter.title} - ${publication.title}`;
      }
    }
  };

  const unsubscribe = session.subscribe(update);

  return {
    destroy(): void {
      if (destroyed) {
        return;
      }
      destroyed = true;
      unsubscribe();
      bookMode.destroy();
      content.removeEventListener("click", onContentClick);
      globalThis.removeEventListener("popstate", onPopStateEvent);
      sidebar.remove();
      toolbar.remove();
      layout.classList.remove("book-layout-enhanced");
    },
  };
}
