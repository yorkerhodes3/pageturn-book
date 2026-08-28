import type {
  PublicationManifest,
  ReaderLocation,
} from "@ethical-tech/book-publication-model";
import { validatePublicationManifest } from "@ethical-tech/book-publication-model";
import { describe, expect, it } from "vitest";
import {
  createReaderSession,
  type PreparedView,
  type ReaderRenderer,
  type RendererHandle,
} from "./index.js";

const hash = "b".repeat(64);

function manifest(): PublicationManifest {
  return validatePublicationManifest({
    schemaVersion: "1.0",
    bookId: "demo-book",
    editionId: "2026-08",
    contentHash: hash,
    title: "Demo",
    authors: [{ name: "Ethical Tech CoLab" }],
    language: "en",
    direction: "ltr",
    tableOfContents: [],
    renditions: {
      semantic: {
        kind: "semantic-html",
        chapters: [
          {
            chapterId: "one",
            title: "One",
            href: "one.html",
            firstAnchor: "one",
            lastAnchor: "one",
            contentHash: hash,
          },
          {
            chapterId: "two",
            title: "Two",
            href: "two.html",
            firstAnchor: "two",
            lastAnchor: "two",
            contentHash: hash,
          },
        ],
      },
    },
    capabilities: {
      annotations: true,
      bookmarks: true,
      facsimile: false,
      legacyFacsimile: false,
      search: false,
      sourceMap: false,
    },
  });
}

function fakeRenderer(delay = 0): {
  renderer: ReaderRenderer;
  presented: ReaderLocation[];
  handles: RendererHandle[];
} {
  const presented: ReaderLocation[] = [];
  const handles: RendererHandle[] = [];
  const renderer: ReaderRenderer = {
    kind: "semantic",
    mount: () => {
      const handle: RendererHandle = {
        async prepare(location, _publication, signal): Promise<PreparedView> {
          if (delay > 0) {
            await new Promise<void>((resolve, reject) => {
              const timer = setTimeout(resolve, delay);
              signal.addEventListener(
                "abort",
                () => {
                  clearTimeout(timer);
                  reject(new DOMException("Aborted", "AbortError"));
                },
                { once: true },
              );
            });
          }
          return { location, payload: null };
        },
        async present(view) {
          presented.push(view.location);
        },
        getVisibleLocation: () => presented.at(-1),
        focusContent: () => undefined,
        destroy: () => undefined,
      };
      handles.push(handle);
      return handle;
    },
  };
  return { renderer, presented, handles };
}

describe("createReaderSession", () => {
  it("returns synchronously and becomes ready only after presentation", async () => {
    const fixture = fakeRenderer();
    const session = createReaderSession({ manifest: manifest() });

    expect(session.getState().status).toBe("loading-manifest");
    const unmount = session.mount({} as HTMLElement, fixture.renderer);
    const ready = await session.whenReady();

    expect(ready.status).toBe("ready");
    expect(ready.location?.kind).toBe("semantic");
    expect(fixture.presented).toHaveLength(1);

    unmount();
    session.dispose();
  });

  it("aborts superseded navigation so the latest location wins", async () => {
    const fixture = fakeRenderer(20);
    const session = createReaderSession({ manifest: manifest() });
    session.mount({} as HTMLElement, fixture.renderer);

    await new Promise((resolve) => setTimeout(resolve, 0));
    const result = await session.dispatch({ type: "next" });

    expect(result).toEqual({ ok: true });
    expect(session.getState().location).toMatchObject({
      kind: "semantic",
      chapterId: "two",
      anchor: "two",
    });
    expect(fixture.presented.at(-1)).toMatchObject({ chapterId: "two" });
    session.dispose();
  });

  it("rejects a location from another edition", async () => {
    const fixture = fakeRenderer();
    const session = createReaderSession({ manifest: manifest() });
    session.mount({} as HTMLElement, fixture.renderer);
    await session.whenReady();
    const current = session.getState().location;
    if (!current || current.kind !== "semantic") {
      throw new Error("Expected semantic location");
    }

    const result = await session.dispatch({
      type: "go-to",
      location: { ...current, editionId: "other" as typeof current.editionId },
    });

    expect(result.ok).toBe(false);
    if (!result.ok && "error" in result) {
      expect(result.error.code).toBe("LOCATION_INVALID");
    }
    session.dispose();
  });
});

