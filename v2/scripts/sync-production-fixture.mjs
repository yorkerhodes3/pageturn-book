import { mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const revision = "b456e8e137a0b6ce9a51799b71c6091f5241b5d7";
const sourceUrl =
  `https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/${revision}` +
  "/src/content/publications/what-is-ethical-ai.ts";
const outputRoot = resolve("apps/fixtures/what-is-ethical-ai");

function yamlString(value) {
  return JSON.stringify(value);
}

function slug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseReport(source) {
  const runnable =
    source
      .replace(/^import type .*?;\s*$/m, "")
      .replace(
        "export const whatIsEthicalAiReport =",
        "const whatIsEthicalAiReport =",
      )
      .replace(/\]\s+satisfies\s+\w+\[\]/g, "]") +
    "\nexport { whatIsEthicalAiReport };";
  return import(
    `data:text/javascript;base64,${Buffer.from(runnable).toString("base64")}`
  ).then((module) => module.whatIsEthicalAiReport);
}

function paragraphMarkdown(paragraph, sectionId, index) {
  if (typeof paragraph === "string") {
    return paragraph;
  }
  if ("lead" in paragraph && "text" in paragraph) {
    const headingId = `${sectionId}-${slug(paragraph.lead)}-${index + 1}`;
    return `## ${paragraph.lead} {#${headingId}}\n\n${paragraph.text}`;
  }
  if ("intro" in paragraph && "list" in paragraph) {
    return `${paragraph.intro}\n\n${paragraph.list
      .map((item) => `- ${item}`)
      .join("\n")}`;
  }
  throw new Error(`Unsupported production paragraph shape in ${sectionId}`);
}

function markdownLinkText(value) {
  return value.replace(/([\\[\]])/g, "\\$1");
}

function citationMarkdown(citation, index) {
  const number = String(index + 1).padStart(2, "0");
  const reference = citation.url
    ? `[${markdownLinkText(citation.ref)}](<${citation.url}>)`
    : citation.ref;
  return `[${number}] ${reference}\n\n{#reference-${number}}`;
}

const response = await fetch(sourceUrl);
if (!response.ok) {
  throw new Error(`Could not load production content (${response.status})`);
}
const report = await parseReport(await response.text());

await rm(outputRoot, { recursive: true, force: true });
await mkdir(resolve(outputRoot, "chapters"), { recursive: true });

const chapters = [];
for (const section of report.sections) {
  const filename = `${section.number}-${section.id}.md`;
  chapters.push({
    id: section.id,
    title: section.title,
    source: `chapters/${filename}`,
    slug: section.id,
  });
  const body = [
    `<!-- GENERATED from ${sourceUrl}; do not edit by hand. -->`,
    "",
    `# ${section.number}. ${section.title} {#${section.id}}`,
    "",
    ...section.paragraphs.flatMap((paragraph, index) => [
      paragraphMarkdown(paragraph, section.id, index),
      "",
    ]),
  ].join("\n");
  await writeFile(resolve(outputRoot, "chapters", filename), body);
}

const referencesFilename = "17-references.md";
chapters.push({
  id: "references",
  title: "Works Cited",
  source: `chapters/${referencesFilename}`,
  slug: "references",
});
const referencesBody = [
  `<!-- GENERATED from ${sourceUrl}; do not edit by hand. -->`,
  "",
  "# 17. Works Cited {#references}",
  "",
  ...report.citations.flatMap((citation, index) => [
    citationMarkdown(citation, index),
    "",
  ]),
  "## Disclaimer {#disclaimer}",
  "",
  report.disclaimer,
  "",
  "{#disclaimer-note}",
  "",
].join("\n");
await writeFile(
  resolve(outputRoot, "chapters", referencesFilename),
  referencesBody,
);

const config = [
  "# GENERATED from the pinned Ethical Tech CoLab website source.",
  `# Source: ${sourceUrl}`,
  "bookId: what-is-ethical-ai",
  "editionId: 2026-07",
  `title: ${yamlString(report.title)}`,
  `description: ${yamlString(report.subtitle)}`,
  "authors:",
  "  - name: Ethical Tech CoLab",
  "    url: https://ethical-tech-colab.github.io/website/",
  "language: en",
  "direction: ltr",
  "publicationDate: 2026-07-01",
  "appearance:",
  "  cover:",
  '    background: "#17233d"',
  '    foreground: "#f1ead8"',
  '    accent: "#b99a5e"',
  `    subtitle: ${yamlString(report.subtitle)}`,
  "  binding:",
  "    material: leather",
  '    color: "#111b31"',
  '    accent: "#b99a5e"',
  "    depth: thick",
  "    hubs: 5",
  "    pageCount: 46",
  '    shelfLabel: "WHAT IS ETHICAL AI?"',
  "chapters:",
  ...chapters.flatMap((chapter) => [
    `  - id: ${chapter.id}`,
    `    title: ${yamlString(chapter.title)}`,
    `    source: ${chapter.source}`,
    `    slug: ${chapter.slug}`,
  ]),
  "",
].join("\n");
await writeFile(resolve(outputRoot, "book.yml"), config);
console.log(
  `Synced ${report.sections.length} sections and ${report.citations.length} references from production revision ${revision}`,
);
