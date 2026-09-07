import {
  createPageTurnSourceResolver,
  type PageTurnBookLocation,
  type PageTurnSourceRecord,
} from "@ethical-tech/pageturn-book";

const PLURALITY_REVISION = "86158859464aee75633acd854c656928121a7fd8";

export const HOSTED_SOURCE_RECORDS: readonly PageTurnSourceRecord[] = [
  {
    id: "ethical-ai-publication",
    canonicalUrl: "https://ethical-tech-colab.github.io/what-is-ethical-ai/",
    aliases: [
      "https://yorkerhodes3.github.io/pageturn-book/v3/?book=what-is-ethical-ai&chapter=executive-summary",
    ],
    title: "What Is Ethical AI?",
    publisher: "Ethical Tech CoLab",
    publicationDate: "2026-07-01",
    sourceType: "book",
    localReading: {
      kind: "full-edition",
      bookId: "what-is-ethical-ai",
      editionId: "2026-07",
      chapterId: "executive-summary",
      anchor: "executive-summary",
      shelfHref: "../shelf/",
      rights: {
        status: "approved",
        scope: "full-edition",
        basis: "First-party hosted semantic publication",
        reviewedAt: "2026-09-06",
      },
    },
    courseReadingIds: ["human-choice-ethical-ai"],
    relation: "sameAs",
    rights: {
      status: "approved",
      attribution: "Ethical Tech CoLab",
    },
    reviewedAt: "2026-09-06",
  },
  {
    id: "plurality-pinned-edition",
    canonicalUrl:
      `https://github.com/pluralitybook/plurality/tree/${PLURALITY_REVISION}`,
    title: "Plurality: The Future of Collaborative Technology and Democracy",
    publisher: "The Plurality Community",
    publicationDate: "2023",
    sourceType: "repository",
    repository: {
      url: "https://github.com/pluralitybook/plurality",
      revision: PLURALITY_REVISION,
    },
    localReading: {
      kind: "full-edition",
      bookId: "plurality",
      editionId: "2026-07",
      chapterId: "1",
      anchor: "1",
      shelfHref: "../shelf/",
      rights: {
        status: "approved",
        scope: "full-edition",
        basis: "Pinned source is dedicated to the public domain under CC0 1.0",
        reviewedAt: "2026-09-06",
      },
    },
    courseReadingIds: ["human-choice-plurality-pinned"],
    relation: "isVersionOf",
    rights: {
      status: "approved",
      license: "CC0 1.0 Universal",
      attribution:
        "E. Glen Weyl, Audrey Tang, and the Plurality Community",
    },
    reviewedAt: "2026-09-06",
  },
  {
    id: "plurality-reading-site",
    canonicalUrl: "https://plurality.net/read/",
    aliases: [
      "https://plurality.net/",
      "https://www.plurality.net/",
      "https://www.plurality.net/read/",
    ],
    title: "Plurality",
    publisher: "The Plurality Community",
    publicationDate: "2023",
    sourceType: "book",
    localReading: {
      kind: "full-edition",
      bookId: "plurality",
      editionId: "2026-07",
      chapterId: "1",
      anchor: "1",
      shelfHref: "../shelf/",
      rights: {
        status: "approved",
        scope: "full-edition",
        basis: "Source publication is dedicated to the public domain under CC0 1.0",
        reviewedAt: "2026-09-06",
      },
    },
    courseReadingIds: ["human-choice-plurality"],
    relation: "sameAs",
    rights: {
      status: "approved",
      license: "CC0 1.0 Universal",
      attribution:
        "E. Glen Weyl, Audrey Tang, and the Plurality Community",
    },
    reviewedAt: "2026-09-06",
  },
  {
    id: "plurality-repository-guide",
    canonicalUrl: "https://github.com/pluralitybook/plurality",
    aliases: ["https://github.com/pluralitybook/plurality/"],
    title: "Plurality book and repository",
    publisher: "GitHub",
    sourceType: "repository",
    localReading: {
      kind: "source-guide",
      bookId: "human-choice-source-guide",
      editionId: "2026-08-30",
      chapterId: "plurality-book-and-repository",
      anchor: "plurality-book-and-repository",
      shelfHref: "../shelf/",
      rights: {
        status: "approved",
        scope: "source-guide",
        basis: "Original PageTurn-hosted editorial analysis, not repository text",
        reviewedAt: "2026-09-06",
      },
    },
    courseReadingIds: [
      "human-choice-plurality",
      "human-choice-plurality-repository",
    ],
    relation: "isPartOf",
    rights: {
      status: "link-only",
      attribution: "pluralitybook/plurality",
    },
    reviewedAt: "2026-09-06",
  },
  {
    id: "human-choice-source-guide",
    canonicalUrl:
      "https://yorkerhodes3.github.io/ethical-ai-field-guide/#sources",
    aliases: [
      "https://github.com/yorkerhodes3/ethical-ai-field-guide",
      "https://github.com/yorkerhodes3/ethical-ai-field-guide/",
    ],
    title: "The Human Choice: Source Guide",
    publisher: "The Human Choice Field Guide",
    publicationDate: "2026-08-30",
    sourceType: "document",
    localReading: {
      kind: "source-guide",
      bookId: "human-choice-source-guide",
      editionId: "2026-08-30",
      chapterId: "gates-turbulent-ai-era",
      anchor: "gates-turbulent-ai-era",
      shelfHref: "../shelf/",
      rights: {
        status: "approved",
        scope: "source-guide",
        basis: "Original PageTurn-hosted source analysis",
        reviewedAt: "2026-09-06",
      },
    },
    courseReadingIds: ["human-choice-source-guide"],
    relation: "sameAs",
    rights: {
      status: "approved",
      attribution: "The Human Choice Field Guide",
    },
    reviewedAt: "2026-09-06",
  },
];

export const hostedSourceResolver = createPageTurnSourceResolver(
  HOSTED_SOURCE_RECORDS,
);

export function hostedReadingUrl(location: PageTurnBookLocation): URL {
  const url = new URL("../v3/", globalThis.location.href);
  url.searchParams.set("book", location.bookId);
  url.searchParams.set("edition", location.editionId);
  if (location.chapterId) {
    url.searchParams.set("chapter", location.chapterId);
  }
  url.hash = location.anchor;
  return url;
}
