export type PageTurnBookMediaDisplay = "off" | "on-page" | "pop-out";

export type PageTurnBookMediaStyle =
  | "original"
  | "book-toned"
  | "monochrome"
  | "duotone";

export type PageTurnBookMediaVisualKind =
  | "chart"
  | "diagram"
  | "facsimile"
  | "map"
  | "photo"
  | "portrait";

export type PageTurnBookMediaColorSemantics = "essential" | "decorative";

export type PageTurnBookMediaTreatment = "off" | "on" | "popout";

export type PageTurnBookMediaFigure = Readonly<{
  id: string;
  chapterId: string;
  afterAnchor?: string;
  replaceAnchors?: readonly string[];
  src: string;
  integrity?: string;
  originalSrc?: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
  style?: PageTurnBookMediaStyle;
  visualKind?: PageTurnBookMediaVisualKind;
  colorSemantics?: PageTurnBookMediaColorSemantics;
  transformPermitted?: boolean;
  /** Policy metadata only; PageTurn does not implement source-image export. */
  exportPermitted?: boolean;
  rights?: Readonly<{
    license: string;
    attribution: string;
  }>;
  source?: string;
  provenance?: string;
  reviewedAt?: string;
}>;

export type PageTurnBookMedia = Readonly<{
  defaultDisplay?: PageTurnBookMediaDisplay;
  defaultStyle?: PageTurnBookMediaStyle;
  /** @deprecated Use defaultDisplay. */
  defaultTreatment?: PageTurnBookMediaTreatment;
  figures: readonly PageTurnBookMediaFigure[];
}>;

export function normalizePageTurnBookMediaDisplay(
  value: PageTurnBookMediaDisplay | PageTurnBookMediaTreatment,
): PageTurnBookMediaDisplay {
  switch (value) {
    case "off":
      return "off";
    case "on":
      return "on-page";
    case "popout":
      return "pop-out";
    case "on-page":
    case "pop-out":
      return value;
    default:
      throw new TypeError(`Unsupported media display: ${String(value)}`);
  }
}

export function legacyPageTurnBookMediaTreatment(
  display: PageTurnBookMediaDisplay,
): PageTurnBookMediaTreatment {
  return display === "on-page"
    ? "on"
    : display === "pop-out"
      ? "popout"
      : "off";
}

function hasCompleteRights(figure: PageTurnBookMediaFigure): boolean {
  const reviewedAt =
    typeof figure.reviewedAt === "string" ? figure.reviewedAt : "";
  const reviewedAtValid =
    /^\d{4}-\d{2}-\d{2}$/.test(reviewedAt) &&
    !Number.isNaN(Date.parse(`${reviewedAt}T00:00:00Z`)) &&
    new Date(`${reviewedAt}T00:00:00Z`).toISOString().slice(0, 10) ===
      reviewedAt;
  return (
    figure.rights !== undefined &&
    figure.rights.license.trim().length > 0 &&
    figure.rights.attribution.trim().length > 0 &&
    typeof figure.source === "string" &&
    figure.source.trim().length > 0 &&
    typeof figure.provenance === "string" &&
    figure.provenance.trim().length > 0 &&
    reviewedAtValid
  );
}

export type PageTurnBookMediaSource = "host" | "manifest";

export function resolvePageTurnBookMediaUrl(
  value: string,
  source: PageTurnBookMediaSource,
  hostDocumentBaseUrl: URL,
  manifestUrl: URL,
): string {
  const resolved = new URL(
    value,
    source === "host" ? hostDocumentBaseUrl : manifestUrl,
  );
  if (
    (resolved.protocol !== "http:" && resolved.protocol !== "https:") ||
    resolved.username !== "" ||
    resolved.password !== ""
  ) {
    throw new Error(`V3 media URL uses an unsafe scheme: ${resolved.protocol}`);
  }
  return resolved.href;
}

export function resolvePageTurnBookMediaStyle(
  figure: PageTurnBookMediaFigure,
  requestedStyle: PageTurnBookMediaStyle,
  explicitUserSelection = false,
): PageTurnBookMediaStyle {
  if (requestedStyle === "original") {
    return "original";
  }
  if (figure.transformPermitted !== true || !hasCompleteRights(figure)) {
    return "original";
  }
  if (
    figure.colorSemantics === "essential" &&
    !explicitUserSelection
  ) {
    return "original";
  }
  return requestedStyle;
}

export function defaultPageTurnBookMediaStyle(
  figure: PageTurnBookMediaFigure,
  media: PageTurnBookMedia,
): PageTurnBookMediaStyle {
  const requested =
    figure.style ??
    (figure.visualKind === "photo" || figure.visualKind === "portrait"
      ? (media.defaultStyle ?? "original")
      : "original");
  return resolvePageTurnBookMediaStyle(figure, requested, false);
}
