export type PageTurnSourceType =
  | "article"
  | "book"
  | "chapter"
  | "dataset"
  | "document"
  | "repository"
  | "video"
  | "website";

export type PageTurnSourceRecord = Readonly<{
  id: string;
  canonicalUrl: string;
  aliases?: readonly string[];
  doi?: string;
  isbn?: readonly string[];
  repository?: Readonly<{
    url: string;
    revision?: string;
  }>;
  title: string;
  publisher?: string;
  publicationDate?: string;
  sourceType: PageTurnSourceType;
  localReading?: Readonly<{
    kind: "full-edition" | "excerpt" | "source-guide";
    bookId: string;
    editionId: string;
    chapterId?: string;
    anchor?: string;
    shelfHref?: string;
    rights: Readonly<{
      status: "approved";
      scope: "full-edition" | "excerpt" | "source-guide";
      basis: string;
      reviewedAt: string;
      expiresAt?: string;
    }>;
  }>;
  courseReadingIds?: readonly string[];
  relation?: "sameAs" | "isVersionOf" | "isPartOf";
  rights?: Readonly<{
    status: "approved" | "link-only" | "unknown";
    license?: string;
    attribution?: string;
  }>;
  reviewedAt: string;
}>;

export type PageTurnSourceContext = Readonly<{
  bookId: string;
  editionId: string;
  chapterId: string;
  anchor: string;
  courseReadingIds: readonly string[];
}>;

export type PageTurnSourceResolution =
  | Readonly<{
      kind: "local-publication";
      record: PageTurnSourceRecord;
      target: NonNullable<PageTurnSourceRecord["localReading"]>;
    }>
  | Readonly<{
      kind: "external-card";
      record?: PageTurnSourceRecord;
      url: string;
    }>
  | Readonly<{
      kind: "ambiguous";
      candidates: readonly PageTurnSourceRecord[];
      url: string;
    }>
  | Readonly<{ kind: "direct-external"; url: string }>;

export type PageTurnSourceResolver = (
  url: URL,
  context: PageTurnSourceContext,
  signal: AbortSignal,
) => PageTurnSourceResolution | Promise<PageTurnSourceResolution>;

export type PageTurnSourceRegistryOptions = Readonly<{
  now?: Date;
}>;

const SOURCE_TYPES = new Set<PageTurnSourceType>([
  "article",
  "book",
  "chapter",
  "dataset",
  "document",
  "repository",
  "video",
  "website",
]);
const RELATIONS = new Set(["sameAs", "isVersionOf", "isPartOf"]);
const LOCAL_KINDS = new Set(["full-edition", "excerpt", "source-guide"]);
const LOCAL_SCOPES = new Set(["full-edition", "excerpt", "source-guide"]);
const RIGHTS_STATUSES = new Set(["approved", "link-only", "unknown"]);
const SAFE_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;
const DOI = /^10\.\d{4,9}\/[^\s]+$/;
const UNRESERVED_PERCENT_ENCODING = /%([0-9a-f]{2})/gi;
const UNRESERVED = /^[A-Za-z0-9\-._~]$/;

function sourceError(message: string): Error {
  return new Error(`Invalid PageTurn source record: ${message}`);
}

function requiredText(value: unknown, field: string): string {
  if (
    typeof value !== "string" ||
    value.trim() === "" ||
    value.length > 2_000 ||
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value)
  ) {
    throw sourceError(`${field} must be non-empty safe text`);
  }
  return value;
}

function isoDateTimestamp(value: string, dateOnly = false): number | undefined {
  const pattern = dateOnly
    ? /^\d{4}(?:-\d{2}(?:-\d{2})?)?$/
    : /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2}))?$/;
  if (!pattern.test(value)) {
    return undefined;
  }
  const dateParts = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?/.exec(value);
  const year = Number(dateParts?.[1]);
  const month = Number(dateParts?.[2] ?? "1");
  const day = Number(dateParts?.[3] ?? "1");
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (
    calendarDate.getUTCFullYear() !== year ||
    calendarDate.getUTCMonth() !== month - 1 ||
    calendarDate.getUTCDate() !== day
  ) {
    return undefined;
  }
  const completed =
    value.length === 4
      ? `${value}-01-01T00:00:00Z`
      : value.length === 7
        ? `${value}-01T00:00:00Z`
        : value.length === 10
          ? `${value}T00:00:00Z`
          : value;
  const timestamp = Date.parse(completed);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

function validDate(value: string, field: string, dateOnly = false): void {
  if (isoDateTimestamp(value, dateOnly) === undefined) {
    throw sourceError(`${field} must be a real date`);
  }
}

