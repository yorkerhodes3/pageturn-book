import { describe, expect, it } from "vitest";
import { annotationMarkdown, type V3Annotation } from "./v3-personal.js";

describe("V3 personal data export", () => {
  it("exports quoted notes with source locations and a privacy statement", () => {
    const annotations: V3Annotation[] = [
      {
        id: "note-1",
        chapterId: "power",
        anchor: "power",
        quote: "Power requires restraint.",
        note: "Connect this to institutional accountability.",
        createdAt: "2026-08-31T12:00:00.000Z",
      },
    ];

    const markdown = annotationMarkdown(
      "What Is Ethical AI?",
      annotations,
      ({ anchor }) => `https://example.test/v3/?book=ethical-ai#${anchor}`,
    );

    expect(markdown).toContain("# Notes on What Is Ethical AI?");
    expect(markdown).toContain("> Power requires restraint.");
    expect(markdown).toContain("local-only V3 reader");
    expect(markdown).toContain(
      "[Open source passage](https://example.test/v3/?book=ethical-ai#power)",
    );
  });
});
