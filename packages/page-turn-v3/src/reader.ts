import {
  PAGE_TURN_APPEARANCE_PRESETS,
  applyPageTurnAppearance,
  resolvePageTurnAppearance,
} from "./appearance.js";
import type {
  PageTurnAppearanceInput,
  PageTurnAppearancePresetId,
  PageTurnAnnotationAppearance,
  PageTurnBindingAppearance,
  PageTurnPageFanAppearance,
  PageTurnPaperPattern,
  PageTurnResolvedAppearance,
  PageTurnSemanticChapter,
} from "./publication-types.js";
import {
  solvePageTurn,
  type PageTurnCorner,
  type PageTurnDirection,
  type PageTurnFrame,
  type PageTurnPoint,
} from "./page-turn-geometry.js";
import {
  pageTurnPolygon,
  projectPageTurn,
} from "./page-turn-projection.js";
import {
  normalizeBookFontScale,
  readBookFontScale,
  writeBookFontScale,
} from "./font-scale.js";
import {
  createPageTurnSharePayload,
  pageTurnShareCapabilities,
  pageTurnShareContext,
  pageTurnShareTargetEnd,
  resolvePageTurnSharePolicy,
  shareReadingLocation,
  type PageTurnSharePayload,
  type PageTurnSharePolicy,
} from "./share.js";
import {
  placePageTurnSelectionActions,
  type PageTurnRect,
} from "./selection-actions.js";
import { placePageTurnMarginalia } from "./marginalia.js";
import {
  PAGE_TURN_ANNOTATION_BACKUP_MEDIA_TYPE,
  annotationMarkdown,
  createPageTurnAnnotationBackup,
  openPageTurnPersonalStore,
  parsePageTurnAnnotationBackup,
  previewPageTurnAnnotationImport,
  type PageTurnAnnotationBackupV2,
  type PageTurnAnnotationV2,
  type PageTurnBookmarkV1,
  type PageTurnPersonalStore,
  type V3Annotation,
} from "./personal.js";
import {
  capturePageTurnTextTarget,
  createPageTurnTextTarget,
  normalizePageTurnText,
  pageTurnTextOffsetAt,
  pageTurnTextSegmentRange,
  pageTurnTextTargetRanges,
  pageTurnTextTargetUrl,
  resolvePageTurnTextTargetToken,
  type PageTurnTextSourceBlock,
  type PageTurnDomTextTargetInput,
  type PageTurnTextTargetV1,
} from "./text-target.js";
import type {
  PageTurnSourceContext,
  PageTurnSourceRecord,
  PageTurnSourceResolution,
  PageTurnSourceResolver,
} from "./source.js";
import type {
  PageTurnSourceCardElements,
  PageTurnSourceCardInput,
} from "./source-card.js";
import {
  matchPageTurnExternalPreviewProvider,
  validatePageTurnExternalPreviewProviders,
  type PageTurnExternalPreviewProvider,
} from "./external-preview.js";
import {
  defaultPageTurnBookMediaStyle,
  legacyPageTurnBookMediaTreatment,
  normalizePageTurnBookMediaDisplay,
  resolvePageTurnBookMediaUrl,
  resolvePageTurnBookMediaStyle,
  type PageTurnBookMedia,
  type PageTurnBookMediaDisplay,
  type PageTurnBookMediaFigure,
  type PageTurnBookMediaStyle,
  type PageTurnBookMediaSource,
  type PageTurnBookMediaTreatment,
} from "./media.js";

type SemanticBlock = Readonly<{
  node: HTMLElement;
  anchor: string;
  sourceText: string;
  sourceStart: number;
  sourceEnd: number;
  chapterTitle: string;
  chapterLabel: string;
  chapterStart: boolean;
}>;

type V3Chapter = Pick<
  PageTurnSemanticChapter,
  "chapterId" | "title" | "href" | "firstAnchor" | "contentHash"
>;

type V3TocEntry = Readonly<{
  title: string;
  chapterId: string;
  anchor: string;
  children: readonly V3TocEntry[];
}>;

export type PageTurnBookManifest = Readonly<{
  bookId: string;
  editionId: string;
  title: string;
  authors: readonly Readonly<{ name: string }>[];
  publicationDate?: string;
  description?: string;
  frontMatter?: Readonly<{
    credits?: string;
    kicker?: string;
    thesis?: string;
  }>;
  cover?: Readonly<{
    background?: string;
    foreground?: string;
    accent?: string;
    subtitle?: string;
  }>;
  chapters: readonly V3Chapter[];
  tableOfContents: readonly V3TocEntry[];
  media?: PageTurnBookMedia;
}>;

export type PageTurnBookOptions = Readonly<{
  root: ParentNode;
  bookId: string;
  manifestUrl: string | URL;
  chapterId?: string;
  chaptersStartOnRight?: boolean;
  appearance?: PageTurnAppearanceInput;
  appearancePreset?: PageTurnAppearancePresetId;
  appearanceControls?: boolean;
  media?: PageTurnBookMedia;
  mediaDisplay?: PageTurnBookMediaDisplay;
  mediaStyle?: PageTurnBookMediaStyle;
  /** @deprecated Use mediaDisplay. */
  mediaTreatment?: PageTurnBookMediaTreatment;
  fetch?: typeof globalThis.fetch;
  libraryUrl?: string | URL;
  locationUrl?(location: PageTurnBookLocation): string | URL;
  embedded?: boolean;
  keyboardScope?: "root" | "document";
  selectionActions?: boolean;
  selectionActionShortcut?: PageTurnSelectionActionShortcut | false;
  shareComposer?: boolean;
  sharePolicy?: PageTurnSharePolicy;
  allowShareImageDownload?: boolean;
  annotationAppearance?: PageTurnAnnotationAppearance;
  sourceResolver?: PageTurnSourceResolver;
  sourceLinkMode?: "direct" | "card" | "direct-local";
  courseReadingIds?: readonly string[];
  externalPreviewProviders?: readonly PageTurnExternalPreviewProvider[];
  urlMode?: "managed" | "none";
  updateDocumentTitle?: boolean;
}>;

export type PageTurnSelectionActionShortcut = Readonly<{
  key: string;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
}>;

export type PageTurnSelectionActionDetail = Readonly<{
  text: string;
  target: PageTurnTextTargetV1;
  location: PageTurnBookLocation;
}>;

export type PageTurnShareSelectionActionDetail =
  | Readonly<{
      kind: "quote";
      text: string;
      target: PageTurnTextTargetV1;
      location: PageTurnBookLocation;
    }>
  | Readonly<{
      kind: "location";
      location: PageTurnBookLocation;
    }>;

export type PageTurnBookHandle = Readonly<{
  ready: Promise<void>;
  getAppearance(): PageTurnResolvedAppearance;
  setAppearance(
    appearance: PageTurnAppearanceInput | PageTurnAppearancePresetId,
  ): void;
  getAnnotationAppearance(): Required<PageTurnAnnotationAppearance>;
  setAnnotationAppearance(appearance: PageTurnAnnotationAppearance): void;
  destroy(): void;
}>;

type V3SearchRecord = Readonly<{
  chapterId: string;
  chapterTitle: string;
  anchor: string;
  text: string;
}>;

type V3Selection = Readonly<{
  chapterId: string;
  anchor: string;
  quote: string;
  target?: PageTurnTextTargetV1;
  range?: Range;
  source?: HTMLElement;
  modality?: "keyboard" | "mouse" | "touch" | "pen";
}>;

type V3SelectionCandidate = Readonly<{
  chapterId: string;
  anchor: string;
  quote: string;
  input: PageTurnDomTextTargetInput;
}>;

type V3ValidatedSelection = Readonly<{
  selection: V3Selection & Readonly<{ target: PageTurnTextTargetV1 }>;
  detail: PageTurnSelectionActionDetail;
}>;

type V3PermittedShareSelection = V3Selection &
  Readonly<{ target: PageTurnTextTargetV1 }>;

type PrototypePage = Readonly<{
  label: string;
  runningTitle: string;
  anchor: string;
  kind: "front-matter" | "content" | "placeholder" | "blank";
  chapterOpening: boolean;
  chapterLabel?: string;
  chapterIndex?: number;
  chapterId?: string;
  nodes: readonly HTMLElement[];
}>;

type ChapterState = {
  chapter: V3Chapter;
  index: number;
  status: "idle" | "loading" | "ready" | "error";
  blocks: SemanticBlock[] | undefined;
  pages: PrototypePage[] | undefined;
  promise: Promise<void> | undefined;
  error: Error | undefined;
  pageParity: 1 | 2 | undefined;
};

export type PageTurnBookLocation = Readonly<{
  bookId: string;
  editionId: string;
  chapterId: string;
  anchor: string;
}>;

type LocationUpdate = "none" | "push" | "replace";

type ActiveTurn = {
  direction: PageTurnDirection;
  corner: PageTurnCorner;
  targetSpread: number;
  pointer: PageTurnPoint;
  progress: number;
  pointerId?: number;
  capture?: HTMLButtonElement;
  animationFrame?: number;
  pointerFrame?: number;
  pendingPointer?: PageTurnPoint;
  moving: HTMLElement;
  revealed: HTMLElement;
  curve: HTMLElement;
  shadow: HTMLElement;
};

type HighlightRegistryLike = Readonly<{
  set(name: string, highlight: unknown): void;
  delete(name: string): boolean;
}>;

type HighlightConstructorLike = new (...ranges: Range[]) => unknown;

const personalHighlightOwners = new Map<symbol, Range[]>();
const sharedHighlightOwners = new Map<symbol, Range[]>();

function syncOwnedHighlights(
  name: string,
  owners: ReadonlyMap<symbol, readonly Range[]>,
): boolean {
  const css = globalThis.CSS as typeof CSS & {
    highlights?: HighlightRegistryLike;
  };
  const HighlightConstructor = (
    globalThis as typeof globalThis & {
      Highlight?: HighlightConstructorLike;
    }
  ).Highlight;
  const ranges = Array.from(owners.values()).flat();
  if (!css.highlights || !HighlightConstructor) {
    return false;
  }
  if (ranges.length === 0) {
    css.highlights.delete(name);
  } else {
    css.highlights.set(name, new HighlightConstructor(...ranges));
  }
  return true;
}

export function attachPageTurnBook(
  options: PageTurnBookOptions,
): PageTurnBookHandle {
const root = options.root;
const hostDocumentBaseUrl = new URL(document.baseURI);
const managesUrl = options.urlMode === "managed";
const query = managesUrl
  ? new URLSearchParams(globalThis.location.search)
  : new URLSearchParams();
const requestedBookId = options.bookId;
const requestedChapterId = options.chapterId ?? query.get("chapter");
const requestedEditionId = managesUrl ? query.get("edition") : null;
const requestedSelectionToken = managesUrl ? query.get("selection") : null;
let mediaConfig = options.media;
let mediaConfigSource: PageTurnBookMediaSource =
  options.media === undefined ? "manifest" : "host";
const fetcher = options.fetch ?? globalThis.fetch;
const requestController = new AbortController();
const sourceLinkMode = options.sourceLinkMode ?? "direct";
const externalPreviewProviders = validatePageTurnExternalPreviewProviders(
  options.externalPreviewProviders,
);
if (!["direct", "card", "direct-local"].includes(sourceLinkMode)) {
  throw new Error(`PageTurn sourceLinkMode is invalid: ${sourceLinkMode}`);
}
if (
  (sourceLinkMode === "card" || sourceLinkMode === "direct-local") &&
  !options.sourceResolver
) {
  throw new Error(
    `PageTurn sourceLinkMode "${sourceLinkMode}" requires a sourceResolver`,
  );
}
const maximumSegmentCharacters = 540;
const chaptersStartOnRight = options.chaptersStartOnRight ?? true;
const canCreateDurableLinks =
  managesUrl || options.locationUrl !== undefined;
const resolvedSharePolicy = resolvePageTurnSharePolicy(options.sharePolicy);
const shareCapabilities = pageTurnShareCapabilities(resolvedSharePolicy);
const shareComposerEnabled = options.shareComposer ?? false;
const originalDocumentTitle = document.title;
const managesDocumentTitle = options.updateDocumentTitle ?? managesUrl;
let assignedDocumentTitle: string | undefined;
let baseAppearance: PageTurnAppearanceInput = options.appearance ?? {};
let requestedAppearancePreset: PageTurnAppearancePresetId =
  options.appearancePreset ?? baseAppearance.preset ?? "default";
let requestedAppearanceOverrides: PageTurnAppearanceInput | undefined;
let currentAppearance = resolvePageTurnAppearance(
  baseAppearance,
  requestedAppearancePreset,
);
const defaultAnnotationAppearance: Required<PageTurnAnnotationAppearance> = {
  fontFamily: '"Segoe Print", "Bradley Hand", cursive',
  fontScale: 1,
  inkColor: "#59401d",
  showMarginalia: true,
};
let annotationAppearance: Required<PageTurnAnnotationAppearance> = {
  ...defaultAnnotationAppearance,
  ...options.annotationAppearance,
};

function requiredElement<T extends Element>(
  selector: string,
  searchRoot: ParentNode = root,
): T {
  const node = searchRoot.querySelector<T>(selector);
  if (!node) {
    throw new Error(`PageTurn is missing required shell element: ${selector}`);
  }
  return node;
}

function mediaTreatmentFrom(
  parameters: URLSearchParams,
): PageTurnBookMediaTreatment {
  const requestedDisplay = parameters.get("mediaDisplay");
  const legacyRequested = parameters.get("media");
  const requested =
    requestedDisplay ??
    legacyRequested ??
    options.mediaDisplay ??
    options.mediaTreatment ??
    mediaConfig?.defaultDisplay ??
    mediaConfig?.defaultTreatment ??
    "off";
  if (
    requested !== "off" &&
    requested !== "on" &&
    requested !== "popout" &&
    requested !== "on-page" &&
    requested !== "pop-out"
  ) {
    throw new Error(`V3 image display is unavailable: ${requested}`);
  }
  const display = normalizePageTurnBookMediaDisplay(requested);
  if (!mediaConfig && display !== "off") {
    throw new Error(
      `V3 publication has no configured images: ${requestedBookId}`,
    );
  }
  return legacyPageTurnBookMediaTreatment(display);
}

function mediaStyleFrom(parameters: URLSearchParams): Readonly<{
  style: PageTurnBookMediaStyle;
  explicitUserSelection: boolean;
}> {
  const requested = parameters.get("mediaStyle");
  const style = requested ?? options.mediaStyle ?? mediaConfig?.defaultStyle ?? "original";
  if (
    style !== "original" &&
    style !== "book-toned" &&
    style !== "monochrome" &&
    style !== "duotone"
  ) {
    throw new Error(`V3 image style is unavailable: ${style}`);
  }
  return {
    style,
    explicitUserSelection: requested !== null,
  };
}

function applyPublicationIdentity(publication: PageTurnBookManifest): void {
  publicationTitle.textContent = publication.title;
  coverKicker.textContent =
    publication.authors[0]?.name ?? "Semantic publication";
  coverTitle.textContent = publication.title;
  coverSubtitle.textContent =
    publication.cover?.subtitle ?? "Complete semantic edition";
  if (managesDocumentTitle) {
    assignedDocumentTitle = `${publication.title} - Semantic book reader`;
    document.title = assignedDocumentTitle;
  }
  baseAppearance = {
    ...options.appearance,
    cover: {
      ...(publication.cover?.background
        ? { background: publication.cover.background }
        : {}),
      ...(publication.cover?.foreground
        ? { foreground: publication.cover.foreground }
        : {}),
      ...(publication.cover?.accent
        ? { accent: publication.cover.accent }
        : {}),
      ...options.appearance?.cover,
    },
  };
  currentAppearance = resolvePageTurnAppearance(
    baseAppearance,
    requestedAppearancePreset,
    requestedAppearanceOverrides
      ? { ...requestedAppearanceOverrides, preset: "custom" }
      : undefined,
  );
  applyPageTurnAppearance(reader, currentAppearance);
  renderAppearanceControls();
  mediaPicker.hidden = mediaConfig === undefined;
  mediaSelect.disabled = mediaConfig === undefined;
  mediaSelect.value = mediaTreatment;
  mediaStyleSelect.disabled = mediaConfig === undefined;
  mediaStyleSelect.value = mediaStyle;
  reader.classList.toggle("v3-has-media", mediaConfig !== undefined);
  reader.dataset.v3MediaMode = mediaTreatment;
  reader.dataset.v3MediaDisplay = normalizePageTurnBookMediaDisplay(mediaTreatment);
  reader.dataset.v3MediaStyle = mediaStyle;
  exploreButton.disabled = false;
  chapterSelect.replaceChildren(
    new Option("Front matter", ""),
    ...publication.chapters.map(
      (chapter) =>
        new Option(chapter.title, String(chapter.chapterId)),
    ),
  );
  chapterSelect.disabled = false;
}

function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}

function stripInteractiveIdentity(root: HTMLElement): void {
  root.removeAttribute("id");
  for (const identified of root.querySelectorAll("[id]")) {
    identified.removeAttribute("id");
  }
  for (const focusable of root.querySelectorAll<HTMLElement>(
    "a, button, input, select, textarea, [tabindex]",
  )) {
    focusable.tabIndex = -1;
  }
}

function cloneNodes(
  nodes: readonly HTMLElement[],
  preserveIdentity: boolean,
): HTMLElement[] {
  return nodes.map((node) => {
    const clone = node.cloneNode(true) as HTMLElement;
    if (!preserveIdentity) {
      stripInteractiveIdentity(clone);
    }
    return clone;
  });
}

function chapterOpeningLabel(text: string): HTMLElement {
  const label = createElement(
    "span",
    "v3-chapter-opening-label",
    text,
  );
  return label;
}

function safeMediaHref(value: string): string {
  return resolvePageTurnBookMediaUrl(
    value,
    mediaConfigSource,
    hostDocumentBaseUrl,
    manifestUrl ?? new URL(options.manifestUrl.toString(), hostDocumentBaseUrl),
  );
}

function effectiveMediaStyle(
  figure: PageTurnBookMediaFigure,
): PageTurnBookMediaStyle {
  if (!mediaConfig) {
    return "original";
  }
  if (mediaStyleUserSelected || options.mediaStyle !== undefined) {
    return resolvePageTurnBookMediaStyle(
      figure,
      mediaStyle,
      mediaStyleUserSelected,
    );
  }
  return defaultPageTurnBookMediaStyle(figure, mediaConfig);
}

function applyMediaFigureStyle(
  node: HTMLElement,
  figure: PageTurnBookMediaFigure,
): void {
  const effective = effectiveMediaStyle(figure);
  for (const style of [
    "original",
    "book-toned",
    "monochrome",
    "duotone",
  ] as const) {
    node.classList.toggle(`v3-media-style-${style}`, style === effective);
  }
  node.dataset.v3MediaStyle = effective;
  node.dataset.v3MediaRequestedStyle = mediaStyle;
  for (const kind of [
    "chart",
    "diagram",
    "facsimile",
    "map",
    "photo",
    "portrait",
  ] as const) {
    node.classList.toggle(`v3-media-kind-${kind}`, figure.visualKind === kind);
  }
}

function mediaProvenanceControl(
  figure: PageTurnBookMediaFigure,
): HTMLButtonElement {
  const button = createElement(
    "button",
    "v3-media-provenance-control",
    "Image provenance",
  );
  button.type = "button";
  button.dataset.v3MediaOpen = figure.id;
  button.setAttribute("aria-haspopup", "dialog");
  button.setAttribute(
    "aria-label",
    `View image provenance for ${figure.caption}`,
  );
  return button;
}

function mediaFigureBlock(
  figure: PageTurnBookMediaFigure,
  chapterState: ChapterState,
): SemanticBlock {
  const node = createElement(
    "figure",
    `v3-media-figure v3-media-${mediaTreatment}`,
  );
  const anchor = `v3-media-${figure.id}`;
  node.id = anchor;
  node.dataset.v3MediaId = figure.id;
  node.style.setProperty(
    "--v3-media-aspect",
    `${figure.width} / ${figure.height}`,
  );
  applyMediaFigureStyle(node, figure);
  if (mediaTreatment === "on") {
    const frame = createElement("div", "v3-media-image-frame");
    const image = document.createElement("img");
    image.alt = figure.alt;
    image.width = figure.width;
    image.height = figure.height;
    image.loading = "lazy";
    image.decoding = "async";
    image.dataset.v3MediaSrc = safeMediaHref(figure.src);
    frame.append(image);
    node.append(frame);
  } else {
    const open = createElement("button", undefined, "Open figure");
    open.type = "button";
    open.dataset.v3MediaOpen = figure.id;
    open.setAttribute("aria-haspopup", "dialog");
    open.setAttribute("aria-label", `Open ${figure.caption}`);
    node.append(open);
  }
  const caption = createElement("figcaption", undefined, figure.caption);
  const sourceText = normalizePageTurnText(figure.caption);
  caption.dataset.sourceAnchor = anchor;
  applySourceRange(caption, 0, Array.from(sourceText).length);
  node.append(caption);
  if (mediaTreatment === "on") {
    node.append(mediaProvenanceControl(figure));
  }
  return {
    node,
    anchor,
    sourceText,
    sourceStart: 0,
    sourceEnd: Array.from(sourceText).length,
    chapterTitle: chapterState.chapter.title,
    chapterLabel: chapterLabelForChapter(chapterState.chapter),
    chapterStart: false,
  };
}

function blocksWithMedia(chapterState: ChapterState): readonly SemanticBlock[] {
  const blocks = chapterState.blocks ?? [];
  if (mediaTreatment === "off" || !mediaConfig) {
    return blocks;
  }
  const result = [...blocks];
  for (const figure of mediaConfig.figures.filter(
    ({ chapterId }) => chapterId === String(chapterState.chapter.chapterId),
  )) {
    const replacementAnchors = figure.replaceAnchors ?? [];
    if (replacementAnchors.length > 0) {
      const replacementIndices = replacementAnchors.map((anchor) =>
        result.findIndex((block) => block.anchor === anchor),
      );
      const missingAnchors = replacementAnchors.filter(
        (_anchor, index) => replacementIndices[index] === -1,
      );
      if (missingAnchors.length > 0) {
        throw new Error(
          `V3 figure ${figure.id} cannot find replacement anchors: ${missingAnchors.join(", ")}`,
        );
      }
      const replacementIndex = Math.min(...replacementIndices);
      const remaining = result.filter(
        ({ anchor }) => !replacementAnchors.includes(anchor),
      );
      result.splice(0, result.length, ...remaining);
      result.splice(
        Math.min(replacementIndex, result.length),
        0,
        mediaFigureBlock(figure, chapterState),
      );
      continue;
    }
    if (!figure.afterAnchor) {
      throw new Error(`V3 figure ${figure.id} has no insertion anchor`);
    }
    let anchorIndex = result.length - 1;
    while (
      anchorIndex >= 0 &&
      result[anchorIndex]?.anchor !== figure.afterAnchor
    ) {
      anchorIndex -= 1;
    }
    if (anchorIndex < 0) {
      throw new Error(
        `V3 figure ${figure.id} cannot find anchor ${figure.afterAnchor}`,
      );
    }
    result.splice(anchorIndex + 1, 0, mediaFigureBlock(figure, chapterState));
  }
  return result;
}

function activateMediaImages(root: ParentNode): void {
  for (const image of root.querySelectorAll<HTMLImageElement>(
    "img[data-v3-media-src]",
  )) {
    const src = image.dataset.v3MediaSrc;
    if (src) {
      image.src = src;
    }
  }
}

type TextRange = Readonly<{
  start: number;
  end: number;
}>;

function sentenceRanges(text: string): TextRange[] {
  const sentences = Array.from(
    new Intl.Segmenter(undefined, { granularity: "sentence" }).segment(
      text,
    ),
  );
  if (sentences.length === 0) {
    return text.length > 0 ? [{ start: 0, end: text.length }] : [];
  }

  const ranges: TextRange[] = [];
  let start = sentences[0]?.index ?? 0;
  let end = start;
  for (const sentence of sentences) {
    const sentenceEnd = sentence.index + sentence.segment.length;
    if (end > start && sentenceEnd - start > maximumSegmentCharacters) {
      ranges.push({ start, end });
      start = sentence.index;
    }
    end = sentenceEnd;
  }
  if (end > start) {
    ranges.push({ start, end });
  }
  return ranges;
}

function stripIds(root: HTMLElement): void {
  root.removeAttribute("id");
  for (const identified of root.querySelectorAll("[id]")) {
    identified.removeAttribute("id");
  }
}

function cloneTextRange(
  source: HTMLElement,
  start: number,
  end: number,
  preserveIds: boolean,
): HTMLElement {
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(source, NodeFilter.SHOW_TEXT);
  for (
    let current = walker.nextNode();
    current !== null;
    current = walker.nextNode()
  ) {
    textNodes.push(current as Text);
  }
  if (textNodes.length === 0) {
    const clone = source.cloneNode(true) as HTMLElement;
    if (!preserveIds) {
      stripIds(clone);
    }
    return clone;
  }

  const locate = (offset: number): Readonly<{ node: Text; offset: number }> => {
    let consumed = 0;
    for (const node of textNodes) {
      const next = consumed + node.data.length;
      if (offset <= next) {
        return {
          node,
          offset: Math.max(0, offset - consumed),
        };
      }
      consumed = next;
    }
    const finalNode = textNodes.at(-1);
    if (!finalNode) {
      throw new Error("V3 paragraph range has no final text node");
    }
    return { node: finalNode, offset: finalNode.data.length };
  };

  const boundedStart = Math.max(0, start);
  const boundedEnd = Math.max(boundedStart, end);
  const rangeStart = locate(boundedStart);
  const rangeEnd = locate(boundedEnd);
  const range = document.createRange();
  range.setStart(rangeStart.node, rangeStart.offset);
  range.setEnd(rangeEnd.node, rangeEnd.offset);
  const clone = source.cloneNode(false) as HTMLElement;
  clone.append(range.cloneContents());
  if (!preserveIds) {
    stripIds(clone);
  }
  return clone;
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`V3 manifest ${path} must be an object`);
  }
  return value as Record<string, unknown>;
}

function stringValue(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`V3 manifest ${path} must be a non-empty string`);
  }
  return value;
}

function optionalStringValue(
  value: unknown,
  path: string,
): string | undefined {
  return value === undefined ? undefined : stringValue(value, path);
}

function mediaBooleanValue(
  value: unknown,
  path: string,
): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "boolean") {
    throw new Error(`V3 manifest ${path} must be a boolean`);
  }
  return value;
}

function mediaUrlValue(
  value: unknown,
  path: string,
  manifestUrl: URL,
  requireImmutableRemote = false,
): string {
  const candidate = stringValue(value, path);
  if (
    /[\u0000-\u001f\u007f\\]/.test(candidate) ||
    /^[a-z][a-z0-9+.-]*:/i.test(candidate) &&
      !/^https?:/i.test(candidate) ||
    candidate.startsWith("//")
  ) {
    throw new Error(
      `V3 manifest ${path} must be a safe HTTP(S) or manifest-relative URL`,
    );
  }
  if (requireImmutableRemote && /^https?:/i.test(candidate)) {
    const remote = new URL(candidate);
    const segments = remote.pathname.split("/").filter(Boolean);
    if (
      remote.hostname !== "raw.githubusercontent.com" ||
      !/^[a-f0-9]{40}$/.test(segments[2] ?? "")
    ) {
      throw new Error(
        `V3 manifest ${path} must identify an immutable remote commit`,
      );
    }
  }
  let resolved: URL;
  try {
    resolved = new URL(candidate, manifestUrl);
  } catch {
    throw new Error(
      `V3 manifest ${path} must be a safe HTTP(S) or manifest-relative URL`,
    );
  }
  if (
    (resolved.protocol !== "http:" && resolved.protocol !== "https:") ||
    resolved.username !== "" ||
    resolved.password !== ""
  ) {
    throw new Error(
      `V3 manifest ${path} must resolve to a safe HTTP(S) URL`,
    );
  }
  return resolved.href;
}

function parseManifestMedia(
  value: unknown,
  manifestUrl: URL,
  chapterIds: ReadonlySet<string>,
): PageTurnBookMedia {
  const parsed = record(value, "media");
  const defaultDisplay = stringValue(
    parsed.defaultDisplay,
    "media.defaultDisplay",
  );
  if (
    defaultDisplay !== "off" &&
    defaultDisplay !== "on-page" &&
    defaultDisplay !== "pop-out"
  ) {
    throw new Error("V3 manifest media.defaultDisplay is unavailable");
  }
  const defaultStyle = optionalStringValue(
    parsed.defaultStyle,
    "media.defaultStyle",
  );
  if (
    defaultStyle !== undefined &&
    defaultStyle !== "original" &&
    defaultStyle !== "book-toned" &&
    defaultStyle !== "monochrome" &&
    defaultStyle !== "duotone"
  ) {
    throw new Error("V3 manifest media.defaultStyle is unavailable");
  }
  if (!Array.isArray(parsed.figures) || parsed.figures.length === 0) {
    throw new Error("V3 manifest media.figures must be a non-empty array");
  }
  const figureIds = new Set<string>();
  const placementAnchors = new Set<string>();
  const figures = parsed.figures.map((value, index): PageTurnBookMediaFigure => {
    const path = `media.figures[${index}]`;
    const figure = record(value, path);
    const id = stringValue(figure.id, `${path}.id`);
    if (!/^[a-z0-9](?:[a-z0-9-]{0,126}[a-z0-9])?$/.test(id)) {
      throw new Error(`V3 manifest ${path}.id is invalid`);
    }
    if (figureIds.has(id)) {
      throw new Error(`V3 manifest ${path}.id duplicates ${id}`);
    }
    figureIds.add(id);
    const chapterId = stringValue(figure.chapterId, `${path}.chapterId`);
    if (!chapterIds.has(chapterId)) {
      throw new Error(
        `V3 manifest ${path}.chapterId references unknown chapter ${chapterId}`,
      );
    }
    const afterAnchor = optionalStringValue(
      figure.afterAnchor,
      `${path}.afterAnchor`,
    );
    let replaceAnchors: string[] | undefined;
    if (figure.replaceAnchors !== undefined) {
      if (!Array.isArray(figure.replaceAnchors)) {
        throw new Error(`V3 manifest ${path}.replaceAnchors must be an array`);
      }
      replaceAnchors = figure.replaceAnchors.map((anchor, anchorIndex) =>
        stringValue(anchor, `${path}.replaceAnchors[${anchorIndex}]`),
      );
    }
    if (
      (afterAnchor === undefined) ===
      (replaceAnchors === undefined || replaceAnchors.length === 0)
    ) {
      throw new Error(
        `V3 manifest ${path} must have afterAnchor or non-empty replaceAnchors`,
      );
    }
    for (const anchor of [
      ...(afterAnchor ? [afterAnchor] : []),
      ...(replaceAnchors ?? []),
    ]) {
      const placement = `${chapterId}\u0000${anchor}`;
      if (placementAnchors.has(placement)) {
        throw new Error(`V3 manifest ${path} duplicates placement ${anchor}`);
      }
      placementAnchors.add(placement);
    }
    const width = figure.width;
    const height = figure.height;
    if (
      typeof width !== "number" ||
      !Number.isInteger(width) ||
      width < 1 ||
      width > 16_384 ||
      typeof height !== "number" ||
      !Number.isInteger(height) ||
      height < 1 ||
      height > 16_384
    ) {
      throw new Error(
        `V3 manifest ${path} dimensions must be positive bounded integers`,
      );
    }
    const style = optionalStringValue(figure.style, `${path}.style`);
    if (
      style !== undefined &&
      style !== "original" &&
      style !== "book-toned" &&
      style !== "monochrome" &&
      style !== "duotone"
    ) {
      throw new Error(`V3 manifest ${path}.style is unavailable`);
    }
    const visualKind = optionalStringValue(
      figure.visualKind,
      `${path}.visualKind`,
    );
    if (
      visualKind !== undefined &&
      visualKind !== "chart" &&
      visualKind !== "diagram" &&
      visualKind !== "facsimile" &&
      visualKind !== "map" &&
      visualKind !== "photo" &&
      visualKind !== "portrait"
    ) {
      throw new Error(`V3 manifest ${path}.visualKind is unavailable`);
    }
    const colorSemantics = optionalStringValue(
      figure.colorSemantics,
      `${path}.colorSemantics`,
    );
    if (
      colorSemantics !== undefined &&
      colorSemantics !== "essential" &&
      colorSemantics !== "decorative"
    ) {
      throw new Error(`V3 manifest ${path}.colorSemantics is unavailable`);
    }
    const rightsRecord = record(figure.rights, `${path}.rights`);
    const rights: NonNullable<PageTurnBookMediaFigure["rights"]> = {
      license: stringValue(rightsRecord.license, `${path}.rights.license`),
      attribution: stringValue(
        rightsRecord.attribution,
        `${path}.rights.attribution`,
      ),
    };
    const integrity = stringValue(figure.integrity, `${path}.integrity`);
    if (!/^sha256:[a-f0-9]{64}$/.test(integrity)) {
      throw new Error(
        `V3 manifest ${path}.integrity must use sha256:<64 lowercase hex>`,
      );
    }
    const originalSrc =
      figure.originalSrc === undefined
        ? undefined
        : mediaUrlValue(
            figure.originalSrc,
            `${path}.originalSrc`,
            manifestUrl,
          );
    const source = stringValue(figure.source, `${path}.source`);
    const provenance = stringValue(
      figure.provenance,
      `${path}.provenance`,
    );
    const reviewedAt = stringValue(
      figure.reviewedAt,
      `${path}.reviewedAt`,
    );
    if (
      (!/^\d{4}-\d{2}-\d{2}$/.test(reviewedAt) ||
        Number.isNaN(Date.parse(`${reviewedAt}T00:00:00Z`)) ||
        new Date(`${reviewedAt}T00:00:00Z`).toISOString().slice(0, 10) !==
          reviewedAt)
    ) {
      throw new Error(`V3 manifest ${path}.reviewedAt must be an ISO date`);
    }
    const transformPermitted = mediaBooleanValue(
      figure.transformPermitted,
      `${path}.transformPermitted`,
    );
    const exportPermitted = mediaBooleanValue(
      figure.exportPermitted,
      `${path}.exportPermitted`,
    );
    return {
      id,
      chapterId,
      ...(afterAnchor === undefined ? {} : { afterAnchor }),
      ...(replaceAnchors === undefined ? {} : { replaceAnchors }),
      src: mediaUrlValue(figure.src, `${path}.src`, manifestUrl, true),
      integrity,
      ...(originalSrc === undefined ? {} : { originalSrc }),
      width,
      height,
      alt: stringValue(figure.alt, `${path}.alt`),
      caption: stringValue(figure.caption, `${path}.caption`),
      ...(style === undefined ? {} : { style }),
      ...(visualKind === undefined ? {} : { visualKind }),
      ...(colorSemantics === undefined ? {} : { colorSemantics }),
      ...(transformPermitted === undefined ? {} : { transformPermitted }),
      ...(exportPermitted === undefined ? {} : { exportPermitted }),
      rights,
      source,
      provenance,
      reviewedAt,
    };
  });
  return {
    defaultDisplay,
    ...(defaultStyle === undefined ? {} : { defaultStyle }),
    figures,
  };
}

