import { createHash, randomUUID } from "node:crypto";
import {
  mkdir,
  readFile,
  realpath,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import {
  dirname,
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import {
  MANIFEST_SCHEMA_VERSION,
  validatePublicationManifest,
  type PublicationManifest,
  type PublicationMedia,
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
  mediaAssets: BuildMediaAsset[];
  manifest: PublicationManifest;
  sourceMap: {
    schemaVersion: 1;
    bookId: string;
    editionId: string;
    entries: SourceMapEntry[];
  };
};

type BuildMediaAsset = {
  outputPath: string;
  integrity: string;
  bytes: Uint8Array;
};

type BuildMetadata = {
  schemaVersion: 1;
  artifactHash: string;
};

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function isRemoteMediaSource(value: string): URL | undefined {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url
      : undefined;
  } catch {
    return undefined;
  }
}

function assertPinnedRemoteMediaSource(url: URL, figureId: string): void {
  const path = url.pathname.split("/").filter(Boolean);
  const revision =
    url.hostname === "raw.githubusercontent.com" ? path[2] : undefined;
  if (!revision || !/^[a-f0-9]{40}$/.test(revision)) {
    throw new Error(
      `Media figure ${figureId} must use an immutable remote commit URL`,
    );
  }
}

async function preparePublicationMedia(
  sourceRoot: string,
  media: PublicationMedia | undefined,
): Promise<{
  media: PublicationMedia | undefined;
  assets: BuildMediaAsset[];
}> {
  if (!media) {
    return { media: undefined, assets: [] };
  }
  const assets: BuildMediaAsset[] = [];
  const figures = [];
  for (const figure of media.figures) {
    const remote = isRemoteMediaSource(figure.src);
    if (remote) {
      assertPinnedRemoteMediaSource(remote, figure.id);
      figures.push(figure);
      continue;
    }
    if (/[?#]/.test(figure.src)) {
      throw new Error(
        `Local media figure ${figure.id} must use a fixture-relative file path`,
      );
    }
    let relativeSource: string;
    try {
      relativeSource = decodeURIComponent(figure.src);
    } catch {
      throw new Error(`Local media figure ${figure.id} has an invalid path`);
    }
    const sourcePath = resolveSourceFile(sourceRoot, relativeSource);
    let canonicalSourcePath: string;
    let bytes: Uint8Array;
    try {
      canonicalSourcePath = await realpath(sourcePath);
      bytes = await readFile(canonicalSourcePath);
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        throw new Error(
          `Local media figure ${figure.id} is missing ${relativeSource}`,
        );
      }
      throw error;
    }
    const canonicalSourceRoot = await realpath(sourceRoot);
    const fromSourceRoot = relative(canonicalSourceRoot, canonicalSourcePath);
    if (
      fromSourceRoot === ".." ||
      fromSourceRoot.startsWith(`..${sep}`) ||
      isAbsolute(fromSourceRoot)
    ) {
      throw new Error(
        `Local media figure ${figure.id} escapes the publication source directory`,
      );
    }
    const integrity = `sha256:${sha256(bytes)}`;
    if (integrity !== figure.integrity) {
      throw new Error(
        `Local media figure ${figure.id} integrity mismatch: declared ${figure.integrity}, measured ${integrity}`,
      );
    }
    const extension = extname(relativeSource).toLowerCase();
    const safeExtension = /^\.[a-z0-9]+$/.test(extension) ? extension : ".bin";
    const outputPath = `media/${figure.id}${safeExtension}`;
    assets.push({ outputPath, integrity, bytes });
    figures.push({ ...figure, src: outputPath });
  }
  return {
    media: { ...media, figures },
    assets,
  };
}

function selectorMediaForChapter(
  media: PublicationMedia | undefined,
  chapterId: string,
): unknown[] {
  return (
    media?.figures
      .filter((figure) => figure.chapterId === chapterId)
      .map((figure) => ({
        id: figure.id,
        caption: figure.caption,
        ...(figure.afterAnchor === undefined
          ? {}
          : { afterAnchor: figure.afterAnchor }),
        ...(figure.replaceAnchors === undefined
          ? {}
          : { replaceAnchors: figure.replaceAnchors }),
      })) ?? []
  );
}

function validateMediaAnchors(
  config: BookConfig,
  chapters: readonly CompiledChapter[],
): void {
  const byChapter = new Map(
    chapters.map((chapter) => [chapter.config.chapterId, chapter]),
  );
  for (const figure of config.media?.figures ?? []) {
    const chapter = byChapter.get(figure.chapterId);
    if (!chapter) {
      throw new Error(
        `Media figure ${figure.id} references missing chapter ${figure.chapterId}`,
      );
    }
    const anchors = new Set(chapter.compiled.anchors);
    for (const anchor of [
      ...(figure.afterAnchor === undefined ? [] : [figure.afterAnchor]),
      ...(figure.replaceAnchors ?? []),
    ]) {
      if (!anchors.has(anchor)) {
        throw new Error(
          `Media figure ${figure.id} anchor ${anchor} does not exist in chapter ${figure.chapterId}`,
        );
      }
    }
  }
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
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><text y='25' font-size='24'>📖</text></svg>">
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
      ...(plan.mediaAssets.length === 0
        ? {}
        : {
            mediaAssets: plan.mediaAssets.map((asset) => ({
              outputPath: asset.outputPath,
              integrity: asset.integrity,
              bytes: Buffer.from(asset.bytes).toString("base64"),
            })),
          }),
    }),
  );
}

