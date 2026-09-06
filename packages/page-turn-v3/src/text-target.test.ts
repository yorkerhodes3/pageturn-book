import { describe, expect, it } from "vitest";
import {
  createPageTurnTextTarget,
  decodePageTurnTextTarget,
  encodePageTurnTextTarget,
  normalizePageTurnText,
  pageTurnTextFragment,
  pageTurnTextOffsetAt,
  pageTurnTextSegmentRange,
  pageTurnTextTargetUrl,
  resolvePageTurnTextTarget,
  resolvePageTurnTextTargetToken,
} from "./text-target.js";

const chapterContentHash = "0".repeat(64);

describe("PageTurn text targets", () => {
  it("normalizes Unicode and whitespace deterministically", () => {
    expect(normalizePageTurnText("  Cafe\u0301\r\n\tethics  ")).toBe(
      "Café ethics",
    );
    expect(pageTurnTextOffsetAt("  A  😀 B  ", 8)).toBe(4);
    expect(pageTurnTextOffsetAt("  A  😀 B  ", 11)).toBe(5);
    expect(
      pageTurnTextSegmentRange(
        "First item\n  Second item\nThird item",
        ["First item", "Second item", "Third item"],
        1,
        2,
      ),
    ).toEqual({ start: 11, end: 33 });
  });

  it("matches the normative checksum and token vector", async () => {
    const target = await createPageTurnTextTarget({
      bookId: "demo-book",
      editionId: "2026-08",
      chapterId: "intro",
      chapterContentHash,
      start: { anchor: "p-1", offset: 6 },
      end: { anchor: "p-1", offset: 11 },
      blocks: [{ anchor: "p-1", text: "Hello world." }],
    });

    expect(target.quote).toEqual({
      exact: "world",
      prefix: "Hello ",
      suffix: ".",
    });
    expect(target.checksum).toBe("pbB6znXNrWUNh1mN");
    const encoded = encodePageTurnTextTarget(target);
    expect(encoded).toBe(
      "v1.eyJ2IjoxLCJiIjoiZGVtby1ib29rIiwiZSI6IjIwMjYtMDgiLCJjIjoiaW50cm8iLCJoIjoiMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAiLCJzYSI6InAtMSIsInNvIjo2LCJlYSI6InAtMSIsImVvIjoxMSwicSI6InBiQjZ6blhOcldVTmgxbU4ifQ",
    );
    expect(decodePageTurnTextTarget(encoded)).toEqual({
      version: 1,
      bookId: "demo-book",
      editionId: "2026-08",
      chapterId: "intro",
      chapterContentHashPrefix: "0".repeat(32),
      start: { anchor: "p-1", offset: 6 },
      end: { anchor: "p-1", offset: 11 },
      checksum: "pbB6znXNrWUNh1mN",
    });
    expect(pageTurnTextFragment(target)).toBe(
      ":~:text=Hello%20-,world,-.",
    );
    expect(
      pageTurnTextTargetUrl("https://example.test/v3/?context=drop", target)
        .href,
    ).toBe(
      "https://example.test/v3/?context=drop&book=demo-book&edition=2026-08&chapter=intro&selection=" +
        "v1.eyJ2IjoxLCJiIjoiZGVtby1ib29rIiwiZSI6IjIwMjYtMDgiLCJjIjoiaW50cm8iLCJoIjoiMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAiLCJzYSI6InAtMSIsInNvIjo2LCJlYSI6InAtMSIsImVvIjoxMSwicSI6InBiQjZ6blhOcldVTmgxbU4ifQ" +
        "#p-1:~:text=Hello%20-,world,-.",
    );
  });

  it("uses line-feed separators for cross-block selections", async () => {
    const target = await createPageTurnTextTarget({
      bookId: "demo-book",
      editionId: "2026-08",
      chapterId: "intro",
      chapterContentHash,
      start: { anchor: "p-1", offset: 6 },
      end: { anchor: "p-3", offset: 5 },
      blocks: [
        { anchor: "p-1", text: "Hello first block." },
        { anchor: "p-2", text: "Middle block." },
        { anchor: "p-3", text: "Final words." },
      ],
    });

    expect(target.quote.exact).toBe(
      "first block.\nMiddle block.\nFinal",
    );
    expect(target.quote.prefix).toBe("Hello ");
    expect(target.quote.suffix).toBe(" words.");
  });

  it("canonicalizes empty cross-block boundary segments", async () => {
    const target = await createPageTurnTextTarget({
      bookId: "demo-book",
      editionId: "2026-08",
      chapterId: "intro",
      chapterContentHash,
      start: { anchor: "p-1", offset: 5 },
      end: { anchor: "p-3", offset: 0 },
      blocks: [
        { anchor: "p-1", text: "First" },
        { anchor: "p-2", text: "Middle" },
        { anchor: "p-3", text: "Final" },
      ],
    });

    expect(target.start).toEqual({ anchor: "p-2", offset: 0 });
    expect(target.end).toEqual({ anchor: "p-2", offset: 6 });
    expect(target.quote.exact).toBe("Middle");
  });

  it("keeps Text Fragment start and end terms non-overlapping", () => {
    const exact = Array.from({ length: 49 }, (_, index) =>
      String.fromCharCode(65 + (index % 26)),
    ).join("");
    const fragment = pageTurnTextFragment({
      version: 1,
      bookId: "demo-book",
      editionId: "2026-08",
      chapterId: "intro",
      chapterContentHash,
      start: { anchor: "p-1", offset: 0 },
      end: { anchor: "p-1", offset: 49 },
      quote: { exact, prefix: "", suffix: "" },
      checksum: "unused",
    });
    const [start = "", end = ""] = fragment
      .replace(":~:text=", "")
      .split(",")
      .map(decodeURIComponent);
    expect(Array.from(start)).toHaveLength(24);
    expect(Array.from(end)).toHaveLength(24);
    expect(exact).toBe(`${start}${exact[24]}${end}`);
  });

  it("resolves exact positions and rejects changed editions", async () => {
    const input = {
      bookId: "demo-book",
      editionId: "2026-08",
      chapterId: "intro",
      chapterContentHash,
      start: { anchor: "p-1", offset: 6 },
      end: { anchor: "p-1", offset: 11 },
      blocks: [{ anchor: "p-1", text: "Hello world." }],
    } as const;
    const target = await createPageTurnTextTarget(input);

    await expect(resolvePageTurnTextTarget(target, input)).resolves.toEqual({
      state: "resolved",
      target,
      strategy: "position",
    });
    await expect(
      resolvePageTurnTextTarget(target, {
        ...input,
        editionId: "2026-09",
      }),
    ).resolves.toMatchObject({
      state: "unresolved",
      reason: "edition-mismatch",
    });
  });

  it("re-anchors a valid target by quote context", async () => {
    const target = await createPageTurnTextTarget({
      bookId: "demo-book",
      editionId: "2026-08",
      chapterId: "intro",
      chapterContentHash,
      start: { anchor: "p-1", offset: 6 },
      end: { anchor: "p-1", offset: 12 },
      blocks: [{ anchor: "p-1", text: "Alpha target omega." }],
    });
    const resolution = await resolvePageTurnTextTarget(target, {
      bookId: "demo-book",
      editionId: "2026-08",
      chapterId: "intro",
      chapterContentHash: "1".repeat(64),
      blocks: [{ anchor: "p-1", text: "Inserted. Alpha target omega." }],
    });

    expect(resolution).toMatchObject({
      state: "resolved",
      strategy: "quote-context",
      target: {
        start: { anchor: "p-1", offset: 16 },
        end: { anchor: "p-1", offset: 22 },
      },
    });
  });

  it("rejects invalid and ambiguous stored targets", async () => {
    const target = await createPageTurnTextTarget({
      bookId: "demo-book",
      editionId: "2026-08",
      chapterId: "intro",
      chapterContentHash,
      start: { anchor: "p-1", offset: 0 },
      end: { anchor: "p-1", offset: 6 },
      blocks: [{ anchor: "p-1", text: "target" }],
    });

    await expect(
      resolvePageTurnTextTarget(
        { ...target, checksum: "invalid" },
        {
          bookId: "demo-book",
          editionId: "2026-08",
          chapterId: "intro",
          chapterContentHash,
          blocks: [{ anchor: "p-1", text: "target" }],
        },
      ),
    ).resolves.toMatchObject({
      state: "unresolved",
      reason: "invalid-target",
    });
    await expect(
      resolvePageTurnTextTarget(target, {
        bookId: "demo-book",
        editionId: "2026-08",
        chapterId: "intro",
        chapterContentHash: "1".repeat(64),
        blocks: [{ anchor: "p-1", text: "target and target" }],
      }),
    ).resolves.toMatchObject({
      state: "unresolved",
      reason: "ambiguous-quote",
    });
    await expect(
      resolvePageTurnTextTarget(target, {
        bookId: "demo-book",
        editionId: "2026-08",
        chapterId: "intro",
        chapterContentHash: "2".repeat(64),
        blocks: [
          { anchor: "p-1", text: "The original passage changed." },
          { anchor: "p-2", text: "target" },
        ],
      }),
    ).resolves.toMatchObject({
      state: "unresolved",
      reason: "quote-mismatch",
    });
  });

  it("reconstructs and validates a target from its compact token", async () => {
    const input = {
      bookId: "demo-book",
      editionId: "2026-08",
      chapterId: "intro",
      chapterContentHash,
      start: { anchor: "p-1", offset: 6 },
      end: { anchor: "p-1", offset: 11 },
      blocks: [{ anchor: "p-1", text: "Hello world." }],
    } as const;
    const target = await createPageTurnTextTarget(input);
    await expect(
      resolvePageTurnTextTargetToken(encodePageTurnTextTarget(target), input),
    ).resolves.toEqual({
      state: "resolved",
      target,
      strategy: "position",
    });
    await expect(
      resolvePageTurnTextTargetToken(encodePageTurnTextTarget(target), {
        ...input,
        chapterContentHash: "1".repeat(64),
      }),
    ).resolves.toMatchObject({
      state: "unresolved",
      reason: "edition-mismatch",
    });
  });

  it("rejects non-canonical, malformed, and oversized tokens", () => {
    const reordered = {
      b: "demo-book",
      v: 1,
      e: "2026-08",
      c: "intro",
      h: "0".repeat(32),
      sa: "p-1",
      so: 6,
      ea: "p-1",
      eo: 11,
      q: "pbB6znXNrWUNh1mN",
    };
    const encoded = `v1.${btoa(JSON.stringify(reordered))
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replace(/=+$/, "")}`;

    expect(() => decodePageTurnTextTarget(encoded)).toThrow(
      "not canonically encoded",
    );
    expect(() => decodePageTurnTextTarget("v1.not+a-token")).toThrow(
      "invalid base64url",
    );
    expect(() => decodePageTurnTextTarget(`v1.${"a".repeat(513)}`)).toThrow(
      "invalid",
    );
  });
});
