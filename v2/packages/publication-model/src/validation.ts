import {
  MANIFEST_SCHEMA_VERSION,
  toBookId,
  toChapterId,
  toEditionId,
  type FacsimileLocation,
  type FacsimileRendition,
  type FixedPage,
  type FixedPageVariant,
  type LegacyFacsimileRendition,
  type PublicationAuthor,
  type PublicationAppearance,
  type PublicationBindingAppearance,
  type PublicationCapabilities,
  type PublicationCoverAppearance,
  type PublicationFrontMatter,
  type PublicationManifest,
  type SemanticChapter,
  type SemanticLocation,
  type SemanticRendition,
  type TextSelector,
  type TocEntry,
} from "./types.js";

export type ValidationIssue = {
  code: string;
  path: string;
  message: string;
};

export class PublicationValidationError extends Error {
  readonly issues: ValidationIssue[];

  constructor(issues: ValidationIssue[]) {
    super(
      issues.length === 1
        ? issues[0]?.message
        : `Publication validation failed with ${issues.length} issues`,
    );
    this.name = "PublicationValidationError";
    this.issues = issues;
  }
}

class Validator {
  readonly issues: ValidationIssue[] = [];

  issue(code: string, path: string, message: string): void {
    this.issues.push({ code, path, message });
  }

  record(value: unknown, path: string): Record<string, unknown> {
    if (
      typeof value !== "object" ||
      value === null ||
      Array.isArray(value)
    ) {
      this.issue("TYPE_OBJECT", path, `${path} must be an object`);
      return {};
    }
    return value as Record<string, unknown>;
  }

  array(value: unknown, path: string): unknown[] {
    if (!Array.isArray(value)) {
      this.issue("TYPE_ARRAY", path, `${path} must be an array`);
      return [];
    }
    return value;
  }

  string(value: unknown, path: string, allowEmpty = false): string {
    if (
      typeof value !== "string" ||
      (!allowEmpty && value.trim().length === 0)
    ) {
      this.issue("TYPE_STRING", path, `${path} must be a non-empty string`);
      return "";
    }
    return value;
  }

  number(value: unknown, path: string): number {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      this.issue("TYPE_NUMBER", path, `${path} must be a finite number`);
      return 0;
    }
    return value;
  }

  integer(value: unknown, path: string, minimum = 0): number {
    const number = this.number(value, path);
    if (!Number.isInteger(number) || number < minimum) {
      this.issue(
        "TYPE_INTEGER",
        path,
        `${path} must be an integer greater than or equal to ${minimum}`,
      );
      return minimum;
    }
    return number;
  }

  boolean(value: unknown, path: string): boolean {
    if (typeof value !== "boolean") {
      this.issue("TYPE_BOOLEAN", path, `${path} must be a boolean`);
      return false;
    }
    return value;
  }

  optionalString(
    record: Record<string, unknown>,
    key: string,
    path: string,
  ): string | undefined {
    const value = record[key];
    return value === undefined
      ? undefined
      : this.string(value, `${path}.${key}`);
  }

  finish<T>(value: T): T {
    if (this.issues.length > 0) {
      throw new PublicationValidationError(this.issues);
    }
    return value;
  }
}

function parseIdentifier<T>(
  validator: Validator,
  value: unknown,
  path: string,
  convert: (input: string) => T,
): T {
  const text = validator.string(value, path);
  try {
    return convert(text);
  } catch (error) {
    validator.issue(
      "IDENTIFIER_INVALID",
      path,
      error instanceof Error ? error.message : `${path} is invalid`,
    );
    return convert("invalid");
  }
}