function parseTocEntry(value: unknown, path: string): V3TocEntry {
  const entry = record(value, path);
  const location = record(entry.location, `${path}.location`);
  const childrenValue = entry.children ?? [];
  if (!Array.isArray(childrenValue)) {
    throw new Error(`V3 manifest ${path}.children must be an array`);
  }
  return {
    title: stringValue(entry.title, `${path}.title`),
    chapterId: stringValue(
      location.chapterId,
      `${path}.location.chapterId`,
    ),
    anchor: stringValue(location.anchor, `${path}.location.anchor`),
    children: childrenValue.map((child, index) =>
      parseTocEntry(child, `${path}.children[${index}]`),
    ),
  };
}

function parseV3Manifest(value: unknown, manifestUrl: URL): PageTurnBookManifest {
  const root = record(value, "root");
  const authorsValue = root.authors;
  if (!Array.isArray(authorsValue) || authorsValue.length === 0) {
    throw new Error("V3 manifest authors must be a non-empty array");
  }
  const authors = authorsValue.map((author, index) => ({
    name: stringValue(
      record(author, `authors[${index}]`).name,
      `authors[${index}].name`,
    ),
  }));
  const renditions = record(root.renditions, "renditions");
  const semantic = record(renditions.semantic, "renditions.semantic");
  const chaptersValue = semantic.chapters;
  if (!Array.isArray(chaptersValue) || chaptersValue.length === 0) {
    throw new Error(
      "V3 manifest renditions.semantic.chapters must be a non-empty array",
    );
  }
  const chapters: V3Chapter[] = chaptersValue.map((chapter, index) => {
    const parsed = record(
      chapter,
      `renditions.semantic.chapters[${index}]`,
    );
    return {
      chapterId: stringValue(
        parsed.chapterId,
        `renditions.semantic.chapters[${index}].chapterId`,
      ),
      title: stringValue(
        parsed.title,
        `renditions.semantic.chapters[${index}].title`,
      ),
      href: stringValue(
        parsed.href,
        `renditions.semantic.chapters[${index}].href`,
      ),
      firstAnchor: stringValue(
        parsed.firstAnchor,
        `renditions.semantic.chapters[${index}].firstAnchor`,
      ),
      contentHash: stringValue(
        parsed.contentHash,
        `renditions.semantic.chapters[${index}].contentHash`,
      ),
    };
  });
  const tocValue = root.tableOfContents;
  if (!Array.isArray(tocValue) || tocValue.length === 0) {
    throw new Error("V3 manifest tableOfContents must be a non-empty array");
  }
  const tableOfContents = tocValue.map((entry, index) =>
    parseTocEntry(entry, `tableOfContents[${index}]`),
  );
  const frontMatterRecord =
    root.frontMatter === undefined
      ? undefined
      : record(root.frontMatter, "frontMatter");
  const appearance =
    root.appearance === undefined
      ? undefined
      : record(root.appearance, "appearance");
  const coverRecord =
    appearance?.cover === undefined
      ? undefined
      : record(appearance.cover, "appearance.cover");
  const publicationDate = optionalStringValue(
    root.publicationDate,
    "publicationDate",
  );
  const description = optionalStringValue(
    root.description,
    "description",
  );
  const credits = optionalStringValue(
    frontMatterRecord?.credits,
    "frontMatter.credits",
  );
  const kicker = optionalStringValue(
    frontMatterRecord?.kicker,
    "frontMatter.kicker",
  );
  const thesis = optionalStringValue(
    frontMatterRecord?.thesis,
    "frontMatter.thesis",
  );
  const subtitle = optionalStringValue(
    coverRecord?.subtitle,
    "appearance.cover.subtitle",
  );
  const coverBackground = optionalStringValue(
    coverRecord?.background,
    "appearance.cover.background",
  );
  const coverForeground = optionalStringValue(
    coverRecord?.foreground,
    "appearance.cover.foreground",
  );
  const coverAccent = optionalStringValue(
    coverRecord?.accent,
    "appearance.cover.accent",
  );
  const media =
    root.media === undefined
      ? undefined
      : parseManifestMedia(
          root.media,
          manifestUrl,
          new Set(chapters.map(({ chapterId }) => chapterId)),
        );

  return {
    bookId: stringValue(root.bookId, "bookId"),
    editionId: stringValue(root.editionId, "editionId"),
    title: stringValue(root.title, "title"),
    authors,
    chapters,
    tableOfContents,
    ...(media === undefined ? {} : { media }),
    ...(publicationDate === undefined ? {} : { publicationDate }),
    ...(description === undefined ? {} : { description }),
    ...(frontMatterRecord === undefined
      ? {}
      : {
          frontMatter: {
            ...(credits === undefined ? {} : { credits }),
            ...(kicker === undefined ? {} : { kicker }),
            ...(thesis === undefined ? {} : { thesis }),
          },
        }),
    ...(coverRecord === undefined
      ? {}
      : {
          cover: {
            ...(coverBackground === undefined
              ? {}
              : { background: coverBackground }),
            ...(coverForeground === undefined
              ? {}
              : { foreground: coverForeground }),
            ...(coverAccent === undefined
              ? {}
              : { accent: coverAccent }),
            ...(subtitle === undefined ? {} : { subtitle }),
          },
        }),
  };
}

function chapterNumberForChapter(
  chapter: V3Chapter,
  displayedHeading?: string,
): string | undefined {
  const displayedNumber = displayedHeading
    ? /^(\d+(?:[-.]\d+)*)[.)]?\s+/.exec(displayedHeading)?.[1]
    : undefined;
  const chapterId = String(chapter.chapterId);
  const sourceNumber =
    displayedNumber ??
    (/^\d+(?:-\d+)*$/.test(chapterId) ? chapterId : undefined);
  return sourceNumber
    ?.split("-")
    .map((part) => String(Number(part)))
    .join("-");
}

function chapterLabelForChapter(
  chapter: V3Chapter,
  displayedHeading?: string,
): string {
  const chapterNumber = chapterNumberForChapter(chapter, displayedHeading);
  return chapterNumber ? `Chapter ${chapterNumber}` : "Chapter";
}

function isReferenceSection(
  chapterId: string | undefined,
  title: string | undefined,
): boolean {
  return /\b(references|works cited|bibliography|endnotes|end notes)\b/i.test(
    `${chapterId ?? ""} ${title ?? ""}`,
  );
}

function markLeadingReferenceMarker(node: HTMLElement): void {
  if (
    node.matches("p") &&
    /^\s*\[\s*0*\d+\s*\]\s*/.test(node.textContent ?? "")
  ) {
    node.dataset.v3LeadingMarker = "reference";
  }
}

function markLocalChapterLinks(node: HTMLElement): void {
  if (!manifest) {
    return;
  }
  for (const link of node.querySelectorAll<HTMLAnchorElement>("a[href]")) {
    const href = link.getAttribute("href");
    if (
      sourceLinkMode === "card" &&
      options.sourceResolver &&
      href &&
      /^(?:https?:)?\/\//i.test(href)
    ) {
      link.setAttribute("aria-haspopup", "dialog");
    }
    const match = href
      ? /^\.\.\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?(?:#([^?]+))?$/.exec(href)
      : null;
    const chapterId = match?.[1];
    if (
      !chapterId ||
      !manifest.chapters.some(
        ({ chapterId: candidate }) => String(candidate) === chapterId,
      )
    ) {
      continue;
    }
    link.dataset.v3ChapterLink = chapterId;
    if (match?.[2]) {
      link.dataset.v3ChapterAnchor = decodeURIComponent(match[2]);
    }
  }
}

function applySourceRange(
  node: HTMLElement,
  sourceStart: number,
  sourceEnd: number,
): void {
  node.dataset.v3SourceStart = String(sourceStart);
  node.dataset.v3SourceEnd = String(sourceEnd);
}

function semanticBlocks(
  article: HTMLElement,
  chapter: V3Chapter,
): SemanticBlock[] {
  const blocks: SemanticBlock[] = [];
  for (const child of article.children) {
    if (!(child instanceof HTMLElement)) {
      continue;
    }
    if (child.matches("nav.book-chapter-nav")) {
      continue;
    }
    if (
      !child.matches(
        "h1, h2, h3, h4, h5, h6, p, blockquote, ul, ol, table, pre, figure, hr",
      )
    ) {
      if ((child.textContent?.trim().length ?? 0) > 0) {
        throw new Error(
          `V3 chapter ${chapter.title} contains unsupported ${child.tagName.toLowerCase()} content`,
        );
      }
      continue;
    }
    const anchor = child.id || chapter.firstAnchor;
    const headingText = child.textContent?.trim() ?? "";
    const displayedNumber = /^(\d+(?:[-.]\d+)*)[.)]?\s+/.exec(
      headingText,
    )?.[1];
    const chapterLabel = chapterLabelForChapter(chapter, headingText);
    if (child.matches("p") && (child.textContent?.length ?? 0) > 680) {
      const rawText = child.textContent ?? "";
      const sourceText = normalizePageTurnText(rawText);
      sentenceRanges(rawText).forEach((range, index) => {
        const paragraph = cloneTextRange(
          child,
          range.start,
          range.end,
          index === 0,
        );
        const sourceStart = pageTurnTextOffsetAt(rawText, range.start);
        const sourceEnd = pageTurnTextOffsetAt(rawText, range.end);
        paragraph.dataset.sourceAnchor = anchor;
        applySourceRange(paragraph, sourceStart, sourceEnd);
        markLeadingReferenceMarker(paragraph);
        markLocalChapterLinks(paragraph);
        blocks.push({
          node: paragraph,
          anchor,
          sourceText,
          sourceStart,
          sourceEnd,
          chapterTitle: chapter.title,
          chapterLabel,
          chapterStart: false,
        });
      });
      continue;
    }

    const clone = child.cloneNode(true) as HTMLElement;
    if (child.matches("h1") && displayedNumber) {
      clone.textContent = headingText.replace(
        /^(\d+(?:[-.]\d+)*)[.)]?\s+/,
        "",
      );
    }
    const sourceText = normalizePageTurnText(clone.textContent ?? "");
    clone.dataset.sourceAnchor = anchor;
    applySourceRange(clone, 0, Array.from(sourceText).length);
    markLeadingReferenceMarker(clone);
    markLocalChapterLinks(clone);
    blocks.push({
      node: clone,
      anchor,
      sourceText,
      sourceStart: 0,
      sourceEnd: Array.from(sourceText).length,
      chapterTitle: chapter.title,
      chapterLabel,
      chapterStart:
        child.matches("h1") &&
        (child.id === chapter.firstAnchor ||
          !blocks.some(({ chapterStart }) => chapterStart)),
    });
  }
  return blocks;
}

async function fetchManifest(): Promise<{
  manifest: PageTurnBookManifest;
  url: URL;
}> {
  const url = new URL(options.manifestUrl.toString(), globalThis.location.href);
  const response = await fetcher(url, { signal: requestController.signal });
  if (!response.ok) {
    throw new Error(
      `V3 could not load the publication manifest (${response.status})`,
    );
  }
  return {
    manifest: parseV3Manifest(await response.json(), url),
    url,
  };
}

async function fetchChapterBlocks(
  chapter: V3Chapter,
  manifestUrl: URL,
): Promise<SemanticBlock[]> {
  const response = await fetcher(new URL(chapter.href, manifestUrl), {
    signal: requestController.signal,
  });
  if (!response.ok) {
    throw new Error(
      `V3 could not load ${chapter.title} (${response.status})`,
    );
  }
  const parsed = new DOMParser().parseFromString(
    await response.text(),
    "text/html",
  );
  const article = parsed.querySelector<HTMLElement>("[data-reader-content]");
  if (!article) {
    throw new Error(`V3 chapter ${chapter.title} has no semantic article`);
  }
  return semanticBlocks(article, chapter);
}

function frontMatterPages(manifest: PageTurnBookManifest): PrototypePage[] {
  const insideTitle = createElement("p", "v3-title-kicker", "Publication record");
  const insideHeading = createElement("h2", undefined, manifest.title);
  const credits = createElement(
    "p",
    undefined,
    manifest.frontMatter?.credits ??
      manifest.authors.map(({ name }) => name).join(", "),
  );
  const date = createElement(
    "p",
    undefined,
    `Published ${manifest.publicationDate ?? "as an immutable semantic edition"}`,
  );

  const titleKicker = createElement(
    "p",
    "v3-title-kicker",
    manifest.frontMatter?.kicker ?? "Semantic publication",
  );
  const title = createElement("h1", "v3-title", manifest.title);
  const subtitle = createElement(
    "p",
    "v3-subtitle",
    manifest.cover?.subtitle ?? manifest.description ?? "",
  );

  const thesisHeading = createElement("h2", undefined, "The question");
  const thesis = createElement(
    "p",
    "v3-thesis",
    manifest.frontMatter?.thesis ?? manifest.description ?? "",
  );

  return [
    {
      label: "Inside front board",
      runningTitle: manifest.title,
      anchor: "v3-inside-cover",
      kind: "front-matter",
      chapterOpening: false,
      nodes: [insideTitle, insideHeading, credits, date],
    },
    {
      label: "Title page",
      runningTitle: manifest.authors[0]?.name ?? manifest.title,
      anchor: "v3-title-page",
      kind: "front-matter",
      chapterOpening: false,
      nodes: [titleKicker, title, subtitle],
    },
    {
      label: "Thesis",
      runningTitle: manifest.title,
      anchor: "v3-thesis",
      kind: "front-matter",
      chapterOpening: false,
      nodes: [thesisHeading, thesis],
    },
  ];
}

function pageFromBlocks(
  blocks: readonly SemanticBlock[],
  pageNumber: number,
  chapterState: ChapterState,
): PrototypePage {
  const first = blocks[0];
  if (!first) {
    throw new Error("Cannot create a semantic page without content");
  }
  return {
    label: `${first.chapterTitle}, semantic page ${pageNumber}`,
    runningTitle: first.chapterTitle,
    anchor: first.anchor,
    kind: "content",
    chapterOpening: first.chapterStart,
    chapterIndex: chapterState.index,
    chapterId: String(chapterState.chapter.chapterId),
    ...(first.chapterStart
      ? { chapterLabel: first.chapterLabel }
      : {}),
    nodes: blocks.map(({ node }) => node),
  };
}

function placeholderPage(chapterState: ChapterState): PrototypePage {
  const heading = createElement("h1", undefined, chapterState.chapter.title);
  heading.id = chapterState.chapter.firstAnchor;
  const loading = createElement(
    "p",
    "v3-placeholder-status",
    chapterState.status === "error"
      ? `Chapter unavailable: ${chapterState.error?.message ?? "unknown error"}`
      : "Chapter content is loading",
  );
  const retry =
    chapterState.status === "error"
      ? createElement("button", "v3-placeholder-retry", "Retry chapter")
      : undefined;
  if (retry) {
    retry.type = "button";
    retry.dataset.v3RetryChapter = String(chapterState.chapter.chapterId);
  }
  return {
    label: `${chapterState.chapter.title}, unloaded chapter`,
    runningTitle: chapterState.chapter.title,
    anchor: chapterState.chapter.firstAnchor,
    kind: "placeholder",
    chapterOpening: true,
    chapterIndex: chapterState.index,
    chapterId: String(chapterState.chapter.chapterId),
    chapterLabel: chapterLabelForChapter(chapterState.chapter),
    nodes: [heading, loading, ...(retry ? [retry] : [])],
  };
}

function blankChapterPage(chapterState: ChapterState): PrototypePage {
  return {
    label: `Blank verso after ${chapterState.chapter.title}`,
    runningTitle: chapterState.chapter.title,
    anchor: `v3-blank-${String(chapterState.chapter.chapterId)}`,
    kind: "blank",
    chapterOpening: false,
    chapterIndex: chapterState.index,
    chapterId: String(chapterState.chapter.chapterId),
    nodes: [],
  };
}

function numberedChapterPages(chapterIndex: number): PrototypePage[] {
  return (
    chapterStates[chapterIndex]?.pages?.filter(
      (chapterPage) => chapterPage.kind === "content",
    ) ?? []
  );
}

function folioLabel(
  page: PrototypePage,
  composedFolio: number,
): Readonly<{ text: string; ariaLabel: string }> | undefined {
  if (page.kind === "front-matter") {
    const roman = ["i", "ii", "iii"][composedFolio - 1];
    return roman
      ? { text: roman, ariaLabel: `Front matter page ${composedFolio} of 3` }
      : undefined;
  }
  if (page.kind !== "content" || page.chapterIndex === undefined) {
    return undefined;
  }
  const contentPages = numberedChapterPages(page.chapterIndex);
  const chapterPageIndex = contentPages.indexOf(page);
  if (chapterPageIndex < 0) {
    return undefined;
  }
  return {
    text: `${chapterPageIndex + 1} / ${contentPages.length}`,
    ariaLabel:
      `Chapter page ${chapterPageIndex + 1} of ${contentPages.length}`,
  };
}

function createSheet(
  page: PrototypePage,
  side: "left" | "right",
  folio: number,
  decorative: boolean,
): HTMLElement {
  const sheet = createElement(
    "article",
    [
      "v3-sheet",
      `v3-sheet-${side}`,
      page.kind === "front-matter" ? "v3-sheet-front-matter" : "",
      page.kind === "placeholder" ? "v3-sheet-placeholder" : "",
      page.kind === "blank" ? "v3-sheet-blank" : "",
      page.chapterOpening ? "v3-sheet-chapter-opening" : "",
    ]
      .filter(Boolean)
      .join(" "),
  );
  sheet.setAttribute("aria-label", page.label);
  sheet.dataset.v3Anchor = page.anchor;
  if (page.chapterId) {
    sheet.dataset.v3Chapter = page.chapterId;
  }
  if (isReferenceSection(page.chapterId, page.runningTitle)) {
    sheet.dataset.v3ChapterRole = "references";
  }
  if (decorative) {
    sheet.setAttribute("aria-hidden", "true");
    sheet.inert = true;
  }
  const running = createElement(
    "div",
    "v3-sheet-running",
    page.runningTitle,
  );
  const content = createElement("div", "v3-sheet-content");
  if (page.chapterOpening) {
    content.append(chapterOpeningLabel(page.chapterLabel ?? "Chapter"));
  }
  content.append(...cloneNodes(page.nodes, !decorative));
  activateMediaImages(content);
  const pageFolio = createElement("div", "v3-sheet-folio");
  const displayedFolio = folioLabel(page, folio);
  if (displayedFolio) {
    pageFolio.textContent = displayedFolio.text;
    pageFolio.setAttribute("aria-label", displayedFolio.ariaLabel);
    pageFolio.dataset.v3FolioScope =
      page.kind === "content" ? "chapter" : "front-matter";
  } else {
    pageFolio.hidden = true;
  }
  sheet.append(running, content, pageFolio);
  return sheet;
}

function interpolate(
  start: PageTurnPoint,
  end: PageTurnPoint,
  progress: number,
): PageTurnPoint {
  return {
    x: start.x + (end.x - start.x) * progress,
    y: start.y + (end.y - start.y) * progress,
  };
}

const reader = requiredElement<HTMLElement>("[data-v3-reader]");
const pageRoot = reader.closest<HTMLElement>(".v3-page");
const bookShell = requiredElement<HTMLElement>(".v3-book-shell");
const spread = requiredElement<HTMLElement>("[data-v3-spread]");
const spine = requiredElement<HTMLElement>(".v3-spine");
const stationary = requiredElement<HTMLElement>("[data-v3-stationary]");
const turnLayer = requiredElement<HTMLElement>("[data-v3-turn-layer]");
const entryCover = requiredElement<HTMLElement>("[data-v3-entry-cover]");
const measure = requiredElement<HTMLElement>("[data-v3-measure]");
const measureContent = requiredElement<HTMLElement>(
  "[data-v3-measure-content]",
);
const status = requiredElement<HTMLElement>("[data-v3-status]");
const sourceDialog = requiredElement<HTMLDialogElement>(
  "[data-v3-source-dialog]",
);
const sourceAvailability = requiredElement<HTMLElement>(
  "[data-v3-source-availability]",
);
const sourceTitle = requiredElement<HTMLElement>("[data-v3-source-title]");
const sourceCitation = requiredElement<HTMLElement>(
  "[data-v3-source-citation]",
);
const sourceMetadata = requiredElement<HTMLDListElement>(
  "[data-v3-source-metadata]",
);
const sourceCandidates = requiredElement<HTMLElement>(
  "[data-v3-source-candidates]",
);
const sourceCandidateList = requiredElement<HTMLOListElement>(
  "[data-v3-source-candidate-list]",
);
const sourceActions = requiredElement<HTMLElement>(
  "[data-v3-source-actions]",
);
const sourcePreview = requiredElement<HTMLElement>("[data-v3-source-preview]");
const sourceStatus = requiredElement<HTMLOutputElement>(
  "[data-v3-source-status]",
);
const sourceCardElements: PageTurnSourceCardElements = {
  availability: sourceAvailability,
  title: sourceTitle,
  citation: sourceCitation,
  metadata: sourceMetadata,
  candidates: sourceCandidates,
  candidateList: sourceCandidateList,
  actions: sourceActions,
  preview: sourcePreview,
  status: sourceStatus,
};
const chapterSelect = requiredElement<HTMLSelectElement>(
  "[data-v3-chapter-select]",
);
const publicationTitle = requiredElement<HTMLElement>(
  "[data-v3-publication-title]",
);
const coverKicker = requiredElement<HTMLElement>("[data-v3-cover-kicker]");
const coverTitle = requiredElement<HTMLElement>("[data-v3-cover-title]");
const coverSubtitle = requiredElement<HTMLElement>(
  "[data-v3-cover-subtitle]",
);
const counter = requiredElement<HTMLOutputElement>("[data-v3-counter]");
const decreaseFont = requiredElement<HTMLButtonElement>(
  "[data-v3-font-decrease]",
);
const increaseFont = requiredElement<HTMLButtonElement>(
  "[data-v3-font-increase]",
);
const fontStatus = requiredElement<HTMLOutputElement>(
  "[data-v3-font-status]",
);
const shareButton = requiredElement<HTMLButtonElement>("[data-v3-share]");
const shareStatus = requiredElement<HTMLOutputElement>(
  "[data-v3-share-status]",
);
const shareDialog = requiredElement<HTMLDialogElement>("[data-v3-share-dialog]");
const sharePolicyMessage = requiredElement<HTMLElement>(
  "[data-v3-share-policy]",
);
const shareQuote = requiredElement<HTMLElement>("[data-v3-share-quote]");
const shareBook = requiredElement<HTMLElement>("[data-v3-share-book]");
const shareAuthors = requiredElement<HTMLElement>("[data-v3-share-authors]");
const shareChapter = requiredElement<HTMLElement>("[data-v3-share-chapter]");
const shareEdition = requiredElement<HTMLElement>("[data-v3-share-edition]");
const shareCitation = requiredElement<HTMLElement>("[data-v3-share-citation]");
const sharePreviewUrl = requiredElement<HTMLAnchorElement>(
  "[data-v3-share-preview-url]",
);
const shareVisual = requiredElement<HTMLElement>("[data-v3-share-visual]");
const shareImage = requiredElement<HTMLImageElement>("[data-v3-share-image]");
const shareDisclosure = requiredElement<HTMLElement>(
  "[data-v3-share-disclosure]",
);
const shareEmbedNote = requiredElement<HTMLElement>(
  "[data-v3-share-embed-note]",
);
const shareFinal = requiredElement<HTMLButtonElement>("[data-v3-share-final]");
const shareCopyText = requiredElement<HTMLButtonElement>(
  "[data-v3-share-copy-text]",
);
const shareCopyImage = requiredElement<HTMLButtonElement>(
  "[data-v3-share-copy-image]",
);
const shareDownload = requiredElement<HTMLButtonElement>(
  "[data-v3-share-download]",
);
const shareOpenImage = requiredElement<HTMLButtonElement>(
  "[data-v3-share-open-image]",
);
const shareComposerStatus = requiredElement<HTMLOutputElement>(
  "[data-v3-share-composer-status]",
);
const selectionEntry = requiredElement<HTMLButtonElement>(
  "[data-v3-selection-entry]",
);
const selectionActions = requiredElement<HTMLElement>(
  "[data-v3-selection-actions]",
);
const selectionDescription = requiredElement<HTMLElement>(
  "[data-v3-selection-description]",
);
const selectionStatus = requiredElement<HTMLOutputElement>(
  "[data-v3-selection-status]",
);
const selectionFeedback = requiredElement<HTMLElement>(
  "[data-v3-selection-feedback]",
);
const selectionUndo = requiredElement<HTMLButtonElement>(
  "[data-v3-selection-undo]",
);
const selectionLive = requiredElement<HTMLElement>(
  "[data-v3-selection-live]",
);
const selectionActionButtons = Array.from(
  selectionActions.querySelectorAll<HTMLButtonElement>(
    "[data-v3-selection-action]",
  ),
);
const mediaPicker = requiredElement<HTMLElement>("[data-v3-media-picker]");
const mediaSelect = requiredElement<HTMLSelectElement>(
  "[data-v3-media-treatment]",
);
const mediaStyleSelect = requiredElement<HTMLSelectElement>(
  "[data-v3-media-style]",
);
const mediaDialog = requiredElement<HTMLDialogElement>(
  "[data-v3-media-dialog]",
);
const mediaDialogTitle = requiredElement<HTMLElement>(
  "[data-v3-media-dialog-title]",
);
const mediaDialogImage = requiredElement<HTMLImageElement>(
  "[data-v3-media-dialog-image]",
);
const mediaDialogCaption = requiredElement<HTMLElement>(
  "[data-v3-media-dialog-caption]",
);
const mediaDialogAttribution = requiredElement<HTMLElement>(
  "[data-v3-media-dialog-attribution]",
);
const mediaDialogLicense = requiredElement<HTMLElement>(
  "[data-v3-media-dialog-license]",
);
const mediaDialogSource = requiredElement<HTMLElement>(
  "[data-v3-media-dialog-source]",
);
const mediaDialogProvenance = requiredElement<HTMLElement>(
  "[data-v3-media-dialog-provenance]",
);
const mediaDialogIntegrity = requiredElement<HTMLElement>(
  "[data-v3-media-dialog-integrity]",
);
const mediaDialogOriginal = requiredElement<HTMLAnchorElement>(
  "[data-v3-media-dialog-original]",
);
const exploreButton = requiredElement<HTMLButtonElement>("[data-v3-explore]");
const appearanceButton = requiredElement<HTMLButtonElement>(
  "[data-v3-appearance]",
);
const appearanceDialog = requiredElement<HTMLDialogElement>(
  "[data-v3-appearance-dialog]",
);
const appearanceForm = requiredElement<HTMLFormElement>(
  "[data-v3-appearance-form]",
);
const closeAppearance = requiredElement<HTMLButtonElement>(
  "[data-v3-close-appearance]",
);
const appearancePreset = requiredElement<HTMLSelectElement>(
  "[data-v3-appearance-preset]",
);
const paperColor = requiredElement<HTMLInputElement>("[data-v3-paper-color]");
const inkColor = requiredElement<HTMLInputElement>("[data-v3-ink-color]");
const paperHighlight = requiredElement<HTMLInputElement>(
  "[data-v3-paper-highlight]",
);
const pageEdgeColor = requiredElement<HTMLInputElement>(
  "[data-v3-page-edge-color]",
);
const pageEdgeStyle = requiredElement<HTMLSelectElement>(
  "[data-v3-page-edge-style]",
);
const pagePattern = requiredElement<HTMLSelectElement>("[data-v3-page-pattern]");
const ruleColor = requiredElement<HTMLInputElement>("[data-v3-rule-color]");
const ruleSpacing = requiredElement<HTMLInputElement>(
  "[data-v3-rule-spacing]",
);
const paperAge = requiredElement<HTMLInputElement>("[data-v3-paper-age]");
const paperTexture = requiredElement<HTMLInputElement>(
  "[data-v3-paper-texture]",
);
const typeface = requiredElement<HTMLSelectElement>("[data-v3-typeface]");
const appearanceLineHeight = requiredElement<HTMLInputElement>(
  "[data-v3-line-height]",
);
const baseTypeScale = requiredElement<HTMLInputElement>(
  "[data-v3-base-type-scale]",
);
const dropCap = requiredElement<HTMLInputElement>("[data-v3-drop-cap]");
const gutterLift = requiredElement<HTMLInputElement>("[data-v3-gutter-lift]");
const bottomLift = requiredElement<HTMLInputElement>("[data-v3-bottom-lift]");
const foreEdgeLift = requiredElement<HTMLInputElement>(
  "[data-v3-fore-edge-lift]",
);
const cornerRoundness = requiredElement<HTMLInputElement>(
  "[data-v3-corner-roundness]",
);
const foldRadius = requiredElement<HTMLInputElement>("[data-v3-fold-radius]");
const foldShadow = requiredElement<HTMLInputElement>("[data-v3-fold-shadow]");
const boardOverhang = requiredElement<HTMLInputElement>(
  "[data-v3-board-overhang]",
);
const bindingMaterial = requiredElement<HTMLSelectElement>(
  "[data-v3-binding-material]",
);
const bindingDepth = requiredElement<HTMLSelectElement>(
  "[data-v3-binding-depth]",
);
const spineStyle = requiredElement<HTMLSelectElement>(
  "[data-v3-spine-style]",
);
const appearancePageCount = requiredElement<HTMLInputElement>(
  "[data-v3-page-count]",
);
const bindingHubs = requiredElement<HTMLInputElement>(
  "[data-v3-binding-hubs]",
);
const coverColor = requiredElement<HTMLInputElement>("[data-v3-cover-color]");
const coverForeground = requiredElement<HTMLInputElement>(
  "[data-v3-cover-foreground]",
);
const bindingColor = requiredElement<HTMLInputElement>(
  "[data-v3-binding-color]",
);
const accentColor = requiredElement<HTMLInputElement>(
  "[data-v3-accent-color]",
);
const resetAppearance = requiredElement<HTMLButtonElement>(
  "[data-v3-reset-appearance]",
);
const appearanceStatus = requiredElement<HTMLOutputElement>(
  "[data-v3-appearance-status]",
);
const exploreDialog = requiredElement<HTMLDialogElement>(
  "[data-v3-explore-dialog]",
);
const contents = requiredElement<HTMLElement>("[data-v3-contents]");
const searchForm = requiredElement<HTMLFormElement>("[data-v3-search-form]");
const searchInput = requiredElement<HTMLInputElement>("[data-v3-search-input]");
const searchStatus = requiredElement<HTMLElement>("[data-v3-search-status]");
const searchResults = requiredElement<HTMLOListElement>(
  "[data-v3-search-results]",
);
const bookmarkCurrent = requiredElement<HTMLButtonElement>(
  "[data-v3-bookmark-current]",
);
const bookmarkList = requiredElement<HTMLOListElement>(
  "[data-v3-bookmark-list]",
);
const selectionPreview = requiredElement<HTMLElement>(
  "[data-v3-selection-preview]",
);
const annotationNote = requiredElement<HTMLTextAreaElement>(
  "[data-v3-annotation-note]",
);
const saveAnnotation = requiredElement<HTMLButtonElement>(
  "[data-v3-save-annotation]",
);
const annotationList = requiredElement<HTMLOListElement>(
  "[data-v3-annotation-list]",
);
const showMarginalia = requiredElement<HTMLInputElement>(
  "[data-v3-show-marginalia]",
);
const readableMarginalia = requiredElement<HTMLInputElement>(
  "[data-v3-readable-marginalia]",
);
const annotationDialog = requiredElement<HTMLDialogElement>(
  "[data-v3-annotation-dialog]",
);
const annotationDialogTitle = requiredElement<HTMLElement>(
  "[data-v3-annotation-dialog-title]",
);
const annotationDialogQuote = requiredElement<HTMLElement>(
  "[data-v3-annotation-dialog-quote]",
);
const annotationDialogGroup = requiredElement<HTMLElement>(
  "[data-v3-annotation-dialog-group]",
);
const annotationDialogEditor = requiredElement<HTMLElement>(
  "[data-v3-annotation-dialog-editor]",
);
const annotationDialogNote = requiredElement<HTMLTextAreaElement>(
  "[data-v3-annotation-dialog-note]",
);
const annotationDialogActions = requiredElement<HTMLElement>(
  "[data-v3-annotation-dialog-actions]",
);
const updateAnnotation = requiredElement<HTMLButtonElement>(
  "[data-v3-update-annotation]",
);
const deleteOpenAnnotation = requiredElement<HTMLButtonElement>(
  "[data-v3-delete-open-annotation]",
);
const exploreOpenAnnotation = requiredElement<HTMLButtonElement>(
  "[data-v3-explore-open-annotation]",
);
const annotationDialogStatus = requiredElement<HTMLOutputElement>(
  "[data-v3-annotation-dialog-status]",
);
const exportAnnotations = requiredElement<HTMLButtonElement>(
  "[data-v3-export-annotations]",
);
const backupAnnotations = requiredElement<HTMLButtonElement>(
  "[data-v3-backup-annotations]",
);
const importAnnotations = requiredElement<HTMLInputElement>(
  "[data-v3-import-annotations]",
);
const importPreview = requiredElement<HTMLElement>("[data-v3-import-preview]");
const importCounts = requiredElement<HTMLElement>("[data-v3-import-counts]");
const importConflicts = requiredElement<HTMLInputElement>(
  "[data-v3-import-conflicts]",
);
const confirmReplace = requiredElement<HTMLInputElement>(
  "[data-v3-confirm-replace]",
);
const importMerge = requiredElement<HTMLButtonElement>("[data-v3-import-merge]");
const importReplace = requiredElement<HTMLButtonElement>(
  "[data-v3-import-replace]",
);
const deleteEdition = requiredElement<HTMLButtonElement>(
  "[data-v3-delete-edition]",
);
const deletePublication = requiredElement<HTMLButtonElement>(
  "[data-v3-delete-publication]",
);
const personalStatus = requiredElement<HTMLOutputElement>(
  "[data-v3-personal-status]",
);
const resumeNotice = requiredElement<HTMLElement>("[data-v3-resume-notice]");
const resumeLabel = requiredElement<HTMLElement>("[data-v3-resume-label]");
const startOver = requiredElement<HTMLButtonElement>("[data-v3-start-over]");
const backLink = requiredElement<HTMLAnchorElement>("[data-v3-back]");
const previous = requiredElement<HTMLButtonElement>("[data-v3-previous]");
const next = requiredElement<HTMLButtonElement>("[data-v3-next]");
const corners = Array.from(
  root.querySelectorAll<HTMLButtonElement>("[data-v3-direction]"),
);
shareButton.hidden = !canCreateDurableLinks;
shareButton.title = resolvedSharePolicy.message;
shareStatus.value = resolvedSharePolicy.message;
shareEmbedNote.hidden = options.embedded !== true;
appearanceButton.hidden = !(options.appearanceControls ?? managesUrl);
const singlePageMedia = globalThis.matchMedia("(max-width: 48rem)");
const reducedMotion = globalThis.matchMedia(
  "(prefers-reduced-motion: reduce)",
);
const selectionActionsEnabled = options.selectionActions ?? false;
const defaultSelectionShortcut: PageTurnSelectionActionShortcut = {
  key: "a",
  altKey: true,
  shiftKey: true,
};
const selectionShortcut =
  options.selectionActionShortcut === false
    ? undefined
    : (options.selectionActionShortcut ?? defaultSelectionShortcut);

