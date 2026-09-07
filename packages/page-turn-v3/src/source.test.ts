import { afterEach, describe, expect, it, vi } from "vitest";
import {
  approvedPageTurnLocalReading,
  createPageTurnSourceResolver,
  normalizePageTurnDoi,
  normalizePageTurnIsbn,
  normalizePageTurnSourceUrl,
  type PageTurnSourceContext,
  type PageTurnSourceRecord,
} from "./source.js";
import { validatePageTurnSourceResolution } from "./source-card.js";

const context: PageTurnSourceContext = {
  bookId: "host-book",
  editionId: "2026-09",
  chapterId: "one",
  anchor: "citation",
  courseReadingIds: [],
};

function source(
  overrides: Partial<PageTurnSourceRecord> = {},
): PageTurnSourceRecord {
  return {
    id: "source-one",
    canonicalUrl: "https://example.com/Work",
    title: "Reviewed work",
    sourceType: "book",
    reviewedAt: "2026-09-01",
    rights: { status: "approved" },
    ...overrides,
  };
}

describe("PageTurn source normalization", () => {
  it("normalizes safe HTTP URLs without changing path case or query", () => {
    expect(
      normalizePageTurnSourceUrl(
        "HTTPS://BÜCHER.Example:443/a/../Work/%7e?q=%41#passage",
      ),
    ).toBe("https://xn--bcher-kva.example/Work/~?q=A");
    expect(() => normalizePageTurnSourceUrl("javascript:alert(1)")).toThrow(
      /safe HTTP/,
    );
    expect(() =>
      normalizePageTurnSourceUrl("https://user:password@example.com/"),
    ).toThrow(/safe HTTP/);
  });

  it("normalizes DOI prefixes and rejects malformed DOI values", () => {
    expect(normalizePageTurnDoi("doi:10.1000/ABC.Def")).toBe(
      "10.1000/abc.def",
    );
    expect(
      normalizePageTurnDoi(
        "https://doi.org/10.5555/TEST?source=course#passage",
      ),
    ).toBe(
      "10.5555/test",
    );
    expect(normalizePageTurnDoi("not a DOI")).toBeUndefined();
  });

  it("normalizes and checksum-validates ISBN-10 and ISBN-13", () => {
    expect(normalizePageTurnIsbn("ISBN-10: 0-306-40615-2")).toBe("0306406152");
    expect(normalizePageTurnIsbn("978-0-306-40615-7")).toBe("9780306406157");
    expect(normalizePageTurnIsbn("0-8044-2957-X")).toBe("080442957X");
    expect(normalizePageTurnIsbn("978-0-306-40615-8")).toBeUndefined();
    expect(normalizePageTurnIsbn("4006381333931")).toBeUndefined();
  });
});

