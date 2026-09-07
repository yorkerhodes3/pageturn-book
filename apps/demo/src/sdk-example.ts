import {
  PAGE_TURN_APPEARANCE_PRESETS,
  createPageTurnBook,
  createPageTurnSourceResolver,
  mountPageTurnBookShell,
  type PageTurnBookHandle,
  type PageTurnExternalPreviewProvider,
  type PageTurnSharePolicy,
  type PageTurnSourceResolver,
} from "@ethical-tech/pageturn-book";
import "@ethical-tech/pageturn-book/styles.css";
import "./v3-demo-host.css";

const root = document.querySelector<HTMLElement>("#page-turn-book");
const destroyButton = document.querySelector<HTMLButtonElement>(
  "[data-sdk-destroy]",
);

if (!root || !destroyButton) {
  throw new Error("The SDK example is missing its mount controls");
}

if (new URLSearchParams(globalThis.location.search).get("hidden") === "1") {
  root.hidden = true;
}

const sdkQuery = new URLSearchParams(globalThis.location.search);
const sourceScenario = sdkQuery.get("source");
const previewScenario = sourceScenario?.startsWith("preview-") ?? false;
const shareMode = sdkQuery.get("share");
const requestedQuoteMaximum = Number(sdkQuery.get("quoteMax"));
const quoteMaximum =
  Number.isSafeInteger(requestedQuoteMaximum) &&
  requestedQuoteMaximum >= 2 &&
  requestedQuoteMaximum <= 2_000
    ? requestedQuoteMaximum
    : 800;
const sharePolicy: PageTurnSharePolicy | undefined =
  shareMode === "visual"
    ? {
        location: "public",
        quote: { permitted: true, maximumCharacters: quoteMaximum },
        visual: {
          permitted: true,
          maximumContextCharacters: 240,
          sourceImages: "none",
        },
      }
    : shareMode === "quote"
      ? {
          location: "public",
          quote: { permitted: true, maximumCharacters: quoteMaximum },
          visual: {
            permitted: false,
            maximumContextCharacters: 0,
            sourceImages: "none",
          },
        }
      : shareMode === "anchor"
        ? {
            location: "public",
            quote: { permitted: false, maximumCharacters: 0 },
            visual: {
              permitted: false,
              maximumContextCharacters: 0,
              sourceImages: "none",
            },
          }
        : shareMode === "invalid"
          ? ({
              location: "public",
              quote: { permitted: false, maximumCharacters: 0 },
              visual: {
                permitted: true,
                maximumContextCharacters: 240,
                sourceImages: "none",
              },
            } as PageTurnSharePolicy)
          : undefined;
const shareFixtureOptions =
  shareMode === null
    ? {}
    : {
        urlMode: "managed" as const,
        selectionActions: true,
        shareComposer: true,
        ...(sdkQuery.has("allowDownload")
          ? { allowShareImageDownload: sdkQuery.get("allowDownload") === "1" }
          : {}),
        ...(shareMode === "missing" ? {} : { sharePolicy }),
      };

const sourceFixtureRecord = {
  id: "sdk-source-fixture",
  canonicalUrl: new URL("../source-fixture", globalThis.location.href).href,
  title: "SDK source fixture",
  publisher: "PageTurn test host",
  sourceType: "document" as const,
  reviewedAt: "2026-09-06",
  rights: { status: "approved" as const },
  localReading: {
    kind: "excerpt" as const,
    bookId: "demo-book",
    editionId: "2026-08",
    chapterId: "principles",
    anchor: "principles",
    rights: {
      status: "approved" as const,
      scope: "excerpt" as const,
      basis: "First-party SDK fixture",
      reviewedAt: "2026-09-06",
    },
  },
};
const registryResolver = createPageTurnSourceResolver([sourceFixtureRecord]);
const linkOnlyFixtureRecord = {
  id: "sdk-link-only-source-fixture",
  canonicalUrl: sourceFixtureRecord.canonicalUrl,
  aliases: [
    new URL("../source-fixture-alias", globalThis.location.href).href,
  ],
  title: sourceFixtureRecord.title,
  publisher: sourceFixtureRecord.publisher,
  sourceType: sourceFixtureRecord.sourceType,
  reviewedAt: sourceFixtureRecord.reviewedAt,
  rights: { status: "link-only" as const },
};
const linkOnlyResolver = createPageTurnSourceResolver([linkOnlyFixtureRecord]);
const delayedLocalRecord = {
  ...sourceFixtureRecord,
  localReading: {
    ...sourceFixtureRecord.localReading,
    chapterId: "introduction",
    anchor: "introduction",
  },
};
const delayedLocalResolver: PageTurnSourceResolver = (_url, _context, signal) =>
  new Promise((resolve, reject) => {
    const timer = globalThis.setTimeout(
      () =>
        resolve({
          kind: "local-publication",
          record: delayedLocalRecord,
          target: delayedLocalRecord.localReading,
        }),
      sourceScenario === "direct-local-delayed" ? 1_000 : 250,
    );
    signal.addEventListener(
      "abort",
      () => {
        globalThis.clearTimeout(timer);
        root.dataset.sdkSourceAborted = "true";
        reject(signal.reason);
      },
      { once: true },
    );
  });
