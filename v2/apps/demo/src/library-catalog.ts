import type { PublicationAppearance } from "@ethical-tech/book-publication-model";
import type {
  BookshelfSection,
  BookshelfVolume,
} from "@ethical-tech/book-reader-ui";

export const PRODUCTION_REVISION =
  "b456e8e137a0b6ce9a51799b71c6091f5241b5d7";

type CatalogBook = {
  id: string;
  title: string;
  shelfLabel: string;
  collection: string;
  pageCount: number;
  appearance: PublicationAppearance;
  subtitle?: string;
  semanticHref?: string;
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

function appearance(
  index: number,
  pageCount: number,
  shelfLabel: string,
): PublicationAppearance {
  const palette = palettes[index % palettes.length] ?? palettes[0];
  const depth =
    pageCount >= 30 ? "thick" : pageCount >= 18 ? "standard" : "slim";
  return {
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
  ],
  [
    "ai-carbon-footprint",
    "AI Carbon Footprint",
    "AI CARBON FOOTPRINT",
    "Foundational & Policy",
    18,
  ],
  [
    "ai-models-research",
    "AI Models Research",
    "AI MODELS RESEARCH",
    "Foundational & Policy",
    19,
  ],
  ["erus", "ERUS", "ERUS", "Foundational & Policy", 24],
  ["cerai", "CERAI", "CERAI", "Foundational & Policy", 13],
  [
    "agentic-language-development",
    "Agentic Language Development",
    "AGENTIC LANGUAGE",
    "Foundational & Policy",
    25,
  ],
  ["war-games", "War Games", "WAR GAMES", "Foundational & Policy", 15],
  [
    "after-the-corridor",
    "After the Corridor",
    "AFTER THE CORRIDOR",
    "Humanitarian Systems",
    22,
    "From AI-Informed Evacuation to Digital Public Goods for Refugee Economic Inclusion",
  ],
  ["ercf", "ERCF", "ERCF", "Humanitarian Systems", 32],
  [
    "evacuation-inform-index",
    "Evacuation INFORM Index",
    "EVACUATION INFORM",
    "Humanitarian Systems",
    11,
  ],
  [
    "evacuation-simulation",
    "Evacuation Simulation",
    "EVACUATION SIMULATION",
    "Humanitarian Systems",
    22,
  ],
  ["haste", "HASTE", "HASTE", "Humanitarian Systems", 26],
  [
    "mariupol-severity-model",
    "Mariupol Severity Model",
    "MARIUPOL SEVERITY",
    "Humanitarian Systems",
    26,
  ],
  [
    "forced-labor-structural-risk-index",
    "Forced Labor Structural Risk Index",
    "FORCED LABOR RISK",
    "Humanitarian Systems",
    25,
  ],
  [
    "agentic-behavior-observatory",
    "Agentic Behavior Observatory",
    "AGENTIC OBSERVATORY",
    "Research & Public Tools",
    12,
  ],
  [
    "ai-research-assistant",
    "AI Research Assistant",
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
    "Digital Provenance Passport",
    "PROVENANCE PASSPORT",
    "Research & Public Tools",
    28,
  ],
  [
    "diplomatic-simulator",
    "Diplomatic Simulator",
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
  ["vango", "VANGO", "VANGO", "Research & Public Tools", 16],
] as const;

export const LIBRARY_BOOKS: CatalogBook[] = catalogSource.map(
  (
    [id, title, shelfLabel, collection, pageCount, subtitle, semanticHref],
    index,
  ) => ({
    id,
    title,
    shelfLabel,
    collection,
    pageCount,
    appearance: appearance(index, pageCount, shelfLabel),
    ...(subtitle ? { subtitle } : {}),
    ...(semanticHref ? { semanticHref } : {}),
  }),
);

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
  return LIBRARY_BOOKS.find(({ id }) => id === bookId);
}

function bookshelfVolume(book: CatalogBook): BookshelfVolume {
  const facsimileHref = `../legacy/?book=${encodeURIComponent(book.id)}&view=book`;
  return {
    id: book.id,
    title: book.title,
    shelfLabel: book.shelfLabel,
    collection: book.collection,
    pageCount: book.pageCount,
    appearance: book.appearance,
    ...(book.subtitle ? { subtitle: book.subtitle } : {}),
    actions: book.semanticHref
      ? [
          {
            label: "Read semantic edition",
            href: book.semanticHref,
            description: "Open accessible native text in the V2 book reader",
          },
          {
            label: "View designed pages",
            href: facsimileHref,
            description: "Open the preserved fixed-page edition",
          },
        ]
      : [
          {
            label: "Open designed pages",
            href: facsimileHref,
            description: "Open the publication in the fixed-page reader",
          },
        ],
  };
}

export const LIBRARY_SECTIONS: BookshelfSection[] = [
  "Foundational & Policy",
  "Humanitarian Systems",
  "Research & Public Tools",
].map((title, index) => ({
  id: `shelf-${index + 1}`,
  title,
  volumes: LIBRARY_BOOKS.filter((book) => book.collection === title).map(
    bookshelfVolume,
  ),
}));