let manifest: PageTurnBookManifest | undefined;
let manifestUrl: URL | undefined;
let chapterStates: ChapterState[] = [];
let pages: PrototypePage[] = [];
let paginationVersion = 0;
let spreadStart = 0;
let activeTurn: ActiveTurn | undefined;
let resizeTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
let appearanceTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
let openingTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
let chapterWindowVersion = 0;
let retainedChapterIndices: number[] = [];
let opening = true;
let fontScale = 1;
let mediaTreatment: PageTurnBookMediaTreatment = "off";
let mediaStyle: PageTurnBookMediaStyle =
  options.mediaStyle ?? mediaConfig?.defaultStyle ?? "original";
let mediaStyleUserSelected = false;
let locationTrackingReady = false;
let applyingHistory = false;
let sharing = false;
let shareOperationVersion = 0;
let sharePreparationVersion = 0;
let shareComposerVersion = 0;
let shareComposerController: AbortController | undefined;
let shareComposerObjectUrl: string | undefined;
let shareComposerPayload: PageTurnSharePayload | undefined;
let shareComposerImage: Blob | undefined;
let shareComposerFile: File | undefined;
let shareComposerReturnFocus: HTMLElement | undefined;
let shareComposerReturnFocusHadTabindex = false;
let preferredAnchor:
  | Readonly<{ chapterId: string; anchor: string }>
  | undefined;
let locationNavigationVersion = 0;
let historyRestoreVersion = 0;
let failureReported = false;
let pendingTurn = false;
let mediaReturnFocus: HTMLElement | undefined;
let personalStore: PageTurnPersonalStore | undefined;
let personalBusy = false;
let bookmarks: PageTurnBookmarkV1[] = [];
let annotations: PageTurnAnnotationV2[] = [];
let activeAnnotationId: string | undefined;
let annotationReturnFocus: HTMLElement | undefined;
let activeMarginEditor: HTMLFormElement | undefined;
let pendingAnnotationImport: PageTurnAnnotationBackupV2 | undefined;
let pendingSelection: V3Selection | undefined;
let selectionCaptureVersion = 0;
let selectionTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
let selectionPlacementFrame: number | undefined;
let selectionUndoTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
let selectionFeedbackTimer:
  | ReturnType<typeof globalThis.setTimeout>
  | undefined;
let selectionUndoAnnotation: PageTurnAnnotationV2 | undefined;
let selectionReturnTarget: HTMLElement | undefined;
let selectionReturnTargetHadTabindex = false;
let selectionFocusActive = false;
let exploreSelectionActive = false;
const highlightOwner = Symbol("pageturn-reader");
let lastSelectionModality: NonNullable<V3Selection["modality"]> = "keyboard";
let sharedTextTarget: PageTurnTextTargetV1 | undefined;
let searchRecordsPromise: Promise<readonly V3SearchRecord[]> | undefined;
let searchController: AbortController | undefined;
let sourceController: AbortController | undefined;
let sourceResolutionVersion = 0;
let sourceReturnFocus: HTMLAnchorElement | undefined;
let sourceCardModulePromise:
  | Promise<typeof import("./source-card.js")>
  | undefined;
let sourcePreviewModulePromise:
  | Promise<typeof import("./external-preview-runtime.js")>
  | undefined;
let sourcePreviewHandle:
  | import("./external-preview-runtime.js").PageTurnExternalPreviewRuntimeHandle
  | undefined;
const legacyChapterSources = new Map<
  string,
  Promise<readonly PageTurnTextSourceBlock[]>
>();
let resumedFromStorage = false;
let destroyed = false;

if (options.embedded === true) {
  const embeddedRoot =
    root instanceof HTMLElement ? root : document.body;
  embeddedRoot.classList.add("v3-page-embedded");
}

function configureBackNavigation(): void {
  let destination = options.libraryUrl
    ? new URL(options.libraryUrl.toString(), globalThis.location.href)
    : undefined;
  let label = "Library";
  try {
    if (managesUrl && document.referrer) {
      const referrer = new URL(document.referrer);
      const current = new URL(globalThis.location.href);
      if (
        (referrer.protocol === "http:" || referrer.protocol === "https:") &&
        referrer.href !== current.href
      ) {
        destination = referrer;
        label = "Back";
      }
    }
  } catch (error) {
    console.warn("V3 could not restore the referring location", error);
  }
  if (!destination) {
    backLink.hidden = true;
    backLink.removeAttribute("href");
    return;
  }
  backLink.hidden = false;
  backLink.href = destination.href;
  backLink.textContent = label;
  backLink.dataset.v3BackMode = label === "Back" ? "referrer" : "library";
}

function tocList(entries: readonly V3TocEntry[]): HTMLOListElement {
  const list = createElement("ol", "v3-contents-list");
  for (const entry of entries) {
    const item = createElement("li");
    const link = createElement("button", undefined, entry.title);
    link.type = "button";
    link.dataset.v3GoChapter = entry.chapterId;
    link.dataset.v3GoAnchor = entry.anchor;
    item.append(link);
    if (entry.children.length > 0) {
      item.append(tocList(entry.children));
    }
    list.append(item);
  }
  return list;
}

function renderContents(): void {
  contents.replaceChildren(
    ...(manifest ? [tocList(manifest.tableOfContents)] : []),
  );
}

function searchRecordElements(
  article: HTMLElement,
  chapter: V3Chapter,
): V3SearchRecord[] {
  return Array.from(article.children).flatMap((child) => {
    if (
      !(child instanceof HTMLElement) ||
      !child.id ||
      !child.matches(
        "h1, h2, h3, h4, h5, h6, p, blockquote, ul, ol, table, pre, figure",
      )
    ) {
      return [];
    }
    const text = child.textContent?.replace(/\s+/g, " ").trim() ?? "";
    return text.length < 2
      ? []
      : [
          {
            chapterId: String(chapter.chapterId),
            chapterTitle: chapter.title,
            anchor: child.id,
            text,
          },
        ];
  });
}

async function loadSearchRecords(): Promise<readonly V3SearchRecord[]> {
  if (searchRecordsPromise) {
    return searchRecordsPromise;
  }
  if (!manifest || !manifestUrl) {
    throw new Error("V3 cannot search before loading the publication");
  }
  const publication = manifest;
  const publicationUrl = manifestUrl;
  const controller = new AbortController();
  searchController = controller;
  searchRecordsPromise = (async () => {
    const records: V3SearchRecord[][] = Array.from(
      { length: publication.chapters.length },
      () => [],
    );
    let nextIndex = 0;
    const worker = async () => {
      while (nextIndex < publication.chapters.length) {
        const index = nextIndex;
        nextIndex += 1;
        const chapter = publication.chapters[index];
        if (!chapter) {
          continue;
        }
        const response = await fetcher(new URL(chapter.href, publicationUrl), {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(
            `V3 search could not load ${chapter.title} (${response.status})`,
          );
        }
        const parsed = new DOMParser().parseFromString(
          await response.text(),
          "text/html",
        );
        const article =
          parsed.querySelector<HTMLElement>("[data-reader-content]");
        if (!article) {
          throw new Error(
            `V3 search could not find content for ${chapter.title}`,
          );
        }
        records[index] = searchRecordElements(article, chapter);
      }
    };
    await Promise.all(
      Array.from(
        { length: Math.min(4, publication.chapters.length) },
        () => worker(),
      ),
    );
    return records.flat();
  })()
    .then((records) => {
      if (searchController === controller) {
        searchController = undefined;
      }
      return records;
    })
    .catch((error: unknown) => {
      if (searchController === controller) {
        searchController = undefined;
      }
      searchRecordsPromise = undefined;
      throw error;
    });
  return searchRecordsPromise;
}

function searchSnippet(text: string, matchIndex: number, length: number): string {
  const start = Math.max(0, matchIndex - 55);
  const end = Math.min(text.length, matchIndex + length + 95);
  return `${start > 0 ? "..." : ""}${text.slice(start, end)}${
    end < text.length ? "..." : ""
  }`;
}

async function runSearch(queryText: string): Promise<void> {
  const queryValue = queryText.replace(/\s+/g, " ").trim();
  if (queryValue.length < 2) {
    searchStatus.textContent = "Enter at least two characters.";
    searchResults.replaceChildren();
    return;
  }
  searchStatus.textContent = "Building the on-demand text index...";
  searchInput.disabled = true;
  try {
    const queryLower = queryValue.toLocaleLowerCase();
    const matches = (await loadSearchRecords())
      .flatMap((entry) => {
        const index = entry.text.toLocaleLowerCase().indexOf(queryLower);
        return index < 0 ? [] : [{ entry, index }];
      })
      .slice(0, 50);
    searchResults.replaceChildren(
      ...matches.map(({ entry, index }) => {
        const item = createElement("li");
        const open = createElement(
          "button",
          undefined,
          `${entry.chapterTitle}: ${searchSnippet(
            entry.text,
            index,
            queryValue.length,
          )}`,
        );
        open.type = "button";
        open.dataset.v3GoChapter = entry.chapterId;
        open.dataset.v3GoAnchor = entry.anchor;
        item.append(open);
        return item;
      }),
    );
    searchStatus.textContent =
      matches.length === 0
        ? `No results for "${queryValue}".`
        : `${matches.length} result${matches.length === 1 ? "" : "s"} for "${queryValue}".`;
  } finally {
    searchInput.disabled = false;
  }
}

function personalLocationUrl(
  chapterId: string,
  anchor: string,
): string {
  if (!manifest) {
    throw new Error("V3 publication is unavailable");
  }
  return readingLocationUrl(
    {
      bookId: manifest.bookId,
      editionId: manifest.editionId,
      chapterId,
      anchor,
    },
    false,
  ).href;
}

function toolLocationButton(
  label: string,
  chapterId: string,
  anchor: string,
): HTMLButtonElement {
  const open = createElement("button", undefined, label);
  open.type = "button";
  open.dataset.v3GoChapter = chapterId;
  open.dataset.v3GoAnchor = anchor;
  return open;
}

function renderBookmarks(): void {
  const location = currentReadingLocation();
  const currentBookmark = location
    ? bookmarks.find(
        ({ location: saved }) =>
          saved.chapterId === location.chapterId &&
          saved.anchor === location.anchor,
      )
    : undefined;
  bookmarkCurrent.disabled = location === undefined || !personalStore || personalBusy;
  bookmarkCurrent.setAttribute(
    "aria-pressed",
    String(currentBookmark !== undefined),
  );
  bookmarkCurrent.textContent = currentBookmark
    ? "Remove current bookmark"
    : "Bookmark current passage";
  bookmarkList.replaceChildren(
    ...bookmarks.map((bookmark) => {
      const item = createElement("li");
      item.append(
        toolLocationButton(
          bookmark.label ?? bookmark.excerpt ?? "Saved passage",
          bookmark.location.chapterId,
          bookmark.location.anchor,
        ),
      );
      const remove = createElement("button", undefined, "Remove");
      remove.type = "button";
      remove.dataset.v3RemoveBookmark = bookmark.bookmarkId;
      remove.disabled = !personalStore || personalBusy;
      remove.setAttribute(
        "aria-label",
        `Remove bookmark: ${bookmark.label ?? "Saved passage"}`,
      );
      item.append(remove);
      return item;
    }),
  );
}

function annotationLocation(annotation: PageTurnAnnotationV2): {
  chapterId: string;
  anchor: string;
  quote: string;
} {
  return annotation.target.state === "resolved"
    ? {
        chapterId: annotation.target.selector.chapterId,
        anchor: annotation.target.selector.start.anchor,
        quote: annotation.target.selector.quote.exact,
      }
    : annotation.target.legacy;
}

function annotationText(annotation: PageTurnAnnotationV2): string {
  return annotation.body?.value.trim() ?? "";
}

function marginaliaPreferenceKey(bookId: string): string {
  return `ethical-tech-book-v3-marginalia:${bookId}`;
}

function applyAnnotationAppearance(): void {
  const scale = Number.isFinite(annotationAppearance.fontScale)
    ? Math.min(2, Math.max(0.75, annotationAppearance.fontScale))
    : 1;
  annotationAppearance = {
    fontFamily:
      annotationAppearance.fontFamily.trim() ||
      defaultAnnotationAppearance.fontFamily,
    fontScale: scale,
    inkColor:
      annotationAppearance.inkColor.trim() ||
      defaultAnnotationAppearance.inkColor,
    showMarginalia: annotationAppearance.showMarginalia,
  };
  reader.style.setProperty(
    "--v3-annotation-font",
    annotationAppearance.fontFamily,
  );
  reader.style.setProperty("--v3-annotation-scale", String(scale));
  reader.style.setProperty(
    "--v3-annotation-ink",
    annotationAppearance.inkColor,
  );
  showMarginalia.checked = annotationAppearance.showMarginalia;
  reader.dataset.v3ReadableMarginalia = String(readableMarginalia.checked);
}

function readMarginaliaPreferences(): void {
  if (!manifest) {
    return;
  }
  try {
    const value = JSON.parse(
      globalThis.localStorage.getItem(marginaliaPreferenceKey(manifest.bookId)) ??
        "{}",
    ) as { showMarginalia?: unknown; readableFont?: unknown };
    if (typeof value.showMarginalia === "boolean") {
      annotationAppearance = {
        ...annotationAppearance,
        showMarginalia: value.showMarginalia,
      };
    }
    readableMarginalia.checked = value.readableFont === true;
  } catch {
    readableMarginalia.checked = false;
  }
  applyAnnotationAppearance();
}

function writeMarginaliaPreferences(): void {
  if (!manifest) {
    return;
  }
  try {
    globalThis.localStorage.setItem(
      marginaliaPreferenceKey(manifest.bookId),
      JSON.stringify({
        showMarginalia: showMarginalia.checked,
        readableFont: readableMarginalia.checked,
      }),
    );
  } catch {
    personalStatus.value = "Marginalia preference could not be saved.";
  }
}

function setAnnotationAppearance(value: PageTurnAnnotationAppearance): void {
  annotationAppearance = { ...annotationAppearance, ...value };
  applyAnnotationAppearance();
  renderMarginalia();
}

function marginaliaLayer(
  sheet: HTMLElement,
  side: "left" | "right",
  decorative: boolean,
): HTMLElement {
  const layer = createElement(
    "aside",
    `v3-marginalia-layer v3-marginalia-layer-${side}`,
  );
  layer.dataset.v3Marginalia = side;
  if (decorative) {
    layer.setAttribute("aria-hidden", "true");
    layer.inert = true;
  } else {
    layer.setAttribute("aria-label", `${side} outer margin annotations`);
  }
  sheet.append(layer);
  return layer;
}

function annotationRanges(
  annotation: PageTurnAnnotationV2,
  scope: ParentNode,
): Range[] {
  return annotation.target.state === "resolved"
    ? pageTurnTextTargetRanges(
        annotation.target.selector,
        textSourceBlocks(annotation.target.selector.chapterId),
        scope,
      )
    : [];
}

function renderMarginalia(
  scope: ParentNode = stationary,
  decorative = false,
): void {
  for (const existing of scope.querySelectorAll("[data-v3-marginalia]")) {
    existing.remove();
  }
  if (!annotationAppearance.showMarginalia) {
    return;
  }
  const compact = singlePageMedia.matches;
  for (const sheet of scope.querySelectorAll<HTMLElement>(".v3-sheet")) {
    const side = sheet.classList.contains("v3-sheet-left") ? "left" : "right";
    const sheetBounds = sheet.getBoundingClientRect();
    const content = sheet.querySelector<HTMLElement>(".v3-sheet-content");
    const contentBounds = content?.getBoundingClientRect();
    if (!content || sheetBounds.height <= 0 || !contentBounds) {
      continue;
    }
    const attached = annotations.flatMap((annotation) => {
      const note = annotationText(annotation);
      if (
        annotation.motivation !== "commenting" ||
        note === "" ||
        annotation.target.state !== "resolved"
      ) {
        return [];
      }
      let rectangles = annotationRanges(annotation, sheet)
        .flatMap((range) => Array.from(range.getClientRects()))
        .filter(({ width, height }) => width > 0 && height > 0);
      if (rectangles.length === 0 && decorative) {
        const anchor = annotation.target.selector.start.anchor;
        const source = sheet.querySelector<HTMLElement>(
          `[data-source-anchor="${CSS.escape(anchor)}"]`,
        );
        if (source) {
          rectangles = [source.getBoundingClientRect()];
        }
      }
      const first = rectangles[0];
      return first
        ? [
            {
              annotation,
              note,
              requestedTop: first.top - sheetBounds.top,
            },
          ]
        : [];
    });
    if (attached.length === 0) {
      continue;
    }
    const noteHeight = compact ? 22 : Math.max(38, sheetBounds.height * 0.1);
    const placements = placePageTurnMarginalia(
      attached.map(({ annotation, requestedTop }) => ({
        id: annotation.annotationId,
        requestedTop,
        height: noteHeight,
        createdAt: annotation.createdAt,
      })),
      {
        top: Math.max(0, contentBounds.top - sheetBounds.top),
        bottom: Math.min(
          sheetBounds.height,
          contentBounds.bottom - sheetBounds.top,
        ),
        gap: compact ? 5 : 8,
        groupHeight: compact ? 22 : 28,
      },
    );
    const layer = marginaliaLayer(sheet, side, decorative);
    for (const placement of placements) {
      if (placement.kind === "group") {
        const node = createElement(
          decorative ? "span" : "button",
          "v3-marginalia-group",
          `${placement.memberIds.length} notes`,
        );
        node.style.top = `${placement.top}px`;
        node.style.height = `${placement.height}px`;
        if (node instanceof HTMLButtonElement) {
          node.type = "button";
          node.dataset.v3AnnotationGroup = placement.memberIds.join(",");
          node.setAttribute(
            "aria-label",
            `Open ${placement.memberIds.length} grouped annotations`,
          );
        }
        layer.append(node);
        continue;
      }
      const matched = attached.find(
        ({ annotation }) => annotation.annotationId === placement.id,
      );
      if (!matched) {
        continue;
      }
      const node = createElement(
        decorative ? "span" : "button",
        "v3-marginalia-note",
        matched.note,
      );
      node.style.top = `${placement.top}px`;
      node.style.height = `${placement.height}px`;
      if (node instanceof HTMLButtonElement) {
        node.type = "button";
        node.dataset.v3AnnotationOpen = placement.id;
        node.setAttribute("aria-label", `Open annotation: ${matched.note}`);
      }
      layer.append(node);
    }
  }
}

function rememberAnnotationFocus(target: HTMLElement | undefined): void {
  if (!target?.isConnected) {
    return;
  }
  selectionReturnTarget = target;
  selectionReturnTargetHadTabindex = target.hasAttribute("tabindex");
  if (!selectionReturnTargetHadTabindex) {
    target.tabIndex = -1;
  }
  selectionFocusActive = true;
}

function closeMarginEditor(restoreFocus: boolean): void {
  activeMarginEditor?.remove();
  activeMarginEditor = undefined;
  if (restoreFocus) {
    dismissSelectionActions(true, true);
  }
}

function openMarginEditor(
  selection: V3Selection & Readonly<{ target: PageTurnTextTargetV1 }>,
): void {
  closeMarginEditor(false);
  const sheet = selection.source?.closest<HTMLElement>(".v3-sheet");
  if (!sheet) {
    return;
  }
  const side = sheet.classList.contains("v3-sheet-left") ? "left" : "right";
  const layer =
    sheet.querySelector<HTMLElement>("[data-v3-marginalia]") ??
    marginaliaLayer(sheet, side, false);
  const sheetBounds = sheet.getBoundingClientRect();
  const targetBounds =
    selection.range?.getClientRects()[0] ??
    selection.source?.getBoundingClientRect();
  const form = createElement("form", "v3-margin-editor");
  form.dataset.v3MarginEditor = "";
  form.setAttribute("role", "dialog");
  form.setAttribute("aria-label", "Add annotation");
  form.style.top = `${Math.max(0, (targetBounds?.top ?? sheetBounds.top) - sheetBounds.top)}px`;
  const label = createElement("label");
  label.append("Note");
  const note = createElement("textarea");
  note.name = "note";
  note.rows = 3;
  note.maxLength = 4000;
  note.required = true;
  note.setAttribute("aria-label", "Note on selected text");
  label.append(note);
  const actions = createElement("div", "v3-margin-editor-actions");
  const save = createElement("button", undefined, "Save");
  save.type = "submit";
  const cancel = createElement("button", undefined, "Cancel");
  cancel.type = "button";
  actions.append(save, cancel);
  form.append(label, actions);
  form.addEventListener(
    "submit",
    (event) => {
      event.preventDefault();
      void saveCurrentAnnotation(note.value, true);
    },
    { signal: lifecycle.signal },
  );
  note.addEventListener(
    "input",
    () => note.setCustomValidity(""),
    { signal: lifecycle.signal },
  );
  cancel.addEventListener(
    "click",
    () => closeMarginEditor(true),
    { signal: lifecycle.signal },
  );
  form.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMarginEditor(true);
      }
    },
    { signal: lifecycle.signal },
  );
  layer.append(form);
  activeMarginEditor = form;
  requestAnimationFrame(() => note.focus({ preventScroll: true }));
}

function openAnnotationDetail(
  annotationId: string,
  trigger?: HTMLElement,
): void {
  const annotation = annotations.find(
    ({ annotationId: candidate }) => candidate === annotationId,
  );
  if (!annotation) {
    return;
  }
  activeAnnotationId = annotationId;
  annotationReturnFocus = trigger;
  annotationDialogTitle.textContent = "Annotation";
  annotationDialogQuote.textContent = annotationLocation(annotation).quote;
  annotationDialogGroup.hidden = true;
  annotationDialogGroup.replaceChildren();
  annotationDialogEditor.hidden = false;
  annotationDialogActions.hidden = false;
  annotationDialogNote.value = annotationText(annotation);
  annotationDialogStatus.value = "";
  if (!annotationDialog.open) {
    annotationDialog.showModal();
  }
  requestAnimationFrame(() =>
    annotationDialogNote.focus({ preventScroll: true }),
  );
}

function openAnnotationGroup(
  annotationIds: readonly string[],
  trigger: HTMLElement,
): void {
  const grouped = annotationIds.flatMap((id) => {
    const annotation = annotations.find(
      ({ annotationId }) => annotationId === id,
    );
    return annotation ? [annotation] : [];
  });
  if (grouped.length === 0) {
    return;
  }
  activeAnnotationId = undefined;
  annotationReturnFocus = trigger;
  annotationDialogTitle.textContent = `${grouped.length} notes`;
  annotationDialogQuote.textContent =
    "Choose a note to read, edit, or delete its complete text.";
  annotationDialogEditor.hidden = true;
  annotationDialogActions.hidden = true;
  annotationDialogGroup.hidden = false;
  annotationDialogGroup.replaceChildren(
    ...grouped.map((annotation) => {
      const button = createElement(
        "button",
        undefined,
        annotationText(annotation),
      );
      button.type = "button";
      button.dataset.v3GroupedAnnotation = annotation.annotationId;
      return button;
    }),
  );
  annotationDialogStatus.value = "";
  annotationDialog.showModal();
}

async function updateCurrentAnnotation(): Promise<void> {
  const annotation = annotations.find(
    ({ annotationId }) => annotationId === activeAnnotationId,
  );
  const note = annotationDialogNote.value.trim();
  if (!annotation || !personalStore || note === "") {
    annotationDialogStatus.value = "Enter a note before saving.";
    return;
  }
  const updated: PageTurnAnnotationV2 = {
    ...annotation,
    motivation: "commenting",
    body: { format: "text/markdown", value: note },
    updatedAt: new Date().toISOString(),
  };
  try {
    await personalStore.putAnnotation(updated);
    annotations = annotations.map((candidate) =>
      candidate.annotationId === updated.annotationId ? updated : candidate,
    );
    annotationDialogStatus.value = "Annotation updated in this browser.";
    renderMarginalia();
    renderPersonalTextHighlights();
    renderPersonalTools();
  } catch (error) {
    annotationDialogStatus.value =
      error instanceof Error ? error.message : "Annotation could not be updated.";
  }
}

async function deleteAnnotationById(annotationId: string): Promise<boolean> {
  if (!manifest || !personalStore) {
    return false;
  }
  try {
    await personalStore.deleteAnnotation(
      manifest.bookId,
      manifest.editionId,
      annotationId,
    );
    annotations = annotations.filter(
      ({ annotationId: candidate }) => candidate !== annotationId,
    );
    renderMarginalia();
    renderPersonalTextHighlights();
    renderPersonalTools();
    return true;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Annotation could not be deleted.";
    annotationDialogStatus.value = message;
    personalStatus.value = message;
    return false;
  }
}

function renderAnnotations(): void {
  selectionPreview.hidden = pendingSelection === undefined;
  selectionPreview.textContent = pendingSelection?.quote ?? "";
  annotationNote.disabled = pendingSelection?.target === undefined;
  saveAnnotation.disabled =
    pendingSelection?.target === undefined || !personalStore || personalBusy;
  exportAnnotations.disabled =
    annotations.length === 0 || !canCreateDurableLinks;
  backupAnnotations.disabled = annotations.length === 0 || !personalStore;
  annotationList.replaceChildren(
    ...annotations.map((annotation) => {
      const location = annotationLocation(annotation);
      const item = createElement("li");
      item.dataset.v3AnnotationItem = annotation.annotationId;
      const quote = createElement(
        "blockquote",
        undefined,
        location.quote,
      );
      item.append(
        toolLocationButton(
          annotation.body?.value.trim() || location.quote.slice(0, 80),
          location.chapterId,
          location.anchor,
        ),
        quote,
      );
      if (annotation.target.state === "unresolved") {
        const unresolved = createElement(
          "p",
          "v3-unresolved-note",
          "Unresolved: this note is not attached to current text.",
        );
        unresolved.setAttribute("role", "status");
        item.append(unresolved);
      }
      if (annotation.body?.value.trim()) {
        item.append(createElement("p", undefined, annotation.body.value));
        const edit = createElement("button", undefined, "Edit");
        edit.type = "button";
        edit.dataset.v3EditAnnotation = annotation.annotationId;
        edit.disabled = !personalStore || personalBusy;
        edit.setAttribute("aria-label", "Edit private annotation");
        item.append(edit);
      }
      const remove = createElement("button", undefined, "Delete");
      remove.type = "button";
      remove.disabled = !personalStore || personalBusy;
      remove.dataset.v3RemoveAnnotation = annotation.annotationId;
      remove.setAttribute("aria-label", "Delete private annotation");
      item.append(remove);
      return item;
    }),
  );
}

function renderPersonalTools(): void {
  renderBookmarks();
  renderAnnotations();
  const storageUnavailable = personalStore === undefined;
  importAnnotations.disabled = storageUnavailable || personalBusy;
  deleteEdition.disabled = storageUnavailable || personalBusy;
  deletePublication.disabled = storageUnavailable || personalBusy;
  importMerge.disabled = storageUnavailable || personalBusy;
  importReplace.disabled =
    storageUnavailable || personalBusy || !confirmReplace.checked;
  updateSelectionActionCapabilities();
}

function selectionElement(node: Node | null): Element | undefined {
  return node instanceof Element
    ? node
    : node?.parentElement ?? undefined;
}

function textSourceBlocks(chapterId: string): PageTurnTextSourceBlock[] {
  const chapterState = chapterStates.find(
    ({ chapter }) => String(chapter.chapterId) === chapterId,
  );
  if (!chapterState) {
    return [];
  }

  const result: PageTurnTextSourceBlock[] = [];
  const byAnchor = new Map<string, string>();
  for (const block of chapterState.blocks ?? []) {
    const existing = byAnchor.get(block.anchor);
    if (existing !== undefined && existing !== block.sourceText) {
      throw new Error(
        `V3 source anchor has inconsistent text: ${block.anchor}`,
      );
    }
    if (existing === undefined) {
      result.push({ anchor: block.anchor, text: block.sourceText });
      byAnchor.set(block.anchor, block.sourceText);
    }
  }
  for (const figure of mediaConfig?.figures.filter(
    ({ chapterId: candidate }) => candidate === chapterId,
  ) ?? []) {
    const source = {
      anchor: `v3-media-${figure.id}`,
      text: normalizePageTurnText(figure.caption),
    };
    const replacementAnchors = figure.replaceAnchors ?? [];
    if (replacementAnchors.length > 0) {
      const missingAnchors = replacementAnchors.filter(
        (anchor) => !result.some((block) => block.anchor === anchor),
      );
      if (missingAnchors.length > 0) {
        throw new Error(
          `V3 figure ${figure.id} has no selector replacement anchors: ${missingAnchors.join(", ")}`,
        );
      }
      const index = result.findIndex(({ anchor }) =>
        replacementAnchors.includes(anchor),
      );
      if (index < 0) {
        throw new Error(
          `V3 figure ${figure.id} has no selector replacement anchor`,
        );
      }
      result.splice(index, 0, source);
      continue;
    }
    if (!figure.afterAnchor) {
      throw new Error(`V3 figure ${figure.id} has no selector insertion anchor`);
    }
    let index = result.length - 1;
    while (index >= 0 && result[index]?.anchor !== figure.afterAnchor) {
      index -= 1;
    }
    if (index < 0) {
      throw new Error(
        `V3 figure ${figure.id} has no selector anchor ${figure.afterAnchor}`,
      );
    }
    result.splice(index + 1, 0, source);
  }
  return result;
}