async function compileSource(sourceRoot: string): Promise<{
  config: BookConfig;
  chapters: CompiledChapter[];
  mediaAssets: BuildMediaAsset[];
}> {
  const parsedConfig = await readBookConfig(sourceRoot);
  const preparedMedia = await preparePublicationMedia(
    sourceRoot,
    parsedConfig.media,
  );
  const config: BookConfig = {
    ...parsedConfig,
    ...(preparedMedia.media === undefined
      ? {}
      : { media: preparedMedia.media }),
  };
  const chapters: CompiledChapter[] = [];

  for (const chapterConfig of config.chapters) {
    const sourcePath = resolveSourceFile(sourceRoot, chapterConfig.source);
    const markdown = await readFile(sourcePath, "utf8");
    const compiled = await compileMarkdown(markdown, chapterConfig.source);
    const htmlHash = sha256(compiled.html);
    const mediaSelectors = selectorMediaForChapter(
      config.media,
      chapterConfig.chapterId,
    );
    chapters.push({
      config: chapterConfig,
      compiled,
      contentHash:
        mediaSelectors.length === 0
          ? htmlHash
          : sha256(JSON.stringify({ htmlHash, mediaSelectors })),
      bodyHtml: compiled.html,
    });
  }

  validateMediaAnchors(config, chapters);
  return { config, chapters, mediaAssets: preparedMedia.assets };
}

export async function createBuildPlan(
  sourceRoot: string,
): Promise<BuildPlan> {
  const { config, chapters, mediaAssets } = await compileSource(sourceRoot);
  const canonical = JSON.stringify({
    bookId: config.bookId,
    editionId: config.editionId,
    title: config.title,
    authors: config.authors,
    language: config.language,
    direction: config.direction,
    publicationDate: config.publicationDate,
    description: config.description,
    frontMatter: config.frontMatter,
    appearance: config.appearance,
    media: config.media,
    chapters: chapters.map((chapter) => ({
      chapterId: chapter.config.chapterId,
      title: chapter.config.title,
      slug: chapter.config.slug,
      html: chapter.bodyHtml,
    })),
    ...(mediaAssets.length === 0
      ? {}
      : {
          mediaAssets: mediaAssets.map((asset) => ({
            outputPath: asset.outputPath,
            integrity: asset.integrity,
            bytes: Buffer.from(asset.bytes).toString("base64"),
          })),
        }),
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
    ...(config.frontMatter === undefined
      ? {}
      : { frontMatter: config.frontMatter }),
    ...(config.appearance === undefined
      ? {}
      : { appearance: config.appearance }),
    ...(config.media === undefined ? {} : { media: config.media }),
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

  return { config, chapters, mediaAssets, manifest, sourceMap };
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

  for (const asset of plan.mediaAssets) {
    const assetPath = join(stagingPath, ...asset.outputPath.split("/"));
    await mkdir(dirname(assetPath), { recursive: true });
    await writeFile(assetPath, asset.bytes);
  }

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
