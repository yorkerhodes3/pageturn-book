import type {
  PublicationManifest,
  ReaderLocation,
  SemanticChapter,
  SemanticLocation,
} from "@ethical-tech/book-publication-model";
import type {
  PreparedView,
  ReaderRenderer,
  RendererContext,
  RendererHandle,
} from "@ethical-tech/book-reader-core";

type SemanticPayload = {
  kind: "semantic";
  chapter: SemanticChapter;
  html?: string;
  adopted: boolean;
};

function isSemanticPayload(value: unknown): value is SemanticPayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return (
    "kind" in value &&
    value.kind === "semantic" &&
    "chapter" in value &&
    "adopted" in value
  );
}

function semanticLocation(location: ReaderLocation): SemanticLocation {
  if (location.kind !== "semantic") {
    throw new Error("Semantic renderer received a non-semantic location");
  }
  return location;
}

function findChapter(
  publication: PublicationManifest,
  location: SemanticLocation,
): SemanticChapter {
  const chapter = publication.renditions.semantic.chapters.find(
    (candidate) => candidate.chapterId === location.chapterId,
  );
  if (!chapter) {
    throw new Error(`Semantic chapter ${location.chapterId} is not available`);
  }
  return chapter;
}

function findAnchor(host: HTMLElement, anchor: string): HTMLElement | undefined {
  if (host.id === anchor) {
    return host;
  }
  return Array.from(host.querySelectorAll<HTMLElement>("[id]")).find(
    (element) => element.id === anchor,
  );
}

function waitForPaint(signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    let firstFrame = 0;
    let secondFrame = 0;
    let fallback: ReturnType<typeof setTimeout>;
    let settled = false;
    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(fallback);
      signal?.removeEventListener("abort", abort);
      resolve();
    };
    const abort = () => {
      if (settled) {
        return;
      }
      settled = true;
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
      clearTimeout(fallback);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", abort, { once: true });
    // Nested/background frames can suspend requestAnimationFrame indefinitely.
    // The fallback prevents session readiness from hanging in that state.
    fallback = globalThis.setTimeout(finish, 500);
    firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(finish);
    });
  });
}

export type SemanticRendererOptions = {
  fetch?: typeof globalThis.fetch;
  scrollBehavior?: ScrollBehavior;
};

export function createSemanticRenderer(
  options: SemanticRendererOptions = {},
): ReaderRenderer {
  return {
    kind: "semantic",
    mount(host: HTMLElement, _context: RendererContext): RendererHandle {
      const fetcher = options.fetch ?? globalThis.fetch;
      const resizeObserver =
        typeof ResizeObserver === "undefined"
          ? undefined
          : new ResizeObserver(([entry]) => {
              if (entry) {
                host.style.setProperty(
                  "--book-reader-host-width",
                  `${Math.round(entry.contentRect.width)}px`,
                );
              }
            });
      resizeObserver?.observe(host);
      let destroyed = false;
      let visibleLocation: SemanticLocation | undefined;
      let preparedSignal: AbortSignal | undefined;

      return {
        async prepare(
          location,
          publication,
          signal,
        ): Promise<PreparedView> {
          if (destroyed) {
            throw new Error("Semantic renderer has been destroyed");
          }
          const semantic = semanticLocation(location);
          const chapter = findChapter(publication, semantic);
          preparedSignal = signal;
          const adopted =
            host.dataset.chapterId === semantic.chapterId &&
            host.hasChildNodes();
          if (adopted) {
            return {
              location: semantic,
              payload: {
                kind: "semantic",
                chapter,
                adopted: true,
              } satisfies SemanticPayload,
            };
          }

          const response = await fetcher(chapter.href, { signal });
          if (!response.ok) {
            throw new Error(
              `Semantic chapter request failed with ${response.status}`,
            );
          }
          const documentText = await response.text();
          if (signal.aborted) {
            throw new DOMException("Aborted", "AbortError");
          }
          const parsed = new DOMParser().parseFromString(
            documentText,
            "text/html",
          );
          const article = parsed.querySelector<HTMLElement>(
            "[data-reader-content]",
          );
          if (!article) {
            throw new Error(
              `Semantic chapter ${chapter.chapterId} has no reader content`,
            );
          }
          return {
            location: semantic,
            payload: {
              kind: "semantic",
              chapter,
              html: article.innerHTML,
              adopted: false,
            } satisfies SemanticPayload,
          };
        },

        async present(view): Promise<void> {
          if (destroyed) {
            throw new Error("Semantic renderer has been destroyed");
          }
          const location = semanticLocation(view.location);
          if (!isSemanticPayload(view.payload)) {
            throw new Error("Semantic renderer received invalid prepared content");
          }
          if (!view.payload.adopted) {
            host.innerHTML = view.payload.html ?? "";
            host.dataset.chapterId = view.payload.chapter.chapterId;
          }
          const target = findAnchor(host, location.anchor);
          if (!target) {
            throw new Error(
              `Semantic anchor ${location.anchor} is not present in ${location.chapterId}`,
            );
          }
          await waitForPaint(preparedSignal);
          target.scrollIntoView({
            block: "start",
            behavior: options.scrollBehavior ?? "auto",
          });
          visibleLocation = location;
        },

        getVisibleLocation: () => visibleLocation,

        focusContent(): void {
          if (!host.hasAttribute("tabindex")) {
            host.tabIndex = -1;
          }
          host.focus({ preventScroll: true });
        },

        destroy(): void {
          if (destroyed) {
            return;
          }
          destroyed = true;
          resizeObserver?.disconnect();
          preparedSignal = undefined;
          visibleLocation = undefined;
          host.style.removeProperty("--book-reader-host-width");
        },
      };
    },
  };
}
