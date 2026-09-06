import {
  validatePageTurnTextTarget,
  type PageTurnTextTargetV1,
} from "./text-target.js";

export const PAGE_TURN_PERSONAL_DATABASE_NAME =
  "ethical-tech-pageturn-personal";
export const PAGE_TURN_PERSONAL_DATABASE_VERSION = 2;
export const PAGE_TURN_ANNOTATION_SCHEMA_VERSION = 2 as const;
export const PAGE_TURN_ANNOTATION_DATA_MAX_BYTES = 16 * 1024 * 1024;
export const PAGE_TURN_ANNOTATION_IMPORT_MAX_BYTES = 20 * 1024 * 1024;
export const PAGE_TURN_ANNOTATION_BACKUP_MEDIA_TYPE =
  "application/vnd.ethical-tech.pageturn-annotations+json;version=2";

const BOOKMARK_STORE = "bookmarks";
const ANNOTATION_STORE = "annotations";
const BOOK_EDITION_INDEX = "bookEdition";
const BOOK_INDEX = "bookId";

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

export type PageTurnBookmarkV1 = Readonly<{
  bookmarkId: string;
  schemaVersion: 1;
  bookId: string;
  editionId: string;
  location: Readonly<{
    chapterId: string;
    anchor: string;
  }>;
  label?: string;
  excerpt?: string;
  createdAt: string;
  updatedAt: string;
}>;

export type PageTurnStoredTarget =
  | Readonly<{
      state: "resolved";
      selector: PageTurnTextTargetV1;
    }>
  | Readonly<{
      state: "unresolved";
      legacy: Readonly<{
        chapterId: string;
        anchor: string;
        quote: string;
      }>;
      reason:
        | "edition-mismatch"
        | "missing-anchor"
        | "quote-mismatch"
        | "ambiguous-quote"
        | "invalid-legacy-record";
    }>;

export type PageTurnAnnotationV2 = Readonly<{
  annotationId: string;
  schemaVersion: typeof PAGE_TURN_ANNOTATION_SCHEMA_VERSION;
  bookId: string;
  editionId: string;
  motivation: "highlighting" | "commenting";
  target: PageTurnStoredTarget;
  body?: Readonly<{
    format: "text/markdown";
    value: string;
  }>;
  style?: Readonly<{
    color: "yellow" | "blue" | "green" | "pink";
    treatment: "highlight" | "underline";
  }>;
  createdAt: string;
  updatedAt: string;
}>;

export type PageTurnAnnotationBackupV2 = Readonly<{
  schemaVersion: typeof PAGE_TURN_ANNOTATION_SCHEMA_VERSION;
  exportedAt: string;
  publication: Readonly<{
    bookId: string;
    editionId: string;
    title: string;
  }>;
  annotations: readonly PageTurnAnnotationV2[];
}>;

export type PageTurnAnnotationImportPreview = Readonly<{
  newRecords: number;
  identicalDuplicates: number;
  idConflicts: number;
  unresolvedRecords: number;
}>;

export type PageTurnAnnotationImportOptions = Readonly<{
  mode?: "merge" | "replace";
  conflicts?: "keep-existing" | "import-as-copy";
}>;

export type PageTurnAnnotationImportResult =
  PageTurnAnnotationImportPreview &
    Readonly<{
      imported: number;
    }>;

export type PageTurnLegacyAnnotationResolution =
  | Readonly<{ state: "resolved"; selector: PageTurnTextTargetV1 }>
  | Readonly<{
      state: "unresolved";
      reason: Extract<PageTurnStoredTarget, { state: "unresolved" }>["reason"];
    }>;

export type PageTurnPersonalEdition = Readonly<{
  bookmarks: PageTurnBookmarkV1[];
  annotations: PageTurnAnnotationV2[];
  migratedBookmarks: number;
  migratedAnnotations: number;
}>;

export class PageTurnPersonalStorageError extends Error {
  readonly code:
    | "unavailable"
    | "invalid-data"
    | "storage-limit"
    | "transaction";

  constructor(
    code: PageTurnPersonalStorageError["code"],
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "PageTurnPersonalStorageError";
    this.code = code;
  }
}

type StoredCollection = V3Bookmark[] | V3Annotation[];

