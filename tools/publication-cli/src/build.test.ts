import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { buildPublication, createBuildPlan } from "./build.js";

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
  await mkdir(join(sourceRoot, "media"), { recursive: true });
  await writeFile(
    join(sourceRoot, "media", "example.webp"),
    "example media bytes",
  );
  await writeFile(
    join(sourceRoot, "book.yml"),
    `bookId: demo-book
editionId: 2026-08
title: Demo Book
authors:
  - name: Ethical Tech CoLab
language: en
media:
  defaultDisplay: pop-out
  defaultStyle: book-toned
  figures:
    - id: example-portrait
      chapterId: introduction
      afterAnchor: introduction
      src: media/example.webp
      integrity: sha256:5010c3b6c7697669beaa052de75b012d294dd9f6bf13f7c2ad7653e1875b1661
      originalSrc: https://example.org/example.jpg
      width: 800
      height: 600
      alt: An example portrait.
      caption: Figure 1. Example portrait.
      visualKind: portrait
      colorSemantics: decorative
      transformPermitted: true
      exportPermitted: false
      rights:
        license: CC BY 4.0
        attribution: Example Artist
      source: Example archive
      provenance: Reviewed record
      reviewedAt: 2026-09-06
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
    expect(first.manifest.media?.figures[0]?.id).toBe("example-portrait");
    expect(first.manifest.media?.figures[0]?.src).toBe(
     "media/example-portrait.webp",
    );
    const media = await readFile(
     join(first.editionPath, "media", "example-portrait.webp"),
    );
    expect(
     createHash("sha256").update(media).digest("hex"),
    ).toBe("5010c3b6c7697669beaa052de75b012d294dd9f6bf13f7c2ad7653e1875b1661");
    expect(html).toContain("data-reader-content");
    expect(html).toContain('id="introduction"');
  });

  it("includes media metadata in deterministic content hashing", async () => {
    const paths = await fixture();
    const first = await createBuildPlan(paths.sourceRoot);
    const configPath = join(paths.sourceRoot, "book.yml");
    const config = await readFile(configPath, "utf8");
    await writeFile(
      configPath,
      config.replace("exportPermitted: false", "exportPermitted: true"),
    );
    const changed = await createBuildPlan(paths.sourceRoot);
    const repeated = await createBuildPlan(paths.sourceRoot);

    expect(changed.manifest.contentHash).not.toBe(first.manifest.contentHash);
    expect(repeated.manifest.contentHash).toBe(changed.manifest.contentHash);
  });

  it("captures verified local media bytes in publication identity", async () => {
    const paths = await fixture();
    const configPath = join(paths.sourceRoot, "book.yml");
    const first = await createBuildPlan(paths.sourceRoot);
    expect(Buffer.from(first.mediaAssets[0]?.bytes ?? []).toString()).toBe(
      "example media bytes",
    );
    await writeFile(
      join(paths.sourceRoot, "media", "example.webp"),
      "second media bytes",
    );
    const config = await readFile(configPath, "utf8");
    await writeFile(
      configPath,
      config.replace(
        "5010c3b6c7697669beaa052de75b012d294dd9f6bf13f7c2ad7653e1875b1661",
        "6b7c1cae115ddb5db843925449bb1a2b98562260e7338ff61e7582ffdefdf4b5",
      ),
    );
    const changed = await createBuildPlan(paths.sourceRoot);

    expect(changed.manifest.contentHash).not.toBe(first.manifest.contentHash);
    expect(Buffer.from(changed.mediaAssets[0]?.bytes ?? []).toString()).toBe(
      "second media bytes",
    );
  });

  it("includes caption placement identity only in the affected chapter hash", async () => {
    const paths = await fixture();
    const configPath = join(paths.sourceRoot, "book.yml");
    await writeFile(
      configPath,
      `${await readFile(configPath, "utf8")}  - id: appendix
    title: Appendix
    source: chapters/appendix.md
`,
    );
    await writeFile(
      join(paths.sourceRoot, "chapters", "appendix.md"),
      "# Appendix {#appendix}\n\nUnchanged appendix.\n",
    );
    const before = await createBuildPlan(paths.sourceRoot);
    const config = await readFile(configPath, "utf8");
    await writeFile(
      configPath,
      config.replace(
        "caption: Figure 1. Example portrait.",
        "caption: Figure 1. Revised canonical caption.",
      ),
    );
    const after = await createBuildPlan(paths.sourceRoot);
    const beforeHashes = new Map<string, string>(
      before.manifest.renditions.semantic.chapters.map((chapter) => [
        String(chapter.chapterId),
        chapter.contentHash,
      ]),
    );
    const afterHashes = new Map<string, string>(
      after.manifest.renditions.semantic.chapters.map((chapter) => [
        String(chapter.chapterId),
        chapter.contentHash,
      ]),
    );

    expect(afterHashes.get("introduction")).not.toBe(
      beforeHashes.get("introduction"),
    );
    expect(afterHashes.get("appendix")).toBe(beforeHashes.get("appendix"));
  });

  it("rejects missing, mismatched, and escaping local media", async () => {
    const paths = await fixture();
    const configPath = join(paths.sourceRoot, "book.yml");
    const config = await readFile(configPath, "utf8");

    await writeFile(
      configPath,
      config.replace("media/example.webp", "media/missing.webp"),
    );
    await expect(createBuildPlan(paths.sourceRoot)).rejects.toThrow(
      "is missing media/missing.webp",
    );

    await writeFile(
      configPath,
      config.replace(
        "sha256:5010c3b6c7697669beaa052de75b012d294dd9f6bf13f7c2ad7653e1875b1661",
        `sha256:${"0".repeat(64)}`,
      ),
    );
    await expect(createBuildPlan(paths.sourceRoot)).rejects.toThrow(
      "integrity mismatch",
    );

    await writeFile(
      configPath,
      config.replace("media/example.webp", "../outside.webp"),
    );
    await expect(createBuildPlan(paths.sourceRoot)).rejects.toThrow(
      "escapes the publication source directory",
    );
  });

  it("requires pinned remote media and every compiled placement anchor", async () => {
    const paths = await fixture();
    const configPath = join(paths.sourceRoot, "book.yml");
    const config = await readFile(configPath, "utf8");
    await writeFile(
      configPath,
      config.replace(
        "src: media/example.webp",
        "src: https://example.org/example.webp",
      ),
    );
    await expect(createBuildPlan(paths.sourceRoot)).rejects.toThrow(
      /immutable.*commit/u,
    );

    await writeFile(
      configPath,
      config.replace("afterAnchor: introduction", "afterAnchor: missing-after"),
    );
    await expect(createBuildPlan(paths.sourceRoot)).rejects.toThrow(
      "anchor missing-after does not exist in chapter introduction",
    );

    await writeFile(
      configPath,
      config.replace(
        "afterAnchor: introduction",
        "replaceAnchors:\n         - introduction\n         - missing-anchor",
      ),
    );
    await expect(createBuildPlan(paths.sourceRoot)).rejects.toThrow(
      "anchor missing-anchor does not exist in chapter introduction",
    );
  });

  it("rejects unsafe and incomplete media metadata before building", async () => {
    const paths = await fixture();
    const configPath = join(paths.sourceRoot, "book.yml");
    const config = await readFile(configPath, "utf8");
    await writeFile(
      configPath,
      config
        .replace("src: media/example.webp", "src: javascript:alert(1)")
        .replace("        attribution: Example Artist\n", "")
        .replace(
          "chapters:\n",
          `    - id: duplicate-placement
      chapterId: introduction
      afterAnchor: introduction
      src: media/second.webp
      integrity: sha256:6b7c1cae115ddb5db843925449bb1a2b98562260e7338ff61e7582ffdefdf4b5
      width: 20
      height: 20
      alt: A duplicate.
      caption: Duplicate.
chapters:
`,
        ),
    );

    await expect(createBuildPlan(paths.sourceRoot)).rejects.toMatchObject({
      issues: expect.arrayContaining([
        expect.objectContaining({ code: "MEDIA_URL_INVALID" }),
        expect.objectContaining({ code: "MEDIA_ANCHOR_DUPLICATE" }),
        expect.objectContaining({ code: "TYPE_STRING" }),
      ]),
    });
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
