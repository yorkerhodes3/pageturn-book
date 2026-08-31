import { mkdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const revision = "0c1f117c369233664b33ec902e54107d06cd8e51";
const repository = "yorkerhodes3/ethical-ai-field-guide";
const sourceRoot =
  `https://raw.githubusercontent.com/${repository}/${revision}` +
  "/research/source-briefs";
const outputRoot = resolve("apps/fixtures/human-choice-source-guide");
const editionId = "2026-08-30";

const chapters = [
  {
    id: "gates-turbulent-ai-era",
    title: "Bill Gates on the Turbulent AI Transition",
    source: "01-gates-turbulent-ai-era.md",
  },
  {
    id: "what-is-ethical-ai",
    title: "What Is Ethical AI? - Executive Summary",
    source: "02-what-is-ethical-ai.md",
  },
  {
    id: "magnifica-humanitas",
    title: "Magnifica Humanitas",
    source: "03-magnifica-humanitas.md",
  },
  {
    id: "plurality-book-and-repository",
    title: "Plurality - Book and Repository",
    source: "04-plurality-book-and-repository.md",
  },
  {
    id: "radicalxchange",
    title: "RadicalxChange",
    source: "05-radicalxchange.md",
  },
  {
    id: "plurality-dot-net",
    title: "Plurality.net",
    source: "06-plurality-dot-net.md",
  },
  {
    id: "ai-2027",
    title: "AI 2027",
    source: "07-ai-2027.md",
  },
  {
    id: "ai-2040-plan-a",
    title: "AI 2040 - Plan A",
    source: "08-ai-2040-plan-a.md",
  },
  {
    id: "ai-2040-reading-group-handout",
    title: "AI 2040 - Reading Group Handout",
    source: "09-ai-2040-reading-group-handout.md",
  },
];

function yaml(value) {
  return JSON.stringify(String(value));
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not fetch ${url} (${response.status})`);
  }
  return response.text();
}

function normalizeChapter(markdown, chapter) {
  const normalized = markdown.replace(/\r\n/g, "\n").trim();
  let headingFound = false;
  const anchored = normalized.replace(/^#\s+(.+)$/m, (_, title) => {
    headingFound = true;
    return `# ${title.trim()} {#${chapter.id}}`;
  });
  if (!headingFound) {
    throw new Error(`Field-guide chapter ${chapter.source} has no H1`);
  }
  return [
    `<!-- Generated from ${repository}@${revision}; do not edit here. -->`,
    "",
    anchored,
    "",
  ].join("\n");
}

const fetched = await Promise.all(
  chapters.map(async (chapter) => ({
    ...chapter,
    markdown: normalizeChapter(
      await fetchText(`${sourceRoot}/${chapter.source}`),
      chapter,
    ),
  })),
);

await rm(outputRoot, { recursive: true, force: true });
await mkdir(join(outputRoot, "chapters"), { recursive: true });

await Promise.all(
  fetched.map((chapter) =>
    writeFile(
      join(outputRoot, "chapters", chapter.source),
      chapter.markdown,
      "utf8",
    ),
  ),
);

const book = [
  `# GENERATED from https://github.com/${repository}/tree/${revision}.`,
  "bookId: human-choice-source-guide",
  `editionId: ${editionId}`,
  `title: ${yaml("The Human Choice: Source Guide")}`,
  `description: ${yaml("Nine source briefs for studying AI, power, dignity, plurality, and governance")}`,
  "authors:",
  `  - name: ${yaml("The Human Choice Field Guide")}`,
  `    url: https://github.com/${repository}`,
  "language: en",
  "direction: ltr",
  "publicationDate: 2026-08-30",
  "frontMatter:",
  `  kicker: ${yaml("The Human Choice - AI, Power & Dignity Field Guide - Source analysis")}`,
  `  credits: ${yaml("Original analysis prepared for the NYU Ethical Tech CoLab, AI-2040 discussions, public salons, and human-dignity events.")}`,
  `  thesis: ${yaml("The central issue across the source set is power: who chooses purposes, controls infrastructure, receives benefit, absorbs risk, and can contest or reverse a decision.")}`,
  "  canonicalUrl: https://yorkerhodes3.github.io/ethical-ai-field-guide/#sources",
  `  notesStatus: ${yaml("This semantic edition contains original source analysis and attributed short quotations. It links to, but does not republish, third-party source text.")}`,
  "appearance:",
  "  cover:",
  '    background: "#17233d"',
  '    foreground: "#f1ead8"',
  '    accent: "#66c5b8"',
  `    subtitle: ${yaml("Nine-source analysis for teaching, salons, and public speaking")}`,
  "  binding:",
  "    material: cloth",
  '    color: "#17233d"',
  '    accent: "#66c5b8"',
  "    depth: standard",
  "    hubs: 4",
  "    pageCount: 72",
  `    shelfLabel: ${yaml("THE HUMAN CHOICE")}`,
  "chapters:",
  ...chapters.flatMap((chapter) => [
    `  - id: ${chapter.id}`,
    `    title: ${yaml(chapter.title)}`,
    `    source: chapters/${chapter.source}`,
    `    slug: ${chapter.id}`,
  ]),
  "",
].join("\n");

const sourceRecord = [
  "# The Human Choice source and rights record",
  "",
  `This fixture is generated from [${repository}](https://github.com/${repository})`,
  `at pinned revision \`${revision}\`. Run`,
  "`npm run sync:field-guide-sourcebook` to reproduce it.",
  "",
  "The fixture contains the field guide's original analysis, compact metadata,",
  "and attributed short quotations. It does not contain the raw third-party page",
  "extractions used during research. Each chapter links to its primary source.",
  "",
  "No additional public reuse license is granted by the source repository.",
  "Third-party text, names, marks, and linked materials remain subject to their",
  "respective owners' terms.",
  "",
].join("\n");

await Promise.all([
  writeFile(join(outputRoot, "book.yml"), book, "utf8"),
  writeFile(join(outputRoot, "SOURCE.md"), sourceRecord, "utf8"),
]);

process.stdout.write(
  `Synced ${chapters.length} field-guide source chapters from ${revision}\n`,
);