function storageKey(
  kind: "bookmarks" | "annotations",
  bookId: string,
  editionId: string,
): string {
  return `ethical-tech-book-v3-${kind}:${bookId}:${editionId}`;
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function assertPublicationIdentifier(value: string, name: string): void {
  if (!/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(value)) {
    throw new PageTurnPersonalStorageError(
      "invalid-data",
      `${name} must use lowercase letters, numbers, and internal hyphens.`,
    );
  }
}

function validTimestamp(value: unknown): value is string {
  return nonEmptyString(value) && Number.isFinite(Date.parse(value));
}

function recordOf(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function isLegacyBookmark(value: unknown): value is V3Bookmark {
  const bookmark = recordOf(value);
  return (
    bookmark !== undefined &&
    nonEmptyString(bookmark.chapterId) &&
    nonEmptyString(bookmark.anchor) &&
    nonEmptyString(bookmark.label) &&
    validTimestamp(bookmark.createdAt)
  );
}

function isLegacyAnnotation(value: unknown): value is V3Annotation {
  const annotation = recordOf(value);
  return (
    annotation !== undefined &&
    nonEmptyString(annotation.id) &&
    nonEmptyString(annotation.chapterId) &&
    nonEmptyString(annotation.anchor) &&
    nonEmptyString(annotation.quote) &&
    typeof annotation.note === "string" &&
    validTimestamp(annotation.createdAt)
  );
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

/** @deprecated Use openPageTurnPersonalStore for durable personal data. */
export function readBookmarks(
  bookId: string,
  editionId: string,
): V3Bookmark[] {
  return readCollection("bookmarks", bookId, editionId, isLegacyBookmark);
}

/** @deprecated Use openPageTurnPersonalStore for durable personal data. */
export function writeBookmarks(
  bookId: string,
  editionId: string,
  bookmarks: readonly V3Bookmark[],
): void {
  writeCollection("bookmarks", bookId, editionId, [...bookmarks]);
}

/** @deprecated Use openPageTurnPersonalStore for durable personal data. */
export function readAnnotations(
  bookId: string,
  editionId: string,
): V3Annotation[] {
  return readCollection("annotations", bookId, editionId, isLegacyAnnotation);
}

/** @deprecated Use openPageTurnPersonalStore for durable personal data. */
export function writeAnnotations(
  bookId: string,
  editionId: string,
  annotations: readonly V3Annotation[],
): void {
  writeCollection("annotations", bookId, editionId, [...annotations]);
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), {
      once: true,
    });
    request.addEventListener(
      "error",
      () => reject(request.error ?? new Error("IndexedDB request failed")),
      { once: true },
    );
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });
    transaction.addEventListener(
      "abort",
      () =>
        reject(
          transaction.error ?? new Error("IndexedDB transaction was aborted"),
        ),
      { once: true },
    );
    transaction.addEventListener(
      "error",
      () =>
        reject(transaction.error ?? new Error("IndexedDB transaction failed")),
      { once: true },
    );
  });
}

function abortTransaction(transaction: IDBTransaction): void {
  try {
    transaction.abort();
  } catch {
    // The original transaction error remains the useful failure.
  }
}

function editionRange(bookId: string, editionId: string): IDBKeyRange {
  return IDBKeyRange.only([bookId, editionId]);
}

function annotationBytes(
  annotations: readonly PageTurnAnnotationV2[],
): number {
  return new TextEncoder().encode(JSON.stringify(annotations)).byteLength;
}

function assertAnnotationCap(
  annotations: readonly PageTurnAnnotationV2[],
): void {
  if (annotationBytes(annotations) > PAGE_TURN_ANNOTATION_DATA_MAX_BYTES) {
    throw new PageTurnPersonalStorageError(
      "storage-limit",
      "Annotations for this edition exceed the 16 MiB storage limit.",
    );
  }
}

function normalizeDatabaseError(
  message: string,
  error: unknown,
): PageTurnPersonalStorageError {
  return error instanceof PageTurnPersonalStorageError
    ? error
    : new PageTurnPersonalStorageError(
        "transaction",
        message,
        error instanceof Error ? { cause: error } : undefined,
      );
}

function openDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest;
    try {
      request = factory.open(
        PAGE_TURN_PERSONAL_DATABASE_NAME,
        PAGE_TURN_PERSONAL_DATABASE_VERSION,
      );
    } catch (error) {
      reject(
        new PageTurnPersonalStorageError(
          "unavailable",
          "Personal storage is unavailable in this browser.",
          error instanceof Error ? { cause: error } : undefined,
        ),
      );
      return;
    }
    request.addEventListener(
      "upgradeneeded",
      () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(BOOKMARK_STORE)) {
          const bookmarks = database.createObjectStore(BOOKMARK_STORE, {
            keyPath: ["bookId", "editionId", "bookmarkId"],
          });
          bookmarks.createIndex(BOOK_EDITION_INDEX, ["bookId", "editionId"], {
            unique: false,
          });
          bookmarks.createIndex(BOOK_INDEX, "bookId", { unique: false });
        }
        if (!database.objectStoreNames.contains(ANNOTATION_STORE)) {
          const annotations = database.createObjectStore(ANNOTATION_STORE, {
            keyPath: ["bookId", "editionId", "annotationId"],
          });
          annotations.createIndex(BOOK_EDITION_INDEX, ["bookId", "editionId"], {
            unique: false,
          });
          annotations.createIndex(BOOK_INDEX, "bookId", { unique: false });
        }
      },
      { once: true },
    );
    request.addEventListener(
      "success",
      () => {
        request.result.addEventListener("versionchange", () =>
          request.result.close(),
        );
        resolve(request.result);
      },
      { once: true },
    );
    request.addEventListener(
      "error",
      () =>
        reject(
          new PageTurnPersonalStorageError(
            "unavailable",
            "Personal storage could not be opened.",
            request.error ? { cause: request.error } : undefined,
          ),
        ),
      { once: true },
    );
    request.addEventListener(
      "blocked",
      () =>
        reject(
          new PageTurnPersonalStorageError(
            "unavailable",
            "Personal storage is blocked by another PageTurn tab.",
          ),
        ),
      { once: true },
    );
  });
}

