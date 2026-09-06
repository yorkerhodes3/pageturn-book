import { describe, expect, it } from "vitest";
import { createPageTurnTextTarget } from "./text-target.js";
import {
  annotationMarkdown,
  createPageTurnAnnotationBackup,
  parsePageTurnAnnotationBackup,
  previewPageTurnAnnotationImport,
  type PageTurnAnnotationV2,
  type V3Annotation,
} from "./personal.js";

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
    const legacyLocation = (annotation: V3Annotation) =>
      `https://example.test/v3/?book=ethical-ai#${annotation.anchor}`;

    const markdown = annotationMarkdown(
      "What Is Ethical AI?",
      annotations,
      legacyLocation,
    );

    expect(markdown).toContain("# Notes on What Is Ethical AI?");
    expect(markdown).toContain("> Power requires restraint.");
    expect(markdown).toContain("local-only V3 reader");
    expect(markdown).toContain(
      "[Open source passage](https://example.test/v3/?book=ethical-ai#power)",
    );
  });

  it("round-trips fully validated version 2 resolved and unresolved records", async () => {
    const selector = await createPageTurnTextTarget({
      bookId: "demo-book",
      editionId: "2026-08",
      chapterId: "intro",
      chapterContentHash: "0".repeat(64),
      blocks: [{ anchor: "p-1", text: "Hello ethical world." }],
      start: { anchor: "p-1", offset: 6 },
      end: { anchor: "p-1", offset: 13 },
    });
    const resolved: PageTurnAnnotationV2 = {
      annotationId: "note-1",
      schemaVersion: 2,
      bookId: "demo-book",
      editionId: "2026-08",
      motivation: "commenting",
      target: { state: "resolved", selector },
      body: { format: "text/markdown", value: "A note." },
      style: { color: "yellow", treatment: "highlight" },
      createdAt: "2026-08-31T12:00:00.000Z",
      updatedAt: "2026-08-31T12:00:00.000Z",
    };
    const unresolved: PageTurnAnnotationV2 = {
      ...resolved,
      annotationId: "note-2",
      target: {
        state: "unresolved",
        legacy: {
          chapterId: "intro",
          anchor: "missing",
          quote: "A missing quote.",
        },
        reason: "missing-anchor",
      },
    };
    const backup = createPageTurnAnnotationBackup(
      {
        bookId: "demo-book",
        editionId: "2026-08",
        title: "Demo",
      },
      [resolved, unresolved],
      "2026-09-06T12:00:00.000Z",
    );

    await expect(
      parsePageTurnAnnotationBackup(JSON.stringify(backup), {
        bookId: "demo-book",
        editionId: "2026-08",
      }),
    ).resolves.toEqual(backup);
    expect(annotationMarkdown("Demo", [unresolved], () => "#missing")).toContain(
      "Note 1 (unresolved)",
    );
  });

  it("previews deterministic duplicates and conflicts", () => {
    const base = {
      annotationId: "same-id",
      schemaVersion: 2,
      bookId: "demo-book",
      editionId: "2026-08",
      motivation: "highlighting",
      target: {
        state: "unresolved",
        legacy: { chapterId: "intro", anchor: "p-1", quote: "Quote" },
        reason: "quote-mismatch",
      },
      createdAt: "2026-08-31T12:00:00.000Z",
      updatedAt: "2026-08-31T12:00:00.000Z",
    } as const satisfies PageTurnAnnotationV2;

    expect(
      previewPageTurnAnnotationImport(
        [
          base,
          { ...base, annotationId: "new-id" },
          { ...base, body: { format: "text/markdown", value: "Conflict" } },
        ],
        [base],
      ),
    ).toEqual({
      newRecords: 1,
      identicalDuplicates: 1,
      idConflicts: 1,
      unresolvedRecords: 3,
    });
  });

  it("rejects a mismatched publication and a corrupted selector before import", async () => {
    const selector = await createPageTurnTextTarget({
      bookId: "demo-book",
      editionId: "2026-08",
      chapterId: "intro",
      chapterContentHash: "0".repeat(64),
      blocks: [{ anchor: "p-1", text: "Hello world." }],
      start: { anchor: "p-1", offset: 0 },
      end: { anchor: "p-1", offset: 5 },
    });
    const backup = createPageTurnAnnotationBackup(
      {
        bookId: "demo-book",
        editionId: "2026-08",
        title: "Demo",
      },
      [
        {
          annotationId: "note-1",
          schemaVersion: 2,
          bookId: "demo-book",
          editionId: "2026-08",
          motivation: "highlighting",
          target: {
            state: "resolved",
            selector: { ...selector, checksum: "corrupted" },
          },
          createdAt: "2026-08-31T12:00:00.000Z",
          updatedAt: "2026-08-31T12:00:00.000Z",
        },
      ],
    );

    await expect(
      parsePageTurnAnnotationBackup(JSON.stringify(backup), {
        bookId: "another-book",
        editionId: "2026-08",
      }),
    ).rejects.toThrow(/validation failed/);
    await expect(
      parsePageTurnAnnotationBackup(JSON.stringify(backup), {
        bookId: "demo-book",
        editionId: "2026-08",
      }),
    ).rejects.toThrow(/validation failed/);
  });
});