function parseTextSelector(
  validator: Validator,
  value: unknown,
  path: string,
): TextSelector {
  const record = validator.record(value, path);
  const quoteRecord = validator.record(record.quote, `${path}.quote`);
  const exact = validator.string(quoteRecord.exact, `${path}.quote.exact`);
  const prefix = validator.optionalString(quoteRecord, "prefix", `${path}.quote`);
  const suffix = validator.optionalString(quoteRecord, "suffix", `${path}.quote`);
  const quote: TextSelector["quote"] = {
    exact,
    ...(prefix === undefined ? {} : { prefix }),
    ...(suffix === undefined ? {} : { suffix }),
  };

  if (record.position === undefined) {
    return { quote };
  }

  const positionRecord = validator.record(
    record.position,
    `${path}.position`,
  );
  const start = validator.integer(positionRecord.start, `${path}.position.start`);
  const end = validator.integer(positionRecord.end, `${path}.position.end`);
  if (end < start) {
    validator.issue(
      "POSITION_ORDER",
      `${path}.position.end`,
      "Text selector end must not precede start",
    );
  }
  return { quote, position: { start, end } };
}

function parseSemanticLocation(
  validator: Validator,
  value: unknown,
  path: string,
): SemanticLocation {
  const record = validator.record(value, path);
  if (record.kind !== "semantic") {
    validator.issue(
      "LOCATION_KIND",
      `${path}.kind`,
      `${path}.kind must be "semantic"`,
    );
  }
  const text =
    record.text === undefined
      ? undefined
      : parseTextSelector(validator, record.text, `${path}.text`);
  const blockProgress =
    record.blockProgress === undefined
      ? undefined
      : validator.number(record.blockProgress, `${path}.blockProgress`);
  if (
    blockProgress !== undefined &&
    (blockProgress < 0 || blockProgress > 1)
  ) {
    validator.issue(
      "PROGRESS_RANGE",
      `${path}.blockProgress`,
      "blockProgress must be between 0 and 1",
    );
  }
  return {
    kind: "semantic",
    bookId: parseIdentifier(validator, record.bookId, `${path}.bookId`, toBookId),
    editionId: parseIdentifier(
      validator,
      record.editionId,
      `${path}.editionId`,
      toEditionId,
    ),
    chapterId: parseIdentifier(
      validator,
      record.chapterId,
      `${path}.chapterId`,
      toChapterId,
    ),
    anchor: validator.string(record.anchor, `${path}.anchor`),
    ...(text === undefined ? {} : { text }),
    ...(blockProgress === undefined ? {} : { blockProgress }),
  };
}

function parseFacsimileLocation(
  validator: Validator,
  value: unknown,
  path: string,
): FacsimileLocation {
  const record = validator.record(value, path);
  if (record.kind !== "facsimile") {
    validator.issue(
      "LOCATION_KIND",
      `${path}.kind`,
      `${path}.kind must be "facsimile"`,
    );
  }
  const pageLabel = validator.optionalString(record, "pageLabel", path);
  let point: FacsimileLocation["point"];
  if (record.point !== undefined) {
    const pointRecord = validator.record(record.point, `${path}.point`);
    point = {
      x: validator.number(pointRecord.x, `${path}.point.x`),
      y: validator.number(pointRecord.y, `${path}.point.y`),
    };
  }
  return {
    kind: "facsimile",
    bookId: parseIdentifier(validator, record.bookId, `${path}.bookId`, toBookId),
    editionId: parseIdentifier(
      validator,
      record.editionId,
      `${path}.editionId`,
      toEditionId,
    ),
    pageIndex: validator.integer(record.pageIndex, `${path}.pageIndex`),
    ...(pageLabel === undefined ? {} : { pageLabel }),
    ...(point === undefined ? {} : { point }),
  };
}

function parseAuthor(
  validator: Validator,
  value: unknown,
  path: string,
): PublicationAuthor {
  const record = validator.record(value, path);
  const url = validator.optionalString(record, "url", path);
  return {
    name: validator.string(record.name, `${path}.name`),
    ...(url === undefined ? {} : { url }),
  };
}

function parseTocEntry(
  validator: Validator,
  value: unknown,
  path: string,
): TocEntry {
  const record = validator.record(value, path);
  const children =
    record.children === undefined
      ? undefined
      : validator
          .array(record.children, `${path}.children`)
          .map((child, index) =>
            parseTocEntry(validator, child, `${path}.children[${index}]`),
          );
  return {
    title: validator.string(record.title, `${path}.title`),
    location: parseSemanticLocation(
      validator,
      record.location,
      `${path}.location`,
    ),
    ...(children === undefined ? {} : { children }),
  };
}