function decodeUnreserved(value: string): string {
  return value.replace(
    UNRESERVED_PERCENT_ENCODING,
    (encoded: string, hex: string) => {
      const decoded = String.fromCharCode(Number.parseInt(hex, 16));
      return UNRESERVED.test(decoded) ? decoded : encoded.toUpperCase();
    },
  );
}

export function normalizePageTurnSourceUrl(value: string | URL): string {
  let url: URL;
  try {
    url = new URL(value.toString());
  } catch {
    throw new Error("PageTurn source URL must be an absolute URL");
  }
  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.username !== "" ||
    url.password !== "" ||
    url.href.length > 4_096
  ) {
    throw new Error("PageTurn source URL must be a safe HTTP(S) URL");
  }
  url.protocol = url.protocol.toLowerCase();
  url.hostname = url.hostname.toLowerCase();
  if (
    (url.protocol === "http:" && url.port === "80") ||
    (url.protocol === "https:" && url.port === "443")
  ) {
    url.port = "";
  }
  url.pathname = decodeUnreserved(url.pathname);
  url.search = decodeUnreserved(url.search);
  url.hash = "";
  return url.href;
}

export function pageTurnSourceDisplayDomain(value: string | URL): string {
  const url = new URL(normalizePageTurnSourceUrl(value));
  return url.hostname.replace(/\.$/, "");
}

export function normalizePageTurnDoi(value: string): string | undefined {
  let normalized = value.trim();
  if (/^https?:\/\/(?:dx\.)?doi\.org\//i.test(normalized)) {
    if (!URL.canParse(normalized)) {
      return undefined;
    }
    normalized = new URL(normalized).pathname.replace(/^\/+/, "");
  } else {
    normalized = normalized.replace(/^doi:\s*/i, "");
  }
  try {
    normalized = decodeURIComponent(normalized);
  } catch {
    return undefined;
  }
  normalized = normalized.toLowerCase();
  return DOI.test(normalized) ? normalized : undefined;
}

export function normalizePageTurnIsbn(value: string): string | undefined {
  const withoutPrefix = value.trim().replace(/^isbn(?:-1[03])?\s*:?\s*/i, "");
  if (/[^0-9xX\-\s]/.test(withoutPrefix)) {
    return undefined;
  }
  const normalized = withoutPrefix.replace(/[\s-]/g, "").toUpperCase();
  if (/^\d{9}[\dX]$/.test(normalized)) {
    const total = Array.from(normalized).reduce(
      (sum, character, index) =>
        sum + (character === "X" ? 10 : Number(character)) * (10 - index),
      0,
    );
    return total % 11 === 0 ? normalized : undefined;
  }
  if (/^(?:978|979)\d{10}$/.test(normalized)) {
    const total = Array.from(normalized.slice(0, 12)).reduce(
      (sum, character, index) =>
        sum + Number(character) * (index % 2 === 0 ? 1 : 3),
      0,
    );
    const check = (10 - (total % 10)) % 10;
    return check === Number(normalized[12]) ? normalized : undefined;
  }
  return undefined;
}

function validateIdentifier(value: unknown, field: string): void {
  if (typeof value !== "string" || !SAFE_IDENTIFIER.test(value)) {
    throw sourceError(`${field} is invalid`);
  }
}

function validateOptionalUrl(value: unknown, field: string): void {
  if (value === undefined) {
    return;
  }
  if (typeof value !== "string") {
    throw sourceError(`${field} must be a URL`);
  }
  normalizePageTurnSourceUrl(value);
}

