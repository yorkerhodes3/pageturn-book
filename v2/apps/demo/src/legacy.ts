import { openBookViewer } from "read-as-book";
import "read-as-book/styles.css";

const openButton = document.querySelector<HTMLButtonElement>("#open-legacy");
const status = document.querySelector<HTMLElement>("#legacy-status");
if (!openButton || !status) {
  throw new Error("Legacy comparison controls are missing");
}

type LegacyPage = {
  heading: string;
  lines: string[];
};

const content: LegacyPage[] = [
  {
    heading: "A Small Book About Ethical Technology",
    lines: ["Ethical Tech CoLab", "Fixed-page comparison edition"],
  },
  {
    heading: "Introduction",
    lines: [
      "Technology becomes ethical through choices",
      "that remain open to examination.",
      "",
      "This page is a fixed SVG image.",
    ],
  },
  {
    heading: "Why semantic reading matters",
    lines: [
      "A publication should preserve meaning",
      "before it adds motion.",
      "",
      "The legacy viewer preserves appearance.",
    ],
  },
  {
    heading: "Preserve meaning",
    lines: [
      "Content structure, durable locations,",
      "and attribution take priority over",
      "visual simulation.",
    ],
  },
  {
    heading: "Bound optional work",
    lines: [
      "Long publications should not fetch or",
      "decode every page merely because one",
      "location was opened.",
    ],
  },
  {
    heading: "Keep a fallback",
    lines: [
      "The original viewer remains separate",
      "while the semantic approach is tested.",
    ],
  },
];

function fixedPage(page: LegacyPage, index: number): string {
  const lines = page.lines
    .map(
      (line, lineIndex) =>
        `<text x="64" y="${230 + lineIndex * 34}" font-size="22">${line || " "}</text>`,
    )
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="612" height="792" viewBox="0 0 612 792">
    <rect width="612" height="792" fill="#fffdf8"/>
    <rect x="24" y="24" width="564" height="744" fill="none" stroke="#d7cdbb"/>
    <text x="64" y="118" font-family="Georgia,serif" font-size="36" fill="#26231e">${page.heading}</text>
    <g font-family="Georgia,serif" fill="#4c463e">${lines}</g>
    <text x="306" y="738" text-anchor="middle" font-family="Georgia,serif" font-size="16" fill="#776f64">${index + 1}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const pages = content.map(fixedPage);

openButton.addEventListener("click", async () => {
  openButton.disabled = true;
  status.textContent = "Loading pinned legacy viewer.";
  try {
    await openBookViewer({
      pages,
      aspect: 612 / 792,
      title: "Legacy fixed-page comparison",
      hint: "Original fixed-page viewer - use arrows to turn pages",
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

