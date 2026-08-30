import { mkdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const revision = "86158859464aee75633acd854c656928121a7fd8";
const repository = "pluralitybook/plurality";
const sourceRoot =
  `https://raw.githubusercontent.com/${repository}/${revision}`;
const outputRoot = resolve("apps/fixtures/plurality");
const chapterPattern = /^([1-7](?:-\d+)?)-(.*)\.md$/;

function yaml(value) {
  return JSON.stringify(String(value));
}

function asciiSlug(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56)
    .replace(/-+$/g, "") || "chapter";
}

function pinnedAssetUrl(value) {
  if (
    /^https:\/\/raw\.githubusercontent\.com\/pluralitybook\/plurality\/main\//.test(
      value,
    )
  ) {
    return value.replace(
      "/pluralitybook/plurality/main/",
      `/pluralitybook/plurality/${revision}/`,
    );
  }
  const figure = /(?:^|\/)figs\/(.+)$/.exec(value);
  return figure
    ? `${sourceRoot}/figs/${figure[1]}`
    : value;
}

function figureLink(alt, source, caption = "") {
  const label = String(alt || caption || "Book figure")
    .replace(/\s+/g, " ")
    .trim();
  return [
    `[Figure: ${label}](<${pinnedAssetUrl(source)}>)`,
    caption ? `*${String(caption).replace(/\s+/g, " ").trim()}*` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function preserveFigures(markdown) {
  let result = markdown.replace(
    /<figure\b[^>]*>([\s\S]*?)<\/figure>/gi,
    (_, body) => {
      const image = /<img\b([^>]*)>/i.exec(body);
      const source = /\bsrc=["']([^"']+)["']/i.exec(image?.[1] ?? "")?.[1];
      if (!source) {
        return body.replace(/<[^>]+>/g, "");
      }
      const alt = /\balt=["']([^"']*)["']/i.exec(image?.[1] ?? "")?.[1] ?? "";
      const caption =
        /<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i
          .exec(body)?.[1]
          ?.replace(/<[^>]+>/g, "") ?? "";
      return figureLink(alt, source, caption);
    },
  );
  result = result.replace(
    /!\[([^\]]*)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g,
    (_, alt, source) => figureLink(alt, source),
  );
  result = result.replace(
    /<span\b[^>]*aria-label=["']Plurality["'][^>]*>([\s\S]*?)<\/span>/gi,
    "Plurality ($1)",
  );
  return result;
}

function preserveFootnotes(markdown, chapterId) {
  const lines = markdown.split(/\r?\n/);
  const definitions = [];
  const body = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = /^\[\^([^\]]+)\]:\s*(.*)$/.exec(lines[index]);
    if (!match) {
      body.push(lines[index]);
      continue;
    }
    const text = [match[2]];
    while (
      index + 1 < lines.length &&
      (/^(?: {2,}|\t)\S/.test(lines[index + 1]) ||
        (lines[index + 1] === "" &&
          /^(?: {2,}|\t)\S/.test(lines[index + 2] ?? "")))
    ) {
      index += 1;
      text.push(lines[index].trim());
    }
    definitions.push({ id: match[1], text: text.filter(Boolean).join(" ") });
  }
  const numbers = new Map(
    definitions.map(({ id }, index) => [id, index + 1]),
  );
  const linkedBody = body
    .join("\n")
    .replace(/\[\^([^\]]+)\]/g, (_, id) => {
      const number = numbers.get(id);
      return number ? `[${number}](#note-${chapterId}-${number})` : `[${id}]`;
    });
  if (definitions.length === 0) {
    return linkedBody;
  }
  return [
    linkedBody,
    "",
    `## Chapter notes {#notes-${chapterId}}`,
    "",
    ...definitions.flatMap(({ text }, index) => [
      `### Note ${index + 1} {#note-${chapterId}-${index + 1}}`,
      "",
      text,
      "",
    ]),
  ].join("\n");
}

function normalizeChapter(markdown, chapterId) {
  let result = preserveFigures(markdown);
  result = result.replace(
    /https:\/\/raw\.githubusercontent\.com\/pluralitybook\/plurality\/main\//g,
    `${sourceRoot}/`,
  );
  result = preserveFootnotes(result, chapterId);
  result = result.replace(/<br\s*\/?>\s*<\/br>/gi, "\n");
  result = result.replace(/<br\s*\/?>/gi, "\n");
  result = result.replace(/\\ (?=\S)/g, " ");
  result = result
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .join("\n");
  let headingFound = false;
  result = result.replace(/^#\s+(.+)$/m, (_, title) => {
    headingFound = true;
    return `# ${title.trim()} {#${chapterId}}`;
  });
  if (!headingFound) {
    throw new Error(`Plurality chapter ${chapterId} has no H1`);
  }
  return [
    `<!-- CC0 source: ${repository}@${revision}; generated, do not edit. -->`,
    "",
    result.trim(),
    "",
  ].join("\n");
}

