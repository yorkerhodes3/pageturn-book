import { readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve("apps/demo/dist");
const base = process.env.PAGES_BASE_PATH ?? "/pageturn-book/";
const required = [
  "index.html",
  "legacy/index.html",
  "compare/index.html",
  "book/demo-book/2026-08/manifest.json",
  "book/demo-book/2026-08/build-metadata.json",
  "book/demo-book/2026-08/chapters/introduction/index.html",
  "book/demo-book/2026-08/chapters/principles/index.html",
  "book/what-is-ethical-ai/2026-07/manifest.json",
  "book/what-is-ethical-ai/2026-07/chapters/executive-summary/index.html",
  "book/what-is-ethical-ai/2026-07/chapters/conclusion/index.html",
];

for (const path of required) {
  const info = await stat(join(root, path));
  if (!info.isFile()) {
    throw new Error(`Pages artifact is missing file: ${path}`);
  }
}

for (const path of required.filter((path) => path.endsWith(".html"))) {
  const html = await readFile(join(root, path), "utf8");
  for (const match of html.matchAll(/(?:href|src)="(\/[^"]+)"/g)) {
    const url = match[1];
    if (url && !url.startsWith(base)) {
      throw new Error(
        `${path} contains absolute URL ${url} outside Pages base ${base}`,
      );
    }
  }
}

process.stdout.write(
  `Pages artifact verified at ${root} with base ${base}\n`,
);