async function legacyTextSourceBlocks(
  chapterId: string,
): Promise<readonly PageTurnTextSourceBlock[]> {
  const existing = legacyChapterSources.get(chapterId);
  if (existing) {
    return existing;
  }
  if (!manifest || !manifestUrl) {
    throw new Error("V3 publication is unavailable");
  }
  const chapter = manifest.chapters.find(
    ({ chapterId: candidate }) => String(candidate) === chapterId,
  );
  if (!chapter) {
    return [];
  }
  const promise = (async () => {
    const response = await fetcher(new URL(chapter.href, manifestUrl), {
      signal: requestController.signal,
    });
    if (!response.ok) {
      throw new Error(
        `V3 could not load legacy annotation source (${response.status})`,
      );
    }
    const parsed = new DOMParser().parseFromString(
      await response.text(),
      "text/html",
    );
    const article = parsed.querySelector<HTMLElement>("[data-reader-content]");
    if (!article) {
      throw new Error("V3 could not find legacy annotation source");
    }
    const sources = new Map<string, string>();
    for (const block of semanticBlocks(article, chapter)) {
      sources.set(block.anchor, block.sourceText);
    }
    return [...sources].map(([anchor, text]) => ({ anchor, text }));
  })();
  legacyChapterSources.set(chapterId, promise);
  return promise;
}

async function resolveLegacyAnnotation(
  annotation: V3Annotation,
): Promise<
  | Readonly<{ state: "resolved"; selector: PageTurnTextTargetV1 }>
  | Readonly<{
      state: "unresolved";
      reason: "missing-anchor" | "quote-mismatch" | "ambiguous-quote";
    }>
> {
  if (!manifest) {
    return { state: "unresolved", reason: "missing-anchor" };
  }
  const chapter = manifest.chapters.find(
    ({ chapterId }) => String(chapterId) === annotation.chapterId,
  );
  const blocks = await legacyTextSourceBlocks(annotation.chapterId);
  const block = blocks.find(({ anchor }) => anchor === annotation.anchor);
  if (!chapter || !block) {
    return { state: "unresolved", reason: "missing-anchor" };
  }
  const quote = normalizePageTurnText(annotation.quote);
  const source = normalizePageTurnText(block.text);
  const matches: number[] = [];
  let cursor = source.indexOf(quote);
  while (cursor >= 0) {
    matches.push(cursor);
    cursor = source.indexOf(quote, cursor + 1);
  }
  const match = matches[0];
  if (matches.length !== 1 || match === undefined) {
    return {
      state: "unresolved",
      reason: matches.length > 1 ? "ambiguous-quote" : "quote-mismatch",
    };
  }
  const start = Array.from(source.slice(0, match)).length;
  const selector = await createPageTurnTextTarget({
    bookId: manifest.bookId,
    editionId: manifest.editionId,
    chapterId: annotation.chapterId,
    chapterContentHash: chapter.contentHash,
    blocks,
    start: { anchor: annotation.anchor, offset: start },
    end: {
      anchor: annotation.anchor,
      offset: start + Array.from(quote).length,
    },
  });
  return { state: "resolved", selector };
}

function clearSharedTextHighlight(): void {
  sharedHighlightOwners.delete(highlightOwner);
  syncOwnedHighlights("v3-shared-quote", sharedHighlightOwners);
  for (const element of stationary.querySelectorAll<HTMLElement>(
    "[data-v3-shared-range]",
  )) {
    element.replaceWith(...Array.from(element.childNodes));
  }
}

function clearSharedTextTarget(): void {
  sharedTextTarget = undefined;
  delete reader.dataset.v3SharedTarget;
  clearSharedTextHighlight();
}

function renderSharedTextHighlight():
  | "highlighted"
  | "unavailable"
  | "unsupported" {
  clearSharedTextHighlight();
  if (!sharedTextTarget) {
    return "unavailable";
  }
  const ranges = pageTurnTextTargetRanges(
    sharedTextTarget,
    textSourceBlocks(sharedTextTarget.chapterId),
    stationary,
  );
  if (ranges.length === 0) {
    return "unavailable";
  }
  sharedHighlightOwners.set(highlightOwner, ranges);
  if (syncOwnedHighlights("v3-shared-quote", sharedHighlightOwners)) {
    return "highlighted";
  }
  sharedHighlightOwners.delete(highlightOwner);
  return "unsupported";
}

function currentTextSelection(): V3SelectionCandidate | undefined {
  const selection = document.getSelection();
  if (
    !manifest ||
    !selection ||
    selection.isCollapsed ||
    selection.rangeCount === 0
  ) {
    return undefined;
  }
  const range = selection.getRangeAt(0);
  const start = selectionElement(range.startContainer);
  const end = selectionElement(range.endContainer);
  const startSheet = start?.closest<HTMLElement>(
    "[data-v3-stationary] .v3-sheet",
  );
  const endSheet = end?.closest<HTMLElement>(
    "[data-v3-stationary] .v3-sheet",
  );
  if (
    !startSheet ||
    !endSheet ||
    startSheet.dataset.v3Chapter === undefined ||
    startSheet.dataset.v3Chapter !== endSheet.dataset.v3Chapter
  ) {
    return undefined;
  }
  const quote = normalizePageTurnText(selection.toString());
  const quoteLength = Array.from(quote).length;
  if (quoteLength < 2 || quoteLength > 2_000) {
    return undefined;
  }
  const source = start?.closest<HTMLElement>("[data-source-anchor]");
  const anchor = source?.dataset.sourceAnchor ?? startSheet.dataset.v3Anchor;
  const chapterId = startSheet.dataset.v3Chapter;
  const chapter = manifest.chapters.find(
    ({ chapterId: candidate }) => String(candidate) === chapterId,
  );
  const blocks = chapterId ? textSourceBlocks(chapterId) : [];
  return anchor && chapterId && chapter && blocks.length > 0
    ? {
        chapterId,
        anchor,
        quote,
        input: {
          bookId: manifest.bookId,
          editionId: manifest.editionId,
          chapterId,
          chapterContentHash: chapter.contentHash,
          blocks,
          range: range.cloneRange(),
          scope: stationary,
        },
      }
    : undefined;
}

function domRect(value: DOMRect | DOMRectReadOnly): PageTurnRect {
  return {
    left: value.left,
    top: value.top,
    right: value.right,
    bottom: value.bottom,
    width: value.width,
    height: value.height,
  };
}

function clearSelectionReturnTarget(): void {
  const target = selectionReturnTarget;
  if (target?.isConnected && !selectionReturnTargetHadTabindex) {
    if (document.activeElement === target) {
      target.addEventListener(
        "blur",
        () => target.removeAttribute("tabindex"),
        { once: true },
      );
    } else {
      target.removeAttribute("tabindex");
    }
  }
  selectionReturnTarget = undefined;
  selectionReturnTargetHadTabindex = false;
  selectionFocusActive = false;
}

function dismissSelectionActions(
  clearSelection = true,
  restoreFocus = false,
): void {
  hideSelectionActionSurface();
  if (
    restoreFocus &&
    selectionReturnTarget?.isConnected &&
    selectionFocusActive
  ) {
    selectionReturnTarget.focus({ preventScroll: true });
  }
  clearSelectionReturnTarget();
  if (clearSelection) {
    selectionCaptureVersion += 1;
    pendingSelection = undefined;
    renderSelectionControls();
  }
}

function hideSelectionActionSurface(): void {
  if (selectionTimer !== undefined) {
    clearTimeout(selectionTimer);
    selectionTimer = undefined;
  }
  if (selectionPlacementFrame !== undefined) {
    cancelAnimationFrame(selectionPlacementFrame);
    selectionPlacementFrame = undefined;
  }
  selectionActions.hidden = true;
  selectionActions.classList.remove("v3-selection-actions-permanent");
  selectionActions.classList.remove("v3-selection-actions-touch");
  delete selectionActions.dataset.v3Placement;
  selectionEntry.hidden = true;
}

function selectionActionButtonsAvailable(): HTMLButtonElement[] {
  return selectionActionButtons.filter(
    (button) => !button.hidden && !button.disabled,
  );
}

function updateSelectionActionCapabilities(): void {
  const share = selectionActions.querySelector<HTMLButtonElement>(
    '[data-v3-selection-action="share"]',
  );
  const highlight = selectionActions.querySelector<HTMLButtonElement>(
    '[data-v3-selection-action="highlight"]',
  );
  const annotate = selectionActions.querySelector<HTMLButtonElement>(
    '[data-v3-selection-action="annotate"]',
  );
  if (share) {
    share.hidden = !canCreateDurableLinks || !shareCapabilities.location;
    share.disabled = sharing;
    share.title = resolvedSharePolicy.message;
    const label = shareCapabilities.quote
      ? "Share selected text"
      : "Share passage location";
    share.setAttribute("aria-label", label);
    share.dataset.tooltip = shareCapabilities.quote ? "Share" : "Share location";
  }
  if (highlight) {
    highlight.disabled = personalStore === undefined || personalBusy;
  }
  if (annotate) {
    annotate.hidden = personalStore === undefined;
    annotate.disabled = personalBusy;
  }
  const available = selectionActionButtonsAvailable();
  for (const [index, button] of available.entries()) {
    button.tabIndex = index === 0 ? 0 : -1;
  }
}

function selectionViewportRect(): PageTurnRect {
  const viewport = globalThis.visualViewport;
  const left = viewport?.offsetLeft ?? 0;
  const top = viewport?.offsetTop ?? 0;
  const width = viewport?.width ?? globalThis.innerWidth;
  const height = viewport?.height ?? globalThis.innerHeight;
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
  };
}

function showPermanentSelectionActions(): void {
  if (!pendingSelection?.target) {
    return;
  }
  updateSelectionActionCapabilities();
  const toolbar = requiredElement<HTMLElement>(".v3-reader-toolbar");
  const bounds = toolbar.getBoundingClientRect();
  selectionActions.classList.add("v3-selection-actions-permanent");
  selectionActions.dataset.v3Placement = "permanent";
  selectionActions.style.left = `${Math.max(8, bounds.left)}px`;
  selectionActions.style.top = `${bounds.bottom + 4}px`;
  selectionActions.hidden = false;
}

function positionSelectionActions(): void {
  selectionPlacementFrame = undefined;
  const selection = pendingSelection;
  if (!selectionActionsEnabled || !selection?.target || !selection.range) {
    selectionActions.hidden = true;
    return;
  }
  updateSelectionActionCapabilities();
  selectionActions.classList.remove("v3-selection-actions-permanent");
  selectionActions.classList.toggle(
    "v3-selection-actions-touch",
    selection.modality === "touch" || selection.modality === "pen",
  );
  selectionActions.style.left = "0px";
  selectionActions.style.top = "0px";
  selectionActions.style.visibility = "hidden";
  selectionActions.hidden = false;
  const size = {
    width: selectionActions.offsetWidth,
    height: selectionActions.offsetHeight,
  };
  const exclusions = [
    spine.getBoundingClientRect(),
    ...corners
     .filter((corner) => !corner.disabled)
     .map((corner) => corner.getBoundingClientRect()),
  ].map(domRect);
  const safeAreaBottom = Number.parseFloat(
    getComputedStyle(pageRoot ?? reader).getPropertyValue(
     "--v3-safe-area-bottom",
    ),
  );
  const placement = placePageTurnSelectionActions({
    selectionRects: Array.from(selection.range.getClientRects(), domRect),
    bounds: domRect(bookShell.getBoundingClientRect()),
    viewport: selectionViewportRect(),
    toolbarSize: size,
    exclusions,
    touch: selection.modality === "touch" || selection.modality === "pen",
    safeAreaBottom:
      12 + (Number.isFinite(safeAreaBottom) ? safeAreaBottom : 0),
  });
  selectionActions.style.visibility = "";
  if (placement.mode === "hidden") {
    selectionActions.hidden = true;
    selectionEntry.hidden = false;
    return;
  }
  selectionEntry.hidden = true;
  selectionActions.dataset.v3Placement = placement.mode;
  selectionActions.style.left = `${placement.left}px`;
  selectionActions.style.top = `${placement.top}px`;
}

function queueSelectionActionPlacement(): void {
  if (selectionPlacementFrame !== undefined) {
    cancelAnimationFrame(selectionPlacementFrame);
  }
  selectionPlacementFrame = requestAnimationFrame(positionSelectionActions);
}

function captureSelectionCandidate(selection: V3SelectionCandidate): void {
  const version = ++selectionCaptureVersion;
  const range = selection.input.range.cloneRange();
  const source = selectionElement(range.startContainer)?.closest<HTMLElement>(
    "[data-source-anchor]",
  );
  pendingSelection = {
    chapterId: selection.chapterId,
    anchor: selection.anchor,
    quote: selection.quote,
    range,
    ...(source ? { source } : {}),
    modality: lastSelectionModality,
  };
  renderSelectionControls();
  void capturePageTurnTextTarget(selection.input)
    .then((target) => {
     if (destroyed || version !== selectionCaptureVersion) {
       return;
     }
     pendingSelection = {
       chapterId: selection.chapterId,
       anchor: target.start.anchor,
       quote: target.quote.exact,
       target,
       range,
       ...(source ? { source } : {}),
       modality: lastSelectionModality,
     };
     renderControls();
     queueSelectionActionPlacement();
     if (lastSelectionModality === "keyboard" && selectionActionsEnabled) {
       selectionLive.textContent = "";
       requestAnimationFrame(() => {
         selectionLive.textContent =
           `Selection actions available. ${selectionShortcutText()}`;
       });
     }
     if (exploreDialog.open) {
       renderAnnotations();
     }
    })
    .catch((error: unknown) => {
     if (destroyed || version !== selectionCaptureVersion) {
       return;
     }
     dismissSelectionActions();
     shareStatus.value =
       error instanceof Error
         ? `Selection unavailable: ${error.message}`
         : "Selection unavailable";
     renderControls();
     if (exploreDialog.open) {
       renderAnnotations();
     }
    });
}

function onSelectionChange(): void {
  if (
    (selectionFocusActive &&
      (selectionActions.contains(document.activeElement) ||
        activeMarginEditor?.contains(document.activeElement))) ||
    ((exploreDialog.open || shareDialog.open) &&
      pendingSelection?.target !== undefined)
  ) {
    return;
  }
  const selection = currentTextSelection();
  if (!selection) {
    dismissSelectionActions();
    if (exploreDialog.open) {
     renderAnnotations();
    }
    return;
  }
  if (selectionTimer !== undefined) {
    clearTimeout(selectionTimer);
  }
  const delay =
    lastSelectionModality === "touch" || lastSelectionModality === "pen"
     ? 220
     : 0;
  if (delay === 0) {
    captureSelectionCandidate(selection);
    return;
  }
  selectionTimer = globalThis.setTimeout(() => {
    selectionTimer = undefined;
    const stableSelection = currentTextSelection();
    if (stableSelection) {
     captureSelectionCandidate(stableSelection);
    } else {
     dismissSelectionActions();
    }
  }, delay);
}

async function runPersonalAction(
  pendingMessage: string,
  successMessage: string,
  action: () => Promise<void>,
): Promise<void> {
  if (personalBusy) {
    return;
  }
  personalBusy = true;
  personalStatus.value = pendingMessage;
  renderPersonalTools();
  try {
    await action();
    if (personalStatus.value === pendingMessage) {
      personalStatus.value = successMessage;
    }
  } catch (error) {
    personalStatus.value =
      error instanceof Error ? error.message : "Local storage failed.";
  } finally {
    personalBusy = false;
    renderPersonalTools();
  }
}

function currentSelectionAction(): V3ValidatedSelection | undefined {
  const selection = pendingSelection;
  const target = selection?.target;
  if (!manifest || !selection || !target) {
    return undefined;
  }
  const ranges = pageTurnTextTargetRanges(
    target,
    textSourceBlocks(target.chapterId),
    stationary,
  );
  if (
    ranges.length === 0 ||
    normalizePageTurnText(ranges.map((range) => range.toString()).join(" ")) !==
      target.quote.exact
  ) {
    selectionStatus.value = "The selection changed. Select the text again.";
    selectionFeedback.hidden = false;
    dismissSelectionActions();
    return undefined;
  }
  return {
    selection: selection as V3Selection &
      Readonly<{ target: PageTurnTextTargetV1 }>,
    detail: {
      text: target.quote.exact,
      target,
      location: {
        bookId: manifest.bookId,
        editionId: manifest.editionId,
        chapterId: target.chapterId,
        anchor: target.start.anchor,
      },
    },
  };
}

function dispatchAnnotationSelectionAction(
  detail: PageTurnSelectionActionDetail,
): void {
  reader.dispatchEvent(
    new CustomEvent<PageTurnSelectionActionDetail>(
      "pageturn:annotate-selection",
      { bubbles: true, detail },
    ),
  );
}

function dispatchShareSelectionAction(
  selected: V3Selection,
  permitted: V3PermittedShareSelection | undefined,
): void {
  const location = selectedShareLocation(selected);
  if (!location) {
    return;
  }
  const detail: PageTurnShareSelectionActionDetail = permitted
    ? {
        kind: "quote",
        text: permitted.quote,
        target: permitted.target,
        location: {
          ...location,
          chapterId: permitted.target.chapterId,
          anchor: permitted.target.start.anchor,
        },
      }
    : { kind: "location", location };
  reader.dispatchEvent(
    new CustomEvent<PageTurnShareSelectionActionDetail>(
      "pageturn:share-selection",
      { bubbles: true, detail },
    ),
  );
}

function showSelectionFeedback(message: string, timeout = 4_000): void {
  if (selectionFeedbackTimer !== undefined) {
    clearTimeout(selectionFeedbackTimer);
    selectionFeedbackTimer = undefined;
  }
  selectionStatus.value = message;
  selectionFeedback.hidden = false;
  if (timeout > 0) {
    selectionFeedbackTimer = globalThis.setTimeout(() => {
      selectionFeedbackTimer = undefined;
      if (selectionUndo.hidden) {
        selectionFeedback.hidden = true;
      }
    }, timeout);
  }
}

async function copySelectedText(): Promise<void> {
  const current = currentSelectionAction();
  if (!current) {
    return;
  }
  if (!navigator.clipboard?.writeText) {
    showSelectionFeedback(
      "Automatic copy is unavailable. Use the browser's Copy command.",
      0,
    );
    return;
  }
  try {
    await navigator.clipboard.writeText(current.detail.text);
    showSelectionFeedback("Selected text copied.");
    dismissSelectionActions(true, selectionFocusActive);
  } catch {
    showSelectionFeedback(
      "Automatic copy was not permitted. Use the browser's Copy command.",
      0,
    );
  }
}