export function validatePageTurnSourceRecord(
  record: PageTurnSourceRecord,
): PageTurnSourceRecord {
  if (typeof record !== "object" || record === null) {
    throw sourceError("record must be an object");
  }
  validateIdentifier(record.id, "id");
  requiredText(record.title, "title");
  normalizePageTurnSourceUrl(record.canonicalUrl);
  if (!SOURCE_TYPES.has(record.sourceType)) {
    throw sourceError("sourceType is invalid");
  }
  validDate(record.reviewedAt, "reviewedAt");
  for (const [index, alias] of (record.aliases ?? []).entries()) {
    validateOptionalUrl(alias, `aliases[${index}]`);
  }
  if (record.doi !== undefined && !normalizePageTurnDoi(record.doi)) {
    throw sourceError("doi is invalid");
  }
  for (const [index, isbn] of (record.isbn ?? []).entries()) {
    if (!normalizePageTurnIsbn(isbn)) {
      throw sourceError(`isbn[${index}] is invalid or has a bad checksum`);
    }
  }
  if (record.repository) {
    const repositoryUrl = new URL(
      normalizePageTurnSourceUrl(record.repository.url),
    );
    if (record.repository.revision !== undefined) {
      requiredText(record.repository.revision, "repository.revision");
      if (
        !/^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$/.test(
          record.repository.revision,
        ) ||
        record.repository.revision
          .split("/")
          .some((segment) => segment === "." || segment === "..")
      ) {
        throw sourceError("repository.revision is invalid");
      }
      const canonicalUrl = new URL(
        normalizePageTurnSourceUrl(record.canonicalUrl),
      );
      const repositoryPath = repositoryUrl.pathname.replace(/\/$/, "");
      const canonicalPath = canonicalUrl.pathname.replace(/\/$/, "");
      const revision =
        canonicalUrl.href.includes(record.repository.revision) ||
        canonicalUrl.href.includes(
          encodeURIComponent(record.repository.revision),
        );
      if (
        canonicalUrl.origin !== repositoryUrl.origin ||
        canonicalPath === repositoryPath ||
        !canonicalPath.startsWith(`${repositoryPath}/`) ||
        !revision
      ) {
        throw sourceError(
          "canonicalUrl must identify the declared repository revision",
        );
      }
    }
  }
  if (record.publisher !== undefined) {
    requiredText(record.publisher, "publisher");
  }
  if (record.publicationDate !== undefined) {
    validDate(record.publicationDate, "publicationDate", true);
  }
  if (record.relation !== undefined && !RELATIONS.has(record.relation)) {
    throw sourceError("relation is invalid");
  }
  for (const [index, id] of (record.courseReadingIds ?? []).entries()) {
    validateIdentifier(id, `courseReadingIds[${index}]`);
  }
  if (record.rights) {
    if (!RIGHTS_STATUSES.has(record.rights.status)) {
      throw sourceError("rights.status is invalid");
    }
    if (record.rights.license !== undefined) {
      requiredText(record.rights.license, "rights.license");
    }
    if (record.rights.attribution !== undefined) {
      requiredText(record.rights.attribution, "rights.attribution");
    }
  }
  return record;
}

export function approvedPageTurnLocalReading(
  record: PageTurnSourceRecord,
  now = new Date(),
): NonNullable<PageTurnSourceRecord["localReading"]> | undefined {
  const local = record.localReading;
  if (
    !local ||
    !LOCAL_KINDS.has(local.kind) ||
    !SAFE_IDENTIFIER.test(local.bookId) ||
    !SAFE_IDENTIFIER.test(local.editionId) ||
    (local.chapterId !== undefined &&
      !SAFE_IDENTIFIER.test(local.chapterId)) ||
    (local.anchor !== undefined && !SAFE_IDENTIFIER.test(local.anchor)) ||
    (local.anchor !== undefined && local.chapterId === undefined)
  ) {
    return undefined;
  }
  if (local.shelfHref !== undefined) {
    if (!URL.canParse(local.shelfHref, "https://pageturn.invalid/")) {
      return undefined;
    }
    const shelf = new URL(local.shelfHref, "https://pageturn.invalid/");
    if (shelf.protocol !== "http:" && shelf.protocol !== "https:") {
      return undefined;
    }
  }
  const rights = local.rights;
  if (
    !rights ||
    rights.status !== "approved" ||
    !LOCAL_SCOPES.has(rights.scope) ||
    typeof rights.basis !== "string" ||
    rights.basis.trim() === "" ||
    rights.basis.length > 2_000 ||
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(rights.basis)
  ) {
    return undefined;
  }
  if (
    typeof rights.reviewedAt !== "string" ||
    isoDateTimestamp(rights.reviewedAt) === undefined
  ) {
    return undefined;
  }
  if (rights.expiresAt !== undefined) {
    const expiration = isoDateTimestamp(rights.expiresAt);
    if (expiration === undefined || !Number.isFinite(now.getTime())) {
      return undefined;
    }
    if (expiration <= now.getTime()) {
      return undefined;
    }
  }
  const scopeMatches =
    (local.kind === "full-edition" && rights.scope === "full-edition") ||
    (local.kind === "excerpt" &&
      (rights.scope === "excerpt" || rights.scope === "full-edition")) ||
    (local.kind === "source-guide" && rights.scope === "source-guide");
  if (!scopeMatches) {
    return undefined;
  }
  if (
    (local.kind === "full-edition" || local.kind === "excerpt") &&
    record.rights?.status !== "approved"
  ) {
    return undefined;
  }
  return local;
}

function doiFromUrl(url: URL): string | undefined {
  return /^(?:dx\.)?doi\.org$/i.test(url.hostname)
    ? normalizePageTurnDoi(url.pathname.replace(/^\/+/, ""))
    : undefined;
}

function isbnFromUrl(url: URL): string | undefined {
  const parameter = Array.from(url.searchParams.entries()).find(([name]) =>
    /^isbn(?:10|13)?$/i.test(name),
  )?.[1];
  if (parameter) {
    return normalizePageTurnIsbn(parameter);
  }
  const segmentMatch = /(?:^|\/)(?:isbn(?:-1[03])?\/)?([0-9Xx -]{10,25})(?:\/|$)/.exec(
    decodeURIComponent(url.pathname),
  );
  return segmentMatch?.[1]
    ? normalizePageTurnIsbn(segmentMatch[1])
    : undefined;
}