function parseSemanticChapter(
  validator: Validator,
  value: unknown,
  path: string,
): SemanticChapter {
  const record = validator.record(value, path);
  const contentHash = validator.string(
    record.contentHash,
    `${path}.contentHash`,
  );
  if (!/^[a-f0-9]{64}$/.test(contentHash)) {
    validator.issue(
      "HASH_INVALID",
      `${path}.contentHash`,
      "contentHash must be a lowercase SHA-256 hex digest",
    );
  }
  return {
    chapterId: parseIdentifier(
      validator,
      record.chapterId,
      `${path}.chapterId`,
      toChapterId,
    ),
    title: validator.string(record.title, `${path}.title`),
    href: validator.string(record.href, `${path}.href`),
    firstAnchor: validator.string(record.firstAnchor, `${path}.firstAnchor`),
    lastAnchor: validator.string(record.lastAnchor, `${path}.lastAnchor`),
    contentHash,
  };
}

function parseSemanticRendition(
  validator: Validator,
  value: unknown,
  path: string,
): SemanticRendition {
  const record = validator.record(value, path);
  if (record.kind !== "semantic-html") {
    validator.issue(
      "RENDITION_KIND",
      `${path}.kind`,
      `${path}.kind must be "semantic-html"`,
    );
  }
  const sourceMap = validator.optionalString(record, "sourceMap", path);
  const searchIndex = validator.optionalString(record, "searchIndex", path);
  const chapters = validator
    .array(record.chapters, `${path}.chapters`)
    .map((chapter, index) =>
      parseSemanticChapter(validator, chapter, `${path}.chapters[${index}]`),
    );
  if (chapters.length === 0) {
    validator.issue(
      "CHAPTERS_EMPTY",
      `${path}.chapters`,
      "Semantic rendition must contain at least one chapter",
    );
  }
  return {
    kind: "semantic-html",
    chapters,
    ...(sourceMap === undefined ? {} : { sourceMap }),
    ...(searchIndex === undefined ? {} : { searchIndex }),
  };
}

function parseFixedPageVariant(
  validator: Validator,
  value: unknown,
  path: string,
): FixedPageVariant {
  const record = validator.record(value, path);
  const allowedMimeTypes = new Set([
    "image/avif",
    "image/webp",
    "image/jpeg",
    "image/png",
  ]);
  const mimeType = validator.string(record.mimeType, `${path}.mimeType`);
  if (!allowedMimeTypes.has(mimeType)) {
    validator.issue(
      "MIME_UNSUPPORTED",
      `${path}.mimeType`,
      `${mimeType} is not a supported fixed-page image type`,
    );
  }
  const integrity = validator.optionalString(record, "integrity", path);
  return {
    href: validator.string(record.href, `${path}.href`),
    mimeType: allowedMimeTypes.has(mimeType)
      ? (mimeType as FixedPageVariant["mimeType"])
      : "image/webp",
    pixelWidth: validator.integer(record.pixelWidth, `${path}.pixelWidth`, 1),
    byteSize: validator.integer(record.byteSize, `${path}.byteSize`, 1),
    ...(integrity === undefined ? {} : { integrity }),
  };
}

function parseFixedPage(
  validator: Validator,
  value: unknown,
  path: string,
): FixedPage {
  const record = validator.record(value, path);
  const label = validator.optionalString(record, "label", path);
  let semanticRange: FixedPage["semanticRange"];
  if (record.semanticRange !== undefined) {
    const rangeRecord = validator.record(
      record.semanticRange,
      `${path}.semanticRange`,
    );
    semanticRange = {
      start: parseSemanticLocation(
        validator,
        rangeRecord.start,
        `${path}.semanticRange.start`,
      ),
      end: parseSemanticLocation(
        validator,
        rangeRecord.end,
        `${path}.semanticRange.end`,
      ),
    };
  }
  const variants = validator
    .array(record.variants, `${path}.variants`)
    .map((variant, index) =>
      parseFixedPageVariant(
        validator,
        variant,
        `${path}.variants[${index}]`,
      ),
    );
  if (variants.length === 0) {
    validator.issue(
      "PAGE_VARIANTS_EMPTY",
      `${path}.variants`,
      "Fixed page must contain at least one image variant",
    );
  }
  return {
    index: validator.integer(record.index, `${path}.index`),
    ...(label === undefined ? {} : { label }),
    width: validator.integer(record.width, `${path}.width`, 1),
    height: validator.integer(record.height, `${path}.height`, 1),
    variants,
    ...(semanticRange === undefined ? {} : { semanticRange }),
  };
}