function bookmarkRecord(
  legacy: V3Bookmark,
  bookId: string,
  editionId: string,
): PageTurnBookmarkV1 {
  return {
    bookmarkId: crypto.randomUUID(),
    schemaVersion: 1,
    bookId,
    editionId,
    location: {
      chapterId: legacy.chapterId,
      anchor: legacy.anchor,
    },
    label: legacy.label,
    createdAt: legacy.createdAt,
    updatedAt: legacy.createdAt,
  };
}

async function annotationRecord(
  legacy: V3Annotation,
  bookId: string,
  editionId: string,
  resolveLegacy?: (
    annotation: V3Annotation,
  ) => Promise<PageTurnLegacyAnnotationResolution>,
): Promise<PageTurnAnnotationV2> {
  const unresolvedTarget: Extract<
    PageTurnStoredTarget,
    { state: "unresolved" }
  > = {
    state: "unresolved",
    legacy: {
      chapterId: legacy.chapterId,
      anchor: legacy.anchor,
      quote: legacy.quote,
    },
    reason: "quote-mismatch",
  };
  let target: PageTurnStoredTarget = unresolvedTarget;
  if (resolveLegacy) {
    const resolution = await resolveLegacy(legacy);
    target =
      resolution.state === "resolved"
        ? { state: "resolved", selector: resolution.selector }
        : {
            state: "unresolved",
            legacy: unresolvedTarget.legacy,
            reason: resolution.reason,
          };
  }
  return {
    annotationId: legacy.id,
    schemaVersion: PAGE_TURN_ANNOTATION_SCHEMA_VERSION,
    bookId,
    editionId,
    motivation: legacy.note.trim() === "" ? "highlighting" : "commenting",
    target,
    ...(legacy.note.trim() === ""
      ? {}
      : {
          body: {
            format: "text/markdown" as const,
            value: legacy.note,
          },
        }),
    style: { color: "yellow", treatment: "highlight" },
    createdAt: legacy.createdAt,
    updatedAt: legacy.createdAt,
  };
}

function legacyArray<T>(
  kind: "bookmarks" | "annotations",
  bookId: string,
  editionId: string,
  validate: (value: unknown) => value is T,
): { key: string; values: T[] } | undefined {
  const key = storageKey(kind, bookId, editionId);
  const raw = globalThis.localStorage.getItem(key);
  if (raw === null) {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new PageTurnPersonalStorageError(
      "invalid-data",
      `Stored beta ${kind} are malformed and were left untouched.`,
      error instanceof Error ? { cause: error } : undefined,
    );
  }
  if (!Array.isArray(parsed) || !parsed.every(validate)) {
    throw new PageTurnPersonalStorageError(
      "invalid-data",
      `Stored beta ${kind} are invalid and were left untouched.`,
    );
  }
  return { key, values: parsed };
}

function sameRecord(
  first: PageTurnAnnotationV2,
  second: PageTurnAnnotationV2,
): boolean {
  return JSON.stringify(first) === JSON.stringify(second);
}

function validatedBookmark(value: unknown): PageTurnBookmarkV1 {
  const bookmark = recordOf(value);
  const location = bookmark ? recordOf(bookmark.location) : undefined;
  if (
    !bookmark ||
    !nonEmptyString(bookmark.bookmarkId) ||
    bookmark.schemaVersion !== 1 ||
    !nonEmptyString(bookmark.bookId) ||
    !nonEmptyString(bookmark.editionId) ||
    !location ||
    !nonEmptyString(location.chapterId) ||
    !nonEmptyString(location.anchor) ||
    (bookmark.label !== undefined && typeof bookmark.label !== "string") ||
    (bookmark.excerpt !== undefined && typeof bookmark.excerpt !== "string") ||
    !validTimestamp(bookmark.createdAt) ||
    !validTimestamp(bookmark.updatedAt)
  ) {
    throw new Error("Stored bookmark is invalid");
  }
  return {
    bookmarkId: bookmark.bookmarkId,
    schemaVersion: 1,
    bookId: bookmark.bookId,
    editionId: bookmark.editionId,
    location: {
      chapterId: location.chapterId,
      anchor: location.anchor,
    },
    ...(typeof bookmark.label === "string" ? { label: bookmark.label } : {}),
    ...(typeof bookmark.excerpt === "string"
      ? { excerpt: bookmark.excerpt }
      : {}),
    createdAt: bookmark.createdAt,
    updatedAt: bookmark.updatedAt,
  };
}