async function highlightSelectedText(): Promise<void> {
  const current = currentSelectionAction();
  if (!current || !manifest || !personalStore || personalBusy) {
    return;
  }
  const timestamp = new Date().toISOString();
  const annotation: PageTurnAnnotationV2 = {
    annotationId: crypto.randomUUID(),
    schemaVersion: 2,
    bookId: manifest.bookId,
    editionId: manifest.editionId,
    motivation: "highlighting",
    target: { state: "resolved", selector: current.detail.target },
    body: { format: "text/markdown", value: "" },
    style: { color: "yellow", treatment: "highlight" },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const store = personalStore;
  personalBusy = true;
  updateSelectionActionCapabilities();
  try {
    await store.putAnnotation(annotation);
    if (destroyed || personalStore !== store) {
      return;
    }
    annotations.push(annotation);
    selectionUndoAnnotation = annotation;
    if (selectionUndoTimer !== undefined) {
      clearTimeout(selectionUndoTimer);
    }
    selectionUndo.hidden = false;
    showSelectionFeedback("Highlight saved in this browser.", 0);
    selectionUndoTimer = globalThis.setTimeout(() => {
      selectionUndoTimer = undefined;
      selectionUndoAnnotation = undefined;
      selectionUndo.hidden = true;
      selectionFeedback.hidden = true;
    }, 8_000);
    renderPersonalTextHighlights();
    renderPersonalTools();
    dismissSelectionActions(true, selectionFocusActive);
  } catch (error) {
    showSelectionFeedback(
      error instanceof Error ? error.message : "Highlight could not be saved.",
      0,
    );
  } finally {
    personalBusy = false;
    if (!destroyed) {
      updateSelectionActionCapabilities();
    }
  }
}

async function undoSelectionHighlight(): Promise<void> {
  const annotation = selectionUndoAnnotation;
  if (!annotation || !personalStore || personalBusy) {
    return;
  }
  const store = personalStore;
  personalBusy = true;
  selectionUndo.disabled = true;
  try {
    await store.deleteAnnotation(
      annotation.bookId,
      annotation.editionId,
      annotation.annotationId,
    );
    if (destroyed || personalStore !== store) {
      return;
    }
    annotations = annotations.filter(
      ({ annotationId }) => annotationId !== annotation.annotationId,
    );
    renderPersonalTextHighlights();
    renderPersonalTools();
    selectionUndoAnnotation = undefined;
    selectionUndo.hidden = true;
    showSelectionFeedback("Highlight removed.");
  } catch (error) {
    showSelectionFeedback(
      error instanceof Error ? error.message : "Highlight could not be removed.",
      0,
    );
  } finally {
    personalBusy = false;
    if (!destroyed) {
      selectionUndo.disabled = false;
    }
  }
}

async function shareSelectedText(): Promise<void> {
  const current = currentSelectionAction();
  if (
    !current ||
    !canCreateDurableLinks ||
    !shareCapabilities.location
  ) {
    return;
  }
  await shareValidatedSelection(current);
}

function annotateSelectedText(): void {
  const current = currentSelectionAction();
  if (!current || !personalStore) {
    return;
  }
  dispatchAnnotationSelectionAction(current.detail);
  selectionActions.hidden = true;
  selectionEntry.hidden = true;
  rememberAnnotationFocus(current.selection.source);
  openMarginEditor(current.selection);
}

function activateSelectionAction(action: string | undefined): void {
  if (action === "copy") {
    void copySelectedText();
  } else if (action === "share") {
    void shareSelectedText();
  } else if (action === "highlight") {
    void highlightSelectedText();
  } else if (action === "annotate") {
    annotateSelectedText();
  }
}

async function toggleCurrentBookmark(): Promise<void> {
  if (!manifest || !personalStore) {
    return;
  }
  const location = currentReadingLocation();
  if (!location) {
    return;
  }
  const index = bookmarks.findIndex(
    ({ location: saved }) =>
      saved.chapterId === location.chapterId &&
      saved.anchor === location.anchor,
  );
  await runPersonalAction(
    index >= 0 ? "Removing bookmark..." : "Saving bookmark...",
    index >= 0 ? "Bookmark removed." : "Bookmark saved in this browser.",
    async () => {
      if (!manifest || !personalStore) {
        return;
      }
      if (index >= 0) {
        const bookmark = bookmarks[index];
        if (!bookmark) {
          return;
        }
        await personalStore.deleteBookmark(
          manifest.bookId,
          manifest.editionId,
          bookmark.bookmarkId,
        );
        bookmarks.splice(index, 1);
      } else {
        const chapter = manifest.chapters.find(
          ({ chapterId }) => String(chapterId) === location.chapterId,
        );
        const timestamp = new Date().toISOString();
        const bookmark: PageTurnBookmarkV1 = {
          bookmarkId: crypto.randomUUID(),
          schemaVersion: 1,
          bookId: manifest.bookId,
          editionId: manifest.editionId,
          location: {
            chapterId: location.chapterId,
            anchor: location.anchor,
          },
          label:
            chapter?.title ?? activePage()?.runningTitle ?? "Saved passage",
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        await personalStore.putBookmark(bookmark);
        bookmarks.push(bookmark);
      }
    },
  );
}

async function saveCurrentAnnotation(
  noteValue = annotationNote.value,
  fromMargin = false,
): Promise<void> {
  if (!manifest || !pendingSelection?.target || !personalStore) {
    return;
  }
  const selection = pendingSelection;
  const selectionTarget = selection.target;
  if (!selectionTarget) {
    return;
  }
  const marginNote = fromMargin
    ? activeMarginEditor?.querySelector<HTMLTextAreaElement>("textarea")
    : undefined;
  marginNote?.setCustomValidity("");
  const note = noteValue.trim();
  if (note === "") {
    if (fromMargin) {
      marginNote?.setCustomValidity("Enter a note before saving.");
      activeMarginEditor?.reportValidity();
    } else {
      personalStatus.value = "Enter a note before saving.";
    }
    return;
  }
  const timestamp = new Date().toISOString();
  const annotation: PageTurnAnnotationV2 = {
    annotationId: crypto.randomUUID(),
    schemaVersion: 2,
    bookId: manifest.bookId,
    editionId: manifest.editionId,
    motivation: "commenting",
    target: { state: "resolved", selector: selectionTarget },
    body: { format: "text/markdown", value: note },
    style: { color: "yellow", treatment: "highlight" },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await runPersonalAction(
    "Saving annotation...",
    "Annotation saved in this browser.",
    async () => {
      if (!personalStore) {
        return;
      }
      await personalStore.putAnnotation(annotation);
      annotations.push(annotation);
      annotationNote.value = "";
      activeMarginEditor?.remove();
      activeMarginEditor = undefined;
      selectionCaptureVersion += 1;
      pendingSelection = undefined;
      document.getSelection()?.removeAllRanges();
      renderMarginalia();
      renderPersonalTextHighlights();
      if (selectionReturnTarget?.isConnected && selectionFocusActive) {
        selectionReturnTarget.focus({ preventScroll: true });
      }
      clearSelectionReturnTarget();
      renderControls();
    },
  );
}

function downloadPersonalFile(
  contents: string,
  type: string,
  filename: string,
): void {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const download = createElement("a");
  download.href = url;
  download.download = filename;
  download.click();
  globalThis.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function exportPrivateAnnotations(): void {
  if (!manifest || annotations.length === 0 || !canCreateDurableLinks) {
    return;
  }
  const markdown = annotationMarkdown(
    manifest.title,
    annotations,
    ({ chapterId, anchor }) => personalLocationUrl(chapterId, anchor),
  );
  downloadPersonalFile(
    markdown,
    "text/markdown;charset=utf-8",
    `${manifest.bookId}-annotations.md`,
  );
}

function backupPrivateAnnotations(): void {
  if (!manifest || annotations.length === 0) {
    personalStatus.value = "There are no annotations to back up.";
    return;
  }
  try {
    const backup = createPageTurnAnnotationBackup(
      {
        bookId: manifest.bookId,
        editionId: manifest.editionId,
        title: manifest.title,
      },
      annotations,
    );
    downloadPersonalFile(
      JSON.stringify(backup),
      PAGE_TURN_ANNOTATION_BACKUP_MEDIA_TYPE,
      `${manifest.bookId}-${manifest.editionId}-annotations-v2.json`,
    );
    personalStatus.value = "Version 2 annotation backup downloaded.";
  } catch (error) {
    personalStatus.value =
      error instanceof Error ? error.message : "Annotation backup failed.";
  }
}

async function previewAnnotationFile(file: File): Promise<void> {
  if (!manifest || !personalStore) {
    return;
  }
  pendingAnnotationImport = undefined;
  importPreview.hidden = true;
  if (file.size > 20 * 1024 * 1024) {
    personalStatus.value = "Annotation backup exceeds the 20 MiB import limit.";
    return;
  }
  await runPersonalAction(
    "Validating annotation backup...",
    "Annotation backup is valid. Review the counts before importing.",
    async () => {
      if (!manifest) {
        return;
      }
      const backup = await parsePageTurnAnnotationBackup(await file.text(), {
        bookId: manifest.bookId,
        editionId: manifest.editionId,
      });
      const preview = previewPageTurnAnnotationImport(
        backup.annotations,
        annotations,
      );
      pendingAnnotationImport = backup;
      importCounts.textContent =
        `${preview.newRecords} new, ${preview.identicalDuplicates} identical ` +
        `duplicate${preview.identicalDuplicates === 1 ? "" : "s"}, ` +
        `${preview.idConflicts} ID conflict${preview.idConflicts === 1 ? "" : "s"}, ` +
        `${preview.unresolvedRecords} unresolved.`;
      importConflicts.checked = false;
      confirmReplace.checked = false;
      importPreview.hidden = false;
    },
  );
}

async function applyAnnotationImport(mode: "merge" | "replace"): Promise<void> {
  if (!personalStore || !pendingAnnotationImport || !manifest) {
    return;
  }
  if (mode === "replace" && !confirmReplace.checked) {
    personalStatus.value = "Confirm replacement before continuing.";
    return;
  }
  await runPersonalAction(
    mode === "replace" ? "Replacing annotations..." : "Merging annotations...",
    "Annotation import completed.",
    async () => {
      if (!personalStore || !pendingAnnotationImport || !manifest) {
        return;
      }
      const result = await personalStore.importAnnotations(
        pendingAnnotationImport,
        {
          mode,
          conflicts: importConflicts.checked
            ? "import-as-copy"
            : "keep-existing",
        },
      );
      annotations = (
        await personalStore.readEdition(manifest.bookId, manifest.editionId)
      ).annotations;
      pendingAnnotationImport = undefined;
      importPreview.hidden = true;
      importAnnotations.value = "";
      personalStatus.value =
        `Imported ${result.imported}; skipped ${result.identicalDuplicates} ` +
        `identical duplicate${result.identicalDuplicates === 1 ? "" : "s"}.`;
      renderStationary("none");
    },
  );
}

function clearPersonalTextHighlights(): void {
  personalHighlightOwners.delete(highlightOwner);
  syncOwnedHighlights("v3-personal-annotations", personalHighlightOwners);
}

function renderPersonalTextHighlights(): void {
  clearPersonalTextHighlights();
  const ranges = annotations.flatMap(({ target }) =>
    target.state === "resolved"
      ? pageTurnTextTargetRanges(
          target.selector,
          textSourceBlocks(target.selector.chapterId),
          stationary,
        )
      : [],
  );
  if (ranges.length === 0) {
    return;
  }
  personalHighlightOwners.set(highlightOwner, ranges);
  if (!syncOwnedHighlights("v3-personal-annotations", personalHighlightOwners)) {
    personalHighlightOwners.delete(highlightOwner);
  }
}

function openExploreDialog(preserveSelection = false): void {
  exploreSelectionActive = preserveSelection;
  if (preserveSelection) {
    hideSelectionActionSurface();
  } else {
    dismissSelectionActions();
    document.getSelection()?.removeAllRanges();
  }
  renderPersonalTools();
  exploreDialog.showModal();
}

function onExploreDialogClose(): void {
  searchController?.abort();
  searchController = undefined;
  if (exploreSelectionActive) {
    dismissSelectionActions(true, selectionFocusActive);
  }
  exploreSelectionActive = false;
}

function onExploreDialogClick(event: MouseEvent): void {
  if (!(event.target instanceof Element)) {
    return;
  }
  const location = event.target.closest<HTMLElement>(
    "[data-v3-go-chapter]",
  );
  const chapterId = location?.dataset.v3GoChapter;
  const anchor = location?.dataset.v3GoAnchor;
  if (location && chapterId && anchor) {
    exploreDialog.close();
    void goToLocation(chapterId, anchor, "push").catch((error: unknown) => {
      reportFailure("V3 could not open the selected book location", error);
    });
    return;
  }
  const bookmarkRemoval = event.target.closest<HTMLElement>(
    "[data-v3-remove-bookmark]",
  )?.dataset.v3RemoveBookmark;
  if (bookmarkRemoval !== undefined && manifest && personalStore) {
    const bookmark = bookmarks.find(
      ({ bookmarkId }) => bookmarkId === bookmarkRemoval,
    );
    if (!bookmark) {
      personalStatus.value = "The selected bookmark is unavailable.";
      return;
    }
    void runPersonalAction(
      "Removing bookmark...",
      "Bookmark removed.",
      async () => {
        if (!manifest || !personalStore) {
          return;
        }
        await personalStore.deleteBookmark(
          manifest.bookId,
          manifest.editionId,
          bookmark.bookmarkId,
        );
        bookmarks = bookmarks.filter(
          ({ bookmarkId }) => bookmarkId !== bookmark.bookmarkId,
        );
      },
    );
    return;
  }
  const annotationRemoval = event.target.closest<HTMLElement>(
    "[data-v3-remove-annotation]",
  )?.dataset.v3RemoveAnnotation;
  if (annotationRemoval && manifest && personalStore) {
    void runPersonalAction(
      "Deleting annotation...",
      "Annotation deleted.",
      async () => {
        await deleteAnnotationById(annotationRemoval);
      },
    );
    return;
  }
  const annotationEdit = event.target.closest<HTMLElement>(
    "[data-v3-edit-annotation]",
  )?.dataset.v3EditAnnotation;
  if (annotationEdit) {
    const trigger = event.target.closest<HTMLElement>("[data-v3-edit-annotation]");
    exploreDialog.close();
    openAnnotationDetail(annotationEdit, trigger ?? undefined);
  }
}

async function deletePersonalData(allEditions: boolean): Promise<void> {
  if (!manifest || !personalStore) {
    return;
  }
  const scope = allEditions
    ? "all bookmark and annotation data for every edition of this publication"
    : "all bookmark and annotation data for this edition";
  if (!globalThis.confirm(`Delete ${scope}? This cannot be undone.`)) {
    personalStatus.value = "Deletion cancelled.";
    return;
  }
  await runPersonalAction(
    "Deleting local research data...",
    allEditions
      ? "All publication bookmark and annotation data was deleted."
      : "This edition's bookmark and annotation data was deleted.",
    async () => {
      if (!manifest || !personalStore) {
        return;
      }
      await personalStore.deleteResearchData(
        manifest.bookId,
        allEditions ? undefined : manifest.editionId,
      );
      bookmarks = [];
      annotations = [];
      renderStationary("none");
    },
  );
}

function startFromBeginning(): void {
  clearResumeLocation();
  resumedFromStorage = false;
  resumeNotice.hidden = true;
  void goToLocation("", undefined, "push").catch((error: unknown) => {
    reportFailure("V3 could not restart the publication", error);
  });
}

function pageSize(): { width: number; height: number } {
  const bounds = spread.getBoundingClientRect();
  if (bounds.width <= 0 || bounds.height <= 0) {
    throw new Error("V3 book has no measurable page area");
  }
  return {
    width: singlePageMedia.matches ? bounds.width : bounds.width / 2,
    height: bounds.height,
  };
}

function waitForPageLayout(timeoutMs = 10_000): Promise<void> {
  if (lifecycle.signal.aborted) {
    return Promise.reject(new DOMException("Aborted", "AbortError"));
  }
  if (spread.clientWidth > 0 && spread.clientHeight > 0) {
    return Promise.resolve();
  }
  return new Promise((resolveLayout, rejectLayout) => {
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      observer.disconnect();
      lifecycle.signal.removeEventListener("abort", abort);
      if (error) {
        rejectLayout(error);
      } else {
        resolveLayout();
      }
    };
    const abort = () => {
      finish(new DOMException("Aborted", "AbortError"));
    };
    const observer = new ResizeObserver(() => {
      if (spread.clientWidth > 0 && spread.clientHeight > 0) {
        finish();
      }
    });
    const timeout = globalThis.setTimeout(() => {
      finish(
        new Error("V3 book did not receive a measurable layout"),
      );
    }, timeoutMs);
    lifecycle.signal.addEventListener("abort", abort, { once: true });
    observer.observe(spread);
  });
}

function pageStep(): 1 | 2 {
  return singlePageMedia.matches ? 1 : 2;
}

function pageAt(index: number): PrototypePage {
  const page = pages[index];
  if (!page) {
    throw new Error(`V3 semantic page ${index} is unavailable`);
  }
  return page;
}

function canTurn(direction: PageTurnDirection): boolean {
  const step = pageStep();
  return direction === "forward"
    ? spreadStart + step < pages.length
    : spreadStart >= step;
}

function targetSpread(direction: PageTurnDirection): number {
  const step = pageStep();
  return direction === "forward"
    ? spreadStart + step
    : spreadStart - step;
}

function turnTargetReady(direction: PageTurnDirection): boolean {
  const target = targetSpread(direction);
  return pages
    .slice(target, target + pageStep())
    .every((page) => page?.kind !== "placeholder");
}

function activePage(): PrototypePage | undefined {
  const visiblePages = pages.slice(spreadStart, spreadStart + pageStep());
  const pinnedAnchor = preferredAnchor;
  const preferredPage = pinnedAnchor
    ? visiblePages.find(
        (page) =>
          page?.chapterId === pinnedAnchor.chapterId &&
          pageContainsAnchor(page, pinnedAnchor.anchor),
      )
    : undefined;
  const contentPages = visiblePages.filter(
    (page) => page?.kind === "content",
  );
  return (
    preferredPage ??
    contentPages.at(-1) ??
    visiblePages
      .filter((page) => page?.chapterIndex !== undefined)
      .at(-1) ??
    visiblePages[0]
  );
}

function activeChapterIndex(): number {
  return activePage()?.chapterIndex ?? 0;
}

function loadedChapterCount(): number {
  return chapterStates.filter(({ status }) => status === "ready").length;
}

function decodeLocationHash(hash = globalThis.location.hash): string | undefined {
  const [encoded = ""] = (hash.startsWith("#") ? hash.slice(1) : hash).split(
    ":~:",
    1,
  );
  if (encoded === "") {
    return undefined;
  }
  try {
    return decodeURIComponent(encoded);
  } catch {
    throw new Error("V3 location contains a malformed source anchor");
  }
}

function resumeStorageKey(bookId: string): string {
  return `ethical-tech-book-v3-location:${bookId}`;
}

function readResumeLocation(
  publication: PageTurnBookManifest,
): PageTurnBookLocation | undefined {
  try {
    const raw = globalThis.localStorage.getItem(
      resumeStorageKey(publication.bookId),
    );
    if (raw === null) {
      return undefined;
    }
    const parsed: unknown = JSON.parse(raw);
    const saved = record(parsed, "saved reading location");
    const location = {
      bookId: stringValue(saved.bookId, "saved location.bookId"),
      editionId: stringValue(saved.editionId, "saved location.editionId"),
      chapterId: stringValue(saved.chapterId, "saved location.chapterId"),
      anchor: stringValue(saved.anchor, "saved location.anchor"),
    };
    if (
      location.bookId !== publication.bookId ||
      location.editionId !== publication.editionId ||
      !publication.chapters.some(
        ({ chapterId }) => String(chapterId) === location.chapterId,
      )
    ) {
      return undefined;
    }
    return location;
  } catch (error) {
    console.warn("V3 reading location could not be restored", error);
    return undefined;
  }
}

function writeResumeLocation(location: PageTurnBookLocation): void {
  try {
    globalThis.localStorage.setItem(
      resumeStorageKey(location.bookId),
      JSON.stringify(location),
    );
  } catch (error) {
    console.warn("V3 reading location could not be saved", error);
  }
}

function clearResumeLocation(): void {
  if (!manifest) {
    return;
  }
  try {
    globalThis.localStorage.removeItem(resumeStorageKey(manifest.bookId));
  } catch (error) {
    console.warn("V3 reading location could not be cleared", error);
  }
}

function currentReadingLocation(): PageTurnBookLocation | undefined {
  const page = activePage();
  if (
    !manifest ||
    page?.kind !== "content" ||
    page.chapterIndex === undefined ||
    page.chapterId === undefined
  ) {
    return undefined;
  }
  return {
    bookId: manifest.bookId,
    editionId: manifest.editionId,
    chapterId: page.chapterId,
    anchor:
      preferredAnchor?.chapterId === page.chapterId &&
      pageContainsAnchor(page, preferredAnchor.anchor)
        ? preferredAnchor.anchor
        : page.anchor,
  };
}

function readingLocationUrl(
  location: PageTurnBookLocation | undefined,
  preserveContext: boolean,
  selection?: V3Selection,
  includeEdition = false,
): URL {
  if (!manifest) {
    throw new Error("V3 cannot create a location before loading a publication");
  }
  if (!managesUrl && location && options.locationUrl) {
    const url = new URL(
      options.locationUrl(location).toString(),
      globalThis.location.href,
    );
    if (includeEdition) {
      url.searchParams.set("edition", manifest.editionId);
    }
    return selection?.target
      ? pageTurnTextTargetUrl(url, selection.target)
      : url;
  }
  const url = new URL(globalThis.location.href);
  if (!preserveContext) {
    url.search = "";
  }
  url.searchParams.set("book", manifest.bookId);
  if (includeEdition) {
    url.searchParams.set("edition", manifest.editionId);
  } else if (!preserveContext) {
    url.searchParams.delete("edition");
  }
  url.searchParams.delete("selection");
  if (location) {
    url.searchParams.set("chapter", location.chapterId);
    url.hash = location.anchor;
  } else {
    url.searchParams.delete("chapter");
    url.hash = "";
  }
  return selection?.target
    ? pageTurnTextTargetUrl(url, selection.target)
    : url;
}

function syncCurrentLocation(update: LocationUpdate): void {
  if (
    update === "none" ||
    !locationTrackingReady ||
    applyingHistory ||
    !manifest
  ) {
    return;
  }
  const location = currentReadingLocation();
  const sharedSelection =
    sharedTextTarget &&
    location?.chapterId === sharedTextTarget.chapterId &&
    location.anchor === sharedTextTarget.start.anchor
      ? {
          chapterId: sharedTextTarget.chapterId,
          anchor: sharedTextTarget.start.anchor,
          quote: sharedTextTarget.quote.exact,
          target: sharedTextTarget,
        }
      : undefined;
  if (sharedTextTarget && !sharedSelection) {
    clearSharedTextTarget();
  }
  if (managesUrl) {
    const url = readingLocationUrl(location, true, sharedSelection);
    if (url.href !== globalThis.location.href) {
      if (update === "push") {
        globalThis.history.pushState({ v3Location: true }, "", url);
      } else {
        globalThis.history.replaceState({ v3Location: true }, "", url);
      }
    }
  }
  if (location) {
    writeResumeLocation(location);
  }
}

function renderFontControls(): void {
  const percent = Math.round(fontScale * 100);
  fontStatus.value = `${percent}%`;
  reader.dataset.v3FontSize = String(percent);
  increaseFont.disabled =
    opening || pendingTurn || activeTurn !== undefined || fontScale >= 1.3;
  decreaseFont.disabled =
    opening || pendingTurn || activeTurn !== undefined || fontScale <= 0.8;
}

function renderSelectionControls(): void {
  const selectionPending =
    pendingSelection !== undefined && pendingSelection.target === undefined;
  shareButton.textContent =
    selectionPending
      ? shareCapabilities.quote
        ? "Preparing selection"
        : "Preparing passage"
      : pendingSelection
        ? shareCapabilities.quote
          ? "Share selection"
          : "Share passage"
        : "Share";
  shareButton.setAttribute(
    "aria-label",
    selectionPending
      ? shareCapabilities.quote
        ? "Preparing selected text"
        : "Preparing passage location"
      : pendingSelection
        ? shareCapabilities.quote
          ? "Share selected text and location"
          : "Share passage location"
        : "Share location",
  );
  updateSelectionActionCapabilities();
}

function applyFontScale(value: number): void {
  fontScale = normalizeBookFontScale(value);
  reader.style.setProperty(
    "--v3-font-scale",
    String(fontScale * currentAppearance.typography.baseScale),
  );
  renderFontControls();
}

const typefaceOptions = {
  classic: {
    bodyFamily: 'Georgia, "Times New Roman", serif',
    headingFamily: 'Georgia, "Times New Roman", serif',
  },
  antique: {
    bodyFamily: 'Palatino Linotype, Book Antiqua, Georgia, serif',
    headingFamily: 'Palatino Linotype, Book Antiqua, Georgia, serif',
  },
  modern: {
    bodyFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    headingFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
  },
  technical: {
    bodyFamily: 'IBM Plex Mono, Consolas, "Courier New", monospace',
    headingFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
  },
  handwritten: {
    bodyFamily: '"Segoe Print", "Bradley Hand", cursive',
    headingFamily: '"Segoe Print", "Bradley Hand", cursive',
  },
} as const;

type TypefaceId = keyof typeof typefaceOptions;

function currentTypeface(): TypefaceId {
  const entry = Object.entries(typefaceOptions).find(
    ([, fonts]) =>
      fonts.bodyFamily === currentAppearance.typography.bodyFamily &&
      fonts.headingFamily === currentAppearance.typography.headingFamily,
  );
  return (entry?.[0] as TypefaceId | undefined) ?? "classic";
}

function selectedPaperPattern(value: string): PageTurnPaperPattern {
  return value === "lined" || value === "grid" ? value : "plain";
}

function selectedPageEdgeStyle(
  value: string,
): PageTurnPageFanAppearance["edgeStyle"] {
  return value === "gold" || value === "red" || value === "marbled"
    ? value
    : "plain";
}

function fanForStyle(
  edgeStyle: PageTurnPageFanAppearance["edgeStyle"],
): Partial<PageTurnPageFanAppearance> {
  if (edgeStyle === "gold") {
    return {
      edgeStyle,
      stripeDark: "#8d6427",
      stripeLight: "#e0bd67",
      stripeMid: "#b98a35",
    };
  }
  if (edgeStyle === "red") {
    return {
      edgeStyle,
      stripeDark: "#71332f",
      stripeLight: "#d6b4a6",
      stripeMid: "#a9574e",
    };
  }
  if (edgeStyle === "marbled") {
    return {
      edgeStyle,
      stripeDark: "#6f4729",
      stripeLight: "#d3ad65",
      stripeMid: "#98683d",
    };
  }
  return {
    edgeStyle,
    stripeDark: "#b9ab91",
    stripeLight: "#f2eadc",
    stripeMid: "#d8cbb6",
  };
}

function selectedBindingMaterial(
  value: string,
): PageTurnBindingAppearance["material"] {
  return value === "cloth" || value === "paper" ? value : "leather";
}

function selectedBindingDepth(
  value: string,
): PageTurnBindingAppearance["depth"] {
  return value === "slim" || value === "thick" ? value : "standard";
}

function selectedSpineStyle(
  value: string,
): Required<PageTurnBindingAppearance>["spineStyle"] {
  return value === "flat" || value === "exposed-stitch"
    ? value
    : "raised-hubs";
}

function selectedTypeface(value: string): TypefaceId {
  return value in typefaceOptions ? (value as TypefaceId) : "classic";
}

function presetLabel(presetId: PageTurnAppearancePresetId): string {
  return (
    PAGE_TURN_APPEARANCE_PRESETS.find(({ id }) => id === presetId)?.label ??
    "Custom"
  );
}

function presetDescription(presetId: PageTurnAppearancePresetId): string {
  return (
    PAGE_TURN_APPEARANCE_PRESETS.find(({ id }) => id === presetId)
      ?.description ?? "Custom appearance combination"
  );
}

function renderAppearanceControls(): void {
  if (appearancePreset.options.length === 0) {
    appearancePreset.append(
      ...PAGE_TURN_APPEARANCE_PRESETS.map(
        ({ id, label }) => new Option(label, id),
      ),
      new Option("Custom", "custom"),
    );
  }
  appearancePreset.value = currentAppearance.preset;
  paperColor.value = currentAppearance.paper.color;
  inkColor.value = currentAppearance.paper.inkColor;
  paperHighlight.value = currentAppearance.paper.highlight;
  pageEdgeColor.value = currentAppearance.paper.edgeColor;
  pageEdgeStyle.value = currentAppearance.fan.edgeStyle;
  pagePattern.value = currentAppearance.paper.pattern;
  ruleColor.value = currentAppearance.paper.ruleColor;
  ruleSpacing.value = String(currentAppearance.paper.ruleSpacingRem);
  paperAge.value = String(currentAppearance.paper.age);
  paperTexture.value = String(currentAppearance.paper.texture);
  typeface.value = currentTypeface();
  appearanceLineHeight.value = String(
    currentAppearance.typography.lineHeight,
  );
  baseTypeScale.value = String(currentAppearance.typography.baseScale);
  dropCap.checked = currentAppearance.typography.dropCap;
  gutterLift.value = String(currentAppearance.geometry.gutterLift);
  bottomLift.value = String(currentAppearance.geometry.bottomLift);
  foreEdgeLift.value = String(currentAppearance.geometry.foreEdgeLift);
  cornerRoundness.value = String(
    currentAppearance.geometry.cornerRoundness,
  );
  foldRadius.value = String(currentAppearance.geometry.foldRadius);
  foldShadow.value = String(currentAppearance.geometry.foldShadow);
  boardOverhang.value = String(currentAppearance.geometry.boardOverhang);
  bindingMaterial.value = currentAppearance.binding.material;
  bindingDepth.value = currentAppearance.binding.depth;
  spineStyle.value = currentAppearance.binding.spineStyle;
  appearancePageCount.value = String(currentAppearance.binding.pageCount);
  bindingHubs.value = String(currentAppearance.binding.hubs);
  coverColor.value = currentAppearance.cover.background;
  coverForeground.value = currentAppearance.cover.foreground;
  bindingColor.value = currentAppearance.binding.color;
  accentColor.value = currentAppearance.binding.accent;
  appearanceStatus.value =
    `${presetLabel(currentAppearance.preset)} — ` +
    presetDescription(currentAppearance.preset);
}

function scheduleAppearanceRepagination(): void {
  if (!manifest || pages.length === 0) {
    return;
  }
  dismissSelectionActions();
  if (appearanceTimer !== undefined) {
    clearTimeout(appearanceTimer);
  }
  appearanceTimer = globalThis.setTimeout(() => {
    appearanceTimer = undefined;
    if (destroyed) {
      return;
    }
    const preservation = currentPreservation();
    if (activeTurn) {
      finishTurn(false);
    }
    reader.setAttribute("aria-busy", "true");
    status.textContent = "Applying book appearance";
    void document.fonts.ready
      .then(() => {
        if (destroyed) {
          return;
        }
        rebuildPages(
          preservation.anchor,
          preservation.progress,
          preservation.chapterIndex,
          preservation.chapterPageOffset,
        );
        reportReadyIfHealthy();
      })
      .catch((error: unknown) => {
        reportFailure("V3 could not apply the book appearance", error);
      });
  }, 140);
}

function applyAppearance(
  appearance: PageTurnResolvedAppearance,
  repaginate: boolean,
): void {
  currentAppearance = appearance;
  applyPageTurnAppearance(reader, currentAppearance);
  applyFontScale(fontScale);
  renderAppearanceControls();
  if (repaginate) {
    scheduleAppearanceRepagination();
  }
}

function mergeAppearanceInputs(
  previous: PageTurnAppearanceInput | undefined,
  next: PageTurnAppearanceInput,
): PageTurnAppearanceInput {
  return {
    ...previous,
    ...next,
    cover: { ...previous?.cover, ...next.cover },
    binding: { ...previous?.binding, ...next.binding },
    paper: { ...previous?.paper, ...next.paper },
    fan: { ...previous?.fan, ...next.fan },
    typography: { ...previous?.typography, ...next.typography },
    geometry: { ...previous?.geometry, ...next.geometry },
  };
}

function requiresAppearanceRepagination(
  previous: PageTurnResolvedAppearance,
  next: PageTurnResolvedAppearance,
): boolean {
  return (
    previous.typography.bodyFamily !== next.typography.bodyFamily ||
    previous.typography.headingFamily !== next.typography.headingFamily ||
    previous.typography.lineHeight !== next.typography.lineHeight ||
    previous.typography.baseScale !== next.typography.baseScale ||
    previous.typography.dropCap !== next.typography.dropCap
  );
}

function setBookAppearance(
  appearance: PageTurnAppearanceInput | PageTurnAppearancePresetId,
): void {
  if (typeof appearance === "string") {
    requestedAppearancePreset = appearance;
    requestedAppearanceOverrides = undefined;
    const next = resolvePageTurnAppearance(baseAppearance, appearance);
    applyAppearance(
      next,
      requiresAppearanceRepagination(currentAppearance, next),
    );
    return;
  }
  if (appearance.preset && appearance.preset !== "custom") {
    requestedAppearancePreset = appearance.preset;
  }
  requestedAppearanceOverrides = mergeAppearanceInputs(
    requestedAppearanceOverrides,
    appearance,
  );
  const next = resolvePageTurnAppearance(
    baseAppearance,
    requestedAppearancePreset,
    { ...requestedAppearanceOverrides, preset: "custom" },
  );
  applyAppearance(
    next,
    requiresAppearanceRepagination(currentAppearance, next),
  );
}

function appearanceFromControls(): PageTurnAppearanceInput {
  const selectedFonts = typefaceOptions[selectedTypeface(typeface.value)];
  const depth = selectedBindingDepth(bindingDepth.value);
  return {
    preset: "custom",
    cover: {
      background: coverColor.value,
      foreground: coverForeground.value,
      accent: accentColor.value,
    },
    binding: {
      material: selectedBindingMaterial(bindingMaterial.value),
      color: bindingColor.value,
      accent: accentColor.value,
      depth,
      boardThickness: depth,
      spineStyle: selectedSpineStyle(spineStyle.value),
      pageCount: Number(appearancePageCount.value),
      hubs: Number(bindingHubs.value),
    },
    paper: {
      color: paperColor.value,
      highlight: paperHighlight.value,
      edgeColor: pageEdgeColor.value,
      inkColor: inkColor.value,
      pattern: selectedPaperPattern(pagePattern.value),
      ruleColor: ruleColor.value,
      ruleSpacingRem: Number(ruleSpacing.value),
      age: Number(paperAge.value),
      texture: Number(paperTexture.value),
    },
    fan: fanForStyle(selectedPageEdgeStyle(pageEdgeStyle.value)),
    typography: {
      ...selectedFonts,
      lineHeight: Number(appearanceLineHeight.value),
      baseScale: Number(baseTypeScale.value),
      dropCap: dropCap.checked,
    },
    geometry: {
      gutterLift: Number(gutterLift.value),
      bottomLift: Number(bottomLift.value),
      foreEdgeLift: Number(foreEdgeLift.value),
      cornerRoundness: Number(cornerRoundness.value),
      foldRadius: Number(foldRadius.value),
      foldShadow: Number(foldShadow.value),
      boardOverhang: Number(boardOverhang.value),
    },
  };
}

function openAppearanceDialog(): void {
  dismissSelectionActions();
  renderAppearanceControls();
  appearanceDialog.showModal();
}

function renderControls(): void {
  previous.disabled =
    opening ||
    pendingTurn ||
    !canTurn("backward") ||
    activeTurn !== undefined;
  next.disabled =
    opening ||
    pendingTurn ||
    !canTurn("forward") ||
    activeTurn !== undefined;
  for (const corner of corners) {
    const direction = corner.dataset.v3Direction;
    corner.disabled =
      opening ||
      pendingTurn ||
      activeTurn !== undefined ||
      (direction !== "forward" && direction !== "backward") ||
      !canTurn(direction) ||
      !turnTargetReady(direction);
  }
  shareButton.disabled =
    !canCreateDurableLinks ||
    !shareCapabilities.location ||
    opening ||
    pendingTurn ||
    activeTurn !== undefined ||
    sharing ||
    manifest === undefined ||
    (pendingSelection !== undefined && pendingSelection.target === undefined);
  renderFontControls();
  renderSelectionControls();
}

function renderStationary(locationUpdate: LocationUpdate = "replace"): void {
  closeSourceCard(false);
  if (shareDialog.open) {
    closeShareComposer(false);
  } else {
    cancelShareComposerWork();
  }
  dismissSelectionActions();
  const singlePage = singlePageMedia.matches;
  spread.classList.toggle("v3-spread-single", singlePage);
  stationary.replaceChildren(
    ...(singlePage
      ? [createSheet(pageAt(spreadStart), "right", spreadStart + 1, false)]
      : [
          createSheet(pageAt(spreadStart), "left", spreadStart + 1, false),
          createSheet(
            pageAt(spreadStart + 1),
            "right",
            spreadStart + 2,
            false,
          ),
        ]),
  );
  renderMarginalia();
  renderSharedTextHighlight();
  renderPersonalTextHighlights();
  const visiblePages = pages.slice(spreadStart, spreadStart + pageStep());
  const focusedPage =
    visiblePages.filter((page) => page?.kind === "content").at(-1) ??
    visiblePages.find((page) => page?.chapterIndex !== undefined);
  if (focusedPage?.chapterIndex !== undefined) {
    const chapterPages = numberedChapterPages(focusedPage.chapterIndex);
    const localIndices = visiblePages.flatMap((page) => {
      const localIndex = chapterPages.indexOf(page);
      return localIndex >= 0 ? [localIndex + 1] : [];
    });
    const pageLabel =
      localIndices.length > 1
        ? `pages ${localIndices[0]}–${localIndices.at(-1)}`
        : localIndices.length === 1
          ? `page ${localIndices[0]}`
          : focusedPage.kind === "blank"
            ? "blank verso"
            : "chapter loading";
    counter.value =
      `Chapter ${focusedPage.chapterIndex + 1}/${chapterStates.length}` +
      ` · ${pageLabel}` +
      (localIndices.length > 0
        ? `/${Math.max(1, chapterPages.length)}`
        : "") +
      (singlePage
        ? ` · Page ${spreadStart + 1} of ${pages.length}`
        : ` · Spread ${spreadStart / 2 + 1} of ${Math.ceil(pages.length / 2)}`);
  } else {
    counter.value = singlePage
      ? `Front matter · Page ${spreadStart + 1} of ${pages.length}`
      : `Front matter · Spread ${spreadStart / 2 + 1} of ${Math.ceil(pages.length / 2)}`;
  }
  reader.dataset.v3Turning = "false";
  if (pageRoot) {
    pageRoot.dataset.v3Turning = "false";
  }
  reader.dataset.v3PageIndex = String(spreadStart);
  reader.dataset.v3PageCount = String(pages.length);
  reader.dataset.v3AtEnd = String(!canTurn("forward"));
  if (manifest) {
    const visibleEnd = spreadStart + pageStep() - 1;
    const starts = manifest.chapters
      .map((chapter) => ({
        id: String(chapter.chapterId),
        pageIndex: pages.findIndex((page) =>
          pageContainsAnchor(page, chapter.firstAnchor),
        ),
      }))
      .filter(({ pageIndex }) => pageIndex >= 0);
    const current = starts
      .filter(({ pageIndex }) => pageIndex <= visibleEnd)
      .at(-1);
    chapterSelect.value = current?.id ?? "";
  }
  renderControls();
  syncCurrentLocation(locationUpdate);
  if (
    pendingSelection &&
    stationary.querySelector(
      `[data-source-anchor="${CSS.escape(pendingSelection.anchor)}"]`,
    ) === null
  ) {
    selectionCaptureVersion += 1;
    pendingSelection = undefined;
  }
  if (exploreDialog.open) {
    renderPersonalTools();
  }
  if (preferredAnchor) {
    const target = stationary.querySelector<HTMLElement>(
      `#${CSS.escape(preferredAnchor.anchor)}`,
    );
    if (target) {
      target.tabIndex = -1;
      target.focus({ preventScroll: true });
    }
  }
}

function setFontScale(value: number): void {
  if (!manifest) {
    return;
  }
  const nextScale = normalizeBookFontScale(value);
  if (nextScale === fontScale) {
    return;
  }
  dismissSelectionActions();
  const preservation = currentPreservation();
  if (activeTurn) {
    finishTurn(false);
  }
  reader.setAttribute("aria-busy", "true");
  status.textContent = "Repaginating the loaded chapter window";
  applyFontScale(nextScale);
  writeBookFontScale(manifest.bookId, fontScale);
  try {
    rebuildPages(
      preservation.anchor,
      preservation.progress,
      preservation.chapterIndex,
      preservation.chapterPageOffset,
    );
    reportReadyIfHealthy();
  } catch (error: unknown) {
    reportFailure("V3 could not resize the book text", error);
  }
}

function setMediaTreatment(value: string): void {
  if (!mediaConfig) {
    throw new Error("V3 publication has no configured image treatment");
  }
  if (value !== "off" && value !== "on" && value !== "popout") {
    throw new Error(`V3 image treatment is unavailable: ${value}`);
  }
  if (value === mediaTreatment) {
    return;
  }
  dismissSelectionActions();
  const preservation = currentPreservation();
  if (activeTurn) {
    finishTurn(false);
  }
  if (mediaDialog.open) {
    mediaDialog.close();
  }
  mediaTreatment = value;
  mediaSelect.value = value;
  reader.dataset.v3MediaMode = value;
  reader.dataset.v3MediaDisplay = normalizePageTurnBookMediaDisplay(value);
  if (managesUrl && !applyingHistory) {
    const url = new URL(globalThis.location.href);
    url.searchParams.set("media", value);
    url.searchParams.set(
      "mediaDisplay",
      normalizePageTurnBookMediaDisplay(value),
    );
    globalThis.history.replaceState({ v3Location: true }, "", url);
  }
  reader.setAttribute("aria-busy", "true");
  status.textContent = "Applying image treatment";
  try {
    rebuildPages(
      preservation.anchor,
      preservation.progress,
      preservation.chapterIndex,
      preservation.chapterPageOffset,
    );
    reportReadyIfHealthy();
  } catch (error: unknown) {
    reportFailure("V3 could not apply the image treatment", error);
  }
}

function setMediaStyle(value: string, explicitUserSelection = true): void {
  if (!mediaConfig) {
    throw new Error("V3 publication has no configured image style");
  }
  if (
    value !== "original" &&
    value !== "book-toned" &&
    value !== "monochrome" &&
    value !== "duotone"
  ) {
    throw new Error(`V3 image style is unavailable: ${value}`);
  }
  mediaStyle = value;
  mediaStyleUserSelected = explicitUserSelection;
  mediaStyleSelect.value = value;
  reader.dataset.v3MediaStyle = value;
  if (managesUrl && !applyingHistory) {
    const url = new URL(globalThis.location.href);
    url.searchParams.set("mediaStyle", value);
    globalThis.history.replaceState({ v3Location: true }, "", url);
  }
  const mediaNodes = new Set<HTMLElement>(
    root.querySelectorAll<HTMLElement>("[data-v3-media-id]"),
  );
  for (const chapterState of chapterStates) {
    for (const block of chapterState.blocks ?? []) {
      if (block.node.dataset.v3MediaId) {
        mediaNodes.add(block.node);
      }
    }
    for (const page of chapterState.pages ?? []) {
      for (const pageNode of page.nodes) {
        if (pageNode.dataset.v3MediaId) {
          mediaNodes.add(pageNode);
        }
      }
    }
  }
  for (const node of mediaNodes) {
    const id = node.dataset.v3MediaId;
    const figure = mediaConfig.figures.find((candidate) => candidate.id === id);
    if (figure) {
      applyMediaFigureStyle(node, figure);
    }
  }
  status.textContent = `Image style: ${value}`;
}

function openMediaFigure(id: string, trigger: HTMLElement): void {
  dismissSelectionActions();
  const figure = mediaConfig?.figures.find((candidate) => candidate.id === id);
  if (!figure) {
    throw new Error(`V3 publication figure is unavailable: ${id}`);
  }
  mediaReturnFocus = trigger;
  mediaDialogTitle.textContent = figure.caption;
  mediaDialogCaption.textContent = [
    figure.caption,
    figure.rights?.attribution
      ? `Attribution: ${figure.rights.attribution}.`
      : "Attribution not supplied.",
    figure.rights?.license
      ? `License: ${figure.rights.license}.`
      : "License not supplied.",
  ].join(" ");
  mediaDialogAttribution.textContent =
    figure.rights?.attribution ?? "Not supplied";
  mediaDialogLicense.textContent = figure.rights?.license ?? "Not supplied";
  mediaDialogSource.textContent = figure.source ?? "Not supplied";
  mediaDialogProvenance.textContent = [
    figure.provenance ?? "Not supplied",
    figure.exportPermitted === true
      ? "Export permission is recorded as policy metadata; this reader does not export source images."
      : "",
  ]
    .filter(Boolean)
    .join(" ");
  mediaDialogIntegrity.textContent = figure.integrity ?? "Not supplied";
  mediaDialogOriginal.href = safeMediaHref(figure.originalSrc ?? figure.src);
  mediaDialogImage.alt = figure.alt;
  mediaDialogImage.width = figure.width;
  mediaDialogImage.height = figure.height;
  mediaDialogImage.className = "v3-media-style-original";
  mediaDialogImage.dataset.v3MediaStyle = "original";
  mediaDialogImage.src = safeMediaHref(figure.src);
  mediaDialog.showModal();
}

function onMediaDialogClose(): void {
  mediaDialogImage.removeAttribute("src");
  mediaDialogOriginal.removeAttribute("href");
  mediaDialogImage.alt = "";
  if (mediaReturnFocus?.isConnected) {
    mediaReturnFocus.focus();
  }
  mediaReturnFocus = undefined;
}

async function permittedShareSelection(
  selected: V3Selection | undefined,
): Promise<V3PermittedShareSelection | undefined> {
  if (!selected?.target || !shareCapabilities.quote) {
    return undefined;
  }
  const maximum = resolvedSharePolicy.policy.quote.maximumCharacters;
  if (Array.from(selected.target.quote.exact).length <= maximum) {
    return selected as V3PermittedShareSelection;
  }
  const blocks = textSourceBlocks(selected.target.chapterId);
  const end = pageTurnShareTargetEnd(selected.target, blocks, maximum);
  if (!end) {
    return undefined;
  }
  const target = await createPageTurnTextTarget({
    bookId: selected.target.bookId,
    editionId: selected.target.editionId,
    chapterId: selected.target.chapterId,
    chapterContentHash: selected.target.chapterContentHash,
    blocks,
    start: selected.target.start,
    end,
  });
  return {
    ...selected,
    anchor: target.start.anchor,
    quote: target.quote.exact,
    target,
  };
}

function selectedShareLocation(
  selected: V3Selection | undefined,
): PageTurnBookLocation | undefined {
  const current = currentReadingLocation();
  return selected && manifest
    ? {
        bookId: manifest.bookId,
        editionId: manifest.editionId,
        chapterId: selected.chapterId,
        anchor: selected.anchor,
      }
    : current;
}

function shareChapterFor(
  location: PageTurnBookLocation | undefined,
): V3Chapter | undefined {
  return location
    ? manifest?.chapters.find(
        ({ chapterId }) => String(chapterId) === location.chapterId,
      )
    : undefined;
}

function shareCitationText(chapter: V3Chapter | undefined): string {
  if (!manifest) {
    return "PageTurn publication";
  }
  return [
    manifest.title,
    chapter?.title,
    `edition ${manifest.editionId}`,
  ]
    .filter(Boolean)
    .join(", ");
}

function revokeShareComposerUrl(): void {
  if (shareComposerObjectUrl) {
    URL.revokeObjectURL(shareComposerObjectUrl);
    shareComposerObjectUrl = undefined;
  }
  shareImage.removeAttribute("src");
}

function cancelShareComposerWork(): void {
  sharePreparationVersion += 1;
  shareComposerVersion += 1;
  shareOperationVersion += 1;
  shareComposerController?.abort();
  shareComposerController = undefined;
  revokeShareComposerUrl();
  shareComposerPayload = undefined;
  shareComposerImage = undefined;
  shareComposerFile = undefined;
  sharing = false;
}

function restoreShareComposerFocus(): void {
  const target = shareComposerReturnFocus;
  const hadTabindex = shareComposerReturnFocusHadTabindex;
  shareComposerReturnFocus = undefined;
  shareComposerReturnFocusHadTabindex = false;
  if (!target?.isConnected || destroyed) {
    return;
  }
  if (!hadTabindex) {
    target.tabIndex = -1;
    target.addEventListener(
      "blur",
      () => target.removeAttribute("tabindex"),
      { once: true },
    );
  }
  target.focus({ preventScroll: true });
}

let restoreFocusAfterShareClose = true;

function closeShareComposer(restoreFocus: boolean): void {
  restoreFocusAfterShareClose = restoreFocus;
  cancelShareComposerWork();
  if (!restoreFocus) {
    shareComposerReturnFocus = undefined;
    shareComposerReturnFocusHadTabindex = false;
  }
  if (shareDialog.open) {
    shareDialog.close();
  } else {
    if (restoreFocus) {
      restoreShareComposerFocus();
    }
  }
}

function resetShareComposerControls(): void {
  shareQuote.hidden = true;
  shareQuote.textContent = "";
  shareVisual.hidden = true;
  shareFinal.disabled = true;
  shareFinal.title =
    typeof navigator.share === "function"
      ? "Open system sharing"
      : "System sharing is unavailable in this browser or embedding policy";
  shareCopyText.disabled = true;
  shareCopyText.textContent = "Copy quote + link";
  shareCopyImage.hidden = true;
  shareCopyImage.disabled = true;
  shareDownload.hidden = true;
  shareDownload.disabled = true;
  shareOpenImage.hidden = true;
  shareOpenImage.disabled = true;
}

function downloadAllowedByHost(): boolean {
  const anchor = document.createElement("a");
  if (!("download" in anchor)) {
    return false;
  }
  try {
    const framed = globalThis.top !== globalThis.self;
    if (options.embedded === true || framed) {
      if (options.allowShareImageDownload !== true) {
        return false;
      }
      const frame = globalThis.frameElement;
      return (
        frame instanceof HTMLIFrameElement &&
        !(
          frame.hasAttribute("sandbox") &&
          !frame.sandbox.contains("allow-downloads")
        )
      );
    }
    return options.allowShareImageDownload !== false;
  } catch {
    return false;
  }
}

function openShareImage(): void {
  if (!shareComposerObjectUrl) {
    shareComposerStatus.value = "The generated image is unavailable.";
    return;
  }
  globalThis.open(shareComposerObjectUrl, "_blank", "noopener,noreferrer");
  shareComposerStatus.value =
    "The image was opened in a new tab. Use the browser save command or long-press the image to save it. If no tab opened, allow pop-ups and use the preview.";
}

async function copyShareText(): Promise<void> {
  const payload = shareComposerPayload;
  if (!payload) {
    return;
  }
  const version = ++shareOperationVersion;
  if (!navigator.clipboard?.writeText) {
    shareComposerStatus.value =
      "Clipboard text writing is unavailable. Select the preview text and copy it manually.";
    return;
  }
  try {
    await navigator.clipboard.writeText(payload.clipboardText);
    if (
      destroyed ||
      version !== shareOperationVersion ||
      !shareDialog.open
    ) {
      return;
    }
    shareComposerStatus.value = payload.quote
      ? "Quote and exact link copied."
      : "Public anchor link and citation copied.";
  } catch {
    if (
      destroyed ||
      version !== shareOperationVersion ||
      !shareDialog.open
    ) {
      return;
    }
    shareComposerStatus.value =
      "Clipboard access was not permitted. Select the preview text and copy it manually.";
  }
}

async function copyShareImage(): Promise<void> {
  const image = shareComposerImage;
  const ClipboardItemConstructor = globalThis.ClipboardItem;
  if (
    !image ||
    typeof ClipboardItemConstructor !== "function" ||
    typeof navigator.clipboard?.write !== "function"
  ) {
    shareComposerStatus.value =
      "PNG clipboard writing is unavailable. Download or open the image instead.";
    return;
  }
  const version = ++shareOperationVersion;
  try {
    await navigator.clipboard.write([
      new ClipboardItemConstructor({ "image/png": image }),
    ]);
    if (
      destroyed ||
      version !== shareOperationVersion ||
      !shareDialog.open
    ) {
      return;
    }
    shareComposerStatus.value = "Generated PNG copied.";
  } catch {
    if (
      destroyed ||
      version !== shareOperationVersion ||
      !shareDialog.open
    ) {
      return;
    }
    shareComposerStatus.value =
      "PNG clipboard access was not permitted. Download or open the image instead.";
  }
}

function downloadShareImage(): void {
  const payloadUrl = shareComposerObjectUrl;
  if (!payloadUrl) {
    shareComposerStatus.value = "The generated image is unavailable.";
    return;
  }
  if (!downloadAllowedByHost()) {
    openShareImage();
    return;
  }
  const anchor = document.createElement("a");
  anchor.href = payloadUrl;
  anchor.download = shareComposerFile?.name ?? "pageturn-quote.png";
  anchor.rel = "noopener";
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  shareComposerStatus.value = "Generated PNG download started.";
}

async function finalShare(): Promise<void> {
  const payload = shareComposerPayload;
  if (!payload || sharing || !shareDialog.open) {
    return;
  }
  const version = ++shareOperationVersion;
  sharing = true;
  shareFinal.disabled = true;
  shareComposerStatus.value = "Opening system sharing.";
  const textAndUrl: ShareData = {
    title: payload.title,
    text: payload.text,
    url: payload.url,
  };
  try {
    if (typeof navigator.share !== "function") {
      shareComposerStatus.value =
        "System sharing is unavailable. Use the copy, image, or download actions.";
      return;
    }
    const filePayload: ShareData | undefined = shareComposerFile
      ? { ...textAndUrl, files: [shareComposerFile] }
      : undefined;
    let includesFile = false;
    if (filePayload && typeof navigator.canShare === "function") {
      try {
        includesFile = navigator.canShare(filePayload);
      } catch {
        includesFile = false;
      }
    }
    await navigator.share(includesFile && filePayload ? filePayload : textAndUrl);
    if (
      destroyed ||
      version !== shareOperationVersion ||
      !shareDialog.open
    ) {
      return;
    }
    shareComposerStatus.value =
      shareComposerFile && !includesFile
        ? "Quote and link shared. This share target did not support the generated image."
        : payload.quote
          ? "Quote and link shared."
          : "Public anchor link shared.";
  } catch (error) {
    if (
      destroyed ||
      version !== shareOperationVersion ||
      !shareDialog.open
    ) {
      return;
    }
    shareComposerStatus.value =
      error instanceof DOMException && error.name === "AbortError"
        ? "Sharing cancelled."
        : error instanceof Error
          ? `Sharing failed: ${error.message}`
          : "Sharing failed.";
  } finally {
    if (
      !destroyed &&
      version === shareOperationVersion &&
      shareDialog.open
    ) {
      sharing = false;
      shareFinal.disabled = false;
    }
  }
}

async function openShareComposer(
  current: V3ValidatedSelection,
  allowedSelection: V3PermittedShareSelection | undefined,
): Promise<void> {
  if (
    !manifest ||
    !canCreateDurableLinks ||
    !shareCapabilities.location
  ) {
    return;
  }
  closeShareComposer(false);
  const controller = new AbortController();
  shareComposerController = controller;
  const version = ++shareComposerVersion;
  restoreFocusAfterShareClose = true;
  shareComposerReturnFocus = current.selection.source;
  shareComposerReturnFocusHadTabindex =
    current.selection.source?.hasAttribute("tabindex") ?? false;
  resetShareComposerControls();
  sharePolicyMessage.textContent = resolvedSharePolicy.message;
  shareBook.textContent = manifest.title;
  shareAuthors.textContent =
    manifest.authors.map(({ name }) => name).join(", ") || "Unknown";
  const location = selectedShareLocation(current.selection);
  const chapter = shareChapterFor(location);
  shareChapter.textContent = chapter?.title ?? "Current passage";
  shareEdition.textContent = manifest.editionId;
  shareCitation.textContent = shareCitationText(chapter);
  sharePreviewUrl.textContent = "Preparing public link";
  sharePreviewUrl.removeAttribute("href");
  shareDisclosure.textContent =
    "Preparing the policy-approved public payload. No private notes or stored highlights are read.";
  shareComposerStatus.value = "Preparing share preview.";
  hideSelectionActionSurface();
  shareDialog.showModal();

  try {
    if (
      destroyed ||
      controller.signal.aborted ||
      version !== shareComposerVersion ||
      !shareDialog.open
    ) {
      return;
    }
    const url = readingLocationUrl(
      location,
      false,
      allowedSelection,
      true,
    );
    const payload = createPageTurnSharePayload({
      title: manifest.title,
      authors: manifest.authors.map(({ name }) => name),
      chapterTitle: chapter?.title ?? "Current passage",
      editionId: manifest.editionId,
      sourceUrl: url.href,
      citation: shareCitationText(chapter),
      ...(allowedSelection ? { quote: allowedSelection.quote } : {}),
    });
    shareComposerPayload = payload;
    sharePreviewUrl.href = payload.url;
    sharePreviewUrl.textContent = payload.url;
    shareDisclosure.textContent = payload.disclosure;
    shareCopyText.disabled = false;
    if (allowedSelection) {
      shareQuote.hidden = false;
      shareQuote.textContent = allowedSelection.quote;
    } else {
      shareCopyText.textContent = "Copy link";
    }

    if (!allowedSelection || !shareCapabilities.visual) {
      shareFinal.disabled = typeof navigator.share !== "function";
      shareComposerStatus.value = allowedSelection
        ? "Quote-and-link preview ready. This publication does not permit visual export." +
          (shareFinal.disabled ? " System sharing is unavailable; use Copy." : "")
        : "Anchor-only preview ready. Selected text, exact selectors, Text Fragments, highlights, and images are excluded." +
          (shareFinal.disabled ? " System sharing is unavailable; use Copy." : "");
      return;
    }

    shareVisual.hidden = false;
    shareComposerStatus.value = "Generating a bounded local PNG preview.";
    const blocks = textSourceBlocks(allowedSelection.chapterId);
    const context = pageTurnShareContext(
      allowedSelection.target,
      blocks,
      resolvedSharePolicy.policy.visual.maximumContextCharacters,
    );
    const renderer = await import("./share-renderer.js");
    if (
      destroyed ||
      controller.signal.aborted ||
      version !== shareComposerVersion
    ) {
      return;
    }
    const rendered = await renderer.renderPageTurnShareImage(
      {
        quote: allowedSelection.quote,
        contextBefore: context.before,
        contextAfter: context.after,
        title: manifest.title,
        authors: manifest.authors.map(({ name }) => name),
        chapterTitle: chapter?.title ?? "Current passage",
        runningTitle: chapter?.title ?? manifest.title,
        editionId: manifest.editionId,
        source: payload.url,
        citation: shareCitationText(chapter),
        appearance: currentAppearance,
      },
      controller.signal,
    );
    if (
      destroyed ||
      controller.signal.aborted ||
      version !== shareComposerVersion ||
      !shareDialog.open
    ) {
      return;
    }
    shareComposerImage = rendered.blob;
    try {
      shareComposerFile = new File([rendered.blob], rendered.fileName, {
        type: "image/png",
        lastModified: 0,
      });
    } catch {
      shareComposerFile = undefined;
    }
    shareComposerObjectUrl = URL.createObjectURL(rendered.blob);
    shareImage.src = shareComposerObjectUrl;
    const canCopyImage =
      typeof globalThis.ClipboardItem === "function" &&
      typeof navigator.clipboard?.write === "function";
    shareCopyImage.hidden = false;
    shareCopyImage.disabled = !canCopyImage;
    shareCopyImage.title = canCopyImage
      ? "Copy the generated PNG"
      : "PNG clipboard writing is unavailable in this browser or embedding policy";
    const canDownload = downloadAllowedByHost();
    shareDownload.hidden = !canDownload;
    shareDownload.disabled = !canDownload;
    shareOpenImage.hidden = false;
    shareOpenImage.disabled = false;
    shareFinal.disabled = typeof navigator.share !== "function";
    const capabilityMessage =
      (canCopyImage ? "" : " PNG clipboard writing is unavailable.") +
      (canDownload
        ? ""
        : " Direct download is unavailable; use Open image in new tab.") +
      (shareFinal.disabled
        ? " System sharing is unavailable; use the independent copy or save actions."
        : "");
    shareComposerStatus.value = (shareComposerFile
      ? "Visual share preview ready. The PNG was generated locally."
      : "Visual preview ready, but this browser cannot create a shareable File. Text, copy, and image save actions remain available.") +
      capabilityMessage;
  } catch (error) {
    if (
      controller.signal.aborted ||
      version !== shareComposerVersion ||
      destroyed
    ) {
      return;
    }
    shareVisual.hidden = true;
    shareFinal.disabled = typeof navigator.share !== "function";
    shareComposerStatus.value =
      error instanceof Error
        ? `Visual preview failed: ${error.message}. Quote and link sharing remain available.`
        : "Visual preview failed. Quote and link sharing remain available.";
    if (shareFinal.disabled) {
      shareComposerStatus.value +=
        " System sharing is unavailable; use Copy.";
    }
  }
}

async function shareCurrentLocation(
  requestedSelection: V3Selection | undefined = pendingSelection,
  preparedSelection?: Readonly<{
    value: V3PermittedShareSelection | undefined;
  }>,
): Promise<void> {
  if (
    !manifest ||
    sharing ||
    !canCreateDurableLinks ||
    !shareCapabilities.location
  ) {
    return;
  }
  sharing = true;
  const version = ++shareOperationVersion;
  shareStatus.value = "Preparing reading link";
  renderControls();
  try {
    if (requestedSelection && !requestedSelection.target) {
      shareStatus.value = "Selected text is still being prepared";
      return;
    }
    const selectedText =
      preparedSelection === undefined
        ? await permittedShareSelection(requestedSelection)
        : preparedSelection.value;
    if (destroyed || version !== shareOperationVersion) {
      return;
    }
    const location = selectedShareLocation(requestedSelection);
    const chapter = shareChapterFor(location);
    const title = chapter
      ? `${manifest.title}: ${chapter.title}`
      : manifest.title;
    const url = readingLocationUrl(location, false, selectedText, true);
    shareStatus.value = await shareReadingLocation(
      title,
      url.href,
      selectedText?.quote,
    );
    if (destroyed || version !== shareOperationVersion) {
      return;
    }
    if (requestedSelection) {
      selectionCaptureVersion += 1;
      pendingSelection = undefined;
    }
  } catch (error) {
    if (!destroyed && version === shareOperationVersion) {
      shareStatus.value =
        error instanceof Error
          ? `Sharing failed: ${error.message}`
          : "Sharing failed";
    }
  } finally {
    if (!destroyed && version === shareOperationVersion) {
      sharing = false;
      renderControls();
    }
  }
}

async function shareValidatedSelection(
  current: V3ValidatedSelection,
): Promise<void> {
  const preparationVersion = ++sharePreparationVersion;
  const selectionVersion = selectionCaptureVersion;
  try {
    const allowedSelection = await permittedShareSelection(current.selection);
    if (
      destroyed ||
      preparationVersion !== sharePreparationVersion ||
      selectionVersion !== selectionCaptureVersion ||
      pendingSelection !== current.selection
    ) {
      return;
    }
    dispatchShareSelectionAction(current.selection, allowedSelection);
    if (shareComposerEnabled) {
      await openShareComposer(current, allowedSelection);
    } else {
      await shareCurrentLocation(current.selection, {
        value: allowedSelection,
      });
      dismissSelectionActions(true, selectionFocusActive);
    }
  } catch (error) {
    if (
      !destroyed &&
      preparationVersion === sharePreparationVersion &&
      selectionVersion === selectionCaptureVersion
    ) {
      showSelectionFeedback(
        error instanceof Error
          ? `Sharing failed: ${error.message}`
          : "Sharing failed",
        0,
      );
    }
  }
}

async function shareFromPrimaryControl(): Promise<void> {
  const current = pendingSelection?.target
    ? currentSelectionAction()
    : undefined;
  if (current) {
    await shareValidatedSelection(current);
    return;
  }
  await shareCurrentLocation(undefined);
}

function sourceLocalUrl(
  target: NonNullable<PageTurnSourceRecord["localReading"]>,
): URL | undefined {
  const location: PageTurnBookLocation = {
    bookId: target.bookId,
    editionId: target.editionId,
    chapterId: target.chapterId ?? "",
    anchor: target.anchor ?? "",
  };
  if (options.locationUrl) {
    const url = new URL(
      options.locationUrl(location).toString(),
      globalThis.location.href,
    );
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return undefined;
    }
    return url;
  }
  if (!managesUrl) {
    return undefined;
  }
  const url = new URL(globalThis.location.href);
  url.searchParams.set("book", target.bookId);
  url.searchParams.set("edition", target.editionId);
  url.searchParams.delete("selection");
  if (target.chapterId) {
    url.searchParams.set("chapter", target.chapterId);
  } else {
    url.searchParams.delete("chapter");
  }
  url.hash = target.anchor ?? "";
  return url;
}

function sourceContext(link: HTMLAnchorElement): PageTurnSourceContext {
  const location = currentReadingLocation();
  const block = link.closest<HTMLElement>(
    "[data-source-anchor], [data-v3-source-start], [id]",
  );
  const anchor =
    block?.dataset.sourceAnchor ??
    block?.id ??
    location?.anchor ??
    activePage()?.anchor ??
    "";
  return {
    bookId: manifest?.bookId ?? requestedBookId,
    editionId: manifest?.editionId ?? "",
    chapterId:
      link.closest<HTMLElement>("[data-v3-chapter]")?.dataset.v3Chapter ??
      location?.chapterId ??
      "",
    anchor,
    courseReadingIds: options.courseReadingIds ?? [],
  };
}

function authoredCitation(link: HTMLAnchorElement): string {
  const container = link.closest("p, li, blockquote, figcaption, td, th");
  return (
    container?.textContent?.replace(/\s+/g, " ").trim().slice(0, 2_000) ||
    link.textContent?.replace(/\s+/g, " ").trim() ||
    link.href
  );
}

function sourceFailure(error: unknown): string {
  const message =
    error instanceof Error ? error.message : "Unknown source resolver error";
  status.textContent = `V3 could not resolve the external source: ${message}`;
  sourceStatus.value = `Source resolution failed: ${message}. The authored link remains available.`;
  console.error(error);
  return sourceStatus.value;
}

function closeExternalPreview(restoreFocus = false): void {
  sourcePreviewHandle?.close(restoreFocus);
  sourcePreviewHandle = undefined;
}

function closeSourceCard(restoreFocus: boolean): void {
  closeExternalPreview();
  sourceResolutionVersion += 1;
  sourceController?.abort();
  sourceController = undefined;
  if (sourceDialog.open) {
    if (!restoreFocus) {
      sourceReturnFocus = undefined;
    }
    sourceDialog.close();
  } else if (restoreFocus && sourceReturnFocus?.isConnected) {
    sourceReturnFocus.focus({ preventScroll: true });
    sourceReturnFocus = undefined;
  }
}

function loadSourceCardModule(): Promise<typeof import("./source-card.js")> {
  sourceCardModulePromise ??= import("./source-card.js");
  return sourceCardModulePromise;
}

function loadSourcePreviewModule(): Promise<
  typeof import("./external-preview-runtime.js")
> {
  sourcePreviewModulePromise ??= import("./external-preview-runtime.js");
  return sourcePreviewModulePromise;
}

async function activateSourcePreview(
  button: HTMLButtonElement,
): Promise<void> {
  if (button.disabled) {
    return;
  }
  const providerId = button.dataset.v3SourcePreviewLoad;
  const previewUrl = button.dataset.v3SourcePreviewUrl;
  const version = sourceResolutionVersion;
  const previewSection = button.closest<HTMLElement>(
    "[data-v3-source-preview]",
  );
  const previewStatus =
    previewSection?.querySelector<HTMLOutputElement>(
      "[data-v3-source-preview-status]",
    );
  const previewHost = previewSection?.querySelector<HTMLElement>(
    "[data-v3-source-preview-host]",
  );
  const provider = previewUrl
    ? matchPageTurnExternalPreviewProvider(
        externalPreviewProviders,
        previewUrl,
      )
    : undefined;
  if (
    !providerId ||
    !previewUrl ||
    !provider ||
    provider.id !== providerId ||
    !previewStatus ||
    !previewHost
  ) {
    if (previewStatus) {
      previewStatus.value =
        "External preview is unavailable because its provider configuration did not match.";
    }
    return;
  }
  closeExternalPreview();
  button.disabled = true;
  previewStatus.value = "Preparing external preview…";
  try {
    const { mountPageTurnExternalPreview } = await loadSourcePreviewModule();
    if (
      destroyed ||
      version !== sourceResolutionVersion ||
      !sourceDialog.open ||
      !button.isConnected
    ) {
      return;
    }
    sourcePreviewHandle = mountPageTurnExternalPreview({
      window: globalThis.window,
      document,
      host: previewHost,
      status: previewStatus,
      loadButton: button,
      provider,
      url: previewUrl,
      parentOrigin: globalThis.location.origin,
      isCurrent: () =>
        !destroyed &&
        version === sourceResolutionVersion &&
        sourceDialog.open &&
        button.isConnected,
    });
  } catch (error) {
    if (
      !destroyed &&
      version === sourceResolutionVersion &&
      button.isConnected
    ) {
      const message =
        error instanceof Error ? error.message : "Unknown preview error";
      previewStatus.value = `External preview could not load: ${message}. Use the direct source link.`;
      button.hidden = false;
      button.disabled = false;
      button.textContent = "Retry external preview";
      console.error(error);
    }
  }
}

function showSourceCard(
  link: HTMLAnchorElement,
  input: PageTurnSourceCardInput,
  version: number,
): void {
  sourceReturnFocus = link;
  void loadSourceCardModule().then(
    ({ renderPageTurnSourceCard }) => {
      if (destroyed || version !== sourceResolutionVersion) {
        return;
      }
      let primary: HTMLElement | undefined;
      try {
        closeExternalPreview();
        primary = renderPageTurnSourceCard(
          document,
          sourceCardElements,
          input,
          sourceLocalUrl,
          externalPreviewProviders,
        );
      } catch (error) {
        const message = sourceFailure(error);
        primary = renderPageTurnSourceCard(
          document,
          sourceCardElements,
          {
            authoredUrl: input.authoredUrl,
            citation: input.citation,
            error: message,
          },
          () => undefined,
          externalPreviewProviders,
        );
      }
      if (!sourceDialog.open) {
        sourceDialog.showModal();
      }
      requestAnimationFrame(() => {
        if (!destroyed && version === sourceResolutionVersion) {
          primary?.focus({ preventScroll: true });
        }
      });
    },
    (error: unknown) => {
      if (!destroyed && version === sourceResolutionVersion) {
        sourceFailure(error);
        followAuthoredSource(link, input.authoredUrl);
      }
    },
  );
}

function followAuthoredSource(link: HTMLAnchorElement, url: URL): void {
  if (link.target && link.target !== "_self") {
    globalThis.open(url.href, link.target, "noopener,noreferrer");
  } else {
    globalThis.location.assign(url.href);
  }
}

function followLocalSource(url: URL): void {
  closeSourceCard(false);
  globalThis.location.assign(url.href);
}

function handleSourceResolutionError(
  error: unknown,
  link: HTMLAnchorElement,
  authoredUrl: URL,
  citation: string,
  version: number,
): void {
  if (
    destroyed ||
    version !== sourceResolutionVersion ||
    sourceController?.signal.aborted
  ) {
    return;
  }
  const message = sourceFailure(error);
  if (sourceLinkMode === "card") {
    showSourceCard(
      link,
      { authoredUrl, citation, error: message },
      version,
    );
  } else {
    followAuthoredSource(link, authoredUrl);
  }
}

function applyResolvedSource(
  result: PageTurnSourceResolution,
  link: HTMLAnchorElement,
  authoredUrl: URL,
  citation: string,
  version: number,
): void {
  void loadSourceCardModule().then(
    ({ approvedPageTurnLocalReading, validatePageTurnSourceResolution }) => {
      if (
        destroyed ||
        version !== sourceResolutionVersion ||
        sourceController?.signal.aborted
      ) {
        return;
      }
      try {
        const resolution = validatePageTurnSourceResolution(result, authoredUrl);
        if (sourceLinkMode === "direct-local") {
          if (resolution.kind === "local-publication") {
            const target = approvedPageTurnLocalReading(resolution.record);
            const localUrl = target ? sourceLocalUrl(target) : undefined;
            if (localUrl) {
              followLocalSource(localUrl);
              return;
            }
          }
          followAuthoredSource(link, authoredUrl);
          return;
        }
        showSourceCard(
          link,
          { authoredUrl, citation, resolution },
          version,
        );
      } catch (error) {
        handleSourceResolutionError(
          error,
          link,
          authoredUrl,
          citation,
          version,
        );
      }
    },
    (error: unknown) => {
      if (!destroyed && version === sourceResolutionVersion) {
        sourceFailure(error);
        followAuthoredSource(link, authoredUrl);
      }
    },
  );
}

function activateExternalSource(
  link: HTMLAnchorElement,
  authoredUrl: URL,
): void {
  const resolver = options.sourceResolver;
  if (!resolver || sourceLinkMode === "direct") {
    return;
  }
  sourceController?.abort();
  const controller = new AbortController();
  sourceController = controller;
  const version = ++sourceResolutionVersion;
  const citation = authoredCitation(link);
  if (sourceLinkMode === "card") {
    showSourceCard(link, { authoredUrl, citation, pending: true }, version);
  }
  let resolution: PageTurnSourceResolution | Promise<PageTurnSourceResolution>;
  try {
    resolution = resolver(
      authoredUrl,
      sourceContext(link),
      controller.signal,
    );
  } catch (error) {
    handleSourceResolutionError(
      error,
      link,
      authoredUrl,
      citation,
      version,
    );
    return;
  }
  if (
    resolution instanceof Promise ||
    typeof (
      resolution as unknown as Readonly<{ then?: unknown }>
    ).then === "function"
  ) {
    void Promise.resolve(resolution).then(
      (result) =>
        applyResolvedSource(result, link, authoredUrl, citation, version),
      (error: unknown) =>
        handleSourceResolutionError(
          error,
          link,
          authoredUrl,
          citation,
          version,
        ),
    );
  } else {
    applyResolvedSource(resolution, link, authoredUrl, citation, version);
  }
}

function pageContainsAnchor(page: PrototypePage, anchor: string): boolean {
  return page.nodes.some(
    (node) =>
      node.id === anchor ||
      node.querySelector(`#${CSS.escape(anchor)}`) !== null,
  );
}

function onStationaryClick(event: MouseEvent): void {
  if (
    event.button !== 0 ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    !(event.target instanceof Element)
  ) {
    return;
  }
  const chapterLink = event.target.closest<HTMLAnchorElement>(
    "[data-v3-chapter-link]",
  );
  const chapterLinkId = chapterLink?.dataset.v3ChapterLink;
  if (chapterLink && chapterLinkId) {
    event.preventDefault();
    const chapter = manifest?.chapters.find(
      ({ chapterId }) => String(chapterId) === chapterLinkId,
    );
    void goToLocation(
      chapterLinkId,
      chapterLink.dataset.v3ChapterAnchor ?? chapter?.firstAnchor,
      "push",
    ).catch((error: unknown) => {
      reportFailure("V3 could not open the linked chapter", error);
    });
    return;
  }
  const mediaOpen = event.target.closest<HTMLButtonElement>(
    "[data-v3-media-open]",
  );
  const mediaId = mediaOpen?.dataset.v3MediaOpen;
  if (mediaOpen && mediaId) {
    event.preventDefault();
    try {
      openMediaFigure(mediaId, mediaOpen);
    } catch (error: unknown) {
      reportFailure("V3 could not open the publication figure", error);
    }
    return;
  }
  const retry = event.target.closest<HTMLButtonElement>(
    "[data-v3-retry-chapter]",
  );
  const retryChapterId = retry?.dataset.v3RetryChapter;
  if (retry && retryChapterId) {
    event.preventDefault();
    void goToChapter(retryChapterId, "replace").catch((error: unknown) => {
      reportFailure("V3 could not retry the requested chapter", error);
    });
    return;
  }
  const externalLink = event.target.closest<HTMLAnchorElement>("a[href]");
  const authoredHref = externalLink?.getAttribute("href");
  if (
    externalLink &&
    authoredHref &&
    /^(?:https?:)?\/\//i.test(authoredHref) &&
    sourceLinkMode !== "direct" &&
    options.sourceResolver
  ) {
    try {
      const authoredUrl = new URL(authoredHref, globalThis.location.href);
      if (
        (authoredUrl.protocol !== "http:" &&
          authoredUrl.protocol !== "https:") ||
        authoredUrl.username !== "" ||
        authoredUrl.password !== ""
      ) {
        throw new Error("PageTurn source URL must be a safe HTTP(S) URL");
      }
      event.preventDefault();
      activateExternalSource(externalLink, authoredUrl);
    } catch (error) {
      event.preventDefault();
      sourceFailure(error);
    }
    return;
  }
  const link = event.target.closest<HTMLAnchorElement>('a[href^="#"]');
  const href = link?.getAttribute("href");
  if (!link || !href || href.length <= 1) {
    return;
  }
  let anchor: string;
  try {
    anchor = decodeURIComponent(href.slice(1));
  } catch {
    console.warn(`V3 ignored malformed internal anchor: ${href}`);
    return;
  }
  const pageIndex = pages.findIndex((page) =>
    pageContainsAnchor(page, anchor),
  );
  if (pageIndex < 0) {
    console.warn(`V3 could not locate internal anchor: ${anchor}`);
    return;
  }
  const chapterId = pages[pageIndex]?.chapterId;
  if (!chapterId) {
    console.warn(`V3 internal anchor has no chapter: ${anchor}`);
    return;
  }
  event.preventDefault();
  void goToLocation(chapterId, anchor, "push").catch((error: unknown) => {
    reportFailure("V3 could not open the linked passage", error);
  });
}

function positionAtLocation(
  chapterId: string,
  anchor: string | undefined,
  locationUpdate: LocationUpdate,
): void {
  if (!manifest) {
    return;
  }
  if (chapterId === "") {
    preferredAnchor = undefined;
    spreadStart = 0;
    renderStationary(locationUpdate);
    return;
  }
  const chapter = manifest.chapters.find(
    ({ chapterId: candidate }) => String(candidate) === chapterId,
  );
  if (!chapter) {
    throw new Error(`V3 chapter is unavailable: ${chapterId}`);
  }
  const targetAnchor = anchor ?? chapter.firstAnchor;
  const pageIndex = pages.findIndex((page) =>
    page.kind === "content" &&
    page.chapterId === chapterId &&
    pageContainsAnchor(page, targetAnchor),
  );
  if (pageIndex < 0) {
    throw new Error(
      `V3 could not locate ${targetAnchor} in ${chapter.title}`,
    );
  }
  const step = pageStep();
  preferredAnchor = { chapterId, anchor: targetAnchor };
  spreadStart = Math.floor(pageIndex / step) * step;
  renderStationary(locationUpdate);
  const heading = stationary.querySelector<HTMLElement>(
    `#${CSS.escape(targetAnchor)}`,
  );
  if (heading) {
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }
}

async function goToLocation(
  chapterId: string,
  anchor: string | undefined,
  locationUpdate: LocationUpdate,
): Promise<void> {
  closeSourceCard(false);
  dismissSelectionActions();
  const navigationVersion = ++locationNavigationVersion;
  if (!manifest || chapterId === "") {
    if (navigationVersion === locationNavigationVersion) {
      positionAtLocation(chapterId, anchor, locationUpdate);
    }
    return;
  }
  const chapterIndex = chapterStates.findIndex(
    ({ chapter }) => String(chapter.chapterId) === chapterId,
  );
  if (chapterIndex < 0) {
    throw new Error(`V3 chapter is unavailable: ${chapterId}`);
  }
  const chapter = chapterStates[chapterIndex]?.chapter;
  if (!chapter) {
    throw new Error(`V3 chapter is unavailable: ${chapterId}`);
  }
  const preservation = {
    anchor: anchor ?? chapter.firstAnchor,
    progress:
      chapterStates.length <= 1 ? 0 : chapterIndex / (chapterStates.length - 1),
  };
  while (navigationVersion === locationNavigationVersion) {
    const result = await ensureChapterWindow(
      chapterIndex,
      preservation,
      "none",
    );
    if (navigationVersion !== locationNavigationVersion) {
      return;
    }
    if (result) {
      positionAtLocation(chapterId, anchor, locationUpdate);
      return;
    }
  }
}

async function goToChapter(
  chapterId: string,
  locationUpdate: LocationUpdate = "push",
): Promise<void> {
  const chapter = chapterStates.find(
    ({ chapter: candidate }) => String(candidate.chapterId) === chapterId,
  )?.chapter;
  await goToLocation(
    chapterId,
    chapter?.firstAnchor,
    locationUpdate,
  );
}

function turnPages(direction: PageTurnDirection): {
  moving: PrototypePage;
  movingIndex: number;
  revealed: PrototypePage;
  revealedIndex: number;
  revealedSide: "left" | "right";
} {
  const target = targetSpread(direction);
  if (singlePageMedia.matches) {
    const movingIndex = spreadStart;
    return {
      moving: pageAt(movingIndex),
      movingIndex,
      revealed: pageAt(target),
      revealedIndex: target,
      revealedSide: "right",
    };
  }
  return direction === "forward"
    ? {
        moving: pageAt(target),
        movingIndex: target,
        revealed: pageAt(target + 1),
        revealedIndex: target + 1,
        revealedSide: "right",
      }
    : {
        moving: pageAt(target + 1),
        movingIndex: target + 1,
        revealed: pageAt(target),
        revealedIndex: target,
        revealedSide: "left",
      };
}

function beginTurn(
  direction: PageTurnDirection,
  corner: PageTurnCorner,
  pointer: PageTurnPoint,
): ActiveTurn | undefined {
  if (activeTurn || !canTurn(direction)) {
    return undefined;
  }
  closeSourceCard(false);
  const target = targetSpread(direction);
  const selected = turnPages(direction);
  if (
    selected.moving.kind === "placeholder" ||
    selected.revealed.kind === "placeholder"
  ) {
    return undefined;
  }
  const moving = createElement("div", "v3-turn-surface");
  moving.setAttribute("aria-hidden", "true");
  moving.inert = true;
  moving.append(
    createElement("div", "v3-paper-occluder"),
    createSheet(
      selected.moving,
      singlePageMedia.matches
        ? "right"
        : direction === "forward"
          ? "left"
          : "right",
      selected.movingIndex + 1,
      true,
    ),
  );
  const revealed = createElement("div", "v3-revealed-page");
  revealed.setAttribute("aria-hidden", "true");
  revealed.inert = true;
  revealed.append(
    createElement("div", "v3-paper-occluder"),
    createSheet(
      selected.revealed,
      selected.revealedSide,
      selected.revealedIndex + 1,
      true,
    ),
  );
  const shadow = createElement("div", "v3-fold-shadow");
  shadow.setAttribute("aria-hidden", "true");
  const curve = createElement("div", "v3-fold-curve");
  curve.setAttribute("aria-hidden", "true");
  turnLayer.replaceChildren(revealed, moving, shadow, curve);
  renderMarginalia(moving, true);
  renderMarginalia(revealed, true);

  activeTurn = {
    direction,
    corner,
    targetSpread: target,
    pointer,
    progress: 0,
    moving,
    revealed,
    curve,
    shadow,
  };
  reader.dataset.v3Turning = "true";
  if (pageRoot) {
    pageRoot.dataset.v3Turning = "true";
  }
  counter.value = "Turning semantic leaf";
  renderControls();
  applyTurn(pointer);
  return activeTurn;
}

function applyFrame(frame: PageTurnFrame): void {
  const turn = activeTurn;
  if (!turn) {
    return;
  }
  const projection = projectPageTurn(frame, {
    foldCurvature: currentAppearance.geometry.foldRadius,
  });
  const singlePageOffset =
    singlePageMedia.matches && frame.direction === "forward"
      ? -frame.page.width
      : 0;
  turn.pointer = frame.pointer;
  turn.progress = frame.progress;
  turn.moving.dataset.v3Progress = frame.progress.toFixed(4);

  turn.moving.style.width = `${frame.page.width}px`;
  turn.moving.style.height = `${frame.page.height}px`;
  turn.moving.style.transform = [
    `translate3d(${projection.moving.translate.x + singlePageOffset}px,`,
    `${projection.moving.translate.y}px, 0)`,
    `rotate(${projection.moving.angleRadians}rad)`,
  ].join(" ");
  turn.moving.style.clipPath = pageTurnPolygon(projection.moving.clip);
  turn.moving.style.setProperty(
    "--v3-fold-sheen-direction",
    frame.direction === "forward" ? "90deg" : "270deg",
  );

  turn.revealed.style.width = `${frame.page.width}px`;
  turn.revealed.style.height = `${frame.page.height}px`;
  turn.revealed.style.transform = `translate3d(${projection.revealed.translate.x + singlePageOffset}px, ${projection.revealed.translate.y}px, 0)`;
  turn.revealed.style.clipPath = pageTurnPolygon(projection.revealed.clip);

  const shadow = projection.foldShadow;
  const shadowScale =
    0.55 + currentAppearance.geometry.foldShadow * 0.75;
  const shadowWidth = Math.max(3, shadow.width * shadowScale);
  const curveWidth = Math.min(
    frame.page.width * 0.26,
    Math.max(
      frame.page.width *
        (0.08 + currentAppearance.geometry.foldRadius * 0.12),
      shadow.width * 1.35,
    ),
  );
  const normalX = Math.cos(shadow.angleRadians);
  const normalY = Math.sin(shadow.angleRadians);
  const shadowOffset =
    shadow.gradient === "to-left" ? -shadowWidth : 0;
  const curveOffset =
    shadow.gradient === "to-right" ? -curveWidth : 0;
  turn.shadow.style.width = `${shadowWidth}px`;
  turn.shadow.style.height = `${shadow.length}px`;
  turn.shadow.style.opacity = String(
    Math.min(
      0.42,
      Math.max(
        0,
        shadow.opacity *
          (0.28 + currentAppearance.geometry.foldShadow * 0.42),
      ),
    ),
  );
  turn.shadow.style.background =
    shadow.gradient === "to-right"
      ? "linear-gradient(to right, rgb(38 27 16 / 58%), transparent)"
      : "linear-gradient(to left, rgb(38 27 16 / 58%), transparent)";
  turn.shadow.style.transformOrigin = "0 0";
  turn.shadow.style.transform = [
    `translate3d(${shadow.origin.x + singlePageOffset + normalX * shadowOffset}px,`,
    `${shadow.origin.y + normalY * shadowOffset}px, 0)`,
    `rotate(${shadow.angleRadians}rad)`,
  ].join(" ");
  turn.curve.style.width = `${curveWidth}px`;
  turn.curve.style.height = `${shadow.length}px`;
  turn.curve.style.opacity = String(
    Math.min(
      0.62,
      0.22 +
        shadow.opacity *
          (0.25 + currentAppearance.geometry.foldRadius * 0.28),
    ),
  );
  turn.curve.style.setProperty(
    "--v3-fold-curve-direction",
    shadow.gradient === "to-right" ? "90deg" : "270deg",
  );
  turn.curve.style.transformOrigin = "0 0";
  turn.curve.style.transform = [
    `translate3d(${shadow.origin.x + singlePageOffset + normalX * curveOffset}px,`,
    `${shadow.origin.y + normalY * curveOffset}px, 0)`,
    `rotate(${shadow.angleRadians}rad)`,
  ].join(" ");
}

function applyTurn(pointer: PageTurnPoint): void {
  const turn = activeTurn;
  if (!turn) {
    return;
  }
  const result = solvePageTurn({
    page: pageSize(),
    direction: turn.direction,
    corner: turn.corner,
    pointer,
  });
  if (result.status === "ok") {
    applyFrame(result.frame);
  }
}

function finishTurn(commit: boolean): void {
  const turn = activeTurn;
  if (!turn) {
    return;
  }
  if (turn.animationFrame !== undefined) {
    cancelAnimationFrame(turn.animationFrame);
  }
  if (turn.pointerFrame !== undefined) {
    cancelAnimationFrame(turn.pointerFrame);
  }
  if (turn.capture && turn.pointerId !== undefined) {
    if (turn.capture.hasPointerCapture(turn.pointerId)) {
      turn.capture.releasePointerCapture(turn.pointerId);
    }
  }
  if (commit) {
    preferredAnchor = undefined;
    spreadStart = turn.targetSpread;
  }
  activeTurn = undefined;
  turnLayer.replaceChildren();
  renderStationary();
  if (commit) {
    queueChapterWindow();
  }
}

function settleTurn(commit: boolean): void {
  const turn = activeTurn;
  if (!turn) {
    return;
  }
  if (turn.pointerFrame !== undefined) {
    cancelAnimationFrame(turn.pointerFrame);
    delete turn.pointerFrame;
  }
  delete turn.pendingPointer;
  if (reducedMotion.matches) {
    finishTurn(commit);
    return;
  }

  const size = pageSize();
  const start = turn.pointer;
  const destination = commit
    ? {
        x: -size.width,
        y: turn.corner === "top" ? 0 : size.height,
      }
    : {
        x: size.width - 2,
        y: turn.corner === "top" ? 2 : size.height - 2,
      };
  const duration = commit ? 360 : 260;
  const startedAt = performance.now();
  const animate = (now: number) => {
    const current = activeTurn;
    if (current !== turn) {
      return;
    }
    const elapsed = Math.min(1, (now - startedAt) / duration);
    const eased = 1 - Math.pow(1 - elapsed, 3);
    applyTurn(interpolate(start, destination, eased));
    if (elapsed < 1) {
      turn.animationFrame = requestAnimationFrame(animate);
    } else {
      finishTurn(commit);
    }
  };
  turn.animationFrame = requestAnimationFrame(animate);
}

function pointerForEvent(
  event: PointerEvent,
  direction: PageTurnDirection,
): PageTurnPoint {
  const bounds = spread.getBoundingClientRect();
  if (singlePageMedia.matches) {
    return {
      x:
        direction === "forward"
          ? event.clientX - bounds.left
          : bounds.right - event.clientX,
      y: event.clientY - bounds.top,
    };
  }
  const binding = bounds.left + bounds.width / 2;
  return {
    x:
      direction === "forward"
        ? event.clientX - binding
        : binding - event.clientX,
    y: event.clientY - bounds.top,
  };
}

function onCornerPointerDown(event: PointerEvent): void {
  if (
    !event.isPrimary ||
    event.button !== 0 ||
    !(event.currentTarget instanceof HTMLButtonElement)
  ) {
    return;
  }
  const direction = event.currentTarget.dataset.v3Direction;
  const corner = event.currentTarget.dataset.v3Corner;
  if (
    (direction !== "forward" && direction !== "backward") ||
    (corner !== "top" && corner !== "bottom")
  ) {
    throw new Error("V3 corner control has invalid turn metadata");
  }
  dismissSelectionActions();
  if (resizeTimer !== undefined) {
    clearTimeout(resizeTimer);
    resizeTimer = undefined;
  }
  if (reducedMotion.matches) {
    if (canTurn(direction)) {
      preferredAnchor = undefined;
      spreadStart = targetSpread(direction);
      renderStationary();
      queueChapterWindow();
    }
    return;
  }
  const turn = beginTurn(
    direction,
    corner,
    pointerForEvent(event, direction),
  );
  if (!turn) {
    return;
  }
  event.preventDefault();
  turn.pointerId = event.pointerId;
  turn.capture = event.currentTarget;
  event.currentTarget.setPointerCapture(event.pointerId);
}

function onPointerMove(event: PointerEvent): void {
  const turn = activeTurn;
  if (!turn || turn.pointerId !== event.pointerId) {
    return;
  }
  event.preventDefault();
  turn.pendingPointer = pointerForEvent(event, turn.direction);
  if (turn.pointerFrame === undefined) {
    turn.pointerFrame = requestAnimationFrame(() => {
      delete turn.pointerFrame;
      if (activeTurn === turn && turn.pendingPointer) {
        const pointer = turn.pendingPointer;
        delete turn.pendingPointer;
        applyTurn(pointer);
      }
    });
  }
}

function onPointerEnd(event: PointerEvent): void {
  const turn = activeTurn;
  if (!turn || turn.pointerId !== event.pointerId) {
    return;
  }
  event.preventDefault();
  if (turn.pointerFrame !== undefined) {
    cancelAnimationFrame(turn.pointerFrame);
    delete turn.pointerFrame;
  }
  if (turn.pendingPointer) {
    const pointer = turn.pendingPointer;
    delete turn.pendingPointer;
    applyTurn(pointer);
  }
  settleTurn(turn.progress >= 0.34);
}

function onPointerCancel(event: PointerEvent): void {
  if (activeTurn?.pointerId === event.pointerId) {
    settleTurn(false);
  }
}

async function performAutomaticTurn(
  direction: PageTurnDirection,
): Promise<void> {
  if (!canTurn(direction) || activeTurn) {
    return;
  }
  const target = targetSpread(direction);
  const destinationPages = pages.slice(target, target + pageStep());
  if (destinationPages.some((page) => page?.kind === "placeholder")) {
    const retainedForTurn = [
      ...pages.slice(spreadStart, spreadStart + pageStep()),
      ...destinationPages,
    ].flatMap((page) =>
      page?.chapterIndex === undefined ? [] : [page.chapterIndex],
    );
    await ensureChapterSet(
      retainedForTurn,
      currentPreservation(),
    );
    if (!canTurn(direction) || !turnTargetReady(direction)) {
      return;
    }
  }
  if (reducedMotion.matches) {
    preferredAnchor = undefined;
    spreadStart = targetSpread(direction);
    renderStationary();
    queueChapterWindow();
    return;
  }
  const size = pageSize();
  const corner: PageTurnCorner = "top";
  const turn = beginTurn(direction, corner, {
    x: size.width - Math.max(24, size.width * 0.08),
    y: Math.max(18, size.height * 0.08),
  });
  if (turn) {
    settleTurn(true);
  }
}

async function automaticTurn(direction: PageTurnDirection): Promise<void> {
  if (pendingTurn) {
    return;
  }
  dismissSelectionActions();
  pendingTurn = true;
  renderControls();
  try {
    await performAutomaticTurn(direction);
  } catch (error: unknown) {
    reportFailure("V3 could not turn to the requested chapter", error);
  } finally {
    pendingTurn = false;
    renderControls();
  }
}

function pageFits(blocks: readonly SemanticBlock[]): boolean {
  measure.classList.toggle(
    "v3-sheet-chapter-opening",
    blocks[0]?.chapterStart ?? false,
  );
  if (isReferenceSection(undefined, blocks[0]?.chapterTitle)) {
    measure.dataset.v3ChapterRole = "references";
  } else {
    delete measure.dataset.v3ChapterRole;
  }
  measureContent.replaceChildren(
    ...(blocks[0]?.chapterStart
      ? [chapterOpeningLabel(blocks[0].chapterLabel)]
      : []),
    ...cloneNodes(
      blocks.map(({ node }) => node),
      false,
    ),
  );
  return measureContent.scrollHeight <= measureContent.clientHeight + 1;
}

function paragraphFragment(
  block: SemanticBlock,
  start: number,
  end: number,
  first: boolean,
): SemanticBlock {
  const paragraph = cloneTextRange(block.node, start, end, first);
  const rawText = block.node.textContent ?? "";
  const sourceStart =
    block.sourceStart + pageTurnTextOffsetAt(rawText, start);
  const sourceEnd = block.sourceStart + pageTurnTextOffsetAt(rawText, end);
  paragraph.dataset.sourceAnchor = block.anchor;
  applySourceRange(paragraph, sourceStart, sourceEnd);
  return {
    node: paragraph,
    anchor: block.anchor,
    sourceText: block.sourceText,
    sourceStart,
    sourceEnd,
    chapterTitle: block.chapterTitle,
    chapterLabel: block.chapterLabel,
    chapterStart: false,
  };
}

function atomicFit(block: SemanticBlock): SemanticBlock[] {
  for (let scale = 0.9; scale >= 0.5; scale -= 0.1) {
    const node = block.node.cloneNode(true) as HTMLElement;
    node.style.fontSize = `${scale.toFixed(1)}em`;
    node.dataset.v3FitScale = scale.toFixed(1);
    const candidate = { ...block, node };
    if (pageFits([candidate])) {
      return [candidate];
    }
  }
  throw new Error(
    `V3 semantic ${block.node.tagName.toLowerCase()} at ${block.anchor} does not fit a page`,
  );
}

function listFragment(
  block: SemanticBlock,
  items: readonly Element[],
  itemOffset: number,
): SemanticBlock {
  const list = block.node.cloneNode(false) as HTMLOListElement | HTMLUListElement;
  if (itemOffset > 0) {
    list.removeAttribute("id");
  }
  if (list instanceof HTMLOListElement) {
    const originalStart = Number(block.node.getAttribute("start") ?? "1");
    list.start =
      (Number.isFinite(originalStart) ? originalStart : 1) + itemOffset;
  }
  list.append(
    ...items.flatMap((item, index) => [
      ...(index === 0 ? [] : [document.createTextNode(" ")]),
      item.cloneNode(true),
    ]),
  );
  list.dataset.sourceAnchor = block.anchor;
  const allItems = Array.from(block.node.children).filter((child) =>
    child.matches("li"),
  );
  const range = pageTurnTextSegmentRange(
    block.sourceText,
    allItems.map((item) => item.textContent ?? ""),
    itemOffset,
    items.length,
  );
  const sourceStart = block.sourceStart + range.start;
  const sourceEnd = block.sourceStart + range.end;
  applySourceRange(list, sourceStart, sourceEnd);
  return { ...block, node: list, sourceStart, sourceEnd };
}

function fitListBlock(block: SemanticBlock): SemanticBlock[] {
  const items = Array.from(block.node.children).filter((child) =>
    child.matches("li"),
  );
  if (items.length === 0) {
    return atomicFit(block);
  }

  const fragments: SemanticBlock[] = [];
  let current: Element[] = [];
  let offset = 0;
  for (const item of items) {
    const candidateItems = [...current, item];
    const candidate = listFragment(block, candidateItems, offset);
    if (pageFits([candidate])) {
      current = candidateItems;
      continue;
    }
    if (current.length > 0) {
      fragments.push(listFragment(block, current, offset));
      offset += current.length;
    }
    const single = listFragment(block, [item], offset);
    if (pageFits([single])) {
      current = [item];
    } else {
      fragments.push(...atomicFit(single));
      offset += 1;
      current = [];
    }
  }
  if (current.length > 0) {
    fragments.push(listFragment(block, current, offset));
  }
  return fragments;
}

function fitBlock(block: SemanticBlock): SemanticBlock[] {
  if (pageFits([block])) {
    return [block];
  }
  if (block.node.matches("ul, ol")) {
    return fitListBlock(block);
  }
  if (!block.node.matches("p")) {
    return atomicFit(block);
  }

  const text = block.node.textContent ?? "";
  const boundaries = Array.from(
    text.matchAll(/\S+(?:\s+|$)/g),
    (match) => (match.index ?? 0) + match[0].length,
  );
  if (boundaries.at(-1) !== text.length) {
    boundaries.push(text.length);
  }
  const fragments: SemanticBlock[] = [];
  let start = 0;
  while (start < text.length) {
    let bestEnd = start;
    for (const end of boundaries) {
      if (end <= start) {
        continue;
      }
      const candidate = paragraphFragment(
        block,
        start,
        end,
        fragments.length === 0,
      );
      if (!pageFits([candidate])) {
        break;
      }
      bestEnd = end;
    }
    if (bestEnd === start) {
      throw new Error(
        `V3 word in semantic block ${block.anchor} does not fit a page`,
      );
    }
    fragments.push(
      paragraphFragment(
        block,
        start,
        bestEnd,
        fragments.length === 0,
      ),
    );
    start = bestEnd;
  }
  return fragments;
}

function paginateContent(
  blocks: readonly SemanticBlock[],
  chapterState: ChapterState,
): PrototypePage[] {
  if (measureContent.clientHeight <= 0) {
    throw new Error("V3 pagination measure has no usable height");
  }
  const result: PrototypePage[] = [];
  let current: SemanticBlock[] = [];
  const fittedBlocks = blocks.flatMap((block) => fitBlock(block));

  for (const block of fittedBlocks) {
    if (block.node.matches(".v3-media-on")) {
      if (current.length > 0) {
        result.push(
          pageFromBlocks(current, result.length + 1, chapterState),
        );
        current = [];
      }
      result.push(
        pageFromBlocks([block], result.length + 1, chapterState),
      );
      continue;
    }
    if (block.chapterStart && current.length > 0) {
      result.push(
        pageFromBlocks(current, result.length + 1, chapterState),
      );
      current = [];
    }
    const candidate = [...current, block];
    if (pageFits(candidate)) {
      current = candidate;
      continue;
    }

    if (
      current.length > 1 &&
      current.at(-1)?.node.matches("h1, h2, h3, h4, h5, h6")
    ) {
      const heading = current.pop();
      if (current.length > 0) {
        result.push(
          pageFromBlocks(current, result.length + 1, chapterState),
        );
      }
      const headingWithBlock = heading ? [heading, block] : [block];
      if (pageFits(headingWithBlock)) {
        current = headingWithBlock;
      } else {
        if (heading) {
          result.push(
            pageFromBlocks([heading], result.length + 1, chapterState),
          );
        }
        current = [block];
      }
    } else {
      if (current.length > 0) {
        result.push(
          pageFromBlocks(current, result.length + 1, chapterState),
        );
      }
      current = [block];
    }

    if (!pageFits(current)) {
      throw new Error(`V3 pagination failed at ${block.anchor}`);
    }
  }

  if (current.length > 0) {
    result.push(
      pageFromBlocks(current, result.length + 1, chapterState),
    );
  }
  return result;
}

function blankPage(manifestTitle: string): PrototypePage {
  return {
    label: "Blank final leaf",
    runningTitle: manifestTitle,
    anchor: "v3-blank-final",
    kind: "front-matter",
    chapterOpening: false,
    nodes: [createElement("p", "v3-title-kicker", "End of preview")],
  };
}

function updateLoadedDiagnostics(): void {
  const blocks = chapterStates.flatMap(({ blocks }) => blocks ?? []);
  reader.dataset.v3LoadedChapterIds = chapterStates
    .filter(({ status }) => status === "ready")
    .map(({ chapter }) => String(chapter.chapterId))
    .join(",");
  reader.dataset.v3LoadedChapters = String(loadedChapterCount());
  reader.dataset.v3ChapterCount = String(chapterStates.length);
  reader.dataset.v3Tables = String(
    blocks.filter(({ node }) => node.matches("table")).length,
  );
  reader.dataset.v3CodeBlocks = String(
    blocks.filter(({ node }) => node.matches("pre")).length,
  );
  reader.dataset.v3NoteLinks = String(
    blocks.reduce(
      (total, { node }) =>
        total + node.querySelectorAll('a[href^="#note-"]').length,
      0,
    ),
  );
  reader.dataset.v3DeepHeadings = String(
    blocks.filter(({ node }) => node.matches("h4, h5, h6")).length,
  );
  reader.dataset.v3FigureLinks = String(
    blocks.reduce(
      (total, { node }) =>
        total + node.querySelectorAll('a[href*="/figs/"]').length,
      0,
    ),
  );
  reader.dataset.v3Blocks = String(blocks.length);
}

function repaginateLoadedChapters(): void {
  for (const chapterState of chapterStates) {
    if (chapterState.status === "ready" && chapterState.blocks) {
      const chapterPages = paginateContent(
        blocksWithMedia(chapterState),
        chapterState,
      );
      const physicalPages =
        chaptersStartOnRight && chapterPages.length % 2 !== 0
          ? [...chapterPages, blankChapterPage(chapterState)]
          : chapterPages;
      chapterState.pageParity = physicalPages.length % 2 === 0 ? 2 : 1;
      chapterState.pages = physicalPages;
    }
  }
}

function composedPublicationPages(): PrototypePage[] {
  return chapterStates.flatMap((chapterState) =>
    chapterState.status === "ready" && chapterState.pages
      ? chapterState.pages
      : chaptersStartOnRight || chapterState.pageParity === 2
        ? [placeholderPage(chapterState), blankChapterPage(chapterState)]
        : [placeholderPage(chapterState)],
  );
}

function rebuildPages(
  preserveAnchor?: string,
  preserveProgress = 0,
  preserveChapterIndex?: number,
  preserveChapterPageOffset?: number,
  locationUpdate: LocationUpdate = "replace",
): void {
  if (!manifest) {
    return;
  }
  paginationVersion += 1;
  reader.dataset.v3PaginationVersion = String(paginationVersion);
  spread.classList.toggle("v3-spread-single", singlePageMedia.matches);
  measure.hidden = false;
  repaginateLoadedChapters();
  const built = [
    ...frontMatterPages(manifest),
    ...composedPublicationPages(),
  ];
  if (built.length % 2 !== 0) {
    built.push(blankPage(manifest.title));
  }
  pages = built;
  measure.hidden = true;
  updateLoadedDiagnostics();
  const projectedIndex = Math.round(
    Math.min(1, Math.max(0, preserveProgress)) *
      Math.max(0, pages.length - 1),
  );
  const matchingIndices = preserveAnchor
    ? pages.flatMap((page, index) =>
        pageContainsAnchor(page, preserveAnchor) ? [index] : [],
      )
    : [];
  const chapterPageIndices =
    preserveChapterIndex === undefined
      ? []
      : pages.flatMap((page, index) =>
          page.chapterIndex === preserveChapterIndex &&
          page.kind === "content"
            ? [index]
            : [],
        );
  const chapterPreservedIndex =
    preserveChapterPageOffset === undefined ||
    chapterPageIndices.length === 0
      ? -1
      : chapterPageIndices[
          Math.min(
            chapterPageIndices.length - 1,
            Math.max(0, preserveChapterPageOffset),
          )
        ] ?? -1;
  const anchorPreservedIndex =
    matchingIndices.length === 0
      ? -1
      : matchingIndices.reduce((closest, candidate) =>
          Math.abs(candidate - projectedIndex) <
          Math.abs(closest - projectedIndex)
            ? candidate
            : closest,
        );
  const preservedIndex =
    anchorPreservedIndex >= 0
      ? anchorPreservedIndex
      : chapterPreservedIndex;
  const step = pageStep();
  const maximumStart = Math.max(0, pages.length - step);
  const targetIndex =
    preservedIndex >= 0 ? preservedIndex : projectedIndex;
  spreadStart =
    Math.floor(Math.min(targetIndex, maximumStart) / step) * step;
  renderStationary(locationUpdate);
}

function currentPreservation(): Readonly<{
  anchor?: string;
  progress: number;
  chapterIndex?: number;
  chapterPageOffset?: number;
}> {
  const page = activePage();
  const preservedAnchor = preferredAnchor?.anchor ?? page?.anchor;
  const pageIndex = page ? pages.indexOf(page) : -1;
  const chapterPageIndices =
    page?.chapterIndex === undefined
      ? []
      : pages.flatMap((candidate, index) =>
          candidate.kind === "content" &&
          candidate.chapterIndex === page.chapterIndex
            ? [index]
            : [],
        );
  const chapterPageOffset =
    pageIndex < 0 ? -1 : chapterPageIndices.indexOf(pageIndex);
  return {
    ...(preservedAnchor ? { anchor: preservedAnchor } : {}),
    ...(page?.chapterIndex === undefined
      ? {}
      : { chapterIndex: page.chapterIndex }),
    ...(chapterPageOffset < 0 ? {} : { chapterPageOffset }),
    progress:
      pages.length <= 1 ? 0 : spreadStart / Math.max(1, pages.length - 1),
  };
}

function releaseChapter(chapterState: ChapterState): void {
  if (chapterState.status === "loading") {
    return;
  }
  chapterState.status = "idle";
  chapterState.blocks = undefined;
  chapterState.pages = undefined;
  chapterState.promise = undefined;
  chapterState.error = undefined;
}

function chapterInWindow(index: number): boolean {
  return retainedChapterIndices.includes(index);
}

function releaseChaptersOutside(indices: readonly number[]): void {
  for (const chapterState of chapterStates) {
    if (!indices.includes(chapterState.index)) {
      releaseChapter(chapterState);
    }
  }
}

function rebuildChapterSet(
  indices: readonly number[],
  preservation: ReturnType<typeof currentPreservation>,
  locationUpdate: LocationUpdate,
): void {
  releaseChaptersOutside(indices);
  if (activeTurn) {
    finishTurn(false);
  }
  rebuildPages(
    preservation.anchor,
    preservation.progress,
    preservation.chapterIndex,
    preservation.chapterPageOffset,
    locationUpdate,
  );
}

async function ensureChapterLoaded(index: number): Promise<void> {
  const chapterState = chapterStates[index];
  if (!chapterState) {
    throw new RangeError(`V3 chapter index is unavailable: ${index}`);
  }
  if (chapterState.status === "ready") {
    return;
  }
  if (chapterState.status === "loading" && chapterState.promise) {
    return chapterState.promise;
  }
  if (!manifestUrl) {
    throw new Error("V3 publication manifest URL is unavailable");
  }

  chapterState.status = "loading";
  chapterState.error = undefined;
  updateLoadedDiagnostics();
  const promise = fetchChapterBlocks(chapterState.chapter, manifestUrl)
    .then((blocks) => {
      chapterState.blocks = blocks;
      chapterState.status = "ready";
      chapterState.pages = undefined;
      chapterState.promise = undefined;
      if (!chapterInWindow(index)) {
        releaseChapter(chapterState);
      }
      updateLoadedDiagnostics();
    })
    .catch((error: unknown) => {
      const failure =
        error instanceof Error
          ? error
          : new Error(`Unknown chapter loading failure: ${String(error)}`);
      chapterState.status = "error";
      chapterState.error = failure;
      chapterState.promise = undefined;
      updateLoadedDiagnostics();
      throw failure;
    });
  chapterState.promise = promise;
  return promise;
}

async function ensureChapterSet(
  requestedIndices: readonly number[],
  preservation: ReturnType<typeof currentPreservation>,
  locationUpdate: LocationUpdate = "replace",
): Promise<boolean> {
  const desired = [...new Set(requestedIndices)]
    .filter((index) => index >= 0 && index < chapterStates.length)
    .sort((left, right) => left - right);
  const windowIsReady =
    desired.every(
      (index) => chapterStates[index]?.status === "ready",
    ) &&
    chapterStates.every(
      ({ index, status }) => desired.includes(index) || status === "idle",
    );
  if (windowIsReady) {
    retainedChapterIndices = desired;
    return true;
  }
  const version = ++chapterWindowVersion;
  retainedChapterIndices = desired;
  status.textContent = `Loading chapter window · ${desired.length} chapters`;
  try {
    await Promise.all(desired.map((index) => ensureChapterLoaded(index)));
  } catch (error: unknown) {
    if (version !== chapterWindowVersion) {
      releaseChaptersOutside(retainedChapterIndices);
      console.warn("V3 ignored a failure from an obsolete chapter window", error);
      return false;
    }
    rebuildChapterSet(desired, preservation, locationUpdate);
    throw error;
  }
  if (version !== chapterWindowVersion) {
    releaseChaptersOutside(retainedChapterIndices);
    return false;
  }

  rebuildChapterSet(desired, preservation, locationUpdate);
  if (!opening) {
    reportReady();
  } else {
    failureReported = false;
  }
  return true;
}

async function ensureChapterWindow(
  centerIndex: number,
  preservation = currentPreservation(),
  locationUpdate: LocationUpdate = "replace",
): Promise<boolean> {
  const boundedCenter = Math.min(
    chapterStates.length - 1,
    Math.max(0, centerIndex),
  );
  return ensureChapterSet(
    [boundedCenter - 1, boundedCenter, boundedCenter + 1],
    preservation,
    locationUpdate,
  );
}

function queueChapterWindow(centerIndex = activeChapterIndex()): void {
  void ensureChapterWindow(centerIndex).catch((error: unknown) => {
    reportFailure("V3 could not load the chapter window", error);
  });
}

function prototypeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown V3 reader error";
}

function reportReady(): void {
  failureReported = false;
  reader.dataset.v3Ready = "true";
  reader.setAttribute("aria-busy", "false");
  status.textContent =
    `Geometry ready · ${loadedChapterCount()}/${chapterStates.length} chapters loaded` +
    ` · ${pages.length} composed pages`;
}

function reportFailure(context: string, error: unknown): void {
  if (destroyed) {
    return;
  }
  failureReported = true;
  reader.dataset.v3Ready = "false";
  reader.setAttribute("aria-busy", "false");
  status.textContent = `${context}: ${prototypeErrorMessage(error)}`;
  console.error(error);
}

function reportReadyIfHealthy(): void {
  if (failureReported) {
    reader.setAttribute("aria-busy", "false");
    return;
  }
  reportReady();
}

function finishOpening(): void {
  if (!opening) {
    return;
  }
  opening = false;
  if (openingTimer !== undefined) {
    clearTimeout(openingTimer);
    openingTimer = undefined;
  }
  reader.dataset.v3Opening = "false";
  reportReadyIfHealthy();
  renderControls();
}

function startOpening(): void {
  reader.dataset.v3Opening = "true";
  if (reducedMotion.matches) {
    finishOpening();
    return;
  }
  status.textContent =
    `Opening semantic edition · ${loadedChapterCount()}/${chapterStates.length} chapters loaded`;
  entryCover.addEventListener("animationend", finishOpening, { once: true });
  openingTimer = globalThis.setTimeout(finishOpening, 1_300);
}

type InitialReadingLocation = Readonly<{
  location: PageTurnBookLocation;
  source: "resume" | "url";
}>;

function initialReadingLocation(
  publication: PageTurnBookManifest,
): InitialReadingLocation | undefined {
  const anchor = managesUrl ? decodeLocationHash() : undefined;
  let chapterId = requestedChapterId ?? null;
  if (anchor && chapterId === null) {
    chapterId =
      publication.chapters.find(
        ({ firstAnchor }) => firstAnchor === anchor,
      )?.chapterId.toString() ?? null;
    if (chapterId === null) {
      throw new Error(
        "V3 source-anchor URLs must include their chapter parameter",
      );
    }
  }
  if (chapterId !== null) {
    const chapter = publication.chapters.find(
      ({ chapterId: candidate }) => String(candidate) === chapterId,
    );
    if (!chapter) {
      throw new Error(`V3 chapter is unavailable: ${chapterId}`);
    }
    return {
      source: "url",
      location: {
        bookId: publication.bookId,
        editionId: publication.editionId,
        chapterId,
        anchor: anchor ?? chapter.firstAnchor,
      },
    };
  }
  const resumed = readResumeLocation(publication);
  return resumed ? { source: "resume", location: resumed } : undefined;
}

function nodeIntersectsTextTarget(
  node: HTMLElement,
  target: PageTurnTextTargetV1,
  blocks: readonly PageTurnTextSourceBlock[],
): boolean {
  const blockIndices = new Map(
    blocks.map(({ anchor }, index) => [anchor, index]),
  );
  const startIndex = blockIndices.get(target.start.anchor);
  const endIndex = blockIndices.get(target.end.anchor);
  if (startIndex === undefined || endIndex === undefined) {
    return false;
  }
  const candidates = [
    ...(node.matches("[data-source-anchor]") ? [node] : []),
    ...node.querySelectorAll<HTMLElement>("[data-source-anchor]"),
  ];
  return candidates.some((candidate) => {
    const anchor = candidate.dataset.sourceAnchor;
    const blockIndex = anchor ? blockIndices.get(anchor) : undefined;
    if (
      blockIndex === undefined ||
      blockIndex < startIndex ||
      blockIndex > endIndex
    ) {
      return false;
    }
    const start = Number(candidate.dataset.v3SourceStart);
    const end = Number(candidate.dataset.v3SourceEnd);
    const sourceBlock = blocks[blockIndex];
    if (!sourceBlock) {
      return false;
    }
    const requestedStart =
      blockIndex === startIndex ? target.start.offset : 0;
    const requestedEnd =
      blockIndex === endIndex
        ? target.end.offset
        : Array.from(sourceBlock.text).length;
    return (
      Number.isSafeInteger(start) &&
      Number.isSafeInteger(end) &&
      Math.max(start, requestedStart) < Math.min(end, requestedEnd)
    );
  });
}

function positionAtTextTarget(
  target: PageTurnTextTargetV1,
): "highlighted" | "unavailable" | "unsupported" {
  const blocks = textSourceBlocks(target.chapterId);
  const pageIndex = pages.findIndex(
    (page) =>
      page.chapterId === target.chapterId &&
      page.nodes.some((node) =>
        nodeIntersectsTextTarget(node, target, blocks),
      ),
  );
  if (pageIndex < 0) {
    return "unavailable";
  }
  preferredAnchor = {
    chapterId: target.chapterId,
    anchor: target.start.anchor,
  };
  sharedTextTarget = target;
  spreadStart = Math.floor(pageIndex / pageStep()) * pageStep();
  renderStationary("none");
  return renderSharedTextHighlight();
}

async function restoreTextTargetFromUrl(
  selectionToken: string | null,
  editionId: string | null,
  chapterId: string | null,
  isCurrent: () => boolean = () => true,
): Promise<void> {
  clearSharedTextTarget();
  delete reader.dataset.v3SharedEdition;
  if (!manifest) {
    return;
  }
  if (editionId) {
    const matchesEdition = editionId === manifest.editionId;
    reader.dataset.v3SharedEdition = matchesEdition ? "resolved" : "unresolved";
    if (!matchesEdition) {
      shareStatus.value =
        "Shared passage belongs to a different publication edition";
      console.warn("V3 shared passage has no matching publication edition");
      return;
    }
  }
  if (!selectionToken) {
    return;
  }
  const chapterState = chapterStates.find(
    ({ chapter }) => String(chapter.chapterId) === chapterId,
  );
  if (
    !editionId ||
    editionId !== manifest.editionId ||
    !chapterId ||
    !chapterState ||
    !chapterState.blocks
  ) {
    reader.dataset.v3SharedTarget = "unresolved";
    shareStatus.value =
      "Shared quote could not be matched to this publication edition";
    console.warn("V3 shared quote has no matching publication edition");
    return;
  }
  try {
    const resolution = await resolvePageTurnTextTargetToken(
      selectionToken,
      {
        bookId: manifest.bookId,
        editionId: manifest.editionId,
        chapterId,
        chapterContentHash: chapterState.chapter.contentHash,
        blocks: textSourceBlocks(chapterId),
      },
    );
    if (!isCurrent()) {
      return;
    }
    if (resolution.state === "unresolved") {
      reader.dataset.v3SharedTarget = "unresolved";
      shareStatus.value =
        "Shared quote could not be matched exactly; showing its source passage";
      console.warn(
        `V3 shared quote could not be restored: ${resolution.reason}`,
      );
      return;
    }
    const highlightState = positionAtTextTarget(resolution.target);
    if (highlightState === "unavailable") {
      clearSharedTextTarget();
      reader.dataset.v3SharedTarget = "unresolved";
      shareStatus.value =
        "Shared quote could not be placed exactly; showing its source passage";
      console.warn("V3 shared quote has no composed target range");
      return;
    }
    reader.dataset.v3SharedTarget =
      highlightState === "highlighted" ? "resolved" : "unsupported";
    shareStatus.value =
      highlightState === "highlighted"
        ? "Shared quote highlighted"
        : "Shared quote located; exact highlighting is unsupported";
    if (managesUrl) {
      const location = currentReadingLocation();
      if (location) {
        const url = pageTurnTextTargetUrl(
          readingLocationUrl(location, false),
          resolution.target,
        );
        globalThis.history.replaceState({ v3Location: true }, "", url);
      }
    }
  } catch (error: unknown) {
    if (!isCurrent()) {
      return;
    }
    reader.dataset.v3SharedTarget = "unresolved";
    shareStatus.value =
      error instanceof Error
        ? `Shared quote unavailable: ${error.message}`
        : "Shared quote unavailable";
    console.warn("V3 shared quote could not be restored", error);
  }
}

async function restoreHistoryLocation(): Promise<void> {
  if (!manifest) {
    return;
  }
  const params = new URLSearchParams(globalThis.location.search);
  const version = ++historyRestoreVersion;
  const historyBookId = params.get("book") ?? requestedBookId;
  if (historyBookId !== manifest.bookId) {
    globalThis.location.reload();
    return;
  }
  const chapterId = params.get("chapter");
  const anchor = decodeLocationHash();
  const restoredMediaTreatment = mediaTreatmentFrom(params);
  const restoredMediaStyle = mediaStyleFrom(params);
  if (anchor && chapterId === null) {
    throw new Error(
      "V3 source-anchor URLs must include their chapter parameter",
    );
  }
  applyingHistory = true;
  try {
    if (restoredMediaTreatment !== mediaTreatment) {
      setMediaTreatment(restoredMediaTreatment);
    }
    if (
      restoredMediaStyle.style !== mediaStyle ||
      restoredMediaStyle.explicitUserSelection !== mediaStyleUserSelected
    ) {
      setMediaStyle(
        restoredMediaStyle.style,
        restoredMediaStyle.explicitUserSelection,
      );
    }
    await goToLocation(chapterId ?? "", anchor, "none");
    if (version !== historyRestoreVersion) {
      return;
    }
    await restoreTextTargetFromUrl(
      params.get("selection"),
      params.get("edition"),
      chapterId,
      () => version === historyRestoreVersion,
    );
    if (version !== historyRestoreVersion) {
      return;
    }
    const restored = currentReadingLocation();
    if (restored) {
      writeResumeLocation(restored);
    }
  } finally {
    if (version === historyRestoreVersion) {
      applyingHistory = false;
    }
  }
}

function onPopState(): void {
  closeSourceCard(false);
  closeShareComposer(false);
  void restoreHistoryLocation().catch((error: unknown) => {
    reportFailure("V3 could not restore the browser location", error);
  });
}

async function initializePersonalData(): Promise<void> {
  if (!manifest || destroyed) {
    return;
  }
  try {
    const store = await openPageTurnPersonalStore();
    if (destroyed) {
      store.close();
      return;
    }
    try {
      const personal = await store.migrateLegacyEdition(
        manifest.bookId,
        manifest.editionId,
        resolveLegacyAnnotation,
      );
      if (destroyed) {
        store.close();
        return;
      }
      personalStore = store;
      bookmarks = personal.bookmarks;
      annotations = personal.annotations;
      personalStatus.value =
        personal.migratedBookmarks + personal.migratedAnnotations > 0
          ? `Migrated ${personal.migratedBookmarks} bookmark${
              personal.migratedBookmarks === 1 ? "" : "s"
            } and ${personal.migratedAnnotations} annotation${
              personal.migratedAnnotations === 1 ? "" : "s"
            } to versioned local storage.`
          : "Bookmarks and annotations are stored only in this browser.";
    } catch (error) {
      const personal = await store.readEdition(
        manifest.bookId,
        manifest.editionId,
      );
      if (destroyed) {
        store.close();
        return;
      }
      personalStore = store;
      bookmarks = personal.bookmarks;
      annotations = personal.annotations;
      personalStatus.value =
        error instanceof Error
          ? error.message
          : "Stored beta data could not be migrated.";
    }
  } catch (error) {
    personalStore?.close();
    personalStore = undefined;
    personalStatus.value =
      error instanceof Error
        ? error.message
        : "Personal storage is unavailable.";
  }
  if (destroyed) {
    return;
  }
  renderPersonalTools();
  renderPersonalTextHighlights();
  renderMarginalia();
}

async function initialize(): Promise<void> {
  const sourceCardReady =
    sourceLinkMode === "direct" ? undefined : loadSourceCardModule();
  const loaded = await fetchManifest();
  await sourceCardReady;
  manifest = loaded.manifest;
  manifestUrl = loaded.url;
  if (manifest.bookId !== requestedBookId) {
    throw new Error(
      `V3 requested ${requestedBookId} but loaded ${manifest.bookId}`,
    );
  }
  mediaConfig = options.media ?? manifest.media;
  mediaConfigSource = options.media === undefined ? "manifest" : "host";
  mediaTreatment = mediaTreatmentFrom(query);
  const initialMediaStyle = mediaStyleFrom(query);
  mediaStyle = initialMediaStyle.style;
  mediaStyleUserSelected = initialMediaStyle.explicitUserSelection;
  applyPublicationIdentity(manifest);
  readMarginaliaPreferences();
  applyFontScale(readBookFontScale(manifest.bookId, 1));
  renderContents();
  chapterStates = manifest.chapters.map((chapter, index) => ({
    chapter,
    index,
    status: "idle",
    blocks: undefined,
    pages: undefined,
    promise: undefined,
    error: undefined,
    pageParity: undefined,
  }));
  const initialLocation = initialReadingLocation(manifest);
  resumedFromStorage = initialLocation?.source === "resume";
  const initialChapterIndex = initialLocation
    ? chapterStates.findIndex(
        ({ chapter }) =>
          String(chapter.chapterId) === initialLocation.location.chapterId,
      )
    : 0;
  const initialWindowCenter = Math.max(0, initialChapterIndex);
  retainedChapterIndices = [initialWindowCenter];
  await document.fonts.ready;
  await waitForPageLayout();
  rebuildPages();
  try {
    await ensureChapterLoaded(initialWindowCenter);
  } catch (error: unknown) {
    rebuildPages();
    const placeholderIndex = pages.findIndex(
      (page) =>
        page.kind === "placeholder" &&
        page.chapterIndex === initialWindowCenter,
    );
    if (placeholderIndex >= 0) {
      const step = pageStep();
      spreadStart = Math.floor(placeholderIndex / step) * step;
      const failedChapter = chapterStates[initialWindowCenter]?.chapter;
      chapterSelect.value = failedChapter
        ? String(failedChapter.chapterId)
        : "";
      renderStationary("none");
    }
    locationTrackingReady = true;
    opening = false;
    reader.dataset.v3Opening = "false";
    renderControls();
    throw error;
  }
  rebuildPages();
  if (initialLocation) {
    try {
      positionAtLocation(
        initialLocation.location.chapterId,
        initialLocation.location.anchor,
        "none",
      );
    } catch (error: unknown) {
      if (initialLocation.source !== "resume") {
        throw error;
      }
      console.warn("V3 saved source anchor could not be restored", error);
      positionAtLocation(
        initialLocation.location.chapterId,
        undefined,
        "none",
      );
    }
  }
  if (resumedFromStorage) {
    const chapter = manifest.chapters.find(
      ({ chapterId }) =>
        String(chapterId) === initialLocation?.location.chapterId,
    );
    resumeLabel.textContent =
      `Resumed at ${chapter?.title ?? "your last reading location"}.`;
    resumeNotice.hidden = false;
  }
  locationTrackingReady = true;
  syncCurrentLocation("replace");
  await restoreTextTargetFromUrl(
    requestedSelectionToken,
    requestedEditionId,
    requestedChapterId,
  );
  reportReady();
  startOpening();
  queueChapterWindow(initialWindowCenter);
  void initializePersonalData();
}

function selectionShortcutText(): string {
  if (!selectionShortcut) {
    return "Use the Selection actions control to move focus to these actions.";
  }
  const parts = [
    selectionShortcut.ctrlKey ? "Ctrl" : "",
    selectionShortcut.altKey ? "Alt" : "",
    selectionShortcut.shiftKey ? "Shift" : "",
    selectionShortcut.metaKey ? "Meta" : "",
    selectionShortcut.key.toUpperCase(),
  ].filter(Boolean);
  return `Press ${parts.join("+")} to move focus to selection actions.`;
}

function selectionShortcutAria(): string | undefined {
  if (!selectionShortcut) {
    return undefined;
  }
  return [
    selectionShortcut.ctrlKey ? "Control" : "",
    selectionShortcut.altKey ? "Alt" : "",
    selectionShortcut.shiftKey ? "Shift" : "",
    selectionShortcut.metaKey ? "Meta" : "",
    selectionShortcut.key.toUpperCase(),
  ]
    .filter(Boolean)
    .join("+");
}

function matchesSelectionShortcut(event: KeyboardEvent): boolean {
  return (
    selectionShortcut !== undefined &&
    event.key.toLowerCase() === selectionShortcut.key.toLowerCase() &&
    event.altKey === (selectionShortcut.altKey ?? false) &&
    event.ctrlKey === (selectionShortcut.ctrlKey ?? false) &&
    event.metaKey === (selectionShortcut.metaKey ?? false) &&
    event.shiftKey === (selectionShortcut.shiftKey ?? false)
  );
}

function focusSelectionActions(): void {
  const selection = pendingSelection;
  if (!selectionActionsEnabled || !selection?.target) {
    return;
  }
  if (selectionActions.hidden) {
    showPermanentSelectionActions();
  }
  const source = selection.source;
  if (source?.isConnected) {
    selectionReturnTarget = source;
    selectionReturnTargetHadTabindex = source.hasAttribute("tabindex");
    if (!selectionReturnTargetHadTabindex) {
      source.tabIndex = -1;
    }
  }
  selectionFocusActive = true;
  selectionActionButtonsAvailable()[0]?.focus({ preventScroll: true });
}

function onSelectionActionsKeyDown(event: KeyboardEvent): void {
  const available = selectionActionButtonsAvailable();
  const activeIndex = available.indexOf(
    document.activeElement as HTMLButtonElement,
  );
  if (event.key === "Escape") {
    event.preventDefault();
    dismissSelectionActions(true, true);
    return;
  }
  if (activeIndex < 0) {
    return;
  }
  let nextIndex: number | undefined;
  if (event.key === "ArrowRight") {
    nextIndex = (activeIndex + 1) % available.length;
  } else if (event.key === "ArrowLeft") {
    nextIndex = (activeIndex - 1 + available.length) % available.length;
  } else if (event.key === "Home") {
    nextIndex = 0;
  } else if (event.key === "End") {
    nextIndex = available.length - 1;
  } else if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    available[activeIndex]?.click();
  }
  if (nextIndex !== undefined) {
    event.preventDefault();
    for (const [index, button] of available.entries()) {
      button.tabIndex = index === nextIndex ? 0 : -1;
    }
    available[nextIndex]?.focus({ preventScroll: true });
  }
}