function parseFacsimileRendition(
  validator: Validator,
  value: unknown,
  path: string,
): FacsimileRendition {
  const record = validator.record(value, path);
  if (record.kind !== "fixed-pages") {
    validator.issue(
      "RENDITION_KIND",
      `${path}.kind`,
      `${path}.kind must be "fixed-pages"`,
    );
  }
  const pages = validator
    .array(record.pages, `${path}.pages`)
    .map((page, index) =>
      parseFixedPage(validator, page, `${path}.pages[${index}]`),
    );
  const pageCount = validator.integer(record.pageCount, `${path}.pageCount`);
  if (pageCount !== pages.length) {
    validator.issue(
      "PAGE_COUNT_MISMATCH",
      `${path}.pageCount`,
      "pageCount must equal pages.length",
    );
  }
  pages.forEach((page, index) => {
    if (page.index !== index) {
      validator.issue(
        "PAGE_INDEX_ORDER",
        `${path}.pages[${index}].index`,
        "Fixed page indices must be zero-based and ordered",
      );
    }
  });
  return { kind: "fixed-pages", pageCount, pages };
}

function parseLegacyRendition(
  validator: Validator,
  value: unknown,
  path: string,
): LegacyFacsimileRendition {
  const record = validator.record(value, path);
  if (record.kind !== "legacy-read-as-book") {
    validator.issue(
      "RENDITION_KIND",
      `${path}.kind`,
      `${path}.kind must be "legacy-read-as-book"`,
    );
  }
  const manifestHref = validator.optionalString(record, "manifestHref", path);
  const pdfHref = validator.optionalString(record, "pdfHref", path);
  const aspect =
    record.aspect === undefined
      ? undefined
      : validator.number(record.aspect, `${path}.aspect`);
  const pageUrls =
    record.pageUrls === undefined
      ? undefined
      : validator
          .array(record.pageUrls, `${path}.pageUrls`)
          .map((url, index) =>
            validator.string(url, `${path}.pageUrls[${index}]`),
          );
  const pageMap =
    record.pageMap === undefined
      ? undefined
      : validator
          .array(record.pageMap, `${path}.pageMap`)
          .map((entry, index) => {
            const entryPath = `${path}.pageMap[${index}]`;
            const entryRecord = validator.record(entry, entryPath);
            return {
              pageIndex: validator.integer(
                entryRecord.pageIndex,
                `${entryPath}.pageIndex`,
              ),
              anchor: validator.string(
                entryRecord.anchor,
                `${entryPath}.anchor`,
              ),
            };
          });
  return {
    kind: "legacy-read-as-book",
    revision: validator.string(record.revision, `${path}.revision`),
    ...(manifestHref === undefined ? {} : { manifestHref }),
    ...(pageUrls === undefined ? {} : { pageUrls }),
    ...(aspect === undefined ? {} : { aspect }),
    ...(pdfHref === undefined ? {} : { pdfHref }),
    ...(pageMap === undefined ? {} : { pageMap }),
  };
}

function parseCapabilities(
  validator: Validator,
  value: unknown,
  path: string,
): PublicationCapabilities {
  const record = validator.record(value, path);
  const required =
    record.required === undefined
      ? undefined
      : validator
          .array(record.required, `${path}.required`)
          .map((item, index) =>
            validator.string(item, `${path}.required[${index}]`),
          );
  return {
    annotations: validator.boolean(record.annotations, `${path}.annotations`),
    bookmarks: validator.boolean(record.bookmarks, `${path}.bookmarks`),
    facsimile: validator.boolean(record.facsimile, `${path}.facsimile`),
    legacyFacsimile: validator.boolean(
      record.legacyFacsimile,
      `${path}.legacyFacsimile`,
    ),
    search: validator.boolean(record.search, `${path}.search`),
    sourceMap: validator.boolean(record.sourceMap, `${path}.sourceMap`),
    ...(required === undefined ? {} : { required }),
  };
}

