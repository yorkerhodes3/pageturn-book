import { openBookViewer } from "read-as-book";
import "read-as-book/styles.css";
import {
  catalogBook,
  productionAssetUrl,
  productionManifestUrl,
  productionPdfUrl,
} from "./library-catalog.js";

const openButton = document.querySelector<HTMLButtonElement>("#open-legacy");
const status = document.querySelector<HTMLElement>("#legacy-status");
const title = document.querySelector<HTMLElement>("#legacy-title");
const description = document.querySelector<HTMLElement>("#legacy-description");
const pageSummary = document.querySelector<HTMLElement>("#legacy-page-summary");
if (!openButton || !status || !title || !description || !pageSummary) {
  throw new Error("Legacy comparison controls are missing");
}

type ProductionPageManifest = {
  pageCount: number;
  aspect: number;
  pages: string[];
};

function isProductionPageManifest(
  value: unknown,
  bookId: string,
): value is ProductionPageManifest {
  if (!value || typeof value !== "object") {
    return false;
  }
  const manifest = value as Record<string, unknown>;
  const pagePrefix = `publications/${bookId}/pages/`;
  return (
    Number.isInteger(manifest.pageCount) &&
    (manifest.pageCount as number) > 0 &&
    typeof manifest.aspect === "number" &&
    Number.isFinite(manifest.aspect) &&
    manifest.aspect > 0 &&
    Array.isArray(manifest.pages) &&
    manifest.pages.length === manifest.pageCount &&
    manifest.pages.every(
      (page) =>
        typeof page === "string" &&
        page.startsWith(pagePrefix) &&
        !page.includes(".."),
    )
  );
}

const requestedBookId =
  new URLSearchParams(globalThis.location.search).get("book") ??
  "what-is-ethical-ai";
function requestedBook() {
  const selected = catalogBook(requestedBookId);
  if (!selected) {
    throw new Error(`Unknown fixed-page publication: ${requestedBookId}`);
  }
  return selected;
}
const book = requestedBook();

title.textContent = book.title;
description.textContent = book.subtitle
  ? `${book.subtitle}.`
  : "A designed Ethical Tech CoLab research publication.";
pageSummary.textContent = `${book.pageCount} production pages from the pinned website revision.`;
document.title = `${book.title} - fixed-page reader`;

let manifestPromise: Promise<ProductionPageManifest> | undefined;
function loadManifest(): Promise<ProductionPageManifest> {
  manifestPromise ??= fetch(productionManifestUrl(book.id))
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(
          `Could not load ${book.title} page manifest (${response.status})`,
        );
      }
      const value: unknown = await response.json();
      if (!isProductionPageManifest(value, book.id)) {
        throw new Error(`${book.title} page manifest is invalid`);
      }
      if (value.pageCount !== book.pageCount) {
        throw new Error(
          `${book.title} page count changed from ${book.pageCount} to ${value.pageCount}`,
        );
      }
      return value;
    })
    .catch((error: unknown) => {
      manifestPromise = undefined;
      throw error;
    });
  return manifestPromise;
}

openButton.addEventListener("click", async () => {
  openButton.disabled = true;
  status.textContent = `Loading ${book.title}.`;
  try {
    const manifest = await loadManifest();
    await openBookViewer({
      pages: manifest.pages.map(productionAssetUrl),
      aspect: manifest.aspect,
      title: book.title,
      pdfUrl: productionPdfUrl(book.id),
      hint: `${manifest.pageCount}-page production edition · use arrows to turn pages`,
      onClose: () => {
        openButton.disabled = false;
        openButton.focus();
        status.textContent = "Legacy viewer closed.";
      },
    });
    status.textContent = "Legacy viewer open.";
  } catch (error) {
    openButton.disabled = false;
    status.textContent =
      error instanceof Error
        ? `${book.title} failed: ${error.message}`
        : `${book.title} failed to open.`;
  }
});

if (new URLSearchParams(globalThis.location.search).get("view") === "book") {
  openButton.click();
}
