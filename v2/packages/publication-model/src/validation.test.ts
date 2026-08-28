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
    appearance: {
      cover: {
        background: "#3d211d",
        foreground: "#f2dfb0",
        accent: "#b9914f",
        subtitle: "Field notes",
      },
      binding: {
        material: "leather",
        color: "#301713",
        accent: "#b9914f",
        depth: "thick",
        hubs: 5,
        shelfLabel: "ETHICAL TECHNOLOGY",
      },
    },
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
    expect(manifest.appearance?.binding.material).toBe("leather");
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

  it("rejects unsafe appearance colors and excessive spine hubs", () => {
    const invalid = validManifest();
    if (!invalid.appearance) {
      throw new Error("Expected appearance fixture");
    }
    invalid.appearance.cover.background = "url(javascript:alert(1))";
    invalid.appearance.binding.hubs = 9;

    try {
      validatePublicationManifest(invalid);
      throw new Error("Expected validation failure");
    } catch (error) {
      expect(error).toBeInstanceOf(PublicationValidationError);
      const codes = (error as PublicationValidationError).issues.map(
        (issue) => issue.code,
      );
      expect(codes).toContain("COLOR_INVALID");
      expect(codes).toContain("BINDING_HUBS_RANGE");
    }
  });
});
