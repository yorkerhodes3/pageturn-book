declare const bookIdBrand: unique symbol;
declare const editionIdBrand: unique symbol;
declare const chapterIdBrand: unique symbol;

export type BookId = string & { readonly [bookIdBrand]: true };
export type EditionId = string & { readonly [editionIdBrand]: true };
export type ChapterId = string & { readonly [chapterIdBrand]: true };

export const MANIFEST_SCHEMA_VERSION = "1.0" as const;

const identifierPattern = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

function toIdentifier<T extends string>(
  value: string,
  kind: string,
): T {
  if (!identifierPattern.test(value)) {
    throw new TypeError(
      `${kind} must use lowercase letters, numbers, and internal hyphens`,
    );
  }
  return value as T;
}

export function toBookId(value: string): BookId {
  return toIdentifier<BookId>(value, "bookId");
}

export function toEditionId(value: string): EditionId {
  return toIdentifier<EditionId>(value, "editionId");
}

export function toChapterId(value: string): ChapterId {
  return toIdentifier<ChapterId>(value, "chapterId");
}

export type PublicationAuthor = {
  name: string;
  url?: string;
};

export type TextSelector = {
  quote: {
    exact: string;
    prefix?: string;
    suffix?: string;
  };
  position?: {
    start: number;
    end: number;
  };
};

export type SemanticLocation = {
  kind: "semantic";
  bookId: BookId;
  editionId: EditionId;
  chapterId: ChapterId;
  anchor: string;
  text?: TextSelector;
  blockProgress?: number;
};

export type FacsimileLocation = {
  kind: "facsimile";
  bookId: BookId;
  editionId: EditionId;
  pageIndex: number;
  pageLabel?: string;
  point?: {
    x: number;
    y: number;
  };
};

export type ReaderLocation = SemanticLocation | FacsimileLocation;

export type TocEntry = {
  title: string;
  location: SemanticLocation;
  children?: TocEntry[];
};

export type SemanticChapter = {
  chapterId: ChapterId;
  title: string;
  href: string;
  firstAnchor: string;
  lastAnchor: string;
  contentHash: string;
};

export type SemanticRendition = {
  kind: "semantic-html";
  chapters: SemanticChapter[];
  sourceMap?: string;
  searchIndex?: string;
};

export type FixedPageVariant = {
  href: string;
  mimeType:
    | "image/avif"
    | "image/webp"
    | "image/jpeg"
    | "image/png";
  pixelWidth: number;
  byteSize: number;
  integrity?: string;
};

export type FixedPage = {
  index: number;
  label?: string;
  width: number;
  height: number;
  variants: FixedPageVariant[];
  semanticRange?: {
    start: SemanticLocation;
    end: SemanticLocation;
  };
};

export type FacsimileRendition = {
  kind: "fixed-pages";
  pageCount: number;
  pages: FixedPage[];
};

export type LegacyFacsimileRendition = {
  kind: "legacy-read-as-book";
  revision: string;
  manifestHref?: string;
  pageUrls?: string[];
  aspect?: number;
  pdfHref?: string;
  pageMap?: Array<{
    pageIndex: number;
    anchor: string;
  }>;
};

export type PublicationCapabilities = {
  annotations: boolean;
  bookmarks: boolean;
  facsimile: boolean;
  legacyFacsimile: boolean;
  search: boolean;
  sourceMap: boolean;
  required?: string[];
};

export type PublicationManifest = {
  schemaVersion: typeof MANIFEST_SCHEMA_VERSION;
  bookId: BookId;
  editionId: EditionId;
  contentHash: string;
  title: string;
  authors: PublicationAuthor[];
  language: string;
  direction: "ltr" | "rtl";
  publicationDate?: string;
  description?: string;
  license?: {
    name: string;
    url?: string;
  };
  tableOfContents: TocEntry[];
  renditions: {
    semantic: SemanticRendition;
    facsimile?: FacsimileRendition;
    legacyFacsimile?: LegacyFacsimileRendition;
  };
  capabilities: PublicationCapabilities;
};

export function isSamePublication(
  location: ReaderLocation,
  manifest: PublicationManifest,
): boolean {
  return (
    location.bookId === manifest.bookId &&
    location.editionId === manifest.editionId
  );
}

