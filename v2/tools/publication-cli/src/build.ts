import { createHash, randomUUID } from "node:crypto";
import {
  mkdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import {
  MANIFEST_SCHEMA_VERSION,
  validatePublicationManifest,
  type PublicationManifest,
  type SemanticLocation,
  type TocEntry,
} from "@ethical-tech/book-publication-model";
import {
  readBookConfig,
  resolveSourceFile,
  type BookConfig,
  type ChapterConfig,
} from "./config.js";
import {
  compileMarkdown,
  type CompiledMarkdown,
  type SourceMapEntry,
} from "./markdown.js";

export type PublicationBuildOptions = {
  sourceRoot: string;
  outputRoot: string;
  themeHref?: string;
  enhanceScriptHref?: string;
};

export type PublicationBuildResult = {
  editionPath: string;
  manifest: PublicationManifest;
  unchanged: boolean;
};

type CompiledChapter = {
  config: ChapterConfig;
  compiled: CompiledMarkdown;
  contentHash: string;
  bodyHtml: string;
};

type BuildPlan = {
  config: BookConfig;
  chapters: CompiledChapter[];
  manifest: PublicationManifest;
  sourceMap: {
    schemaVersion: 1;
    bookId: string;
    editionId: string;
    entries: SourceMapEntry[];
  };
};

type BuildMetadata = {
  schemaVersion: 1;
  artifactHash: string;
};

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function semanticLocation(
  config: BookConfig,
  chapter: ChapterConfig,
  anchor: string,
): SemanticLocation {
  return {
    kind: "semantic",
    bookId: config.bookId,
    editionId: config.editionId,
    chapterId: chapter.chapterId,
    anchor,
  };
}

function chapterToc(
  config: BookConfig,
  chapter: CompiledChapter,
): TocEntry {
  const firstAnchor = chapter.compiled.anchors[0];
  if (!firstAnchor) {
    throw new Error(`${chapter.config.source} contains no addressable content`);
  }
  const children = chapter.compiled.headings
    .filter((heading) => heading.depth > 1)
    .map((heading) => ({
      title: heading.title,
      location: semanticLocation(config, chapter.config, heading.anchor),
    }));
  return {
    title: chapter.config.title,
    location: semanticLocation(config, chapter.config, firstAnchor),
    ...(children.length === 0 ? {} : { children }),
  };
}

function renderNavigation(
  chapters: CompiledChapter[],
  index: number,
): string {
  const previous = chapters[index - 1];
  const next = chapters[index + 1];
  if (!previous && !next) {
    return "";
  }
  return [
    '<nav class="book-chapter-nav" aria-label="Chapter navigation">',
    previous
      ? `<a rel="prev" href="../${escapeHtml(previous.config.slug)}/">Previous: ${escapeHtml(previous.config.title)}</a>`
      : "<span></span>",
    next
      ? `<a rel="next" href="../${escapeHtml(next.config.slug)}/">Next: ${escapeHtml(next.config.title)}</a>`
      : "<span></span>",
    "</nav>",
  ].join("");
}

function renderChapterDocument(
  config: BookConfig,
  chapters: CompiledChapter[],
  chapter: CompiledChapter,
  index: number,
  options: Pick<
    PublicationBuildOptions,
    "themeHref" | "enhanceScriptHref"
  >,
): string {
  const firstAnchor = chapter.compiled.anchors[0];
  if (!firstAnchor) {
    throw new Error(`${chapter.config.source} contains no addressable content`);
  }
  const theme = options.themeHref
    ? `<link rel="stylesheet" href="${escapeHtml(options.themeHref)}">`
    : "";
  const script = options.enhanceScriptHref
    ? `<script type="module" src="${escapeHtml(options.enhanceScriptHref)}"></script>`
    : "";
  const navigation = renderNavigation(chapters, index);
  const firstChapter = chapters[0];
  if (!firstChapter) {
    throw new Error("Publication must contain at least one chapter");
  }
  const authors = config.authors.map((author) => author.name).join(", ");
  return `<!doctype html>
<html lang="${escapeHtml(config.language)}" dir="${config.direction}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="author" content="${escapeHtml(authors)}">
  <title>${escapeHtml(chapter.config.title)} - ${escapeHtml(config.title)}</title>
  ${theme}
</head>
<body data-reader-status="static">
  <a class="book-skip-link" href="#${escapeHtml(firstAnchor)}">Skip to chapter</a>
  <header class="book-site-header">
    <a href="../${escapeHtml(firstChapter.config.slug)}/">${escapeHtml(config.title)}</a>
    <span>${escapeHtml(chapter.config.title)}</span>
  </header>
  <main class="book-layout">
    <article
      class="book-content"
      data-reader-content
      data-book-id="${escapeHtml(config.bookId)}"
      data-edition-id="${escapeHtml(config.editionId)}"
      data-chapter-id="${escapeHtml(chapter.config.chapterId)}"
      data-first-anchor="${escapeHtml(firstAnchor)}"
      data-manifest="../../manifest.json"
    >
      ${chapter.bodyHtml}
      ${navigation}
    </article>
  </main>
  ${script}
</body>
</html>
`;
}

function artifactHash(
  plan: BuildPlan,
  options: PublicationBuildOptions,
): string {
  return sha256(
    JSON.stringify({
      manifest: plan.manifest,
      sourceMap: plan.sourceMap,
      chapters: plan.chapters.map((chapter, index) =>
        renderChapterDocument(
          plan.config,
          plan.chapters,
          chapter,
          index,
          options,
        ),
      ),
    }),
  );
}

async function compileSource(sourceRoot: string): Promise<{
  config: BookConfig;
  chapters: CompiledChapter[];
}> {
  const config = await readBookConfig(sourceRoot);
  const chapters: CompiledChapter[] = [];

  for (const chapterConfig of config.chapters) {
    const sourcePath = resolveSourceFile(sourceRoot, chapterConfig.source);
    const markdown = await readFile(sourcePath, "utf8");
    const compiled = await compileMarkdown(markdown, chapterConfig.source);
    chapters.push({
      config: chapterConfig,
      compiled,
      contentHash: sha256(compiled.html),
      bodyHtml: compiled.html,
    });
  }

  return { config, chapters };
}

export async function createBuildPlan(
  sourceRoot: string,
): Promise<BuildPlan> {
  const { config, chapters } = await compileSource(sourceRoot);
  const canonical = JSON.stringify({
    bookId: config.bookId,
    editionId: config.editionId,
    title: config.title,
    authors: config.authors,
    language: config.language,
    direction: config.direction,
    publicationDate: config.publicationDate,
    description: config.description,
    chapters: chapters.map((chapter) => ({
      chapterId: chapter.config.chapterId,
      title: chapter.config.title,
      slug: chapter.config.slug,
      html: chapter.bodyHtml,
    })),
    legacyFacsimile: config.legacyFacsimile,
  });
  const contentHash = sha256(canonical);
  const tableOfContents = chapters.map((chapter) =>
    chapterToc(config, chapter),
  );
  const semanticChapters = chapters.map((chapter) => {
    const firstAnchor = chapter.compiled.anchors[0];
    const lastAnchor =
      chapter.compiled.anchors[chapter.compiled.anchors.length - 1];
    if (!firstAnchor || !lastAnchor) {
      throw new Error(`${chapter.config.source} has no addressable range`);
    }
    return {
      chapterId: chapter.config.chapterId,
      title: chapter.config.title,
      href: `chapters/${chapter.config.slug}/index.html`,
      firstAnchor,
      lastAnchor,
      contentHash: chapter.contentHash,
    };
  });
  const manifest: PublicationManifest = validatePublicationManifest({
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    bookId: config.bookId,
    editionId: config.editionId,
    contentHash,
    title: config.title,
    authors: config.authors,
    language: config.language,
    direction: config.direction,
    ...(config.publicationDate === undefined
      ? {}
      : { publicationDate: config.publicationDate }),
    ...(config.description === undefined
      ? {}
      : { description: config.description }),
    tableOfContents,
    renditions: {
      semantic: {
        kind: "semantic-html",
        chapters: semanticChapters,
        sourceMap: "source-map.json",
      },
      ...(config.legacyFacsimile === undefined
        ? {}
        : { legacyFacsimile: config.legacyFacsimile }),
    },
    capabilities: {
      annotations: true,
      bookmarks: true,
      facsimile: false,
      legacyFacsimile: config.legacyFacsimile !== undefined,
      search: false,
      sourceMap: true,
    },
  });
  const sourceMap = {
    schemaVersion: 1 as const,
    bookId: config.bookId,
    editionId: config.editionId,
    entries: chapters.flatMap((chapter) => chapter.compiled.sourceMap),
  };

  return { config, chapters, manifest, sourceMap };
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return false;
    }
    throw error;
  }
}