function parseColor(
  validator: Validator,
  value: unknown,
  path: string,
): string {
  const color = validator.string(value, path);
  if (!/^#[a-fA-F0-9]{6}$/.test(color)) {
    validator.issue(
      "COLOR_INVALID",
      path,
      `${path} must be a six-digit hexadecimal color`,
    );
  }
  return color;
}

function parseAppearance(
  validator: Validator,
  value: unknown,
  path: string,
): PublicationAppearance {
  const record = validator.record(value, path);
  const coverRecord = validator.record(record.cover, `${path}.cover`);
  const coverSubtitle = validator.optionalString(
    coverRecord,
    "subtitle",
    `${path}.cover`,
  );
  const cover: PublicationCoverAppearance = {
    background: parseColor(
      validator,
      coverRecord.background,
      `${path}.cover.background`,
    ),
    foreground: parseColor(
      validator,
      coverRecord.foreground,
      `${path}.cover.foreground`,
    ),
    accent: parseColor(
      validator,
      coverRecord.accent,
      `${path}.cover.accent`,
    ),
    ...(coverSubtitle === undefined ? {} : { subtitle: coverSubtitle }),
  };

  const bindingRecord = validator.record(record.binding, `${path}.binding`);
  const material =
    bindingRecord.material === "leather" ||
    bindingRecord.material === "cloth" ||
    bindingRecord.material === "paper"
      ? bindingRecord.material
      : "paper";
  if (
    bindingRecord.material !== "leather" &&
    bindingRecord.material !== "cloth" &&
    bindingRecord.material !== "paper"
  ) {
    validator.issue(
      "BINDING_MATERIAL_INVALID",
      `${path}.binding.material`,
      'Binding material must be "leather", "cloth", or "paper"',
    );
  }
  const depth =
    bindingRecord.depth === "slim" ||
    bindingRecord.depth === "standard" ||
    bindingRecord.depth === "thick"
      ? bindingRecord.depth
      : "standard";
  if (
    bindingRecord.depth !== "slim" &&
    bindingRecord.depth !== "standard" &&
    bindingRecord.depth !== "thick"
  ) {
    validator.issue(
      "BINDING_DEPTH_INVALID",
      `${path}.binding.depth`,
      'Binding depth must be "slim", "standard", or "thick"',
    );
  }
  const hubs = validator.integer(
    bindingRecord.hubs,
    `${path}.binding.hubs`,
  );
  if (hubs > 8) {
    validator.issue(
      "BINDING_HUBS_RANGE",
      `${path}.binding.hubs`,
      "Binding hubs must be between 0 and 8",
    );
  }
  const shelfLabel = validator.optionalString(
    bindingRecord,
    "shelfLabel",
    `${path}.binding`,
  );
  const pageCount =
    bindingRecord.pageCount === undefined
      ? undefined
      : validator.integer(
          bindingRecord.pageCount,
          `${path}.binding.pageCount`,
          1,
        );
  const binding: PublicationBindingAppearance = {
    material,
    color: parseColor(
      validator,
      bindingRecord.color,
      `${path}.binding.color`,
    ),
    accent: parseColor(
      validator,
      bindingRecord.accent,
      `${path}.binding.accent`,
    ),
    depth,
    hubs,
    ...(pageCount === undefined ? {} : { pageCount }),
    ...(shelfLabel === undefined ? {} : { shelfLabel }),
  };

  return { cover, binding };
}

