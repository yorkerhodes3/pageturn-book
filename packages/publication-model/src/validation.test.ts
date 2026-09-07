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
    frontMatter: {
      kicker: "Ethical Tech CoLab · Research paper",
      credits: "Research team",
      thesis: "Ethics governs power.",
      disclaimer: "Research publication disclaimer.",
      canonicalUrl: "https://example.org/books/demo/",
      notesStatus: "Works Cited is complete; mapped notes are unavailable.",
    },
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
    expect(manifest.frontMatter?.thesis).toBe("Ethics governs power.");
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

  it("validates and resolves publication media without changing order", () => {
    const source = validManifest() as ReturnType<typeof validManifest> & {
      media?: unknown;
    };
    source.media = {
      defaultDisplay: "pop-out",
      defaultStyle: "book-toned",
      figures: [
        {
          id: "example-portrait",
          chapterId: "introduction",
          afterAnchor: "p-conclusion",
          src: "../media/example.webp",
          integrity:
            "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          originalSrc: "https://images.example.org/example.jpg",
          width: 1200,
          height: 800,
          alt: "A detailed example portrait.",
          caption: "Figure 1. Example portrait.",
          visualKind: "portrait",
          colorSemantics: "decorative",
          transformPermitted: true,
          exportPermitted: false,
          rights: {
            license: "CC BY 4.0",
            attribution: "Example Artist",
          },
          source: "Example archive",
          provenance: "Reviewed source record",
          reviewedAt: "2026-09-06",
        },
      ],
    };

    const manifest = validatePublicationManifest(source);
    const resolved = resolvePublicationManifestUrls(
      manifest,
      new URL("https://example.org/books/demo/manifest.json"),
    );

    expect(manifest.media?.figures.map(({ id }) => id)).toEqual([
      "example-portrait",
    ]);
    expect(resolved.media?.figures[0]?.src).toBe(
      "https://example.org/books/media/example.webp",
    );
    expect(resolved.media?.figures[0]?.originalSrc).toBe(
      "https://images.example.org/example.jpg",
    );
    expect(resolved.media?.figures[0]?.integrity).toBe(
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    );
  });

  it("rejects unsafe, duplicate, and unknown media placements", () => {
    const source = validManifest() as ReturnType<typeof validManifest> & {
      media?: unknown;
    };
    source.media = {
      defaultDisplay: "on-page",
      figures: [
        {
          id: "duplicate",
          chapterId: "missing",
          afterAnchor: "p-same",
          src: "javascript:alert(1)",
          width: 0,
          height: 99999,
          alt: "Unsafe image",
          caption: "Unsafe",
          rights: { license: "CC0" },
        },
        {
          id: "duplicate",
          chapterId: "introduction",
          replaceAnchors: ["p-same", "p-same"],
          src: "safe.webp",
          width: 10,
          height: 10,
          alt: "Duplicate placement",
          caption: "Duplicate",
        },
      ],
    };

    try {
      validatePublicationManifest(source);
      throw new Error("Expected validation failure");
    } catch (error) {
      expect(error).toBeInstanceOf(PublicationValidationError);
      const codes = (error as PublicationValidationError).issues.map(
        ({ code }) => code,
      );
      expect(codes).toContain("MEDIA_URL_INVALID");
      expect(codes).toContain("MEDIA_ID_DUPLICATE");
      expect(codes).toContain("MEDIA_ANCHOR_DUPLICATE");
      expect(codes).toContain("MEDIA_CHAPTER_UNKNOWN");
      expect(codes).toContain("MEDIA_DIMENSION_RANGE");
      expect(codes).toContain("TYPE_STRING");
    }
  });

  it("requires complete integrity, rights, and provenance for manifest media", () => {
    const source = validManifest() as ReturnType<typeof validManifest> & {
      media?: unknown;
    };
    source.media = {
      defaultDisplay: "on-page",
      figures: [
        {
          id: "unreviewed",
          chapterId: "introduction",
          afterAnchor: "p-conclusion",
          src: "unreviewed.webp",
          integrity: "SHA256:not-a-digest",
          width: 10,
          height: 10,
          alt: "Unreviewed image",
          caption: "Unreviewed",
          transformPermitted: false,
          exportPermitted: false,
        },
      ],
    };

    try {
      validatePublicationManifest(source);
      throw new Error("Expected validation failure");
    } catch (error) {
      expect(error).toBeInstanceOf(PublicationValidationError);
      const codes = (error as PublicationValidationError).issues.map(
        ({ code }) => code,
      );
      expect(codes).toContain("MEDIA_INTEGRITY_INVALID");
      expect(codes).toContain("TYPE_OBJECT");
      expect(codes).toContain("TYPE_STRING");
    }
  });

  it("rejects mutable remote media sources", () => {
    const source = validManifest() as ReturnType<typeof validManifest> & {
      media?: unknown;
    };
    source.media = {
      defaultDisplay: "on-page",
      figures: [
        {
          id: "mutable-image",
          chapterId: "introduction",
          afterAnchor: "p-conclusion",
          src: "https://example.org/images/latest.webp",
          integrity:
            "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          width: 10,
          height: 10,
          alt: "A mutable image",
          caption: "Mutable image",
          rights: { license: "CC0", attribution: "Example" },
          source: "Example",
          provenance: "Reviewed source record",
          reviewedAt: "2026-09-06",
        },
      ],
    };

    try {
      validatePublicationManifest(source);
      throw new Error("Expected validation failure");
    } catch (error) {
      expect(error).toBeInstanceOf(PublicationValidationError);
      expect(
        (error as PublicationValidationError).issues.map(({ code }) => code),
      ).toContain("MEDIA_SOURCE_MUTABLE");
    }
  });

  it("requires complete reviewed metadata before granting media permissions", () => {
    const source = validManifest() as ReturnType<typeof validManifest> & {
      media?: unknown;
    };
    source.media = {
      defaultDisplay: "on-page",
      figures: [
        {
          id: "unsafe-permission",
          chapterId: "introduction",
          afterAnchor: "p-conclusion",
          src: "reviewed.webp",
          integrity:
            "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          width: 10,
          height: 10,
          alt: "Reviewed image",
          caption: "Reviewed",
          transformPermitted: true,
          exportPermitted: true,
          rights: { license: "", attribution: "" },
          source: "",
          provenance: "",
          reviewedAt: "not-a-date",
        },
      ],
    };

    try {
      validatePublicationManifest(source);
      throw new Error("Expected validation failure");
    } catch (error) {
      expect(error).toBeInstanceOf(PublicationValidationError);
      const codes = (error as PublicationValidationError).issues.map(
        ({ code }) => code,
      );
      expect(codes).toContain("MEDIA_POLICY_METADATA_INCOMPLETE");
      expect(codes).toContain("MEDIA_REVIEW_DATE_INVALID");
    }
  });

  it("allows the same placement anchor in different chapters", () => {
    const source = validManifest();
    source.renditions.semantic.chapters.push({
      chapterId: "appendix",
      title: "Appendix",
      href: "chapters/appendix/index.html",
      firstAnchor: "h-appendix",
      lastAnchor: "p-conclusion",
      contentHash: hash,
    });
    const figure = (id: string, chapterId: string) => ({
      id,
      chapterId,
      afterAnchor: "p-conclusion",
      src: `${id}.webp`,
      integrity:
        "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      width: 10,
      height: 10,
      alt: "A figure",
      caption: "A caption",
      rights: { license: "CC0", attribution: "Example" },
      source: "Example source",
      provenance: "Reviewed record",
      reviewedAt: "2026-09-06",
    });
    (source as typeof source & { media?: unknown }).media = {
      defaultDisplay: "on-page",
      figures: [
        figure("introduction-figure", "introduction"),
        figure("appendix-figure", "appendix"),
      ],
    };

    expect(validatePublicationManifest(source).media?.figures).toHaveLength(2);
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

  it("rejects unsafe front matter links", () => {
    const invalid = validManifest();
    invalid.frontMatter.canonicalUrl = "javascript:alert(1)";

    try {
      validatePublicationManifest(invalid);
      throw new Error("Expected validation failure");
    } catch (error) {
      expect(error).toBeInstanceOf(PublicationValidationError);
      expect(
        (error as PublicationValidationError).issues.map((issue) => issue.code),
      ).toContain("FRONT_MATTER_URL_INVALID");
    }
  });

  it("rejects invalid BCP-47 language tags", () => {
    const invalid = validManifest();
    invalid.language = "en-US-US";

    try {
      validatePublicationManifest(invalid);
      throw new Error("Expected validation failure");
    } catch (error) {
      expect(error).toBeInstanceOf(PublicationValidationError);
      expect(
        (error as PublicationValidationError).issues.map((issue) => issue.code),
      ).toContain("LANGUAGE_INVALID");
    }
  });
});
