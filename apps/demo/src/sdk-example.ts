import {
  createPageTurnBook,
  type PageTurnBookHandle,
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

const reader: PageTurnBookHandle = createPageTurnBook({
  root,
  bookId: "demo-book",
  manifestUrl: new URL(
    "../book/demo-book/2026-08/manifest.json",
    globalThis.location.href,
  ),
});

void reader.ready
  .then(() => {
    root.dataset.sdkReady = "true";
  })
  .catch((error: unknown) => {
    root.dataset.sdkReady = "false";
    console.error("The PageTurn SDK example could not initialize", error);
  });

destroyButton.addEventListener(
  "click",
  () => {
    reader.destroy();
    root.dataset.sdkDestroyed = "true";
  },
  { once: true },
);

globalThis.addEventListener("pagehide", () => reader.destroy(), { once: true });
