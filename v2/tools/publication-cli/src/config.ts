import { readFile } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import {
  toBookId,
  toChapterId,
  toEditionId,
  type BookId,
  type ChapterId,
  type EditionId,
  type LegacyFacsimileRendition,
  type PublicationAppearance,
  type PublicationAuthor,
} from "@ethical-tech/book-publication-model";
import { parse } from "yaml";

export type ChapterConfig = {
  chapterId: ChapterId;
  title: string;
  source: string;
  slug: string;
};

export type BookConfig = {
  bookId: BookId;
  editionId: EditionId;
  title: string;
  authors: PublicationAuthor[];
  language: string;
  direction: "ltr" | "rtl";
  publicationDate?: string;
  description?: string;
  appearance?: PublicationAppearance;
  chapters: ChapterConfig[];
  legacyFacsimile?: LegacyFacsimileRendition;
};

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${path} must be an object`);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${path} must be a non-empty string`);
  }
  return value;
}

function optionalText(
  value: unknown,
  path: string,
): string | undefined {
  return value === undefined ? undefined : text(value, path);
}

function list(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${path} must be an array`);
  }
  return value;
}

function safeRelativePath(value: unknown, path: string): string {
  const candidate = text(value, path);
  if (
    isAbsolute(candidate) ||
    candidate.split(/[\\/]/).some((part) => part === "..")
  ) {
    throw new Error(`${path} must stay inside the publication source`);
  }
  return candidate;
}

function parseAuthors(value: unknown): PublicationAuthor[] {
  const authors = list(value, "book.authors").map((entry, index) => {
    const author = record(entry, `book.authors[${index}]`);
    const url = optionalText(author.url, `book.authors[${index}].url`);
    return {
      name: text(author.name, `book.authors[${index}].name`),
      ...(url === undefined ? {} : { url }),
    };
  });
  if (authors.length === 0) {
    throw new Error("book.authors must contain at least one author");
  }
  return authors;
}

function parseChapters(value: unknown): ChapterConfig[] {
  const chapterIds = new Set<string>();
  const slugs = new Set<string>();
  const chapters = list(value, "book.chapters").map((entry, index) => {
    const path = `book.chapters[${index}]`;
    const chapter = record(entry, path);
    const chapterId = toChapterId(text(chapter.id, `${path}.id`));
    const slug = text(chapter.slug ?? chapter.id, `${path}.slug`);
    toChapterId(slug);
    if (chapterIds.has(chapterId)) {
      throw new Error(`${path}.id duplicates ${chapterId}`);
    }
    if (slugs.has(slug)) {
      throw new Error(`${path}.slug duplicates ${slug}`);
    }
    chapterIds.add(chapterId);
    slugs.add(slug);
    return {
      chapterId,
      title: text(chapter.title, `${path}.title`),
      source: safeRelativePath(chapter.source, `${path}.source`),
      slug,
    };
  });
  if (chapters.length === 0) {
    throw new Error("book.chapters must contain at least one chapter");
  }
  return chapters;
}

function parseLegacy(
  value: unknown,
): LegacyFacsimileRendition | undefined {
  if (value === undefined) {
    return undefined;
  }
  const legacy = record(value, "book.legacyFacsimile");
  const manifestHref = optionalText(
    legacy.manifestHref,
    "book.legacyFacsimile.manifestHref",
  );
  const pdfHref = optionalText(
    legacy.pdfHref,
    "book.legacyFacsimile.pdfHref",
  );
  return {
    kind: "legacy-read-as-book",
    revision: text(legacy.revision, "book.legacyFacsimile.revision"),
    ...(manifestHref === undefined ? {} : { manifestHref }),
    ...(pdfHref === undefined ? {} : { pdfHref }),
  };
}

function parseColor(value: unknown, path: string): string {
  const color = text(value, path);
  if (!/^#[a-fA-F0-9]{6}$/.test(color)) {
    throw new Error(`${path} must be a six-digit hexadecimal color`);
  }
  return color;
}

function parseAppearance(
  value: unknown,
): PublicationAppearance | undefined {
  if (value === undefined) {
    return undefined;
  }
  const appearance = record(value, "book.appearance");
  const cover = record(appearance.cover, "book.appearance.cover");
  const binding = record(appearance.binding, "book.appearance.binding");
  const material = text(
    binding.material,
    "book.appearance.binding.material",
  );
  if (material !== "leather" && material !== "cloth" && material !== "paper") {
    throw new Error(
      'book.appearance.binding.material must be "leather", "cloth", or "paper"',
    );
  }
  const depth = text(binding.depth, "book.appearance.binding.depth");
  if (depth !== "slim" && depth !== "standard" && depth !== "thick") {
    throw new Error(
      'book.appearance.binding.depth must be "slim", "standard", or "thick"',
    );
  }
  if (
    typeof binding.hubs !== "number" ||
    !Number.isInteger(binding.hubs) ||
    binding.hubs < 0 ||
    binding.hubs > 8
  ) {
    throw new Error("book.appearance.binding.hubs must be an integer from 0 to 8");
  }
  const subtitle = optionalText(
    cover.subtitle,
    "book.appearance.cover.subtitle",
  );
  const shelfLabel = optionalText(
    binding.shelfLabel,
    "book.appearance.binding.shelfLabel",
  );
  return {
    cover: {
      background: parseColor(
        cover.background,
        "book.appearance.cover.background",
      ),
      foreground: parseColor(
        cover.foreground,
        "book.appearance.cover.foreground",
      ),
      accent: parseColor(cover.accent, "book.appearance.cover.accent"),
      ...(subtitle === undefined ? {} : { subtitle }),
    },
    binding: {
      material,
      color: parseColor(binding.color, "book.appearance.binding.color"),
      accent: parseColor(binding.accent, "book.appearance.binding.accent"),
      depth,
      hubs: binding.hubs,
      ...(shelfLabel === undefined ? {} : { shelfLabel }),
    },
  };
}

export function resolveSourceFile(
  sourceRoot: string,
  relativePath: string,
): string {
  const root = resolve(sourceRoot);
  const resolved = resolve(root, relativePath);
  const fromRoot = relative(root, resolved);
  if (
    fromRoot === ".." ||
    fromRoot.startsWith(`..${sep}`) ||
    isAbsolute(fromRoot)
  ) {
    throw new Error(`${relativePath} escapes the publication source directory`);
  }
  return resolved;
}

export async function readBookConfig(sourceRoot: string): Promise<BookConfig> {
  const configPath = resolveSourceFile(sourceRoot, "book.yml");
  const parsed = parse(await readFile(configPath, "utf8")) as unknown;
  const book = record(parsed, "book");
  const directionValue = book.direction ?? "ltr";
  if (directionValue !== "ltr" && directionValue !== "rtl") {
    throw new Error('book.direction must be "ltr" or "rtl"');
  }
  const publicationDate = optionalText(
    book.publicationDate,
    "book.publicationDate",
  );
  const description = optionalText(book.description, "book.description");
  const legacyFacsimile = parseLegacy(book.legacyFacsimile);
  const appearance = parseAppearance(book.appearance);

  return {
    bookId: toBookId(text(book.bookId, "book.bookId")),
    editionId: toEditionId(text(book.editionId, "book.editionId")),
    title: text(book.title, "book.title"),
    authors: parseAuthors(book.authors),
    language: text(book.language, "book.language"),
    direction: directionValue,
    ...(publicationDate === undefined ? {} : { publicationDate }),
    ...(description === undefined ? {} : { description }),
    ...(appearance === undefined ? {} : { appearance }),
    chapters: parseChapters(book.chapters),
    ...(legacyFacsimile === undefined ? {} : { legacyFacsimile }),
  };
}