function parseFrontMatter(
  validator: Validator,
  value: unknown,
  path: string,
): PublicationFrontMatter {
  const record = validator.record(value, path);
  const optional = (key: keyof PublicationFrontMatter) =>
    validator.optionalString(record, key, path);
  const kicker = optional("kicker");
  const credits = optional("credits");
  const thesis = optional("thesis");
  const disclaimer = optional("disclaimer");
  const canonicalUrl = optional("canonicalUrl");
  if (canonicalUrl !== undefined) {
    try {
      const url = new URL(canonicalUrl);
      if (url.protocol !== "https:" && url.protocol !== "http:") {
        throw new Error("Unsupported protocol");
      }
    } catch {
      validator.issue(
        "FRONT_MATTER_URL_INVALID",
        `${path}.canonicalUrl`,
        "Front matter canonicalUrl must be an absolute HTTP(S) URL",
      );
    }
  }
  const notesStatus = optional("notesStatus");
  return {
    ...(kicker === undefined ? {} : { kicker }),
    ...(credits === undefined ? {} : { credits }),
    ...(thesis === undefined ? {} : { thesis }),
    ...(disclaimer === undefined ? {} : { disclaimer }),
    ...(canonicalUrl === undefined ? {} : { canonicalUrl }),
    ...(notesStatus === undefined ? {} : { notesStatus }),
  };
}

function parseLanguage(
  validator: Validator,
  value: unknown,
  path: string,
): string {
  const language = validator.string(value, path);
  try {
    return Intl.getCanonicalLocales(language)[0] ?? "en";
  } catch (error) {
    if (!(error instanceof RangeError)) {
      throw error;
    }
    validator.issue(
      "LANGUAGE_INVALID",
      path,
      `${path} must be a valid BCP-47 language tag`,
    );
    return "en";
  }
}

export function validatePublicationManifest(
  value: unknown,
): PublicationManifest {
  const validator = new Validator();
  const record = validator.record(value, "$");

  if (record.schemaVersion !== MANIFEST_SCHEMA_VERSION) {
    validator.issue(
      "SCHEMA_UNSUPPORTED",
      "$.schemaVersion",
      `Supported manifest schema is ${MANIFEST_SCHEMA_VERSION}`,
    );
  }

  const contentHash = validator.string(record.contentHash, "$.contentHash");
  if (!/^[a-f0-9]{64}$/.test(contentHash)) {
    validator.issue(
      "HASH_INVALID",
      "$.contentHash",
      "contentHash must be a lowercase SHA-256 hex digest",
    );
  }

  const authors = validator
    .array(record.authors, "$.authors")
    .map((author, index) => parseAuthor(validator, author, `$.authors[${index}]`));
  if (authors.length === 0) {
    validator.issue(
      "AUTHORS_EMPTY",
      "$.authors",
      "Publication must contain at least one author",
    );
  }

  const direction =
    record.direction === "rtl" || record.direction === "ltr"
      ? record.direction
      : "ltr";
  if (record.direction !== "rtl" && record.direction !== "ltr") {
    validator.issue(
      "DIRECTION_INVALID",
      "$.direction",
      'direction must be "ltr" or "rtl"',
    );
  }

  const renditionsRecord = validator.record(record.renditions, "$.renditions");
  const semantic = parseSemanticRendition(
    validator,
    renditionsRecord.semantic,
    "$.renditions.semantic",
  );
  const facsimile =
    renditionsRecord.facsimile === undefined
      ? undefined
      : parseFacsimileRendition(
          validator,
          renditionsRecord.facsimile,
          "$.renditions.facsimile",
        );
  const legacyFacsimile =
    renditionsRecord.legacyFacsimile === undefined
      ? undefined
      : parseLegacyRendition(
          validator,
          renditionsRecord.legacyFacsimile,
          "$.renditions.legacyFacsimile",
        );

  const publicationDate = validator.optionalString(
    record,
    "publicationDate",
    "$",
  );
  const description = validator.optionalString(record, "description", "$");
  const frontMatter =
    record.frontMatter === undefined
      ? undefined
      : parseFrontMatter(validator, record.frontMatter, "$.frontMatter");
  let license: PublicationManifest["license"];
  if (record.license !== undefined) {
    const licenseRecord = validator.record(record.license, "$.license");
    const url = validator.optionalString(licenseRecord, "url", "$.license");
    license = {
      name: validator.string(licenseRecord.name, "$.license.name"),
      ...(url === undefined ? {} : { url }),
    };
  }
  const appearance =
    record.appearance === undefined
      ? undefined
      : parseAppearance(validator, record.appearance, "$.appearance");

  const manifest: PublicationManifest = {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    bookId: parseIdentifier(validator, record.bookId, "$.bookId", toBookId),
    editionId: parseIdentifier(
      validator,
      record.editionId,
      "$.editionId",
      toEditionId,
    ),
    contentHash,
    title: validator.string(record.title, "$.title"),
    authors,
    language: parseLanguage(validator, record.language, "$.language"),
    direction,
    ...(publicationDate === undefined ? {} : { publicationDate }),
    ...(description === undefined ? {} : { description }),
    ...(frontMatter === undefined ? {} : { frontMatter }),
    ...(license === undefined ? {} : { license }),
    ...(appearance === undefined ? {} : { appearance }),
    tableOfContents: validator
      .array(record.tableOfContents, "$.tableOfContents")
      .map((entry, index) =>
        parseTocEntry(validator, entry, `$.tableOfContents[${index}]`),
      ),
    renditions: {
      semantic,
      ...(facsimile === undefined ? {} : { facsimile }),
      ...(legacyFacsimile === undefined ? {} : { legacyFacsimile }),
    },
    capabilities: parseCapabilities(
      validator,
      record.capabilities,
      "$.capabilities",
    ),
  };

  return validator.finish(manifest);
}

