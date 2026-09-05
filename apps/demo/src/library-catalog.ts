import type {
  BookshelfAction,
  BookshelfSection,
  BookshelfVolume,
  PageTurnAppearancePresetId,
  PageTurnPublicationAppearance,
} from "@ethical-tech/pageturn-book";

export const PRODUCTION_REVISION =
  "b456e8e137a0b6ce9a51799b71c6091f5241b5d7";

export type CatalogBook = {
  id: string;
  title: string;
  shelfLabel: string;
  collection: string;
  pageCount: number;
  appearance: PageTurnPublicationAppearance;
  subtitle?: string;
  semanticHref?: string;
  geometryHref?: string;
  semanticEdition: string;
  facsimile: boolean;
  externalHref?: string;
  extentLabel?: string;
  chaptersStartOnRight?: false;
  placement?: BookshelfVolume["placement"];
};

const palettes = [
  { color: "#111b31", accent: "#c4a568", material: "leather" },
  { color: "#4a171c", accent: "#d0ad6d", material: "leather" },
  { color: "#17372d", accent: "#c7b477", material: "leather" },
  { color: "#41263d", accent: "#c8a96d", material: "cloth" },
  { color: "#57301e", accent: "#d2b87c", material: "leather" },
  { color: "#17363e", accent: "#b9b075", material: "cloth" },
  { color: "#35251c", accent: "#c29a5f", material: "leather" },
] as const;

const flowingChapterBooks = new Set([
  "agentic-behavior-observatory",
  "ai-research-assistant",
  "cerai",
  "vango",
]);

const appearancePresetByBook = new Map<
  string,
  Exclude<PageTurnAppearancePresetId, "custom" | "default">
>([
  ["plurality", "historical-tome"],
  ["cyber-dictionary", "antique-greek"],
  ["ai-models-research", "grid-lab"],
  ["ai-research-assistant", "modern-lab"],
  ["vango", "lined-journal"],
]);

const shelfPlacementByBook = new Map<
  string,
  NonNullable<BookshelfVolume["placement"]>
>([
  ["ai-carbon-footprint", { pose: "stacked", stackId: "policy-stack", order: 0 }],
  ["ai-models-research", { pose: "stacked", stackId: "policy-stack", order: 1 }],
  ["erus", { pose: "stacked", stackId: "policy-stack", order: 2 }],
  ["haste", { pose: "stacked", stackId: "response-stack", order: 0 }],
  ["mariupol-severity-model", { pose: "stacked", stackId: "response-stack", order: 1 }],
  ["forced-labor-structural-risk-index", { pose: "stacked", stackId: "response-stack", order: 2 }],
  ["cyber-dictionary", { pose: "open-on-stand", standStyle: "lectern" }],
]);

function appearance(
  id: string,
  index: number,
  pageCount: number,
  shelfLabel: string,
): PageTurnPublicationAppearance {
  const palette = palettes[index % palettes.length] ?? palettes[0];
  const preset = appearancePresetByBook.get(id);
  const depth =
    pageCount >= 30 ? "thick" : pageCount >= 18 ? "standard" : "slim";
  return {
    ...(preset ? { preset } : {}),
    cover: {
      background: palette.color,
      foreground: "#f3ead6",
      accent: palette.accent,
    },
    binding: {
      material: palette.material,
      color: palette.color,
      accent: palette.accent,
      depth,
      hubs: pageCount >= 30 ? 5 : pageCount >= 18 ? 4 : 3,
      pageCount,
      shelfLabel,
    },
  };
}

