import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { buildPublication } from "./build.js";

const temporaryRoots: string[] = [];

async function fixture(): Promise<{
  sourceRoot: string;
  outputRoot: string;
}> {
  const root = await mkdtemp(join(tmpdir(), "book-reader-v2-"));
  temporaryRoots.push(root);
  const sourceRoot = join(root, "source");
  const outputRoot = join(root, "output");
  await mkdir(join(sourceRoot, "chapters"), { recursive: true });
  await writeFile(
    join(sourceRoot, "book.yml"),
    `bookId: demo-book
editionId: 2026-08
title: Demo Book
authors:
  - name: Ethical Tech CoLab
language: en
chapters:
  - id: introduction
    title: Introduction
    source: chapters/introduction.md
`,
  );
  await writeFile(
    join(sourceRoot, "chapters", "introduction.md"),
    "# Introduction {#introduction}\n\nA semantic paragraph.\n",
  );
  return { sourceRoot, outputRoot };
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) =>
      rm(root, { recursive: true, force: true }),
    ),
  );
});

describe("buildPublication", () => {
  it("publishes a validated immutable edition", async () => {
    const paths = await fixture();
    const first = await buildPublication(paths);
    const second = await buildPublication(paths);
    const html = await readFile(
      join(
        first.editionPath,
        "chapters",
        "introduction",
        "index.html",
      ),
      "utf8",
    );

    expect(first.unchanged).toBe(false);
    expect(second.unchanged).toBe(true);
    expect(first.manifest.renditions.semantic.chapters).toHaveLength(1);
    expect(html).toContain("data-reader-content");
    expect(html).toContain('id="introduction"');
  });

  it("does not overwrite an immutable edition with changed content", async () => {
    const paths = await fixture();
    const first = await buildPublication(paths);
    const manifestBefore = await readFile(
      join(first.editionPath, "manifest.json"),
      "utf8",
    );
    await writeFile(
      join(paths.sourceRoot, "chapters", "introduction.md"),
      "# Introduction {#introduction}\n\nChanged content.\n",
    );

    await expect(buildPublication(paths)).rejects.toThrow(
      "already exists with different content",
    );
    expect(
      await readFile(join(first.editionPath, "manifest.json"), "utf8"),
    ).toBe(manifestBefore);
  });

  it("does not treat different host integration output as unchanged", async () => {
    const paths = await fixture();
    await buildPublication({
      ...paths,
      themeHref: "/theme-a.css",
    });

    await expect(
      buildPublication({
        ...paths,
        themeHref: "/theme-b.css",
      }),
    ).rejects.toThrow("already exists with different content");
  });
});