export function previewPageTurnAnnotationImport(
  incoming: readonly PageTurnAnnotationV2[],
  existing: readonly PageTurnAnnotationV2[],
): PageTurnAnnotationImportPreview {
  const byId = new Map(existing.map((annotation) => [
    annotation.annotationId,
    annotation,
  ]));
  let newRecords = 0;
  let identicalDuplicates = 0;
  let idConflicts = 0;
  let unresolvedRecords = 0;
  for (const annotation of incoming) {
    if (annotation.target.state === "unresolved") {
      unresolvedRecords += 1;
    }
    const saved = byId.get(annotation.annotationId);
    if (!saved) {
      newRecords += 1;
    } else if (sameRecord(saved, annotation)) {
      identicalDuplicates += 1;
    } else {
      idConflicts += 1;
    }
  }
  return {
    newRecords,
    identicalDuplicates,
    idConflicts,
    unresolvedRecords,
  };
}

function assertExactKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = [],
): void {
  const allowed = new Set([...required, ...optional]);
  if (
    required.some((key) => !(key in value)) ||
    Object.keys(value).some((key) => !allowed.has(key))
  ) {
    throw new Error("Object fields do not match the annotation schema");
  }
}

async function validatedAnnotation(
  value: unknown,
  bookId: string,
  editionId: string,
): Promise<PageTurnAnnotationV2> {
  const annotation = recordOf(value);
  if (!annotation) {
    throw new Error("Annotation must be an object");
  }
  assertExactKeys(
    annotation,
    [
      "annotationId",
      "schemaVersion",
      "bookId",
      "editionId",
      "motivation",
      "target",
      "createdAt",
      "updatedAt",
    ],
    ["body", "style"],
  );
  if (
    !nonEmptyString(annotation.annotationId) ||
    annotation.schemaVersion !== PAGE_TURN_ANNOTATION_SCHEMA_VERSION ||
    annotation.bookId !== bookId ||
    annotation.editionId !== editionId ||
    (annotation.motivation !== "highlighting" &&
      annotation.motivation !== "commenting") ||
    !validTimestamp(annotation.createdAt) ||
    !validTimestamp(annotation.updatedAt)
  ) {
    throw new Error("Annotation identity or metadata is invalid");
  }
  const rawTarget = recordOf(annotation.target);
  if (!rawTarget || (rawTarget.state !== "resolved" && rawTarget.state !== "unresolved")) {
    throw new Error("Annotation target is invalid");
  }
  let target: PageTurnStoredTarget;
  if (rawTarget.state === "resolved") {
    assertExactKeys(rawTarget, ["state", "selector"]);
    const selector = await validatePageTurnTextTarget(rawTarget.selector);
    if (selector.bookId !== bookId || selector.editionId !== editionId) {
      throw new Error("Annotation target publication does not match");
    }
    target = { state: "resolved", selector };
  } else {
    assertExactKeys(rawTarget, ["state", "legacy", "reason"]);
    const legacy = recordOf(rawTarget.legacy);
    const reasons = new Set([
      "edition-mismatch",
      "missing-anchor",
      "quote-mismatch",
      "ambiguous-quote",
      "invalid-legacy-record",
    ]);
    if (
      !legacy ||
      !nonEmptyString(legacy.chapterId) ||
      !nonEmptyString(legacy.anchor) ||
      !nonEmptyString(legacy.quote) ||
      !reasons.has(String(rawTarget.reason))
    ) {
      throw new Error("Unresolved annotation target is invalid");
    }
    assertExactKeys(legacy, ["chapterId", "anchor", "quote"]);
    target = {
      state: "unresolved",
      legacy: {
        chapterId: legacy.chapterId,
        anchor: legacy.anchor,
        quote: legacy.quote,
      },
      reason: rawTarget.reason as Extract<
        PageTurnStoredTarget,
        { state: "unresolved" }
      >["reason"],
    };
  }
  const body = recordOf(annotation.body);
  if (
    annotation.body !== undefined &&
    (!body ||
      body.format !== "text/markdown" ||
      typeof body.value !== "string" ||
      Array.from(body.value).length > 4_000)
  ) {
    throw new Error("Annotation body is invalid");
  }
  if (body) {
    assertExactKeys(body, ["format", "value"]);
  }
  const style = recordOf(annotation.style);
  if (
    annotation.style !== undefined &&
    (!style ||
      !["yellow", "blue", "green", "pink"].includes(String(style.color)) ||
      !["highlight", "underline"].includes(String(style.treatment)))
  ) {
    throw new Error("Annotation style is invalid");
  }
  if (style) {
    assertExactKeys(style, ["color", "treatment"]);
  }
  return {
    annotationId: annotation.annotationId,
    schemaVersion: PAGE_TURN_ANNOTATION_SCHEMA_VERSION,
    bookId,
    editionId,
    motivation: annotation.motivation,
    target,
    ...(body
      ? {
          body: {
            format: "text/markdown" as const,
            value: String(body.value),
          },
        }
      : {}),
    ...(style
      ? {
          style: {
            color: style.color as "yellow" | "blue" | "green" | "pink",
            treatment: style.treatment as "highlight" | "underline",
          },
        }
      : {}),
    createdAt: annotation.createdAt,
    updatedAt: annotation.updatedAt,
  };
}