const controlledPreviewUrl = new URL(
  "../external-preview/",
  globalThis.location.href,
);
if (sourceScenario !== "preview-same-origin") {
  controlledPreviewUrl.hostname =
    controlledPreviewUrl.hostname === "localhost" ? "127.0.0.1" : "localhost";
}
const previewMode = sourceScenario?.replace(/^preview-/, "") ?? "message";
controlledPreviewUrl.searchParams.set(
  "mode",
  previewMode === "message" || previewMode === "timeout" ? "valid" : previewMode,
);
controlledPreviewUrl.searchParams.set("authored", "preserved");
controlledPreviewUrl.searchParams.set("pageturn_nonce", "authored-replaced");
controlledPreviewUrl.hash = "controlled-fragment";
const controlledPathPrefix = controlledPreviewUrl.pathname.replace(/\/$/, "");
const messagePreviewProvider: PageTurnExternalPreviewProvider = {
  id: "controlled-local-preview",
  origins: [controlledPreviewUrl.origin],
  pathPrefixes: [
    sourceScenario === "preview-unapproved"
      ? `${controlledPathPrefix}/approved`
      : controlledPathPrefix,
  ],
  sandbox: ["allow-scripts", "allow-same-origin"],
  permissions: [],
  readiness: {
    kind: "message",
    origin: controlledPreviewUrl.origin,
    messageType: "pageturn-preview-ready",
    timeoutMs: 1_500,
  },
};
const timeoutPreviewProvider: PageTurnExternalPreviewProvider = {
  ...messagePreviewProvider,
  id: "controlled-local-timeout",
  readiness: { kind: "timeout", timeoutMs: 400 },
};
const externalPreviewProviders: readonly PageTurnExternalPreviewProvider[] =
  !previewScenario
    ? []
    : sourceScenario === "preview-timeout"
      ? [timeoutPreviewProvider]
      : sourceScenario === "preview-ambiguous"
        ? [
            messagePreviewProvider,
            { ...messagePreviewProvider, id: "controlled-local-preview-two" },
          ]
        : [messagePreviewProvider];
const sourceResolver: PageTurnSourceResolver | undefined =
  previewScenario
    ? (url) => ({ kind: "external-card", url: url.href })
    : sourceScenario === "reject"
    ? () => Promise.reject(new Error("Test resolver rejected the source"))
    : sourceScenario === "delayed" ||
        sourceScenario === "direct-local-delayed"
      ? delayedLocalResolver
      : sourceScenario === "direct-external"
        ? () => ({
            kind: "direct-external",
            url: new URL("../resolved-source", globalThis.location.href).href,
          })
        : sourceScenario === "canonical-alias"
          ? linkOnlyResolver
      : sourceScenario === "direct-local-unknown"
        ? (url) => ({ kind: "external-card", url: url.href })
        : sourceScenario && sourceScenario !== "direct"
          ? registryResolver
          : undefined;
