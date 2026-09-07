import {
  approvedPageTurnLocalReading,
  normalizePageTurnSourceUrl,
  pageTurnSourceDisplayDomain,
  validatePageTurnSourceRecord,
  type PageTurnSourceRecord,
  type PageTurnSourceResolution,
} from "./source.js";
import {
  matchPageTurnExternalPreviewProvider,
  type PageTurnExternalPreviewProvider,
} from "./external-preview.js";

export { approvedPageTurnLocalReading };

export type PageTurnSourceCardInput = Readonly<{
  authoredUrl: URL;
  citation: string;
  resolution?: PageTurnSourceResolution;
  error?: string;
  pending?: boolean;
}>;

export type PageTurnSourceCardElements = Readonly<{
  availability: HTMLElement;
  title: HTMLElement;
  citation: HTMLElement;
  metadata: HTMLDListElement;
  candidates: HTMLElement;
  candidateList: HTMLOListElement;
  actions: HTMLElement;
  preview: HTMLElement;
  status: HTMLOutputElement;
}>;

export type PageTurnSourceLocalUrl = (
  target: NonNullable<PageTurnSourceRecord["localReading"]>,
) => URL | undefined;

function element<K extends keyof HTMLElementTagNameMap>(
  document: Document,
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

function metadataRow(
  document: Document,
  term: string,
  value: string,
): HTMLDivElement {
  const row = element(document, "div");
  row.append(
    element(document, "dt", undefined, term),
    element(document, "dd", undefined, value),
  );
  return row;
}

function externalAction(
  document: Document,
  label: string,
  href: string,
): HTMLAnchorElement {
  const action = element(document, "a", "v3-source-external-action", label);
  action.href = href;
  action.target = "_blank";
  action.rel = "noopener noreferrer";
  action.referrerPolicy = "no-referrer";
  action.append(
    element(
      document,
      "span",
      "v3-visually-hidden",
      " (external, opens in a new tab)",
    ),
  );
  return action;
}

function localReadingLabel(
  target: NonNullable<PageTurnSourceRecord["localReading"]>,
): string {
  if (target.kind === "full-edition") {
    return "Complete local edition";
  }
  if (target.kind === "excerpt") {
    return "Approved local excerpt";
  }
  return "Independent local source guide";
}

export function validatePageTurnSourceResolution(
  resolution: unknown,
  authoredUrl: URL,
): PageTurnSourceResolution {
  if (typeof resolution !== "object" || resolution === null) {
    throw new Error("PageTurn resolver returned an invalid source resolution");
  }
  const candidate = resolution as Readonly<Record<string, unknown>>;
  if (typeof candidate.kind !== "string") {
    throw new Error("PageTurn resolver returned an invalid source resolution kind");
  }
  if (candidate.kind === "external-card") {
    if (typeof candidate.url !== "string") {
      throw new Error("PageTurn external source resolution needs a URL");
    }
    normalizePageTurnSourceUrl(candidate.url);
    if (candidate.record !== undefined) {
      validatePageTurnSourceRecord(candidate.record as PageTurnSourceRecord);
    }
  } else if (candidate.kind === "ambiguous") {
    if (typeof candidate.url !== "string") {
      throw new Error("PageTurn ambiguous source resolution needs a URL");
    }
    normalizePageTurnSourceUrl(candidate.url);
    if (!Array.isArray(candidate.candidates) || candidate.candidates.length < 2) {
      throw new Error("PageTurn ambiguous source resolution needs two candidates");
    }
    for (const record of candidate.candidates) {
      validatePageTurnSourceRecord(record as PageTurnSourceRecord);
    }
  } else if (candidate.kind === "direct-external") {
    if (typeof candidate.url !== "string") {
      throw new Error("PageTurn direct external source resolution needs a URL");
    }
    normalizePageTurnSourceUrl(candidate.url);
  } else if (candidate.kind === "local-publication") {
    validatePageTurnSourceRecord(candidate.record as PageTurnSourceRecord);
    if (typeof candidate.target !== "object" || candidate.target === null) {
      throw new Error("PageTurn resolver returned an invalid local source target");
    }
    const record = candidate.record as PageTurnSourceRecord;
    const target = candidate.target as NonNullable<
      PageTurnSourceRecord["localReading"]
    >;
    const approved = approvedPageTurnLocalReading(record);
    if (
      !approved ||
      approved.kind !== target.kind ||
      approved.bookId !== target.bookId ||
      approved.editionId !== target.editionId ||
      approved.chapterId !== target.chapterId ||
      approved.anchor !== target.anchor
    ) {
      throw new Error("PageTurn resolver returned an invalid local source target");
    }
  } else {
    throw new Error(
      `PageTurn resolver returned an unknown source resolution kind: ${candidate.kind}`,
    );
  }
  normalizePageTurnSourceUrl(authoredUrl);
  return resolution as PageTurnSourceResolution;
}

function appendReviewedMetadata(
  document: Document,
  elements: PageTurnSourceCardElements,
  record: PageTurnSourceRecord,
): void {
  elements.metadata.append(metadataRow(document, "Reviewed title", record.title));
  if (record.publisher) {
    elements.metadata.append(metadataRow(document, "Publisher", record.publisher));
  }
  if (record.publicationDate) {
    elements.metadata.append(
      metadataRow(document, "Publication date", record.publicationDate),
    );
  }
  elements.metadata.append(
    metadataRow(document, "Reviewed canonical URL", record.canonicalUrl),
    metadataRow(document, "Registry record", record.id),
    metadataRow(document, "Metadata reviewed", record.reviewedAt),
  );
  if (record.repository?.revision) {
    elements.metadata.append(
      metadataRow(document, "Repository revision", record.repository.revision),
    );
  }
  if (record.relation) {
    elements.metadata.append(
      metadataRow(document, "Relationship", record.relation),
    );
  }
  if (record.rights) {
    elements.metadata.append(
      metadataRow(
        document,
        "Source rights",
        [
          record.rights.status,
          record.rights.license,
          record.rights.attribution,
        ]
          .filter(Boolean)
          .join(" · "),
      ),
    );
  }
}

function appendCandidate(
  document: Document,
  elements: PageTurnSourceCardElements,
  record: PageTurnSourceRecord,
  localUrl: PageTurnSourceLocalUrl,
): void {
  const item = element(document, "li");
  item.append(
    element(
      document,
      "strong",
      undefined,
      `${record.title} · ${record.sourceType}`,
    ),
    element(document, "span", undefined, ` Reviewed ${record.reviewedAt}. `),
    externalAction(document, "Open reviewed source", record.canonicalUrl),
  );
  const local = approvedPageTurnLocalReading(record);
  const targetUrl = local ? localUrl(local) : undefined;
  if (local && targetUrl) {
    const action = element(
      document,
      "a",
      undefined,
      "Read this candidate in PageTurn",
    );
    action.href = targetUrl.href;
    item.append(document.createTextNode(" "), action);
  }
  elements.candidateList.append(item);
}

export async function copyPageTurnSourceLink(
  document: Document,
  url: string,
  status: HTMLOutputElement,
  isCurrent: () => boolean,
): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      if (isCurrent()) {
        status.value = "Source link copied.";
      }
      return;
    }
    const input = element(document, "textarea", "v3-visually-hidden");
    input.value = url;
    input.readOnly = true;
    document.body.append(input);
    input.select();
    const copied = document.execCommand("copy");
    input.remove();
    if (isCurrent()) {
      status.value = copied
        ? "Source link copied."
        : "Copy is unavailable. Use the displayed original URL.";
    }
  } catch (error) {
    if (isCurrent()) {
      status.value =
        error instanceof Error
          ? `Copy failed: ${error.message}`
          : "Copy failed. Use the displayed original URL.";
    }
  }
}

