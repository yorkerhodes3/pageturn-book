import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const revision = "b456e8e137a0b6ce9a51799b71c6091f5241b5d7";
const sourceBase =
  `https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/${revision}` +
  "/src/content/publications";
const outputRoot = resolve("apps/fixtures/lab-publications");
const editionId = "2026-08";

const pageCounts = {
  "after-the-corridor": 22,
  "agentic-behavior-observatory": 12,
  "agentic-language-development": 25,
  "ai-carbon-footprint": 18,
  "ai-models-research": 19,
  "ai-research-assistant": 10,
  cerai: 13,
  "cyber-dictionary": 44,
  "digital-provenance-passport": 28,
  "diplomatic-simulator": 23,
  ercf: 32,
  erus: 24,
  "evacuation-inform-index": 11,
  "evacuation-simulation": 22,
  "forced-labor-structural-risk-index": 25,
  haste: 26,
  "mariupol-severity-model": 26,
  "provenance-search": 20,
  vango: 16,
  "war-games": 15,
};

const palettes = [
  ["#4a171c", "#d0ad6d"],
  ["#17372d", "#c7b477"],
  ["#41263d", "#c8a96d"],
  ["#57301e", "#d2b87c"],
  ["#17363e", "#b9b075"],
  ["#35251c", "#c29a5f"],
  ["#1f2947", "#c4a568"],
];
const supportedReportKeys = new Set([
  "acknowledgement",
  "advisor",
  "authors",
  "citations",
  "comparison",
  "date",
  "disclaimer",
  "docsUrl",
  "eyebrow",
  "heroLead",
  "heroEm",
  "heroTail",
  "heroTitle",
  "liveUrl",
  "org",
  "pdfUrl",
  "prompt",
  "publishedUrl",
  "redTeam",
  "repoUrl",
  "rubric",
  "sections",
  "stats",
  "subtitle",
  "thesis",
  "title",
]);

function yaml(value) {
  return JSON.stringify(String(value));
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56)
    .replace(/-+$/g, "");
}

function markdownText(value) {
  return String(value).replace(/\r\n/g, "\n").trim();
}

function tableCell(value) {
  return markdownText(value)
    .replace(/\|/g, "\\|")
    .replace(/\n+/g, " ");
}

function tableMarkdown(table) {
  if (
    !table ||
    !Array.isArray(table.headers) ||
    !Array.isArray(table.rows) ||
    table.headers.length === 0
  ) {
    throw new Error("Report table is missing headers or rows");
  }
  const rows = [
    `| ${table.headers.map(tableCell).join(" | ")} |`,
    `| ${table.headers.map(() => "---").join(" | ")} |`,
    ...table.rows.map(
      (row) => `| ${row.map(tableCell).join(" | ")} |`,
    ),
  ];
  return [
    table.caption ? `**${markdownText(table.caption)}**` : "",
    rows.join("\n"),
  ]
    .filter(Boolean)
    .join("\n\n");
}

function blockMarkdown(block, sectionId, index) {
  if (typeof block === "string") {
    return markdownText(block);
  }
  if (!block || typeof block !== "object") {
    throw new Error(`Invalid block in ${sectionId}`);
  }
  if ("lead" in block && "text" in block) {
    return `**${markdownText(block.lead)}** ${markdownText(block.text)}`;
  }
  if ("formula" in block) {
    return [
      "```text",
      markdownText(block.formula),
      "```",
      block.note ? markdownText(block.note) : "",
    ]
      .filter(Boolean)
      .join("\n\n");
  }
  if ("list" in block && Array.isArray(block.list)) {
    const marker = block.ordered ? (itemIndex) => `${itemIndex + 1}.` : () => "-";
    return [
      block.intro ? markdownText(block.intro) : "",
      block.list
        .map((item, itemIndex) => `${marker(itemIndex)} ${markdownText(item)}`)
        .join("\n"),
    ]
      .filter(Boolean)
      .join("\n\n");
  }
  if ("table" in block) {
    return tableMarkdown(block.table);
  }
  if ("chart" in block) {
    return [
      block.chart.caption
        ? `**${markdownText(block.chart.caption)}**`
        : `**Chart data: ${markdownText(block.chart.kind)}**`,
      tableMarkdown(block.chart.data),
    ].join("\n\n");
  }
  throw new Error(
    `Unsupported report block in ${sectionId} at index ${index}`,
  );
}

