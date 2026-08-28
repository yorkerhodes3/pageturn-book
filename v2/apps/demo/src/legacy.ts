import { openBookViewer } from "read-as-book";
import "read-as-book/styles.css";

const openButton = document.querySelector<HTMLButtonElement>("#open-legacy");
const status = document.querySelector<HTMLElement>("#legacy-status");
if (!openButton || !status) {
  throw new Error("Legacy comparison controls are missing");
}

const productionRevision = "b456e8e137a0b6ce9a51799b71c6091f5241b5d7";
const productionPageRoot =
  "https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/" +
  `${productionRevision}/public/publications/what-is-ethical-ai/pages`;
const pages = Array.from(
  { length: 46 },
  (_, index) =>
    `${productionPageRoot}/p${String(index + 1).padStart(2, "0")}.webp`,
);

openButton.addEventListener("click", async () => {
  openButton.disabled = true;
  status.textContent = "Loading pinned legacy viewer.";
  try {
    await openBookViewer({
      pages,
      aspect: 0.7727,
      title: "What Is Ethical AI?",
      pdfUrl:
        "https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/" +
        `${productionRevision}/public/publications/what-is-ethical-ai/report.pdf`,
      hint: "Production 46-page PDF - use arrows to turn pages",
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
        ? `Legacy viewer failed: ${error.message}`
        : "Legacy viewer failed.";
  }
});

if (new URLSearchParams(globalThis.location.search).get("view") === "book") {
  openButton.click();
}
