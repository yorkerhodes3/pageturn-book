import {
  createPageTurnBook,
  type PageTurnBookHandle,
} from "@ethical-tech/pageturn-book";
import "@ethical-tech/pageturn-book/styles.css";
import "./v3-demo-host.css";
import { catalogBook } from "./library-catalog.js";
import { publicationMedia } from "./v3-media.js";

const query = new URLSearchParams(globalThis.location.search);
const bookId = query.get("book") ?? "what-is-ethical-ai";
const chapterId = query.get("chapter");
const root = document.querySelector<HTMLElement>("#page-turn-book");
const book = catalogBook(bookId);
const media = publicationMedia(bookId);

if (!root) {
  throw new Error("The PageTurn V3 route is missing its SDK mount point");
}
if (!book) {
  throw new Error(`PageTurn does not know publication: ${bookId}`);
}

const manifestUrl = new URL(
  `../book/${encodeURIComponent(book.id)}/` +
    `${encodeURIComponent(book.semanticEdition)}/manifest.json`,
  globalThis.location.href,
);

const reader: PageTurnBookHandle = createPageTurnBook({
  root,
  bookId,
  manifestUrl,
  ...(chapterId ? { chapterId } : {}),
  chaptersStartOnRight: book.chaptersStartOnRight ?? true,
  appearance: book.appearance,
  ...(media ? { media } : {}),
  libraryUrl: new URL("../shelf/", globalThis.location.href),
  appearanceControls: true,
  embedded: query.get("embed") === "1",
  keyboardScope: "document",
  urlMode: "managed",
});

void reader.ready.catch(() => {
  // The SDK renders the detailed failure into its live status region.
});
