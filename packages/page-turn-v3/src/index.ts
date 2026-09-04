export {
  DEFAULT_BINDING_APPEARANCE,
  DEFAULT_COVER_APPEARANCE,
  applyPublicationAppearance,
  publicationAppearanceVariables,
  publicationPageFanCount,
} from "./appearance.js";
export { mountBookshelf } from "./bookshelf.js";
export type {
  BookshelfAction,
  BookshelfHandle,
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
  type ProjectedPageTurn,
} from "./page-turn-projection.js";
export {
  annotationMarkdown,
  readAnnotations,
  readBookmarks,
  writeAnnotations,
  writeBookmarks,
  type V3Annotation,
  type V3Bookmark,
} from "./personal.js";
export type {
  PageTurnBindingAppearance,
  PageTurnCoverAppearance,
  PageTurnPublicationAppearance,
  PageTurnSemanticChapter,
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
    destroy() {
      controller.destroy();
      shell.destroy();
    },
  };
}
