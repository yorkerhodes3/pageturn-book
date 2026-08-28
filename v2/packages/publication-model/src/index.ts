export {
  MANIFEST_SCHEMA_VERSION,
  isSamePublication,
  toBookId,
  toChapterId,
  toEditionId,
} from "./types.js";

export type {
  BookId,
  ChapterId,
  EditionId,
  FacsimileLocation,
  FacsimileRendition,
  FixedPage,
  FixedPageVariant,
  LegacyFacsimileRendition,
  PublicationAuthor,
  PublicationCapabilities,
  PublicationManifest,
  ReaderLocation,
  SemanticChapter,
  SemanticLocation,
  SemanticRendition,
  TextSelector,
  TocEntry,
} from "./types.js";

export {
  PublicationValidationError,
  resolvePublicationManifestUrls,
  validatePublicationManifest,
} from "./validation.js";

export type { ValidationIssue } from "./validation.js";

