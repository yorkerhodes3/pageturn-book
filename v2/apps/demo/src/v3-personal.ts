export type V3Bookmark = Readonly<{
  chapterId: string;
  anchor: string;
  label: string;
  createdAt: string;
}>;

export type V3Annotation = Readonly<{
  id: string;
  chapterId: string;
  anchor: string;
  quote: string;
  note: string;
  createdAt: string;
}>;

type StoredCollection = V3Bookmark[] | V3Annotation[];

function storageKey(
  kind: "bookmarks" | "annotations",
  bookId: string,
  editionId: string,
): string {
  return `ethical-tech-book-v3-${kind}:${bookId}:${editionId}`;
}

function readCollection<T extends StoredCollection>(
  kind: "bookmarks" | "annotations",
  bookId: string,
  editionId: string,
  validate: (value: unknown) => value is T[number],
): T {
  try {
    const raw = globalThis.localStorage.getItem(
      storageKey(kind, bookId, editionId),
    );
    if (raw === null) {
      return [] as unknown as T;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every(validate)) {
      console.warn(`V3 ignored invalid stored ${kind}`);
      return [] as unknown as T;
    }
    return parsed as T;
  } catch (error) {
    console.warn(`V3 could not read stored ${kind}`, error);
    return [] as unknown as T;
  }
}

function writeCollection(
  kind: "bookmarks" | "annotations",
  bookId: string,
  editionId: string,
  values: StoredCollection,
): void {
  try {
    globalThis.localStorage.setItem(
      storageKey(kind, bookId, editionId),
      JSON.stringify(values),
    );
  } catch (error) {
    console.warn(`V3 could not save ${kind}`, error);
  }
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function isBookmark(value: unknown): value is V3Bookmark {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const bookmark = value as Record<string, unknown>;
  return (
    nonEmptyString(bookmark.chapterId) &&
    nonEmptyString(bookmark.anchor) &&
    nonEmptyString(bookmark.label) &&
    nonEmptyString(bookmark.createdAt)
  );
}

function isAnnotation(value: unknown): value is V3Annotation {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const annotation = value as Record<string, unknown>;
  return (
    nonEmptyString(annotation.id) &&
    nonEmptyString(annotation.chapterId) &&
    nonEmptyString(annotation.anchor) &&
    nonEmptyString(annotation.quote) &&
    typeof annotation.note === "string" &&
    nonEmptyString(annotation.createdAt)
  );
}

export function readBookmarks(
  bookId: string,
  editionId: string,
): V3Bookmark[] {
  return readCollection(
    "bookmarks",
    bookId,
    editionId,
    isBookmark,
  );
}

export function writeBookmarks(
  bookId: string,
  editionId: string,
  bookmarks: readonly V3Bookmark[],
): void {
  writeCollection("bookmarks", bookId, editionId, [...bookmarks]);
}

export function readAnnotations(
  bookId: string,
  editionId: string,
): V3Annotation[] {
  return readCollection(
    "annotations",
    bookId,
    editionId,
    isAnnotation,
  );
}

export function writeAnnotations(
  bookId: string,
  editionId: string,
  annotations: readonly V3Annotation[],
): void {
  writeCollection("annotations", bookId, editionId, [...annotations]);
}

export function annotationMarkdown(
  publicationTitle: string,
  annotations: readonly V3Annotation[],
  locationUrl: (annotation: V3Annotation) => string,
): string {
  return [
    `# Notes on ${publicationTitle}`,
    "",
    "Exported from the local-only V3 reader. No annotation data was sent to a server.",
    "",
    ...annotations.flatMap((annotation, index) => [
      `## Note ${index + 1}`,
      "",
      ...annotation.quote.split(/\r?\n/).map((line) => `> ${line}`),
      "",
      ...(annotation.note.trim() === "" ? [] : [annotation.note.trim(), ""]),
      `[Open source passage](${locationUrl(annotation)})`,
      "",
      `Created: ${annotation.createdAt}`,
      "",
    ]),
  ].join("\n");
}