export async function parsePageTurnAnnotationBackup(
  text: string,
  expected: Readonly<{ bookId: string; editionId: string }>,
): Promise<PageTurnAnnotationBackupV2> {
  if (new TextEncoder().encode(text).byteLength > PAGE_TURN_ANNOTATION_IMPORT_MAX_BYTES) {
    throw new PageTurnPersonalStorageError(
      "invalid-data",
      "Annotation backup exceeds the 20 MiB import limit.",
    );
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new PageTurnPersonalStorageError(
      "invalid-data",
      "Annotation backup is not valid JSON.",
      error instanceof Error ? { cause: error } : undefined,
    );
  }
  try {
    const envelope = recordOf(value);
    if (!envelope) {
      throw new Error("Backup envelope must be an object");
    }
    assertExactKeys(envelope, [
      "schemaVersion",
      "exportedAt",
      "publication",
      "annotations",
    ]);
    const publication = recordOf(envelope.publication);
    if (
      envelope.schemaVersion !== PAGE_TURN_ANNOTATION_SCHEMA_VERSION ||
      !validTimestamp(envelope.exportedAt) ||
      !publication ||
      !nonEmptyString(publication.bookId) ||
      !nonEmptyString(publication.editionId) ||
      !nonEmptyString(publication.title) ||
      publication.bookId !== expected.bookId ||
      publication.editionId !== expected.editionId ||
      !Array.isArray(envelope.annotations)
    ) {
      throw new Error("Backup metadata or publication does not match");
    }
    assertExactKeys(publication, ["bookId", "editionId", "title"]);
    const annotations: PageTurnAnnotationV2[] = [];
    const annotationIds = new Set<string>();
    for (const annotation of envelope.annotations) {
      const validated = await validatedAnnotation(
        annotation,
        expected.bookId,
        expected.editionId,
      );
      if (annotationIds.has(validated.annotationId)) {
        throw new Error("Backup contains duplicate annotation IDs");
      }
      annotationIds.add(validated.annotationId);
      annotations.push(validated);
    }
    assertAnnotationCap(annotations);
    return {
      schemaVersion: PAGE_TURN_ANNOTATION_SCHEMA_VERSION,
      exportedAt: envelope.exportedAt,
      publication: {
        bookId: publication.bookId,
        editionId: publication.editionId,
        title: publication.title,
      },
      annotations,
    };
  } catch (error) {
    if (error instanceof PageTurnPersonalStorageError) {
      throw error;
    }
    throw new PageTurnPersonalStorageError(
      "invalid-data",
      "Annotation backup validation failed; nothing was imported.",
      error instanceof Error ? { cause: error } : undefined,
    );
  }
}

export function createPageTurnAnnotationBackup(
  publication: Readonly<{
    bookId: string;
    editionId: string;
    title: string;
  }>,
  annotations: readonly PageTurnAnnotationV2[],
  exportedAt = new Date().toISOString(),
): PageTurnAnnotationBackupV2 {
  assertAnnotationCap(annotations);
  return {
    schemaVersion: PAGE_TURN_ANNOTATION_SCHEMA_VERSION,
    exportedAt,
    publication,
    annotations: [...annotations],
  };
}

export class PageTurnPersonalStore {
  readonly #database: IDBDatabase;

  constructor(database: IDBDatabase) {
    this.#database = database;
  }

  close(): void {
    this.#database.close();
  }