selectionDescription.textContent = selectionShortcutText();
const shortcutAria = selectionShortcutAria();
if (shortcutAria) {
  selectionActions.setAttribute("aria-keyshortcuts", shortcutAria);
  selectionEntry.setAttribute("aria-keyshortcuts", shortcutAria);
} else {
  selectionActions.removeAttribute("aria-keyshortcuts");
  selectionEntry.removeAttribute("aria-keyshortcuts");
}

const lifecycle = new AbortController();
const listenerOptions = { signal: lifecycle.signal };

for (const corner of corners) {
  corner.addEventListener("pointerdown", onCornerPointerDown, listenerOptions);
}
spread.addEventListener("pointermove", onPointerMove, listenerOptions);
spread.addEventListener("pointerup", onPointerEnd, listenerOptions);
spread.addEventListener("pointercancel", onPointerCancel, listenerOptions);
stationary.addEventListener(
  "pointerdown",
  (event) => {
    if (event.isPrimary) {
      lastSelectionModality =
        event.pointerType === "touch"
          ? "touch"
          : event.pointerType === "pen"
            ? "pen"
            : "mouse";
    }
  },
  listenerOptions,
);
stationary.addEventListener("click", onStationaryClick, listenerOptions);
stationary.addEventListener(
  "click",
  (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }
    const note = event.target.closest<HTMLElement>(
      "[data-v3-annotation-open]",
    );
    if (note?.dataset.v3AnnotationOpen) {
      event.preventDefault();
      openAnnotationDetail(note.dataset.v3AnnotationOpen, note);
      return;
    }
    const group = event.target.closest<HTMLElement>(
      "[data-v3-annotation-group]",
    );
    if (group?.dataset.v3AnnotationGroup) {
      event.preventDefault();
      openAnnotationGroup(group.dataset.v3AnnotationGroup.split(","), group);
    }
  },
  listenerOptions,
);
previous.addEventListener(
  "click",
  () => void automaticTurn("backward"),
  listenerOptions,
);
next.addEventListener(
  "click",
  () => void automaticTurn("forward"),
  listenerOptions,
);
decreaseFont.addEventListener(
  "click",
  () => setFontScale(fontScale - 0.1),
  listenerOptions,
);
increaseFont.addEventListener(
  "click",
  () => setFontScale(fontScale + 0.1),
  listenerOptions,
);
shareButton.addEventListener(
  "click",
  () => void shareFromPrimaryControl(),
  listenerOptions,
);
shareDialog.addEventListener(
  "close",
  () => {
    const restoreFocus = restoreFocusAfterShareClose;
    restoreFocusAfterShareClose = true;
    cancelShareComposerWork();
    dismissSelectionActions();
    if (restoreFocus) {
      restoreShareComposerFocus();
    } else {
      shareComposerReturnFocus = undefined;
      shareComposerReturnFocusHadTabindex = false;
    }
  },
  listenerOptions,
);
sourceDialog.addEventListener(
  "click",
  (event) => {
    const loadPreview =
      event.target instanceof Element
        ? event.target.closest<HTMLButtonElement>(
            "[data-v3-source-preview-load]",
          )
        : null;
    if (loadPreview) {
      void activateSourcePreview(loadPreview);
      return;
    }
    const sourceNavigation =
      event.target instanceof Element
        ? event.target.closest<HTMLAnchorElement>("a[href]")
        : null;
    if (sourceNavigation) {
      closeExternalPreview();
    }
    const copy =
      event.target instanceof Element
        ? event.target.closest<HTMLButtonElement>("[data-v3-source-copy]")
        : null;
    if (copy?.dataset.v3SourceCopy) {
      const version = sourceResolutionVersion;
      void loadSourceCardModule().then(
        ({ copyPageTurnSourceLink }) =>
          copyPageTurnSourceLink(
            document,
            copy.dataset.v3SourceCopy ?? "",
            sourceStatus,
            () =>
              !destroyed &&
              version === sourceResolutionVersion &&
              sourceDialog.open,
          ),
        (error: unknown) => sourceFailure(error),
      );
    }
  },
  listenerOptions,
);
sourceDialog.addEventListener(
  "close",
  () => {
    closeExternalPreview();
    sourceResolutionVersion += 1;
    sourceController?.abort();
    sourceController = undefined;
    const returnFocus = sourceReturnFocus;
    sourceReturnFocus = undefined;
    if (returnFocus?.isConnected) {
      returnFocus.focus({ preventScroll: true });
    }
  },
  listenerOptions,
);
shareFinal.addEventListener("click", () => void finalShare(), listenerOptions);
shareCopyText.addEventListener(
  "click",
  () => void copyShareText(),
  listenerOptions,
);
shareCopyImage.addEventListener(
  "click",
  () => void copyShareImage(),
  listenerOptions,
);
shareDownload.addEventListener("click", downloadShareImage, listenerOptions);
shareOpenImage.addEventListener("click", openShareImage, listenerOptions);
appearanceButton.addEventListener(
  "click",
  openAppearanceDialog,
  listenerOptions,
);
closeAppearance.addEventListener(
  "click",
  () => appearanceDialog.close(),
  listenerOptions,
);
appearancePreset.addEventListener(
  "change",
  () =>
    setBookAppearance(
      appearancePreset.value as PageTurnAppearancePresetId,
    ),
  listenerOptions,
);
appearanceForm.addEventListener(
  "input",
  (event) => {
    if (
      event.target === appearancePreset ||
      (event.target instanceof HTMLInputElement &&
        event.target.type === "number")
    ) {
      return;
    }
    setBookAppearance(appearanceFromControls());
  },
  listenerOptions,
);
appearanceForm.addEventListener(
  "change",
  (event) => {
    if (
      event.target instanceof HTMLInputElement &&
      event.target.type === "number"
    ) {
      setBookAppearance(appearanceFromControls());
    }
  },
  listenerOptions,
);
resetAppearance.addEventListener(
  "click",
  () =>
    setBookAppearance(
      options.appearancePreset ?? baseAppearance.preset ?? "default",
    ),
  listenerOptions,
);
exploreButton.addEventListener("click", () => openExploreDialog(), listenerOptions);
exploreDialog.addEventListener("click", onExploreDialogClick, listenerOptions);
exploreDialog.addEventListener("close", onExploreDialogClose, listenerOptions);
showMarginalia.addEventListener(
  "change",
  () => {
    annotationAppearance = {
      ...annotationAppearance,
      showMarginalia: showMarginalia.checked,
    };
    applyAnnotationAppearance();
    writeMarginaliaPreferences();
    renderMarginalia();
  },
  listenerOptions,
);
readableMarginalia.addEventListener(
  "change",
  () => {
    applyAnnotationAppearance();
    writeMarginaliaPreferences();
  },
  listenerOptions,
);
annotationDialog.addEventListener(
  "click",
  (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }
    const grouped = event.target.closest<HTMLElement>(
      "[data-v3-grouped-annotation]",
    )?.dataset.v3GroupedAnnotation;
    if (grouped) {
      openAnnotationDetail(grouped, annotationReturnFocus);
    }
  },
  listenerOptions,
);
annotationDialog.addEventListener(
  "close",
  () => {
    let returnFocus =
      annotationReturnFocus?.isConnected &&
      !annotationReturnFocus.closest("dialog:not([open])")
        ? annotationReturnFocus
        : undefined;
    if (!returnFocus && activeAnnotationId) {
      returnFocus =
        stationary.querySelector<HTMLElement>(
          `[data-v3-annotation-open="${CSS.escape(activeAnnotationId)}"]`,
        ) ?? undefined;
      returnFocus ??= Array.from(
        stationary.querySelectorAll<HTMLElement>("[data-v3-annotation-group]"),
      ).find((candidate) =>
        candidate.dataset.v3AnnotationGroup
          ?.split(",")
          .includes(activeAnnotationId ?? ""),
      );
    }
    if (returnFocus) {
      returnFocus.focus({ preventScroll: true });
    }
    annotationReturnFocus = undefined;
    activeAnnotationId = undefined;
  },
  listenerOptions,
);
updateAnnotation.addEventListener(
  "click",
  () => void updateCurrentAnnotation(),
  listenerOptions,
);
deleteOpenAnnotation.addEventListener(
  "click",
  () => {
    const id = activeAnnotationId;
    if (id) {
      void deleteAnnotationById(id).then((deleted) => {
        if (deleted) {
          annotationDialog.close();
        }
      });
    }
  },
  listenerOptions,
);
exploreOpenAnnotation.addEventListener(
  "click",
  () => {
    const id = activeAnnotationId;
    annotationDialog.close();
    openExploreDialog();
    requestAnimationFrame(() =>
      annotationList
        .querySelector<HTMLElement>(
          `[data-v3-annotation-item="${CSS.escape(id ?? "")}"] button`,
        )
        ?.focus({ preventScroll: true }),
    );
  },
  listenerOptions,
);
searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void runSearch(searchInput.value).catch((error: unknown) => {
    searchStatus.textContent =
      error instanceof DOMException && error.name === "AbortError"
        ? "Search cancelled."
        : `Search failed: ${prototypeErrorMessage(error)}`;
  });
}, listenerOptions);
bookmarkCurrent.addEventListener(
  "click",
  () => void toggleCurrentBookmark(),
  listenerOptions,
);
saveAnnotation.addEventListener(
  "click",
  () => void saveCurrentAnnotation(),
  listenerOptions,
);
exportAnnotations.addEventListener(
  "click",
  exportPrivateAnnotations,
  listenerOptions,
);
backupAnnotations.addEventListener(
  "click",
  backupPrivateAnnotations,
  listenerOptions,
);
importAnnotations.addEventListener(
  "change",
  () => {
    const file = importAnnotations.files?.[0];
    if (file) {
      void previewAnnotationFile(file);
    }
  },
  listenerOptions,
);
confirmReplace.addEventListener("change", renderPersonalTools, listenerOptions);
importMerge.addEventListener(
  "click",
  () => void applyAnnotationImport("merge"),
  listenerOptions,
);
importReplace.addEventListener(
  "click",
  () => void applyAnnotationImport("replace"),
  listenerOptions,
);
deleteEdition.addEventListener(
  "click",
  () => void deletePersonalData(false),
  listenerOptions,
);
deletePublication.addEventListener(
  "click",
  () => void deletePersonalData(true),
  listenerOptions,
);
startOver.addEventListener("click", startFromBeginning, listenerOptions);
selectionEntry.addEventListener("click", focusSelectionActions, listenerOptions);
selectionActions.addEventListener(
  "pointerdown",
  (event) => {
    if (event.isPrimary) {
      event.preventDefault();
    }
  },
  listenerOptions,
);
selectionActions.addEventListener(
  "click",
  (event) => {
    const button =
      event.target instanceof Element
        ? event.target.closest<HTMLButtonElement>("[data-v3-selection-action]")
        : null;
    if (button && !button.disabled) {
      activateSelectionAction(button.dataset.v3SelectionAction);
    }
  },
  listenerOptions,
);
selectionActions.addEventListener(
  "keydown",
  onSelectionActionsKeyDown,
  listenerOptions,
);
selectionUndo.addEventListener(
  "click",
  () => void undoSelectionHighlight(),
  listenerOptions,
);
mediaSelect.addEventListener("change", () => {
  try {
    setMediaTreatment(mediaSelect.value);
  } catch (error: unknown) {
    reportFailure("V3 could not change the image treatment", error);
  }
}, listenerOptions);
mediaStyleSelect.addEventListener("change", () => {
  try {
    setMediaStyle(mediaStyleSelect.value);
  } catch (error: unknown) {
    reportFailure("V3 could not change the image style", error);
  }
}, listenerOptions);
mediaDialog.addEventListener("close", onMediaDialogClose, listenerOptions);
chapterSelect.addEventListener("change", () =>
  void goToChapter(chapterSelect.value).catch((error: unknown) => {
    reportFailure("V3 could not open the selected chapter", error);
  }),
  listenerOptions,
);

