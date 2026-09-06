export {
  DEFAULT_PAGE_TURN_APPEARANCE,
  DEFAULT_BINDING_APPEARANCE,
  DEFAULT_COVER_APPEARANCE,
  PAGE_TURN_APPEARANCE_PRESETS,
  applyPageTurnAppearance,
  applyPublicationAppearance,
  pageTurnAppearanceVariables,
  publicationAppearanceVariables,
  publicationPageFanCount,
  resolvePageTurnAppearance,
  type PageTurnAppearancePreset,
} from "./appearance.js";
export { mountBookshelf } from "./bookshelf.js";
export type {
  BookshelfAction,
  BookshelfHandle,
  BookshelfPlacement,
  BookshelfSection,
  BookshelfVolume,
} from "./bookshelf.js";
export {
  normalizeBookFontScale,
  readBookFontScale,
  writeBookFontScale,
} from "./font-scale.js";
export {
  solvePageTurn,
  type PageTurnCorner,
  type PageTurnDirection,
  type PageTurnFrame,
  type PageTurnPoint,
} from "./page-turn-geometry.js";
export {
  pageTurnPolygon,
  projectPageTurn,
  type PageTurnProjectionOptions,
  type ProjectedPageTurn,
} from "./page-turn-projection.js";
export {
  placePageTurnMarginalia,
  type PageTurnMarginaliaPlacement,
  type PageTurnMarginaliaPlacementItem,
  type PageTurnMarginaliaPlacementOptions,
} from "./marginalia.js";
export {
  annotationMarkdown,
  createPageTurnAnnotationBackup,
  openPageTurnPersonalStore,
  parsePageTurnAnnotationBackup,
  previewPageTurnAnnotationImport,
  readAnnotations,
  readBookmarks,
  writeAnnotations,
  writeBookmarks,
  PAGE_TURN_ANNOTATION_BACKUP_MEDIA_TYPE,
  PAGE_TURN_ANNOTATION_DATA_MAX_BYTES,
  PAGE_TURN_ANNOTATION_IMPORT_MAX_BYTES,
  PAGE_TURN_ANNOTATION_SCHEMA_VERSION,
  PAGE_TURN_PERSONAL_DATABASE_NAME,
  PAGE_TURN_PERSONAL_DATABASE_VERSION,
  PageTurnPersonalStorageError,
  PageTurnPersonalStore,
  type PageTurnAnnotationBackupV2,
  type PageTurnAnnotationImportOptions,
  type PageTurnAnnotationImportPreview,
  type PageTurnAnnotationImportResult,
  type PageTurnAnnotationV2,
  type PageTurnBookmarkV1,
  type PageTurnLegacyAnnotationResolution,
  type PageTurnPersonalEdition,
  type PageTurnStoredTarget,
  type V3Annotation,
  type V3Bookmark,
} from "./personal.js";
export {
  PAGE_TURN_TEXT_TARGET_MAX_QUOTE_CODE_POINTS,
  PAGE_TURN_TEXT_TARGET_MAX_TOKEN_BYTES,
  PAGE_TURN_TEXT_TARGET_VERSION,
  capturePageTurnTextTarget,
  createPageTurnTextTarget,
  decodePageTurnTextTarget,
  encodePageTurnTextTarget,
  normalizePageTurnText,
  pageTurnTextFragment,
  pageTurnTextOffsetAt,
  pageTurnTextTargetRanges,
  pageTurnTextTargetUrl,
  resolvePageTurnTextTarget,
  resolvePageTurnTextTargetToken,
  validatePageTurnTextTarget,
  type PageTurnDomTextTargetInput,
  type PageTurnTextPoint,
  type PageTurnTextQuote,
  type PageTurnTextSourceBlock,
  type PageTurnTextTargetContext,
  type PageTurnTextTargetInput,
  type PageTurnTextTargetResolution,
  type PageTurnTextTargetTokenResolution,
  type PageTurnTextTargetTokenV1,
  type PageTurnTextTargetV1,
} from "./text-target.js";
export type {
  PageTurnAppearanceInput,
  PageTurnAppearancePresetId,
  PageTurnAnnotationAppearance,
  PageTurnBindingAppearance,
  PageTurnCoverAppearance,
  PageTurnGeometryAppearance,
  PageTurnPageFanAppearance,
  PageTurnPaperAppearance,
  PageTurnPaperPattern,
  PageTurnPublicationAppearance,
  PageTurnResolvedAppearance,
  PageTurnSemanticChapter,
  PageTurnTypographyAppearance,
} from "./publication-types.js";
export {
  attachPageTurnBook,
  type PageTurnBookHandle,
  type PageTurnBookLocation,
  type PageTurnBookManifest,
  type PageTurnBookMedia,
  type PageTurnBookMediaFigure,
  type PageTurnBookMediaTreatment,
  type PageTurnBookOptions,
  type PageTurnSelectionActionDetail,
  type PageTurnSelectionActionShortcut,
} from "./reader.js";
export {
  mountPageTurnBookShell,
  type PageTurnBookShell,
} from "./shell.js";
export { shareReadingLocation } from "./share.js";

import {
  attachPageTurnBook,
  type PageTurnBookHandle,
  type PageTurnBookOptions,
} from "./reader.js";
import { mountPageTurnBookShell } from "./shell.js";

export type CreatePageTurnBookOptions = Omit<PageTurnBookOptions, "root"> &
  Readonly<{ root: HTMLElement }>;

export function createPageTurnBook(
  options: CreatePageTurnBookOptions,
): PageTurnBookHandle {
  const shell = mountPageTurnBookShell(options.root);
  let controller: PageTurnBookHandle;
  try {
    controller = attachPageTurnBook({ ...options, root: shell.root });
  } catch (error) {
    shell.destroy();
    throw error;
  }

  return {
    ready: controller.ready,
    getAppearance: controller.getAppearance,
    setAppearance: controller.setAppearance,
    getAnnotationAppearance: controller.getAnnotationAppearance,
    setAnnotationAppearance: controller.setAnnotationAppearance,
    destroy() {
      controller.destroy();
      shell.destroy();
    },
  };
}