const listingResponse = await fetch(
  `https://api.github.com/repos/${repository}/contents/contents/english?ref=${revision}`,
  { headers: { accept: "application/vnd.github+json" } },
);
if (!listingResponse.ok) {
  throw new Error(
    `Could not list Plurality chapters (${listingResponse.status})`,
  );
}
const listing = await listingResponse.json();
const chapters = listing
  .map((entry) => {
    const match = chapterPattern.exec(entry.name);
    return match
      ? {
          id: match[1],
          sourceName: entry.name,
          sourceUrl: entry.download_url,
          slug: asciiSlug(match[2]),
        }
      : undefined;
  })
  .filter(Boolean)
  .sort((left, right) =>
    left.sourceName.localeCompare(right.sourceName, "en", { numeric: true }),
  );
if (chapters.length !== 30) {
  throw new Error(`Expected 30 Plurality chapters, found ${chapters.length}`);
}

await rm(outputRoot, { recursive: true, force: true });
await mkdir(join(outputRoot, "chapters"), { recursive: true });
let noteLinks = 0;
let noteDefinitions = 0;
let figureLinks = 0;
for (const [index, chapter] of chapters.entries()) {
  const response = await fetch(chapter.sourceUrl);
  if (!response.ok) {
    throw new Error(
      `Could not fetch Plurality ${chapter.sourceName} (${response.status})`,
    );
  }
  const markdown = normalizeChapter(await response.text(), chapter.id);
  const anchors = Array.from(
    markdown.matchAll(/\{#([^}]+)\}/g),
    (match) => match[1],
  );
  const duplicateAnchor = anchors.find(
    (anchor, anchorIndex) => anchors.indexOf(anchor) !== anchorIndex,
  );
  if (duplicateAnchor) {
    throw new Error(
      `Plurality chapter ${chapter.id} duplicates anchor ${duplicateAnchor}`,
    );
  }
  noteLinks += (markdown.match(/\]\(#note-/g) ?? []).length;
  noteDefinitions += (markdown.match(/^### Note \d+/gm) ?? []).length;
  figureLinks += (markdown.match(/^\[Figure:/gm) ?? []).length;
  const title = /^#\s+(.+?)\s+\{#/m.exec(markdown)?.[1];
  if (!title) {
    throw new Error(`Could not derive title for Plurality ${chapter.id}`);
  }
  chapter.title = title;
  chapter.localSource = `chapters/${String(index + 1).padStart(2, "0")}-${chapter.id}-${chapter.slug}.md`;
  await writeFile(join(outputRoot, chapter.localSource), markdown);
}
if (noteLinks !== 586 || noteDefinitions !== 607 || figureLinks !== 37) {
  throw new Error(
    `Unexpected Plurality source counts: ${noteLinks} note links, ${noteDefinitions} note definitions, ${figureLinks} figure links`,
  );
}

await writeFile(
  join(outputRoot, "book.yml"),
  [
    `# Generated from https://github.com/${repository}/tree/${revision}.`,
    "bookId: plurality",
    "editionId: 2026-07",
    'title: "Plurality"',
    'description: "The Future of Collaborative Technology and Democracy"',
    "authors:",
    '  - name: "E. Glen Weyl, Audrey Tang, and the Plurality Community"',
    `    url: https://github.com/${repository}`,
    "language: en",
    "direction: ltr",
    "publicationDate: 2026-07-12",
    "frontMatter:",
    '  kicker: "⿻數位 · Open source community book · CC0 1.0 Universal"',
    '  credits: "E. Glen Weyl, Audrey Tang, and the Plurality Community. Dedicated to the public domain under CC0."',
    '  thesis: "Digital technology can support democracy when it enables collaboration across difference rather than concentrating power or forcing uniformity."',
    `  canonicalUrl: https://www.plurality.net/read/`,
    '  notesStatus: "Chapter footnotes are preserved as linked chapter notes in this semantic edition. Figure assets remain pinned links during the lightweight V3 prototype."',
    "appearance:",
    "  cover:",
    '    background: "#39295d"',
    '    foreground: "#f5efe2"',
    '    accent: "#66c5b8"',
    '    subtitle: "The Future of Collaborative Technology and Democracy"',
    "  binding:",
    "    material: cloth",
    '    color: "#39295d"',
    '    accent: "#66c5b8"',
    "    depth: thick",
    "    hubs: 5",
    "    pageCount: 586",
    '    shelfLabel: "PLURALITY"',
    "chapters:",
    ...chapters.flatMap((chapter) => [
      `  - id: ${yaml(chapter.id)}`,
      `    title: ${yaml(chapter.title)}`,
      `    source: ${chapter.localSource}`,
      `    slug: ${yaml(chapter.id)}`,
    ]),
    "",
  ].join("\n"),
);
await writeFile(
  join(outputRoot, "SOURCE.md"),
  [
    "# Plurality source and license",
    "",
    `Source: https://github.com/${repository}/tree/${revision}`,
    "",
    `License: CC0 1.0 Universal - https://github.com/${repository}/blob/${revision}/LICENSE`,
    "",
    "Voluntary citation: E. Glen Weyl, Audrey Tang, and the Plurality Community. *Plurality: The Future of Collaborative Technology and Democracy*. 2023.",
    "",
    "Figure images are represented as pinned source links in the lightweight V3 prototype.",
    "",
  ].join("\n"),
);

process.stdout.write(
  `Synced ${chapters.length} Plurality chapters from ${revision}\n`,
);
