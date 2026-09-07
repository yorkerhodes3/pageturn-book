import { describe, expect, it } from "vitest";
import {
  PAGE_TURN_SHARE_CONTEXT_MAX_CHARACTERS,
  PAGE_TURN_SHARE_QUOTE_MAX_CHARACTERS,
  createPageTurnSharePayload,
  pageTurnShareCapabilities,
  pageTurnShareContext,
  pageTurnShareTargetEnd,
  resolvePageTurnSharePolicy,
  type PageTurnSharePolicy,
} from "./share.js";
import type { PageTurnTextTargetV1 } from "./text-target.js";

const target: PageTurnTextTargetV1 = {
  version: 1,
  bookId: "book",
  editionId: "edition",
  chapterId: "chapter",
  chapterContentHash: "0".repeat(64),
  start: { anchor: "p-1", offset: 3 },
  end: { anchor: "p-2", offset: 2 },
  quote: { exact: "defgh\nij", prefix: "abc", suffix: "klmnop" },
  checksum: "checksum",
};

const blocks = [
  { anchor: "p-1", text: "abcdefgh" },
  { anchor: "p-2", text: "ijklmnop" },
] as const;

describe("PageTurn share policy", () => {
  it("fails closed to anchor-only when policy is missing", () => {
    const resolved = resolvePageTurnSharePolicy();
    expect(resolved).toMatchObject({ source: "missing", valid: true });
    expect(pageTurnShareCapabilities(resolved)).toEqual({
      location: true,
      quote: false,
      visual: false,
      sourceImages: false,
    });
  });

  it("accepts the full capability matrix and source-image gate", () => {
    const resolved = resolvePageTurnSharePolicy({
      location: "public",
      quote: { permitted: true, maximumCharacters: 800 },
      visual: {
        permitted: true,
        maximumContextCharacters: 240,
        sourceImages: "same-origin-approved",
      },
    });
    expect(resolved.valid).toBe(true);
    expect(pageTurnShareCapabilities(resolved)).toEqual({
      location: true,
      quote: true,
      visual: true,
      sourceImages: true,
    });
  });

  it.each([
    {
      location: "public",
      quote: { permitted: false, maximumCharacters: 0 },
      visual: {
        permitted: true,
        maximumContextCharacters: 240,
        sourceImages: "none",
      },
    },
    {
      location: "public",
      quote: {
        permitted: true,
        maximumCharacters: PAGE_TURN_SHARE_QUOTE_MAX_CHARACTERS + 1,
      },
      visual: {
        permitted: false,
        maximumContextCharacters: 0,
        sourceImages: "none",
      },
    },
    {
      location: "public",
      quote: { permitted: true, maximumCharacters: 800 },
      visual: {
        permitted: true,
        maximumContextCharacters:
          PAGE_TURN_SHARE_CONTEXT_MAX_CHARACTERS + 1,
        sourceImages: "none",
      },
    },
  ])("disables every share output for an invalid policy", (policy) => {
    const resolved = resolvePageTurnSharePolicy(
      policy as PageTurnSharePolicy,
    );
    expect(resolved).toMatchObject({ source: "invalid", valid: false });
    expect(pageTurnShareCapabilities(resolved)).toEqual({
      location: false,
      quote: false,
      visual: false,
      sourceImages: false,
    });
  });
});

describe("PageTurn share payload helpers", () => {
  it("bounds public context and truncated exact-target coordinates", () => {
    expect(pageTurnShareContext(target, blocks, 6)).toEqual({
      before: "abc",
      after: "klm",
    });
    expect(pageTurnShareTargetEnd(target, blocks, 5)).toEqual({
      anchor: "p-1",
      offset: 8,
    });
    expect(pageTurnShareTargetEnd(target, blocks, 7)).toEqual({
      anchor: "p-2",
      offset: 1,
    });
  });

  it("fails closed when a cross-block prefix cannot fit the quote cap", () => {
    const shortBlocks = [
      { anchor: "a", text: "A" },
      { anchor: "b", text: "B" },
    ] as const;
    const shortTarget: PageTurnTextTargetV1 = {
      ...target,
      start: { anchor: "a", offset: 0 },
      end: { anchor: "b", offset: 1 },
      quote: { exact: "A\nB", prefix: "", suffix: "" },
    };
    const end = pageTurnShareTargetEnd(shortTarget, shortBlocks, 2);
    expect(end).toBeUndefined();
  });

  it("creates explicit equivalent text without accepting private state", () => {
    const payload = createPageTurnSharePayload({
      title: "Public Book",
      authors: ["A. Author"],
      chapterTitle: "A Chapter",
      editionId: "2026-09",
      sourceUrl: "https://example.test/book#passage",
      citation: "Public Book, A Chapter, edition 2026-09",
      quote: "A public quote",
    });
    expect(payload.text).toContain("A public quote");
    expect(payload.text).toContain("Edition: 2026-09");
    expect(payload.clipboardText).toContain(
      "https://example.test/book#passage",
    );
    expect(JSON.stringify(payload)).not.toContain("secret local note");
  });

  it("removes all exact-text material from anchor-only payloads", () => {
    const payload = createPageTurnSharePayload({
      title: "Public Book",
      authors: [],
      chapterTitle: "A Chapter",
      editionId: "2026-09",
      sourceUrl: "https://example.test/book#passage",
    });
    expect(payload.quote).toBeUndefined();
    expect(payload.disclosure).toContain("exact selectors");
    expect(payload.clipboardText).toBe(
      [
        "Public Book",
        "Chapter: A Chapter",
        "Edition: 2026-09",
        "Source: https://example.test/book#passage",
        "https://example.test/book#passage",
      ].join("\n"),
    );
  });
});