const catalogSource = [
  [
    "what-is-ethical-ai",
    "What Is Ethical AI?",
    "WHAT IS ETHICAL AI?",
    "Foundational & Policy",
    46,
    "Ethics, Ethical Technology, and Ethical International Relations for the Age of Intelligent Machines",
    "../book/what-is-ethical-ai/2026-07/chapters/executive-summary/?view=book",
    "../v3/?from=shelf",
  ],
  [
    "ai-carbon-footprint",
    "AI's Carbon Footprint",
    "AI CARBON FOOTPRINT",
    "Foundational & Policy",
    18,
  ],
  [
    "ai-models-research",
    "AI Model Performance",
    "AI MODELS RESEARCH",
    "Foundational & Policy",
    19,
  ],
  [
    "erus",
    "The Evacuation Readiness and Uncertainty Simulator",
    "ERUS",
    "Foundational & Policy",
    24,
  ],
  [
    "cerai",
    "The Civilian Evacuation Risk Anticipation Index",
    "CERAI",
    "Foundational & Policy",
    13,
  ],
  [
    "agentic-language-development",
    "Agentic Language Development",
    "AGENTIC LANGUAGE",
    "Foundational & Policy",
    25,
  ],
  [
    "war-games",
    "The Only Winning Move",
    "WAR GAMES",
    "Foundational & Policy",
    15,
  ],
  [
    "after-the-corridor",
    "After the Corridor",
    "AFTER THE CORRIDOR",
    "Humanitarian Systems",
    22,
    "From AI-Informed Evacuation to Digital Public Goods for Refugee Economic Inclusion",
  ],
  [
    "ercf",
    "The Evacuation Risk and Cost Framework",
    "ERCF",
    "Humanitarian Systems",
    32,
  ],
  [
    "evacuation-inform-index",
    "The Evacuation Inform Index",
    "EVACUATION INFORM",
    "Humanitarian Systems",
    11,
  ],
  [
    "evacuation-simulation",
    "The Evacuation Simulator",
    "EVACUATION SIMULATION",
    "Humanitarian Systems",
    22,
  ],
  [
    "haste",
    "HASTE: High-speed Assessment and Satellite Tracking for Emergencies",
    "HASTE",
    "Humanitarian Systems",
    26,
  ],
  [
    "mariupol-severity-model",
    "The Mariupol Corridor Severity Model",
    "MARIUPOL SEVERITY",
    "Humanitarian Systems",
    26,
  ],
  [
    "forced-labor-structural-risk-index",
    "The Forced Labor Structural Risk Index",
    "FORCED LABOR RISK",
    "Humanitarian Systems",
    25,
  ],
  [
    "agentic-behavior-observatory",
    "The Agentic Behavior Observatory",
    "AGENTIC OBSERVATORY",
    "Research & Public Tools",
    12,
  ],
  [
    "ai-research-assistant",
    "AI-Powered Research Questions",
    "AI RESEARCH ASSISTANT",
    "Research & Public Tools",
    10,
  ],
  [
    "cyber-dictionary",
    "Cyber Dictionary",
    "CYBER DICTIONARY",
    "Research & Public Tools",
    44,
  ],
  [
    "digital-provenance-passport",
    "The Digital Provenance Passport",
    "PROVENANCE PASSPORT",
    "Research & Public Tools",
    28,
  ],
  [
    "diplomatic-simulator",
    "The Diplomatic Simulator",
    "DIPLOMATIC SIMULATOR",
    "Research & Public Tools",
    23,
  ],
  [
    "provenance-search",
    "Provenance Search",
    "PROVENANCE SEARCH",
    "Research & Public Tools",
    20,
  ],
  [
    "vango",
    "VANGO: The Art Passport",
    "VANGO",
    "Research & Public Tools",
    16,
  ],
] as const;

export const LIBRARY_BOOKS: CatalogBook[] = catalogSource.map(
  (
    [
      id,
      title,
      shelfLabel,
      collection,
      pageCount,
      subtitle,
      semanticHref,
      geometryHref,
    ],
    index,
  ) => {
    const placement = shelfPlacementByBook.get(id);
    return {
      id,
      title,
      shelfLabel,
      collection,
      pageCount,
      appearance: appearance(id, index, pageCount, shelfLabel),
      semanticEdition: id === "what-is-ethical-ai" ? "2026-07" : "2026-08",
      facsimile: true,
      ...(subtitle ? { subtitle } : {}),
      ...(semanticHref ? { semanticHref } : {}),
      ...(flowingChapterBooks.has(id)
        ? { chaptersStartOnRight: false as const }
        : {}),
      ...(placement ? { placement } : {}),
      geometryHref:
        geometryHref ??
        `../v3/?book=${encodeURIComponent(id)}&from=shelf`,
    };
  },
);