function resolveUrl(value: string, baseUrl: URL): string {
  const resolved = new URL(value, baseUrl);
  if (!["http:", "https:", "file:"].includes(resolved.protocol)) {
    throw new PublicationValidationError([
      {
        code: "URL_SCHEME_UNSAFE",
        path: "$.renditions",
        message: `Unsupported publication URL scheme: ${resolved.protocol}`,
      },
    ]);
  }
  return resolved.toString();
}

export function resolvePublicationManifestUrls(
  manifest: PublicationManifest,
  manifestUrl: URL,
): PublicationManifest {
  const semantic = manifest.renditions.semantic;
  const resolvedSemantic: SemanticRendition = {
    ...semantic,
    chapters: semantic.chapters.map((chapter) => ({
      ...chapter,
      href: resolveUrl(chapter.href, manifestUrl),
    })),
    ...(semantic.sourceMap === undefined
      ? {}
      : { sourceMap: resolveUrl(semantic.sourceMap, manifestUrl) }),
    ...(semantic.searchIndex === undefined
      ? {}
      : { searchIndex: resolveUrl(semantic.searchIndex, manifestUrl) }),
  };

  const facsimile =
    manifest.renditions.facsimile === undefined
      ? undefined
      : {
          ...manifest.renditions.facsimile,
          pages: manifest.renditions.facsimile.pages.map((page) => ({
            ...page,
            variants: page.variants.map((variant) => ({
              ...variant,
              href: resolveUrl(variant.href, manifestUrl),
            })),
          })),
        };

  const legacy = manifest.renditions.legacyFacsimile;
  const legacyFacsimile: LegacyFacsimileRendition | undefined =
    legacy === undefined
      ? undefined
      : {
          ...legacy,
          ...(legacy.manifestHref === undefined
            ? {}
            : { manifestHref: resolveUrl(legacy.manifestHref, manifestUrl) }),
          ...(legacy.pdfHref === undefined
            ? {}
            : { pdfHref: resolveUrl(legacy.pdfHref, manifestUrl) }),
          ...(legacy.pageUrls === undefined
            ? {}
            : {
                pageUrls: legacy.pageUrls.map((url) =>
                  resolveUrl(url, manifestUrl),
                ),
              }),
        };

  return {
    ...manifest,
    renditions: {
      semantic: resolvedSemantic,
      ...(facsimile === undefined ? {} : { facsimile }),
      ...(legacyFacsimile === undefined ? {} : { legacyFacsimile }),
    },
  };
}
