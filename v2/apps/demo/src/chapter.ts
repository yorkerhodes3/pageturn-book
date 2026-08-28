import {
  toBookId,
  toChapterId,
  toEditionId,
  type SemanticLocation,
} from "@ethical-tech/book-publication-model";
import { createReaderSession } from "@ethical-tech/book-reader-core";
import { mountReaderShell } from "@ethical-tech/book-reader-ui";
import { createSemanticRenderer } from "@ethical-tech/book-renderer-semantic";

const content = document.querySelector<HTMLElement>("[data-reader-content]");
if (!content) {
  throw new Error("Generated chapter is missing [data-reader-content]");
}

const {
  bookId: rawBookId,
  editionId: rawEditionId,
  chapterId: rawChapterId,
  firstAnchor,
  manifest: rawManifest,
} = content.dataset;

if (
  !rawBookId ||
  !rawEditionId ||
  !rawChapterId ||
  !firstAnchor ||
  !rawManifest
) {
  throw new Error("Generated chapter is missing reader metadata");
}

const hashAnchor = decodeURIComponent(globalThis.location.hash.slice(1));
const initialLocation: SemanticLocation = {
  kind: "semantic",
  bookId: toBookId(rawBookId),
  editionId: toEditionId(rawEditionId),
  chapterId: toChapterId(rawChapterId),
  anchor: hashAnchor || firstAnchor,
};
const manifestUrl = new URL(rawManifest, globalThis.location.href);
const session = createReaderSession({
  manifest: manifestUrl,
  initialLocation,
});
const renderer = createSemanticRenderer();
const unmount = session.mount(content, renderer);
const shell = mountReaderShell(content, session);
const runtimeStatus = document.createElement("p");
runtimeStatus.className = "book-reader-runtime-status";
runtimeStatus.setAttribute("role", "status");
runtimeStatus.textContent = "Enhancing reader";
document.body.append(runtimeStatus);

const unsubscribe = session.subscribe((state) => {
  document.body.dataset.readerStatus = state.status;
  runtimeStatus.textContent =
    state.status === "ready"
      ? "Semantic reader ready"
      : state.status === "error"
        ? (state.error?.message ?? "Reader error")
        : "Enhancing reader";
});

globalThis.addEventListener(
  "pagehide",
  () => {
    unsubscribe();
    shell.destroy();
    unmount();
    session.dispose();
  },
  { once: true },
);
