import { describe, expect, it } from "vitest";
import { HOSTED_SOURCE_RECORDS, hostedSourceResolver } from "./source-registry.js";

const context = {
  bookId: "human-choice-source-guide",
  editionId: "2026-08-30",
  chapterId: "plurality-dot-net",
  anchor: "plurality-dot-net",
  courseReadingIds: [] as readonly string[],
};

describe("hosted source registry", () => {
  it("maps reviewed Ethical AI and Plurality URLs to immutable editions", () => {
    const signal = new AbortController().signal;
    expect(
      hostedSourceResolver(
        new URL("https://ethical-tech-colab.github.io/what-is-ethical-ai/"),
        context,
        signal,
      ),
    ).toMatchObject({
      kind: "local-publication",
      target: {
        bookId: "what-is-ethical-ai",
        editionId: "2026-07",
      },
    });
    expect(
      hostedSourceResolver(
        new URL("https://plurality.net/read/#chapter"),
        context,
        signal,
      ),
    ).toMatchObject({
      kind: "local-publication",
      target: { bookId: "plurality", editionId: "2026-07" },
    });
  });

  it("keeps the unpinned repository mapping limited to an original source guide", () => {
    expect(
      hostedSourceResolver(
        new URL("https://github.com/pluralitybook/plurality"),
        context,
        new AbortController().signal,
      ),
    ).toMatchObject({
      kind: "local-publication",
      target: {
        kind: "source-guide",
        bookId: "human-choice-source-guide",
        editionId: "2026-08-30",
      },
    });
  });

  it("keeps a pinned full-edition record and explicit course ambiguity", () => {
    const pinned = HOSTED_SOURCE_RECORDS.find(
      ({ id }) => id === "plurality-pinned-edition",
    );
    expect(pinned?.repository?.revision).toHaveLength(40);
    expect(
      hostedSourceResolver(
        new URL("https://unknown.example/citation"),
        { ...context, courseReadingIds: ["human-choice-plurality"] },
        new AbortController().signal,
      ),
    ).toMatchObject({
      kind: "ambiguous",
      candidates: [
        { id: "plurality-reading-site" },
        { id: "plurality-repository-guide" },
      ],
    });
  });
});