const sourceFixtureOptions =
  sourceScenario === null || sourceScenario === "direct" || !sourceResolver
    ? {}
    : {
        sourceResolver,
        ...(previewScenario ? { externalPreviewProviders } : {}),
        sourceLinkMode: sourceScenario.startsWith("direct-local")
          ? ("direct-local" as const)
          : ("card" as const),
        locationUrl: ({
          bookId,
          editionId,
          chapterId,
          anchor,
        }: {
          bookId: string;
          editionId: string;
          chapterId: string;
          anchor: string;
        }) => {
          const url = new URL("../sdk/", globalThis.location.href);
          url.searchParams.set("book", bookId);
          url.searchParams.set("edition", editionId);
          url.searchParams.set("chapter", chapterId);
          url.hash = anchor;
          return url;
        },
      };

const readerOptions = {
  bookId: "demo-book",
  manifestUrl: new URL(
    "../book/demo-book/2026-08/manifest.json",
    globalThis.location.href,
  ),
  ...shareFixtureOptions,
  ...sourceFixtureOptions,
};
const reader: PageTurnBookHandle = createPageTurnBook({
  root,
  ...readerOptions,
});

const additionalContainer =
  sdkQuery.get("instances") === "2"
    ? document.body.appendChild(document.createElement("div"))
    : undefined;
const additionalShell =
  additionalContainer && !previewScenario
    ? mountPageTurnBookShell(additionalContainer)
    : undefined;
const additionalRoot = previewScenario
  ? additionalContainer
  : additionalShell?.root;
if (additionalRoot) {
  additionalRoot.setAttribute("data-sdk-additional-shell", "true");
}
const additionalReader = additionalRoot
  && previewScenario
  ? createPageTurnBook({ root: additionalRoot, ...readerOptions })
  : undefined;

const requestedAppearance = sdkQuery.get("appearance");
const appearancePreset = PAGE_TURN_APPEARANCE_PRESETS.find(
  ({ id }) => id === requestedAppearance,
)?.id;
if (appearancePreset) {
  reader.setAppearance(appearancePreset);
}
const requestedPaper = sdkQuery.get("paper");
if (requestedPaper && /^#[0-9a-f]{6}$/i.test(requestedPaper)) {
  reader.setAppearance({ paper: { color: requestedPaper } });
}
const requestedInk = sdkQuery.get("ink");
if (requestedInk && /^#[0-9a-f]{6}$/i.test(requestedInk)) {
  reader.setAppearance({ paper: { inkColor: requestedInk } });
}

function addSourceFixture(targetRoot: HTMLElement): void {
  const add = () => {
    const readerElement =
      targetRoot.querySelector<HTMLElement>("[data-v3-reader]");
    const target = targetRoot.querySelector<HTMLElement>(
      "[data-v3-stationary] .v3-sheet-content",
    );
    if (readerElement?.dataset.v3Opening !== "false" || !target) {
      requestAnimationFrame(add);
      return;
    }
    const citation = document.createElement("p");
    const link = document.createElement("a");
    link.dataset.sdkSourceLink = "true";
    link.href = previewScenario
      ? controlledPreviewUrl.href
      : sourceScenario === "direct-local-unknown" ||
          sourceScenario === "direct"
        ? new URL("../source-fixture-unknown/", globalThis.location.href).href
        : sourceScenario === "canonical-alias"
          ? linkOnlyFixtureRecord.aliases[0]!
          : sourceFixtureRecord.canonicalUrl;
    link.textContent = "SDK authored source citation";
    citation.append(link);
    target.append(citation);
    targetRoot.dataset.sdkSourceReady = "true";
  };
  add();
}

void reader.ready
  .then(() => {
    root.dataset.sdkReady = "true";
    if (sourceScenario !== null) {
      addSourceFixture(root);
    }
  })
  .catch((error: unknown) => {
    root.dataset.sdkReady = "false";
    console.error("The PageTurn SDK example could not initialize", error);
  });

void additionalReader?.ready.then(() => {
  if (sourceScenario !== null && additionalRoot) {
    addSourceFixture(additionalRoot);
  }
});

destroyButton.addEventListener(
  "click",
  () => {
    reader.destroy();
    additionalReader?.destroy();
    additionalShell?.destroy();
    root.dataset.sdkDestroyed = "true";
  },
  { once: true },
);

globalThis.addEventListener(
  "pagehide",
  () => {
    reader.destroy();
    additionalReader?.destroy();
    additionalShell?.destroy();
  },
  { once: true },
);