  async readEdition(
    bookId: string,
    editionId: string,
  ): Promise<PageTurnPersonalEdition> {
    const transaction = this.#database.transaction(
      [BOOKMARK_STORE, ANNOTATION_STORE],
      "readonly",
    );
    try {
      const bookmarksRequest = transaction
        .objectStore(BOOKMARK_STORE)
        .index(BOOK_EDITION_INDEX)
        .getAll(editionRange(bookId, editionId));
      const annotationsRequest = transaction
        .objectStore(ANNOTATION_STORE)
        .index(BOOK_EDITION_INDEX)
        .getAll(editionRange(bookId, editionId));
      const [bookmarks, annotations] = await Promise.all([
        requestResult(bookmarksRequest),
        requestResult(annotationsRequest),
        transactionDone(transaction),
      ]);
      const validatedBookmarks = (bookmarks as unknown[]).map(validatedBookmark);
      const validatedAnnotations: PageTurnAnnotationV2[] = [];
      for (const annotation of annotations as unknown[]) {
        validatedAnnotations.push(
          await validatedAnnotation(annotation, bookId, editionId),
        );
      }
      validatedBookmarks.sort(
        (first, second) =>
          first.createdAt.localeCompare(second.createdAt) ||
          first.bookmarkId.localeCompare(second.bookmarkId),
      );
      validatedAnnotations.sort(
        (first, second) =>
          first.createdAt.localeCompare(second.createdAt) ||
          first.annotationId.localeCompare(second.annotationId),
      );
      return {
        bookmarks: validatedBookmarks,
        annotations: validatedAnnotations,
        migratedBookmarks: 0,
        migratedAnnotations: 0,
      };
    } catch (error) {
      throw normalizeDatabaseError("Personal data could not be read.", error);
    }
  }

  async migrateLegacyEdition(
    bookId: string,
    editionId: string,
    resolveLegacy?: (
      annotation: V3Annotation,
    ) => Promise<PageTurnLegacyAnnotationResolution>,
  ): Promise<PageTurnPersonalEdition> {
    const legacyBookmarks = legacyArray(
      "bookmarks",
      bookId,
      editionId,
      isLegacyBookmark,
    );
    const legacyAnnotations = legacyArray(
      "annotations",
      bookId,
      editionId,
      isLegacyAnnotation,
    );
    if (!legacyBookmarks && !legacyAnnotations) {
      return this.readEdition(bookId, editionId);
    }
    const convertedBookmarks = (legacyBookmarks?.values ?? []).map((bookmark) =>
      bookmarkRecord(bookmark, bookId, editionId),
    );
    const convertedAnnotations: PageTurnAnnotationV2[] = [];
    for (const annotation of legacyAnnotations?.values ?? []) {
      convertedAnnotations.push(
        await annotationRecord(annotation, bookId, editionId, resolveLegacy),
      );
    }
    const transaction = this.#database.transaction(
      [BOOKMARK_STORE, ANNOTATION_STORE],
      "readwrite",
    );
    const completed = transactionDone(transaction);
    let result: PageTurnPersonalEdition;
    try {
      const bookmarkStore = transaction.objectStore(BOOKMARK_STORE);
      const annotationStore = transaction.objectStore(ANNOTATION_STORE);
      const existingBookmarks = (await requestResult(
        bookmarkStore.index(BOOK_EDITION_INDEX).getAll(
          editionRange(bookId, editionId),
        ),
      )) as PageTurnBookmarkV1[];
      const existingAnnotations = (await requestResult(
        annotationStore.index(BOOK_EDITION_INDEX).getAll(
          editionRange(bookId, editionId),
        ),
      )) as PageTurnAnnotationV2[];
      const addedBookmarks = convertedBookmarks.filter(
        (candidate) =>
          !existingBookmarks.some(
            (saved) =>
              saved.location.chapterId === candidate.location.chapterId &&
              saved.location.anchor === candidate.location.anchor,
          ),
      );
      const addedAnnotations = convertedAnnotations.filter(
        (candidate) =>
          !existingAnnotations.some(
            (saved) =>
              saved.annotationId === candidate.annotationId ||
              sameRecord(saved, candidate),
          ),
      );
      assertAnnotationCap([...existingAnnotations, ...addedAnnotations]);
      for (const bookmark of addedBookmarks) {
        bookmarkStore.put(bookmark);
      }
      for (const annotation of addedAnnotations) {
        annotationStore.put(annotation);
      }
      await completed;
      const bookmarks = [...existingBookmarks, ...addedBookmarks].sort(
        (first, second) =>
          first.createdAt.localeCompare(second.createdAt) ||
          first.bookmarkId.localeCompare(second.bookmarkId),
      );
      const annotations = [...existingAnnotations, ...addedAnnotations].sort(
        (first, second) =>
          first.createdAt.localeCompare(second.createdAt) ||
          first.annotationId.localeCompare(second.annotationId),
      );
      result = {
        bookmarks,
        annotations,
        migratedBookmarks: addedBookmarks.length,
        migratedAnnotations: addedAnnotations.length,
      };
    } catch (error) {
      abortTransaction(transaction);
      await completed.catch(() => undefined);
      throw normalizeDatabaseError(
        "Stored beta personal data could not be migrated and was left untouched.",
        error,
      );
    }
    try {
      if (legacyBookmarks) {
        globalThis.localStorage.removeItem(legacyBookmarks.key);
      }
      if (legacyAnnotations) {
        globalThis.localStorage.removeItem(legacyAnnotations.key);
      }
    } catch (error) {
      console.warn("V3 migrated beta data but could not remove its old copy", error);
    }
    return result;
  }

  async putBookmark(bookmark: PageTurnBookmarkV1): Promise<void> {
    validatedBookmark(bookmark);
    const transaction = this.#database.transaction(BOOKMARK_STORE, "readwrite");
    try {
      transaction.objectStore(BOOKMARK_STORE).put(bookmark);
      await transactionDone(transaction);
    } catch (error) {
      throw normalizeDatabaseError("Bookmark could not be saved.", error);
    }
  }

  async deleteBookmark(
    bookId: string,
    editionId: string,
    bookmarkId: string,
  ): Promise<void> {
    const transaction = this.#database.transaction(BOOKMARK_STORE, "readwrite");
    try {
      transaction
        .objectStore(BOOKMARK_STORE)
        .delete([bookId, editionId, bookmarkId]);
      await transactionDone(transaction);
    } catch (error) {
      throw normalizeDatabaseError("Bookmark could not be deleted.", error);
    }
  }

  async putAnnotation(annotation: PageTurnAnnotationV2): Promise<void> {
    const validated = await validatedAnnotation(
      annotation,
      annotation.bookId,
      annotation.editionId,
    );
    const transaction = this.#database.transaction(ANNOTATION_STORE, "readwrite");
    const completed = transactionDone(transaction);
    try {
      const store = transaction.objectStore(ANNOTATION_STORE);
      const current = (await requestResult(
        store.index(BOOK_EDITION_INDEX).getAll(
          editionRange(validated.bookId, validated.editionId),
        ),
      )) as PageTurnAnnotationV2[];
      assertAnnotationCap([
        ...current.filter(
          ({ annotationId }) => annotationId !== validated.annotationId,
        ),
        validated,
      ]);
      store.put(validated);
      await completed;
    } catch (error) {
      abortTransaction(transaction);
      await completed.catch(() => undefined);
      throw normalizeDatabaseError("Annotation could not be saved.", error);
    }
  }

  async deleteAnnotation(
    bookId: string,
    editionId: string,
    annotationId: string,
  ): Promise<void> {
    const transaction = this.#database.transaction(ANNOTATION_STORE, "readwrite");
    const completed = transactionDone(transaction);
    try {
      transaction
        .objectStore(ANNOTATION_STORE)
        .delete([bookId, editionId, annotationId]);
      await completed;
    } catch (error) {
      abortTransaction(transaction);
      await completed.catch(() => undefined);
      throw normalizeDatabaseError("Annotation could not be deleted.", error);
    }
  }

  async importAnnotations(
    backup: PageTurnAnnotationBackupV2,
    options: PageTurnAnnotationImportOptions = {},
  ): Promise<PageTurnAnnotationImportResult> {
    const mode = options.mode ?? "merge";
    const conflicts = options.conflicts ?? "keep-existing";
    if (mode !== "merge" && mode !== "replace") {
      throw new PageTurnPersonalStorageError(
        "invalid-data",
        "Annotation import mode is invalid.",
      );
    }
    if (conflicts !== "keep-existing" && conflicts !== "import-as-copy") {
      throw new PageTurnPersonalStorageError(
        "invalid-data",
        "Annotation conflict behavior is invalid.",
      );
    }
    const candidate = recordOf(backup);
    const candidatePublication = recordOf(candidate?.publication);
    const serialized = JSON.stringify(backup);
    if (typeof serialized !== "string") {
      throw new PageTurnPersonalStorageError(
        "invalid-data",
        "Annotation backup validation failed; nothing was imported.",
      );
    }
    const validatedBackup = await parsePageTurnAnnotationBackup(serialized, {
      bookId:
        typeof candidatePublication?.bookId === "string"
          ? candidatePublication.bookId
          : "",
      editionId:
        typeof candidatePublication?.editionId === "string"
          ? candidatePublication.editionId
          : "",
    });
    const { bookId, editionId } = validatedBackup.publication;
    const validatedIncoming = validatedBackup.annotations;
    const transaction = this.#database.transaction(ANNOTATION_STORE, "readwrite");
    const completed = transactionDone(transaction);
    try {
      const store = transaction.objectStore(ANNOTATION_STORE);
      const index = store.index(BOOK_EDITION_INDEX);
      const existing = (await requestResult(
        index.getAll(editionRange(bookId, editionId)),
      )) as PageTurnAnnotationV2[];
      const preview = previewPageTurnAnnotationImport(
        validatedIncoming,
        existing,
      );
      const byId = new Map(
        existing.map((annotation) => [annotation.annotationId, annotation]),
      );
      const incoming: PageTurnAnnotationV2[] = [];
      for (const annotation of validatedIncoming) {
        const saved = byId.get(annotation.annotationId);
        if (!saved || mode === "replace") {
          incoming.push(annotation);
        } else if (!sameRecord(saved, annotation) && conflicts === "import-as-copy") {
          incoming.push({ ...annotation, annotationId: crypto.randomUUID() });
        }
      }
      const prospective =
        mode === "replace"
          ? incoming
          : [
              ...existing,
              ...incoming.filter(
                (candidate) => !byId.has(candidate.annotationId),
              ),
            ];
      assertAnnotationCap(prospective);
      if (mode === "replace") {
        await deleteIndexRange(index, editionRange(bookId, editionId));
      }
      for (const annotation of incoming) {
        store.put(annotation);
      }
      await completed;
      return { ...preview, imported: incoming.length };
    } catch (error) {
      abortTransaction(transaction);
      await completed.catch(() => undefined);
      throw normalizeDatabaseError(
        "Annotation import failed; existing annotations were not changed.",
        error,
      );
    }
  }

  async deleteResearchData(
    bookId: string,
    editionId?: string,
  ): Promise<void> {
    assertPublicationIdentifier(bookId, "bookId");
    if (editionId !== undefined) {
      assertPublicationIdentifier(editionId, "editionId");
    }
    const transaction = this.#database.transaction(
      [BOOKMARK_STORE, ANNOTATION_STORE],
      "readwrite",
    );
    const completed = transactionDone(transaction);
    try {
      const deletions = [BOOKMARK_STORE, ANNOTATION_STORE].map((name) => {
        const index = transaction
          .objectStore(name)
          .index(editionId === undefined ? BOOK_INDEX : BOOK_EDITION_INDEX);
        return deleteIndexRange(
          index,
          editionId === undefined
            ? IDBKeyRange.only(bookId)
            : editionRange(bookId, editionId),
        );
      });
      await Promise.all([...deletions, completed]);
    } catch (error) {
      abortTransaction(transaction);
      await completed.catch(() => undefined);
      throw normalizeDatabaseError(
        "Publication research data could not be deleted.",
        error,
      );
    }
    try {
      removeLegacyResearchData(bookId, editionId);
    } catch (error) {
      throw new PageTurnPersonalStorageError(
        "transaction",
        "Versioned research data was deleted, but legacy beta data could not be removed.",
        error instanceof Error ? { cause: error } : undefined,
      );
    }
  }
}

