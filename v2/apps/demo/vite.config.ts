import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
} from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const root = dirname(fileURLToPath(import.meta.url));

function collectHtml(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectHtml(path));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(path);
    }
  }
  return files;
}

function copyPublicationData(source: string, destination: string): void {
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const sourcePath = resolve(source, entry.name);
    const destinationPath = resolve(destination, entry.name);
    if (entry.isDirectory()) {
      mkdirSync(destinationPath, { recursive: true });
      copyPublicationData(sourcePath, destinationPath);
    } else if (entry.isFile() && !entry.name.endsWith(".html")) {
      mkdirSync(dirname(destinationPath), { recursive: true });
      copyFileSync(sourcePath, destinationPath);
    }
  }
}

export default defineConfig(() => {
  const publicationRoot = resolve(root, "book");
  const htmlFiles = [
    resolve(root, "index.html"),
    resolve(root, "legacy", "index.html"),
    resolve(root, "compare", "index.html"),
    resolve(root, "shelf", "index.html"),
    ...collectHtml(publicationRoot),
  ];
  const input = Object.fromEntries(
    htmlFiles.map((path) => [
      relative(root, path).replaceAll("\\", "/").replace(/\.html$/, ""),
      path,
    ]),
  );
  return {
    root,
    base: process.env.PAGES_BASE_PATH ?? "/",
    appType: "mpa" as const,
    publicDir: false as const,
    build: {
      outDir: "dist",
      emptyOutDir: true,
      rollupOptions: { input },
    },
    resolve: {
      alias: {
        "page-flip": resolve(
          root,
          "../../node_modules/page-flip/dist/js/page-flip.module.js",
        ),
      },
    },
    plugins: [
      {
        name: "copy-publication-data",
        closeBundle() {
          if (existsSync(publicationRoot)) {
            copyPublicationData(publicationRoot, resolve(root, "dist", "book"));
          }
        },
      },
    ],
  };
});