function citationMarkdown(citation, index) {
  const number = String(index + 1).padStart(2, "0");
  const reference = citation.url
    ? `[${markdownText(citation.ref)}](<${citation.url}>)`
    : markdownText(citation.ref);
  return `[${number}] ${reference}\n\n{#reference-${number}}`;
}

function appearance(index, pageCount, title) {
  const [background, accent] = palettes[index % palettes.length];
  return {
    background,
    accent,
    material: index % 4 === 2 ? "cloth" : "leather",
    depth:
      pageCount >= 30 ? "thick" : pageCount >= 18 ? "standard" : "slim",
    hubs: pageCount >= 30 ? 5 : pageCount >= 18 ? 4 : 3,
    shelfLabel: title.toUpperCase().slice(0, 34),
  };
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not fetch ${url} (${response.status})`);
  }
  return response.text();
}

async function compileWebsiteReports() {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "pageturn-reports-"));
  try {
    const reportsSource = await fetchText(`${sourceBase}/reports.ts`);
    const imports = Array.from(
      reportsSource.matchAll(
        /import\s+\{\s*\w+\s*\}\s+from\s+"\.\/([^"]+)";/g,
      ),
      (match) => match[1],
    );
    await Promise.all([
      writeFile(join(temporaryRoot, "reports.ts"), reportsSource),
      fetchText(`${sourceBase}/types.ts`).then((source) =>
        writeFile(join(temporaryRoot, "types.ts"), source),
      ),
      fetchText(`${sourceBase}/cyber-dictionary-data.ts`).then((source) =>
        writeFile(join(temporaryRoot, "cyber-dictionary-data.ts"), source),
      ),
      ...imports.map((name) =>
        fetchText(`${sourceBase}/${name}.ts`).then((source) =>
          writeFile(join(temporaryRoot, `${name}.ts`), source),
        ),
      ),
    ]);
    await writeFile(
      join(temporaryRoot, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          target: "ES2022",
          module: "Node16",
          moduleResolution: "Node16",
          outDir: "dist",
          noCheck: true,
          skipLibCheck: true,
        },
        include: ["*.ts"],
      }),
    );
    const compiler = resolve("node_modules", "typescript", "lib", "tsc.js");
    const result = spawnSync(process.execPath, [compiler, "-p", temporaryRoot], {
      encoding: "utf8",
    });
    if (result.status !== 0) {
      throw new Error(
        `Could not compile pinned publication sources\n${result.error?.message ?? ""}\n${result.stdout ?? ""}\n${result.stderr ?? ""}`,
      );
    }
    const require = createRequire(import.meta.url);
    return {
      reports: require(join(temporaryRoot, "dist", "reports.js")).reports,
      dictionary: require(
        join(temporaryRoot, "dist", "cyber-dictionary-data.js"),
      ),
    };
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

async function writeReportFixture(report, bookId, index) {
  const unsupportedKeys = Object.keys(report).filter(
    (key) => !supportedReportKeys.has(key),
  );
  if (unsupportedKeys.length > 0) {
    throw new Error(
      `${bookId} contains unsupported report fields: ${unsupportedKeys.join(", ")}`,
    );
  }
  const destination = join(outputRoot, bookId);
  await mkdir(join(destination, "chapters"), { recursive: true });
  const chapters = [];
  for (const [sectionIndex, section] of report.sections.entries()) {
    const chapterId = slug(section.id || `section-${sectionIndex + 1}`);
    const filename = `${String(sectionIndex + 1).padStart(2, "0")}-${chapterId}.md`;
    const blocks = section.paragraphs ?? section.blocks ?? [];
    const markdown = [
      `<!-- GENERATED from ${sourceBase}/${bookId}.ts at ${revision}; do not edit. -->`,
      "",
      `# ${section.number}. ${section.title} {#${chapterId}}`,
      "",
      ...blocks.flatMap((block, blockIndex) => [
        blockMarkdown(block, chapterId, blockIndex),
        "",
      ]),
    ].join("\n");
    await writeFile(join(destination, "chapters", filename), markdown);
    chapters.push({
      id: chapterId,
      title: section.title,
      source: `chapters/${filename}`,
    });
  }

  const writeExtraChapter = async (id, title, body) => {
    const chapterNumber = chapters.length + 1;
    const filename = `${String(chapterNumber).padStart(2, "0")}-${id}.md`;
    await writeFile(
      join(destination, "chapters", filename),
      [
        `<!-- GENERATED from ${sourceBase}/${bookId}.ts at ${revision}; do not edit. -->`,
        "",
        `# ${chapterNumber}. ${title} {#${id}}`,
        "",
        body,
        "",
      ].join("\n"),
    );
    chapters.push({ id, title, source: `chapters/${filename}` });
  };

  if (report.comparison?.rows) {
    await writeExtraChapter(
      "capabilities-comparison",
      report.comparison.heading,
      [
        markdownText(report.comparison.intro),
        "",
        tableMarkdown({
          headers: ["Application", "Example tools", "Approach"],
          rows: report.comparison.rows.map((row) => [
            row.application,
            row.tools.join("; "),
            row.approach,
          ]),
        }),
      ].join("\n"),
    );
  }
  if (report.redTeam) {
    await writeExtraChapter(
      "red-team-verification",
      report.redTeam.heading,
      [
        markdownText(report.redTeam.intro),
        "",
        report.redTeam.checklist
          .map((item) => `- ${markdownText(item)}`)
          .join("\n"),
        "",
        markdownText(report.redTeam.closing),
      ].join("\n"),
    );
  }
  if (report.prompt) {
    await writeExtraChapter(
      "researcher-prompt",
      report.prompt.heading,
      [
        ...report.prompt.intro.flatMap((paragraph) => [
          markdownText(paragraph),
          "",
        ]),
        "```text",
        markdownText(report.prompt.body),
        "```",
      ].join("\n"),
    );
  }
  if (report.rubric?.rows) {
    await writeExtraChapter(
      "journal-credibility-rubric",
      report.rubric.heading,
      [
        markdownText(report.rubric.intro),
        "",
        tableMarkdown({
          headers: ["Score", "Criteria", "Examples"],
          rows: report.rubric.rows.map((row) => [
            row.score,
            row.criteria,
            row.examples,
          ]),
        }),
      ].join("\n"),
    );
  }
  if (report.acknowledgement) {
    await writeExtraChapter(
      "acknowledgements",
      "Acknowledgements",
      markdownText(report.acknowledgement),
    );
  }

  if (Array.isArray(report.citations) && report.citations.length > 0) {
    const chapterId = "references";
    const filename = `${String(chapters.length + 1).padStart(2, "0")}-references.md`;
    await writeFile(
      join(destination, "chapters", filename),
      [
        `<!-- GENERATED from ${sourceBase}/${bookId}.ts at ${revision}; do not edit. -->`,
        "",
        `# ${chapters.length + 1}. Works Cited {#references}`,
        "",
        ...report.citations.flatMap((citation, citationIndex) => [
          citationMarkdown(citation, citationIndex),
          "",
        ]),
        report.disclaimer ? "## Disclaimer {#disclaimer}" : "",
        report.disclaimer ? "" : "",
        report.disclaimer ? markdownText(report.disclaimer) : "",
      ]
        .filter((line, lineIndex, lines) =>
          line !== "" || lines[lineIndex - 1] !== "",
        )
        .join("\n"),
    );
    chapters.push({
      id: chapterId,
      title: "Works Cited",
      source: `chapters/${filename}`,
    });
  }

  const pageCount = pageCounts[bookId];
  if (!pageCount) {
    throw new Error(`Missing designed page count for ${bookId}`);
  }
  const design = appearance(index, pageCount, report.title);
  const config = [
    `# GENERATED from Ethical-Tech-CoLab/website at ${revision}.`,
    `bookId: ${bookId}`,
    `editionId: ${editionId}`,
    `title: ${yaml(report.title)}`,
    `description: ${yaml(report.subtitle)}`,
    "authors:",
    `  - name: ${yaml(report.authors || report.org)}`,
    "language: en",
    "direction: ltr",
    "frontMatter:",
    `  kicker: ${yaml(`${report.eyebrow} · ${report.org}`)}`,
    `  credits: ${yaml([report.authors, report.advisor, report.date].filter(Boolean).join(" · "))}`,
    `  thesis: ${yaml(report.thesis)}`,
    ...(report.disclaimer
      ? [`  disclaimer: ${yaml(report.disclaimer)}`]
      : []),
    `  canonicalUrl: https://ethical-tech-colab.github.io/website/publications/${bookId}/`,
    '  notesStatus: "The source provides a complete Works Cited list but does not provide a consistent citation-to-footnote mapping for semantic endnotes."',
    "appearance:",
    "  cover:",
    `    background: "${design.background}"`,
    '    foreground: "#f3ead6"',
    `    accent: "${design.accent}"`,
    `    subtitle: ${yaml(report.subtitle)}`,
    "  binding:",
    `    material: ${design.material}`,
    `    color: "${design.background}"`,
    `    accent: "${design.accent}"`,
    `    depth: ${design.depth}`,
    `    hubs: ${design.hubs}`,
    `    pageCount: ${pageCount}`,
    `    shelfLabel: ${yaml(design.shelfLabel)}`,
    "legacyFacsimile:",
    `  revision: ${revision}`,
    `  manifestHref: https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/${revision}/public/publications/${bookId}/pages/manifest.json`,
    `  pdfHref: https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/${revision}/public/publications/${bookId}/report.pdf`,
    "chapters:",
    ...chapters.flatMap((chapter) => [
      `  - id: ${chapter.id}`,
      `    title: ${yaml(chapter.title)}`,
      `    source: ${chapter.source}`,
      `    slug: ${chapter.id}`,
    ]),
    "",
  ].join("\n");
  await writeFile(join(destination, "book.yml"), config);
}