LIBRARY_BOOKS.push({
  id: "plurality",
  title: "Plurality",
  shelfLabel: "PLURALITY",
  collection: "Open Source Library",
  pageCount: 586,
  subtitle: "The Future of Collaborative Technology and Democracy",
  semanticEdition: "2026-07",
  facsimile: false,
  geometryHref: "../v3/?book=plurality&from=shelf",
  externalHref: "https://www.plurality.net/read/",
  extentLabel: "586-page print edition · 30 semantic chapters",
  appearance: {
    preset: "historical-tome",
    cover: {
      background: "#39295d",
      foreground: "#f5efe2",
      accent: "#66c5b8",
      subtitle: "The Future of Collaborative Technology and Democracy",
    },
    binding: {
      material: "cloth",
      color: "#39295d",
      accent: "#66c5b8",
      depth: "thick",
      hubs: 5,
      pageCount: 586,
      shelfLabel: "PLURALITY",
    },
  },
});

export const LINKED_SOURCE_BOOKS: CatalogBook[] = [
  {
    id: "human-choice-source-guide",
    title: "The Human Choice: Source Guide",
    shelfLabel: "THE HUMAN CHOICE",
    collection: "Linked Source Guides",
    pageCount: 72,
    subtitle:
      "Nine source briefs for studying AI, power, dignity, plurality, and governance",
    semanticEdition: "2026-08-30",
    facsimile: false,
    geometryHref: "../v3/?book=human-choice-source-guide",
    appearance: {
      cover: {
        background: "#17233d",
        foreground: "#f1ead8",
        accent: "#66c5b8",
        subtitle:
          "Nine-source analysis for teaching, salons, and public speaking",
      },
      binding: {
        material: "cloth",
        color: "#17233d",
        accent: "#66c5b8",
        depth: "standard",
        hubs: 4,
        pageCount: 72,
        shelfLabel: "THE HUMAN CHOICE",
      },
    },
  },
];

export function productionManifestUrl(bookId: string): string {
  return (
    "https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/" +
    `${PRODUCTION_REVISION}/public/publications/${bookId}/pages/manifest.json`
  );
}

export function productionAssetUrl(path: string): string {
  return (
    "https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/" +
    `${PRODUCTION_REVISION}/public/${path}`
  );
}

export function productionPdfUrl(bookId: string): string {
  return productionAssetUrl(`publications/${bookId}/report.pdf`);
}

export function catalogBook(bookId: string): CatalogBook | undefined {
  return (
    LIBRARY_BOOKS.find(({ id }) => id === bookId) ??
    LINKED_SOURCE_BOOKS.find(({ id }) => id === bookId)
  );
}

function bookshelfVolume(book: CatalogBook): BookshelfVolume {
  const facsimileHref = `../legacy/?book=${encodeURIComponent(book.id)}&view=book`;
  const actions: BookshelfAction[] = [];
  if (book.geometryHref) {
    actions.push({
      label: "Read with PageTurn V3",
      href: book.geometryHref,
      description:
        "Open the supported semantic edition with bounded loading and page-turn geometry",
    });
  }
  if (book.semanticHref) {
    actions.push({
      label: "Open V2 compatibility reader",
      href: book.semanticHref,
      description:
        "Open the historical semantic book mode for migration comparison",
    });
  }
  if (book.facsimile) {
    actions.push({
      label: book.semanticHref ? "View designed pages" : "Open designed pages",
      href: facsimileHref,
      description: book.semanticHref
        ? "Open the preserved fixed-page edition"
        : "Open the publication in the fixed-page reader",
    });
  }
  if (book.externalHref) {
    actions.push({
      label: "Open the original flat reader",
      href: book.externalHref,
      description: "Read the source publication on plurality.net",
    });
  }
  return {
    id: book.id,
    title: book.title,
    shelfLabel: book.shelfLabel,
    collection: book.collection,
    pageCount: book.pageCount,
    appearance: book.appearance,
    ...(book.subtitle ? { subtitle: book.subtitle } : {}),
    ...(book.extentLabel ? { extentLabel: book.extentLabel } : {}),
    ...(book.placement ? { placement: book.placement } : {}),
    actions,
  };
}

export const LIBRARY_SECTIONS: BookshelfSection[] = [
  "Foundational & Policy",
  "Humanitarian Systems",
  "Research & Public Tools",
  "Open Source Library",
].map((title, index) => ({
  id: `shelf-${index + 1}`,
  title,
  volumes: LIBRARY_BOOKS.filter((book) => book.collection === title).map(
    bookshelfVolume,
  ),
}));