async function writePlan(
  plan: BuildPlan,
  stagingPath: string,
  options: PublicationBuildOptions,
  metadata: BuildMetadata,
): Promise<void> {
  await mkdir(stagingPath, { recursive: true });
  await writeFile(
    join(stagingPath, "manifest.json"),
    `${JSON.stringify(plan.manifest, null, 2)}\n`,
  );
  await writeFile(
    join(stagingPath, "source-map.json"),
    `${JSON.stringify(plan.sourceMap, null, 2)}\n`,
  );
  await writeFile(
    join(stagingPath, "build-metadata.json"),
    `${JSON.stringify(metadata, null, 2)}\n`,
  );

  for (const [index, chapter] of plan.chapters.entries()) {
    const chapterPath = join(
      stagingPath,
      "chapters",
      chapter.config.slug,
      "index.html",
    );
    await mkdir(dirname(chapterPath), { recursive: true });
    await writeFile(
      chapterPath,
      renderChapterDocument(
        plan.config,
        plan.chapters,
        chapter,
        index,
        options,
      ),
    );
  }
}

export async function buildPublication(
  options: PublicationBuildOptions,
): Promise<PublicationBuildResult> {
  const sourceRoot = resolve(options.sourceRoot);
  const outputRoot = resolve(options.outputRoot);
  const plan = await createBuildPlan(sourceRoot);
  const bookPath = join(outputRoot, plan.config.bookId);
  const editionPath = join(bookPath, plan.config.editionId);
  const stagingPath = join(
    outputRoot,
    `.staging-${plan.config.bookId}-${plan.config.editionId}-${randomUUID()}`,
  );

  await mkdir(outputRoot, { recursive: true });

  try {
    const metadata: BuildMetadata = {
      schemaVersion: 1,
      artifactHash: artifactHash(plan, options),
    };
    await writePlan(plan, stagingPath, options, metadata);
    validatePublicationManifest(
      JSON.parse(await readFile(join(stagingPath, "manifest.json"), "utf8")),
    );

    if (await pathExists(editionPath)) {
      const currentMetadata = JSON.parse(
        await readFile(join(editionPath, "build-metadata.json"), "utf8"),
      ) as Partial<BuildMetadata>;
      if (
        currentMetadata.schemaVersion === metadata.schemaVersion &&
        currentMetadata.artifactHash === metadata.artifactHash
      ) {
        await rm(stagingPath, { recursive: true, force: true });
        return {
          editionPath,
          manifest: plan.manifest,
          unchanged: true,
        };
      }
      throw new Error(
        `Edition ${plan.config.bookId}/${plan.config.editionId} already exists with different content`,
      );
    }

    await mkdir(bookPath, { recursive: true });
    await rename(stagingPath, editionPath);
    return {
      editionPath,
      manifest: plan.manifest,
      unchanged: false,
    };
  } catch (error) {
    await rm(stagingPath, { recursive: true, force: true });
    throw error;
  }
}

export function relativeEditionPath(
  result: PublicationBuildResult,
  outputRoot: string,
): string {
  return relative(resolve(outputRoot), result.editionPath);
}