async function writeDictionaryFixture(dictionary) {
  const destination = join(outputRoot, "cyber-dictionary");
  await mkdir(join(destination, "chapters"), { recursive: true });
  const groups = new Map();
  for (const term of dictionary.dictionaryTerms) {
    const terms = groups.get(term.domain) ?? [];
    terms.push(term);
    groups.set(term.domain, terms);
  }
  const chapters = [];
  let chapterIndex = 0;
  for (const [domain, terms] of groups) {
    chapterIndex += 1;
    const chapterId = slug(domain);
    const filename = `${String(chapterIndex).padStart(2, "0")}-${chapterId}.md`;
    await writeFile(
      join(destination, "chapters", filename),
      [
        `# ${chapterIndex}. ${domain} {#${chapterId}}`,
        "",
        ...terms.flatMap((term, termIndex) => [
          `## ${term.term} {#term-${chapterIndex}-${termIndex + 1}}`,
          "",
          term.alias ? `*${term.alias}*` : "",
          "",
          markdownText(term.definition),
          "",
        ]),
      ].join("\n"),
    );
    chapters.push({ id: chapterId, title: domain, source: `chapters/${filename}` });
  }
  chapterIndex += 1;
  const libraryFilename = `${String(chapterIndex).padStart(2, "0")}-source-library.md`;
  await writeFile(
    join(destination, "chapters", libraryFilename),
    [
      `# ${chapterIndex}. Source Library {#source-library}`,
      "",
      ...dictionary.librarySources.flatMap((source, sourceIndex) => [
        `## ${source.name} {#source-${sourceIndex + 1}}`,
        "",
        `[${source.operator}](<${source.url}>)`,
        "",
        `**Shelf:** ${source.shelf}`,
        "",
        markdownText(source.what),
        "",
        markdownText(source.how),
        "",
        `**Cost:** ${source.cost}`,
        "",
      ]),
    ].join("\n"),
  );
  chapters.push({
    id: "source-library",
    title: "Source Library",
    source: `chapters/${libraryFilename}`,
  });

  const design = appearance(
    20,
    pageCounts["cyber-dictionary"],
    "Cyber Dictionary",
  );
  await writeFile(
    join(destination, "book.yml"),
    [
      `# GENERATED from Ethical-Tech-CoLab/website at ${revision}.`,
      "bookId: cyber-dictionary",
      `editionId: ${editionId}`,
      'title: "Cyber Dictionary"',
      'description: "A practical reference to cybersecurity language, systems, and sources."',
      "authors:",
      "  - name: Ethical Tech CoLab",
      "language: en",
      "direction: ltr",
      "frontMatter:",
      '  kicker: "Ethical Tech CoLab · Open reference publication"',
      `  credits: ${yaml(`${dictionary.dictionaryTerms.length} terms · ${dictionary.librarySources.length} library sources`)}`,
      '  thesis: "Cybersecurity becomes more accessible when its vocabulary, systems, threats, and defenses are explained in direct language."',
      "  canonicalUrl: https://ethical-tech-colab.github.io/website/publications/cyber-dictionary/",
      "appearance:",
      "  cover:",
      `    background: "${design.background}"`,
      '    foreground: "#f3ead6"',
      `    accent: "${design.accent}"`,
      '    subtitle: "A practical cybersecurity reference"',
      "  binding:",
      `    material: ${design.material}`,
      `    color: "${design.background}"`,
      `    accent: "${design.accent}"`,
      "    depth: thick",
      "    hubs: 5",
      `    pageCount: ${pageCounts["cyber-dictionary"]}`,
      '    shelfLabel: "CYBER DICTIONARY"',
      "legacyFacsimile:",
      `  revision: ${revision}`,
      `  manifestHref: https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/${revision}/public/publications/cyber-dictionary/pages/manifest.json`,
      `  pdfHref: https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/${revision}/public/publications/cyber-dictionary/report.pdf`,
      "chapters:",
      ...chapters.flatMap((chapter) => [
        `  - id: ${chapter.id}`,
        `    title: ${yaml(chapter.title)}`,
        `    source: ${chapter.source}`,
        `    slug: ${chapter.id}`,
      ]),
      "",
    ].join("\n"),
  );
}

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });
const { reports, dictionary } = await compileWebsiteReports();
if (Object.keys(reports).length !== 20) {
  throw new Error(
    `Expected 20 registered lab reports, found ${Object.keys(reports).length}`,
  );
}
if (
  dictionary.dictionaryTerms.length !== 542 ||
  dictionary.librarySources.length !== 105
) {
  throw new Error(
    `Unexpected Cyber Dictionary source counts: ${dictionary.dictionaryTerms.length} terms, ${dictionary.librarySources.length} sources`,
  );
}
const entries = Object.entries(reports).filter(
  ([bookId]) => bookId !== "what-is-ethical-ai",
);
for (const [index, [bookId, report]] of entries.entries()) {
  await writeReportFixture(report, bookId, index);
}
await writeDictionaryFixture(dictionary);

await writeFile(
  join(outputRoot, "SOURCE.md"),
  [
    "# Generated lab publication fixtures",
    "",
    `Source: https://github.com/Ethical-Tech-CoLab/website/tree/${revision}`,
    "",
    "Run `npm run sync:lab-publications` to regenerate these fixtures.",
    "",
  ].join("\n"),
);

process.stdout.write(
  `Synced ${entries.length} reports and the Cyber Dictionary from ${revision}\n`,
);
