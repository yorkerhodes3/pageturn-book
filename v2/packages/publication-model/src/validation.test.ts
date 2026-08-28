import { describe, expect, it } from "vitest";
import {
  PublicationValidationError,
  resolvePublicationManifestUrls,
  validatePublicationManifest,
} from "./index.js";

const hash = "a".repeat(64);

function validManifest() {
  return {
    schemaVersion: "1.0",
    bookId: "demo-book",
    editionId: "2026-08",
    contentHash: hash,
    title: "Demo Book",
    authors: [{ name: "Ethical Tech CoLab" }],
    language: "en",
    direction: "ltr",
    tableOfContents: [
      {
        title: "Introduction",
        location: {
          kind: "semantic",
          bookId: "demo-book",
          editionId: "2026-08",
          chapterId: "introduction",
          anchor: "h-introduction",
        },
      },
    ],
    renditions: {
      semantic: {
        kind: "semantic-html",
        chapters: [
          {
            chapterId: "introduction",
            title: "Introduction",
            href: "chapters/introduction/index.html",
            firstAnchor: "h-introduction",
            lastAnchor: "p-conclusion",
            contentHash: hash,
          },
        ],
        sourceMap: "source-map.json",
      },
    },
    capabilities: {
      annotations: true,
      bookmarks: true,
      facsimile: false,
      legacyFacsimile: false,
      search: false,
      sourceMap: true,
    },
  };
}

describe("validatePublicationManifest", () => {
  it("accepts and brands a valid semantic publication", () => {
    const manifest = validatePublicationManifest(validManifest());

    expect(manifest.bookId).toBe("demo-book");
    expect(manifest.renditions.semantic.chapters).toHaveLength(1);
  });

  it("reports multiple structural issues", () => {
    const invalid = validManifest();
    invalid.bookId = "Demo Book";
    invalid.authors = [];
    invalid.contentHash = "short";

    expect(() => validatePublicationManifest(invalid)).toThrow(
      PublicationValidationError,
    );
    try {
      validatePublicationManifest(invalid);
    } catch (error) {
      expect(error).toBeInstanceOf(PublicationValidationError);
      expect((error as PublicationValidationError).issues.length).toBeGreaterThan(
        2,
      );
    }
  });

  it("retains nested relative paths when resolving URLs", () => {
    const manifest = validatePublicationManifest(validManifest());
    const resolved = resolvePublicationManifestUrls(
      manifest,
      new URL("https://example.org/books/demo/manifest.json"),
    );

    expect(resolved.renditions.semantic.chapters[0]?.href).toBe(
      "https://example.org/books/demo/chapters/introduction/index.html",
    );
    expect(resolved.renditions.semantic.sourceMap).toBe(
      "https://example.org/books/demo/source-map.json",
    );
  });
});