export function renderPageTurnSourceCard(
  document: Document,
  elements: PageTurnSourceCardElements,
  input: PageTurnSourceCardInput,
  localUrl: PageTurnSourceLocalUrl,
  externalPreviewProviders: readonly PageTurnExternalPreviewProvider[] = [],
): HTMLElement | undefined {
  const { authoredUrl, citation, resolution } = input;
  const record =
    resolution?.kind === "local-publication" ||
    resolution?.kind === "external-card"
      ? resolution.record
      : undefined;
  const local =
    resolution?.kind === "local-publication"
      ? approvedPageTurnLocalReading(resolution.record)
      : undefined;
  const targetUrl = local ? localUrl(local) : undefined;

  elements.citation.textContent = citation;
  elements.metadata.replaceChildren(
    metadataRow(
      document,
      "Domain",
      pageTurnSourceDisplayDomain(authoredUrl),
    ),
    metadataRow(
      document,
      "Source type",
      record?.sourceType ?? "website (unreviewed)",
    ),
    metadataRow(document, "Original URL", authoredUrl.href),
  );
  elements.title.textContent = record?.title ?? "External source";
  elements.availability.textContent =
    local && targetUrl
      ? "Available in the PageTurn Library"
      : resolution?.kind === "ambiguous"
        ? "Several reviewed sources match"
        : "External source";
  if (record) {
    appendReviewedMetadata(document, elements, record);
  }
  if (local && targetUrl) {
    elements.metadata.append(
      metadataRow(document, "Local access", localReadingLabel(local)),
      metadataRow(document, "Immutable edition", local.editionId),
      metadataRow(document, "Local rights basis", local.rights.basis),
      metadataRow(document, "Local rights reviewed", local.rights.reviewedAt),
    );
    if (local.chapterId) {
      elements.metadata.append(
        metadataRow(document, "Local chapter", local.chapterId),
      );
    }
    if (local.anchor) {
      elements.metadata.append(
        metadataRow(document, "Local anchor", local.anchor),
      );
    }
  }

  elements.candidates.hidden = resolution?.kind !== "ambiguous";
  elements.candidateList.replaceChildren();
  if (resolution?.kind === "ambiguous") {
    for (const candidate of resolution.candidates) {
      appendCandidate(document, elements, candidate, localUrl);
    }
  }

  const actions: HTMLElement[] = [];
  let primary: HTMLElement | undefined;
  if (local && targetUrl) {
    primary = element(document, "a", "v3-source-primary", "Read in PageTurn");
    (primary as HTMLAnchorElement).href = targetUrl.href;
    actions.push(primary);
    actions.push(
      externalAction(document, "Open original source", authoredUrl.href),
    );
    if (local.shelfHref) {
      const shelfUrl = new URL(local.shelfHref, document.baseURI);
      if (shelfUrl.protocol === "http:" || shelfUrl.protocol === "https:") {
        const shelf = element(document, "a", undefined, "View on shelf");
        shelf.href = shelfUrl.href;
        actions.push(shelf);
      }
    }
    if (
      record &&
      normalizePageTurnSourceUrl(record.canonicalUrl) !==
        normalizePageTurnSourceUrl(authoredUrl)
    ) {
      actions.push(
        externalAction(
          document,
          "Open reviewed canonical source",
          record.canonicalUrl,
        ),
      );
    }
  } else {
    const resolvedUrl =
      resolution?.kind === "direct-external"
        ? resolution.url
        : authoredUrl.href;
    primary = externalAction(document, "Open source", resolvedUrl);
    actions.push(primary);
    if (
      record &&
      normalizePageTurnSourceUrl(record.canonicalUrl) !==
        normalizePageTurnSourceUrl(authoredUrl)
    ) {
      actions.push(
        externalAction(
          document,
          "Open reviewed canonical source",
          record.canonicalUrl,
        ),
      );
    } else if (
      normalizePageTurnSourceUrl(resolvedUrl) !==
      normalizePageTurnSourceUrl(authoredUrl)
    ) {
      actions.push(
        externalAction(document, "Open authored source", authoredUrl.href),
      );
    }
    const copy = element(document, "button", undefined, "Copy link");
    copy.type = "button";
    copy.dataset.v3SourceCopy = authoredUrl.href;
    actions.push(copy);
  }
  elements.actions.replaceChildren(...actions);
  elements.preview.hidden = true;
  elements.preview.replaceChildren();
  const previewUrl =
    !input.pending && !input.error && resolution?.kind !== "ambiguous"
      ? resolution?.kind === "direct-external"
        ? resolution.url
        : authoredUrl.href
      : undefined;
  const previewProvider = previewUrl
    ? matchPageTurnExternalPreviewProvider(
        externalPreviewProviders,
        previewUrl,
      )
    : undefined;
  if (previewProvider && previewUrl) {
    const previewDomain = pageTurnSourceDisplayDomain(previewUrl);
    const disclosure = element(
      document,
      "p",
      "v3-source-preview-disclosure",
      `External preview provider “${previewProvider.id}” at ${previewDomain} will receive a request only after you choose to load it.`,
    );
    const load = element(
      document,
      "button",
      "v3-source-preview-load",
      "Load external preview",
    );
    load.type = "button";
    load.dataset.v3SourcePreviewLoad = previewProvider.id;
    load.dataset.v3SourcePreviewUrl = previewUrl;
    const previewStatus = element(
      document,
      "output",
      "v3-source-preview-status",
    );
    previewStatus.dataset.v3SourcePreviewStatus = "";
    previewStatus.setAttribute("role", "status");
    previewStatus.setAttribute("aria-live", "polite");
    const previewHost = element(document, "div", "v3-source-preview-host");
    previewHost.dataset.v3SourcePreviewHost = "";
    elements.preview.replaceChildren(
      disclosure,
      load,
      previewStatus,
      previewHost,
    );
    elements.preview.hidden = false;
  }
  elements.status.value = input.error
    ? input.error
    : input.pending
      ? "Checking the host's reviewed source registry…"
      : resolution?.kind === "ambiguous"
        ? "No destination was selected. Review the candidates or open the authored source."
        : local && !targetUrl
          ? "The host did not provide a safe route to this approved local reading."
          : "No third-party content was requested for this card.";
  return primary;
}