function removeLegacyResearchData(
  bookId: string,
  editionId?: string,
): void {
  const keys =
    editionId === undefined
      ? Array.from(
          { length: globalThis.localStorage.length },
          (_, index) => globalThis.localStorage.key(index),
        ).filter(
          (key): key is string =>
            key !== null &&
            (key.startsWith(`ethical-tech-book-v3-bookmarks:${bookId}:`) ||
              key.startsWith(`ethical-tech-book-v3-annotations:${bookId}:`)),
        )
      : [
          storageKey("bookmarks", bookId, editionId),
          storageKey("annotations", bookId, editionId),
        ];
  for (const key of keys) {
    globalThis.localStorage.removeItem(key);
  }
}

async function deleteIndexRange(
  index: IDBIndex,
  range: IDBKeyRange,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = index.openCursor(range);
    request.addEventListener("error", () => reject(request.error), {
      once: true,
    });
    request.addEventListener("success", () => {
      const cursor = request.result;
      if (!cursor) {
        resolve();
        return;
      }
      cursor.delete();
      cursor.continue();
    });
  });
}

export async function openPageTurnPersonalStore(
  factory: IDBFactory | undefined = globalThis.indexedDB,
): Promise<PageTurnPersonalStore> {
  if (!factory) {
    throw new PageTurnPersonalStorageError(
      "unavailable",
      "Personal storage is unavailable in this browser.",
    );
  }
  return new PageTurnPersonalStore(await openDatabase(factory));
}

