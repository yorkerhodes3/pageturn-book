import { mkdir, readdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const fixturesRoot = resolve("apps/fixtures");
const outputRoot = resolve("apps/demo/book");
const cli = resolve("tools/publication-cli/dist/cli.js");
const transientFileError = /\b(?:EBUSY|EPERM)\b/;

async function fixtureDirectories(directory) {
  const directories = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    const path = join(directory, entry.name);
    const children = await readdir(path, { withFileTypes: true });
    if (children.some((child) => child.isFile() && child.name === "book.yml")) {
      directories.push(path);
    } else {
      directories.push(...(await fixtureDirectories(path)));
    }
  }
  return directories;
}

const fixtures = (await fixtureDirectories(fixturesRoot)).sort();
if (fixtures.length === 0) {
  throw new Error(`No publication fixtures found under ${fixturesRoot}`);
}

await mkdir(outputRoot, { recursive: true });
for (const entry of await readdir(outputRoot, { withFileTypes: true })) {
  if (entry.isDirectory() && entry.name.startsWith(".staging-")) {
    await rm(join(outputRoot, entry.name), {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 100,
    });
  }
}

for (const fixture of fixtures) {
  let built = false;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const result = spawnSync(
      process.execPath,
      [
        cli,
        "build",
        fixture,
        "--out",
        outputRoot,
        "--theme",
        "/src/demo.css",
        "--enhance-script",
        "/src/chapter.ts",
      ],
      { encoding: "utf8" },
    );
    process.stdout.write(result.stdout ?? "");
    process.stderr.write(result.stderr ?? "");
    if (result.status === 0) {
      built = true;
      break;
    }
    const output = `${result.error?.message ?? ""}\n${result.stdout ?? ""}\n${result.stderr ?? ""}`;
    if (!transientFileError.test(output) || attempt === 3) {
      throw new Error(`Publication fixture build failed: ${fixture}`);
    }
    await new Promise((resolveDelay) =>
      setTimeout(resolveDelay, attempt * 250),
    );
  }
  if (!built) {
    throw new Error(`Publication fixture build did not complete: ${fixture}`);
  }
}

process.stdout.write(`Built ${fixtures.length} publication fixtures\n`);