function pinnedRepositoryUrls(record: PageTurnSourceRecord): Set<string> {
  const repository = record.repository;
  if (!repository?.revision) {
    return new Set();
  }
  const urls = new Set<string>();
  urls.add(normalizePageTurnSourceUrl(record.canonicalUrl));
  const base = normalizePageTurnSourceUrl(repository.url);
  const baseUrl = new URL(base);
  const revision = encodeURIComponent(repository.revision);
  if (
    baseUrl.pathname.endsWith(`/tree/${repository.revision}`) ||
    baseUrl.pathname.endsWith(`/commit/${repository.revision}`)
  ) {
    urls.add(base);
  } else {
    const path = baseUrl.pathname.replace(/\/$/, "");
    for (const marker of ["tree", "commit"]) {
      const pinned = new URL(base);
      pinned.pathname = `${path}/${marker}/${revision}`;
      urls.add(normalizePageTurnSourceUrl(pinned));
    }
  }
  return urls;
}

function resolutionFor(
  records: readonly PageTurnSourceRecord[],
  authoredUrl: string,
  now: Date,
): PageTurnSourceResolution {
  if (records.length > 1) {
    return { kind: "ambiguous", candidates: records, url: authoredUrl };
  }
  const record = records[0];
  if (!record) {
    return { kind: "external-card", url: authoredUrl };
  }
  const target = approvedPageTurnLocalReading(record, now);
  return target
    ? { kind: "local-publication", record, target }
    : { kind: "external-card", record, url: authoredUrl };
}

export function createPageTurnSourceResolver(
  sourceRecords: readonly PageTurnSourceRecord[],
  options: PageTurnSourceRegistryOptions = {},
): PageTurnSourceResolver {
  const records = sourceRecords.map(validatePageTurnSourceRecord);
  if (new Set(records.map(({ id }) => id)).size !== records.length) {
    throw sourceError("ids must be unique");
  }
  const fixedNow =
    options.now === undefined ? undefined : new Date(options.now);
  if (fixedNow && !Number.isFinite(fixedNow.getTime())) {
    throw new Error("PageTurn source registry now must be a valid date");
  }
  const normalized = records.map((record) => ({
    record,
    canonical: normalizePageTurnSourceUrl(record.canonicalUrl),
    aliases: (record.aliases ?? []).map(normalizePageTurnSourceUrl),
    doi: record.doi ? normalizePageTurnDoi(record.doi) : undefined,
    isbn: (record.isbn ?? [])
      .map(normalizePageTurnIsbn)
      .filter((value): value is string => value !== undefined),
    pinned: pinnedRepositoryUrls(record),
  }));

  return (url, context, signal) => {
    signal.throwIfAborted();
    const now = fixedNow ? new Date(fixedNow) : new Date();
    const authoredUrl = url.href;
    const sourceUrl = normalizePageTurnSourceUrl(url);

    const pinned = normalized
      .filter(({ pinned: candidates }) => candidates.has(sourceUrl))
      .map(({ record }) => record);
    if (pinned.length > 0) {
      return resolutionFor(pinned, authoredUrl, now);
    }

    const byUrl = normalized
      .filter(({ record, canonical, aliases }) => {
        if (record.repository?.revision) {
          return false;
        }
        return canonical === sourceUrl || aliases.includes(sourceUrl);
      })
      .map(({ record }) => record);
    if (byUrl.length > 0) {
      return resolutionFor(byUrl, authoredUrl, now);
    }

    const sourceDoi = doiFromUrl(url);
    if (sourceDoi) {
      const byDoi = normalized
        .filter(({ doi }) => doi === sourceDoi)
        .map(({ record }) => record);
      if (byDoi.length > 0) {
        return resolutionFor(byDoi, authoredUrl, now);
      }
    }

    const sourceIsbn = isbnFromUrl(url);
    if (sourceIsbn) {
      const byIsbn = normalized
        .filter(({ isbn }) => isbn.includes(sourceIsbn))
        .map(({ record }) => record);
      if (byIsbn.length > 0) {
        return resolutionFor(byIsbn, authoredUrl, now);
      }
    }

    const courseIds = new Set(context.courseReadingIds);
    const byCourse = normalized
      .filter(({ record }) =>
        (record.courseReadingIds ?? []).some((id) => courseIds.has(id)),
      )
      .map(({ record }) => record);
    signal.throwIfAborted();
    return resolutionFor(byCourse, authoredUrl, now);
  };
}
