import { mountBookshelf } from "@ethical-tech/pageturn-book";
import { LIBRARY_BOOKS, LIBRARY_SECTIONS } from "./library-catalog.js";

const host = document.querySelector<HTMLElement>("[data-library-bookshelf]");
const count = document.querySelector<HTMLElement>("[data-library-count]");
if (!host || !count) {
  throw new Error("Library shelf host is missing");
}

count.textContent = `${LIBRARY_BOOKS.length} volumes`;
mountBookshelf(host, LIBRARY_SECTIONS);