describe("PageTurn deterministic source resolver", () => {
  it("uses pinned, URL, DOI, ISBN, and course precedence without fuzzy matching", () => {
    const records = [
      source({
        id: "course",
        canonicalUrl: "https://course.example/item",
        courseReadingIds: ["course-1"],
      }),
      source({
        id: "isbn",
        canonicalUrl: "https://isbn.example/item",
        isbn: ["9780306406157"],
        courseReadingIds: ["course-1"],
      }),
      source({
        id: "doi",
        canonicalUrl: "https://doi.example/item",
        doi: "10.5555/test",
      }),
      source({
        id: "url",
        canonicalUrl: "https://example.com/work",
        aliases: ["https://example.com/alias"],
      }),
      source({
        id: "pinned",
        canonicalUrl:
          "https://github.com/example/project/tree/abcdef123456",
        repository: {
          url: "https://github.com/example/project",
          revision: "abcdef123456",
        },
        aliases: ["https://example.com/alias"],
      }),
    ];
    const resolver = createPageTurnSourceResolver(records);
    const signal = new AbortController().signal;

    expect(
      resolver(
        new URL("https://github.com/example/project/tree/abcdef123456#readme"),
        { ...context, courseReadingIds: ["course-1"] },
        signal,
      ),
    ).toMatchObject({ kind: "external-card", record: { id: "pinned" } });
    expect(
      resolver(
        new URL("https://example.com/alias#retained"),
        context,
        signal,
      ),
    ).toMatchObject({ kind: "external-card", record: { id: "url" } });
    expect(
      resolver(
        new URL("https://doi.org/10.5555/TEST?ref=course#page"),
        context,
        signal,
      ),
    ).toMatchObject({
      kind: "external-card",
      record: { id: "doi" },
      url: "https://doi.org/10.5555/TEST?ref=course#page",
    });
    expect(
      resolver(
        new URL("https://catalog.example/isbn/978-0-306-40615-7"),
        { ...context, courseReadingIds: ["course-1"] },
        signal,
      ),
    ).toMatchObject({
      kind: "external-card",
      record: { id: "isbn" },
      url: "https://catalog.example/isbn/978-0-306-40615-7",
    });
    expect(
      resolver(
        new URL("https://unmatched.example/Reviewed-work"),
        { ...context, courseReadingIds: ["course-1"] },
        signal,
      ),
    ).toMatchObject({ kind: "ambiguous" });
    expect(
      resolver(
        new URL("https://unmatched.example/Reviewed-work"),
        context,
        signal,
      ),
    ).toEqual({
      kind: "external-card",
      url: "https://unmatched.example/Reviewed-work",
    });
  });

  it("never treats an unpinned repository URL as its pinned revision", () => {
    const resolver = createPageTurnSourceResolver([
      source({
        canonicalUrl:
          "https://github.com/example/project/tree/abcdef123456",
        repository: {
          url: "https://github.com/example/project",
          revision: "abcdef123456",
        },
      }),
    ]);
    expect(
      resolver(
        new URL("https://github.com/example/project"),
        context,
        new AbortController().signal,
      ),
    ).toEqual({
      kind: "external-card",
      url: "https://github.com/example/project",
    });
  });

  it("matches an exact declared generic pinned canonical URL at the pinned tier", () => {
    const canonical =
      "https://gitlab.example/group/project/-/releases/revision-2026.09";
    const resolver = createPageTurnSourceResolver([
      source({
        canonicalUrl: canonical,
        repository: {
          url: "https://gitlab.example/group/project",
          revision: "revision-2026.09",
        },
      }),
    ]);
    const signal = new AbortController().signal;
    expect(resolver(new URL(`${canonical}#notes`), context, signal)).toMatchObject(
      {
        kind: "external-card",
        record: { id: "source-one" },
      },
    );
    expect(
      resolver(
        new URL("https://gitlab.example/group/project"),
        context,
        signal,
      ),
    ).toEqual({
      kind: "external-card",
      url: "https://gitlab.example/group/project",
    });
  });

  it("returns ambiguity at the highest matching tier", () => {
    const resolver = createPageTurnSourceResolver([
      source({ id: "a", aliases: ["https://alias.example/work"] }),
      source({
        id: "b",
        canonicalUrl: "https://other.example/work",
        aliases: ["https://alias.example/work"],
      }),
    ]);
    expect(
      resolver(
        new URL("https://alias.example/work"),
        context,
        new AbortController().signal,
      ),
    ).toMatchObject({
      kind: "ambiguous",
      candidates: [{ id: "a" }, { id: "b" }],
    });
  });

  it("fails closed for mismatched, expired, and top-level link-only rights", () => {
    const full = source({
      rights: { status: "link-only" },
      localReading: {
        kind: "full-edition",
        bookId: "book",
        editionId: "edition",
        rights: {
          status: "approved",
          scope: "full-edition",
          basis: "Publisher grant",
          reviewedAt: "2026-01-01",
        },
      },
    });
    expect(approvedPageTurnLocalReading(full)).toBeUndefined();
    expect(
      approvedPageTurnLocalReading({
        ...full,
        rights: { status: "approved" },
        localReading: {
          ...full.localReading!,
          rights: {
            ...full.localReading!.rights,
            scope: "excerpt",
          },
        },
      }),
    ).toBeUndefined();
    const expiredRights = {
      status: "approved" as const,
      scope: "source-guide" as const,
      basis: "Original analysis",
      reviewedAt: "2026-01-01",
      expiresAt: "2026-05-01",
    };
    expect(
      approvedPageTurnLocalReading(
        {
          ...full,
          localReading: {
            kind: "source-guide",
            bookId: "guide",
            editionId: "edition",
            rights: expiredRights,
          },
        },
        new Date("2026-09-01"),
      ),
    ).toBeUndefined();
  });

  it("accepts independently approved source guides for link-only sources", () => {
    const guide = source({
      rights: { status: "link-only" },
      localReading: {
        kind: "source-guide",
        bookId: "guide",
        editionId: "2026-09",
        chapterId: "source",
        anchor: "source",
        rights: {
          status: "approved",
          scope: "source-guide",
          basis: "Original editorial analysis",
          reviewedAt: "2026-09-01",
        },
      },
    });
    expect(approvedPageTurnLocalReading(guide)).toEqual(guide.localReading);
  });

  it("disables malformed local readings without discarding safe source metadata", () => {
    const malformed = source({
      localReading: {
        kind: "excerpt",
        bookId: "book",
        editionId: "edition",
        anchor: "missing-chapter",
        rights: {
          status: "approved",
          scope: "excerpt",
          basis: "Reviewed permission",
          reviewedAt: "2026-09-01",
        },
      },
    });
    const resolution = createPageTurnSourceResolver([malformed])(
      new URL(malformed.canonicalUrl),
      context,
      new AbortController().signal,
    );
    expect(resolution).toMatchObject({
      kind: "external-card",
      record: { id: "source-one" },
    });
  });

  it("rejects invalid base records and honors abort signals", () => {
    expect(() =>
      createPageTurnSourceResolver([
        source({ canonicalUrl: "file:///private/source" }),
      ]),
    ).toThrow(/safe HTTP/);
    expect(() =>
      createPageTurnSourceResolver([
        source({ isbn: ["9780306406158"] }),
      ]),
    ).toThrow(/checksum/);
    expect(() =>
      createPageTurnSourceResolver([
        source({ reviewedAt: "2026-02-31" }),
      ]),
    ).toThrow(/real date/);
    expect(() =>
      createPageTurnSourceResolver([
        source({
          canonicalUrl: "https://github.com/example/project",
          repository: {
            url: "https://github.com/example/project",
            revision: "abcdef123456",
          },
        }),
      ]),
    ).toThrow(/must identify the declared repository revision/);
    const resolver = createPageTurnSourceResolver([source()]);
    const controller = new AbortController();
    controller.abort();
    expect(() =>
      resolver(new URL("https://example.com/Work"), context, controller.signal),
    ).toThrow(expect.objectContaining({ name: "AbortError" }));
  });

  it("evaluates expiring local rights at each call unless the clock is fixed", () => {
    vi.useFakeTimers();
    const expiring = source({
      localReading: {
        kind: "source-guide",
        bookId: "guide",
        editionId: "edition",
        rights: {
          status: "approved",
          scope: "source-guide",
          basis: "Original analysis",
          reviewedAt: "2026-01-01",
          expiresAt: "2030-01-01",
        },
      },
    });
    vi.setSystemTime(new Date("2029-12-31T23:59:59Z"));
    const liveResolver = createPageTurnSourceResolver([expiring]);
    const fixedResolver = createPageTurnSourceResolver([expiring], {
      now: new Date("2029-12-31T23:59:59Z"),
    });
    const resolve = (resolver: ReturnType<typeof createPageTurnSourceResolver>) =>
      resolver(
        new URL(expiring.canonicalUrl),
        context,
        new AbortController().signal,
      );
    expect(resolve(liveResolver)).toMatchObject({ kind: "local-publication" });
    vi.setSystemTime(new Date("2030-01-01T00:00:01Z"));
    expect(resolve(liveResolver)).toMatchObject({ kind: "external-card" });
    expect(resolve(fixedResolver)).toMatchObject({ kind: "local-publication" });
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("PageTurn source resolution validation", () => {
  const authoredUrl = new URL("https://authored.example/source");

  it("rejects unknown resolution kinds", () => {
    expect(() =>
      validatePageTurnSourceResolution(
        { kind: "future-card", url: "https://example.com" },
        authoredUrl,
      ),
    ).toThrow(/unknown source resolution kind/);
  });

  it.each([
    null,
    {},
    { kind: "external-card" },
    { kind: "direct-external", url: 42 },
    { kind: "ambiguous", url: "https://example.com", candidates: {} },
    { kind: "local-publication", record: source(), target: null },
  ])("rejects malformed resolution shape %#", (resolution) => {
    expect(() =>
      validatePageTurnSourceResolution(resolution, authoredUrl),
    ).toThrow(/source resolution|needs a URL|needs two candidates|local source target/);
  });
});