const onKeyDown = (event: KeyboardEvent) => {
  if (
    options.keyboardScope !== "document" &&
    root instanceof Element &&
    (!(event.target instanceof Node) || !root.contains(event.target))
  ) {
    return;
  }
  if (
    event.key === "Escape" &&
    (!selectionActions.hidden || !selectionEntry.hidden)
  ) {
    event.preventDefault();
    dismissSelectionActions(true, selectionFocusActive);
    return;
  }
  if (matchesSelectionShortcut(event)) {
    if (pendingSelection?.target && selectionActionsEnabled) {
      event.preventDefault();
      focusSelectionActions();
    }
    return;
  }
  if (event.shiftKey) {
    lastSelectionModality = "keyboard";
  }
  if (
    mediaDialog.open ||
    sourceDialog.open ||
    appearanceDialog.open ||
    exploreDialog.open ||
    shareDialog.open ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    (event.target instanceof Element &&
      event.target.closest("a, button, input, select, textarea") !== null)
  ) {
    return;
  }
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    void automaticTurn("backward");
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    void automaticTurn("forward");
  }
};
document.addEventListener("keydown", onKeyDown, listenerOptions);
document.addEventListener("selectionchange", onSelectionChange, listenerOptions);
document.addEventListener(
  "pointerdown",
  (event) => {
    const actionTarget =
      event.target instanceof Element
        ? event.target.closest(
            "[data-v3-selection-actions], [data-v3-selection-entry], " +
              "[data-v3-share], [data-v3-explore]",
          )
        : null;
    if (
      (!selectionActions.hidden || !selectionEntry.hidden) &&
      event.target instanceof Node &&
      actionTarget === null
    ) {
      dismissSelectionActions();
    }
  },
  { capture: true, signal: lifecycle.signal },
);
if (managesUrl) {
  globalThis.addEventListener("popstate", onPopState, listenerOptions);
}