function annotationPresentation(annotation: PageTurnAnnotationV2): Readonly<{
  chapterId: string;
  anchor: string;
  quote: string;
  note: string;
  createdAt: string;
  unresolved: boolean;
}> {
  const target = annotation.target;
  return {
    chapterId:
      target.state === "resolved"
        ? target.selector.chapterId
        : target.legacy.chapterId,
    anchor:
      target.state === "resolved"
        ? target.selector.start.anchor
        : target.legacy.anchor,
    quote:
      target.state === "resolved"
        ? target.selector.quote.exact
        : target.legacy.quote,
    note: annotation.body?.value ?? "",
    createdAt: annotation.createdAt,
    unresolved: target.state === "unresolved",
  };
}

export function annotationMarkdown(
  publicationTitle: string,
  annotations: readonly V3Annotation[],
  locationUrl: (annotation: V3Annotation) => string,
): string;
export function annotationMarkdown(
  publicationTitle: string,
  annotations: readonly PageTurnAnnotationV2[],
  locationUrl: (annotation: {
    chapterId: string;
    anchor: string;
  }) => string,
): string;
export function annotationMarkdown(
  publicationTitle: string,
  annotations: readonly (V3Annotation | PageTurnAnnotationV2)[],
  locationUrl:
    | ((annotation: V3Annotation) => string)
    | ((annotation: { chapterId: string; anchor: string }) => string),
): string {
  return [
    `# Notes on ${publicationTitle}`,
    "",
    "Exported from the local-only V3 reader. No annotation data was sent to a server.",
    "",
    ...annotations.flatMap((annotation, index) => {
      const entry =
        "schemaVersion" in annotation
          ? annotationPresentation(annotation)
          : { ...annotation, unresolved: false };
      return [
        `## Note ${index + 1}${entry.unresolved ? " (unresolved)" : ""}`,
        "",
        ...entry.quote.split(/\r?\n/).map((line) => `> ${line}`),
        "",
        ...(entry.note.trim() === "" ? [] : [entry.note.trim(), ""]),
        ...(entry.unresolved
          ? ["This annotation is not attached to current text.", ""]
          : []),
        `[Open source passage](${
          "schemaVersion" in annotation
            ? (
                locationUrl as (value: {
                  chapterId: string;
                  anchor: string;
                }) => string
              )(entry)
            : (locationUrl as (value: V3Annotation) => string)(annotation)
        })`,
        "",
        `Created: ${entry.createdAt}`,
        "",
      ];
    }),
  ].join("\n");
}