const observer = new ResizeObserver(() => {
  dismissSelectionActions();
  if (!manifest || pages.length === 0) {
    return;
  }
  if (resizeTimer !== undefined) {
    clearTimeout(resizeTimer);
  }
  if (appearanceTimer !== undefined) {
    clearTimeout(appearanceTimer);
  }
  resizeTimer = globalThis.setTimeout(() => {
    resizeTimer = undefined;
    const preservation = currentPreservation();
    if (activeTurn) {
      finishTurn(false);
    }
    try {
      rebuildPages(
        preservation.anchor,
        preservation.progress,
        preservation.chapterIndex,
        preservation.chapterPageOffset,
      );
      reportReadyIfHealthy();
    } catch (error: unknown) {
      reportFailure("V3 could not repaginate", error);
    }
  }, 120);
});
observer.observe(spread);
globalThis.visualViewport?.addEventListener(
  "resize",
  queueSelectionActionPlacement,
  listenerOptions,
);
globalThis.visualViewport?.addEventListener(
  "scroll",
  queueSelectionActionPlacement,
  listenerOptions,
);

function destroy(): void {
  if (destroyed) {
    return;
  }
  destroyed = true;
  closeSourceCard(false);
  closeShareComposer(false);
  lifecycle.abort();
  requestController.abort();
  observer.disconnect();
  searchController?.abort();
  personalStore?.close();
  personalStore = undefined;
  dismissSelectionActions();
  clearSharedTextHighlight();
  clearPersonalTextHighlights();
  mediaDialogImage.removeAttribute("src");
  chapterSelect.replaceChildren();
  if (resizeTimer !== undefined) {
    clearTimeout(resizeTimer);
  }
  if (appearanceTimer !== undefined) {
    clearTimeout(appearanceTimer);
  }
  if (openingTimer !== undefined) {
    clearTimeout(openingTimer);
  }
  if (selectionUndoTimer !== undefined) {
    clearTimeout(selectionUndoTimer);
  }
  if (selectionFeedbackTimer !== undefined) {
    clearTimeout(selectionFeedbackTimer);
  }
  if (activeTurn?.animationFrame !== undefined) {
    cancelAnimationFrame(activeTurn.animationFrame);
  }
  if (activeTurn?.pointerFrame !== undefined) {
    cancelAnimationFrame(activeTurn.pointerFrame);
  }
  if (
    assignedDocumentTitle &&
    document.title === assignedDocumentTitle
  ) {
    document.title = originalDocumentTitle;
  }
  const embeddedRoot = root instanceof HTMLElement ? root : document.body;
  embeddedRoot.classList.remove("v3-page-embedded");
  delete pageRoot?.dataset.v3Turning;
}

globalThis.addEventListener("pagehide", destroy, {
  once: true,
  signal: lifecycle.signal,
});

configureBackNavigation();
const ready = initialize().catch((error: unknown) => {
  if (
    destroyed &&
    error instanceof DOMException &&
    error.name === "AbortError"
  ) {
    return;
  }
  reportFailure("V3 could not initialize", error);
  throw error;
});

return {
  ready,
  getAppearance: () => currentAppearance,
  setAppearance: setBookAppearance,
  getAnnotationAppearance: () => ({ ...annotationAppearance }),
  setAnnotationAppearance,
  destroy,
};
}
