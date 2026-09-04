import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const workspace = resolve(fileURLToPath(new URL("..", import.meta.url)));
const temporaryRoot = mkdtempSync(join(tmpdir(), "pageturn-v3-consumer-"));
const packageDirectory = join(temporaryRoot, "packages");
const npmCli = process.env.npm_execpath;

if (!npmCli) {
  throw new Error("npm_execpath is required to verify the packed SDK");
}

function run(command, args, cwd = workspace) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: "pipe",
  });
  if (result.status !== 0) {
    throw new Error(
      [result.error?.message, result.stdout, result.stderr]
        .filter(Boolean)
        .join("\n")
        .trim(),
    );
  }
  return result.stdout.trim();
}

function runNpm(args, cwd = workspace) {
  return run(process.execPath, [npmCli, ...args], cwd);
}

try {
  mkdirSync(packageDirectory);
  runNpm([
    "pack",
    "./packages/page-turn-v3",
    "--pack-destination",
    packageDirectory,
  ]);

  const tarballs = readdirSync(packageDirectory)
    .filter((entry) => entry.endsWith(".tgz"))
    .map((entry) => join(packageDirectory, entry));
  if (tarballs.length !== 1) {
    throw new Error(`Expected one packed SDK artifact, received ${tarballs.length}`);
  }

  writeFileSync(
    join(temporaryRoot, "package.json"),
    JSON.stringify(
      {
        name: "pageturn-v3-clean-consumer",
        private: true,
        type: "module",
      },
      null,
      2,
    ),
  );
  runNpm(
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      ...tarballs,
    ],
    temporaryRoot,
  );

  writeFileSync(
    join(temporaryRoot, "verify.mjs"),
    `
      import assert from "node:assert/strict";
      import {
        attachPageTurnBook,
        createPageTurnBook,
        mountPageTurnBookShell,
        solvePageTurn,
      } from "@ethical-tech/pageturn-book";

      assert.equal(typeof createPageTurnBook, "function");
      assert.equal(typeof attachPageTurnBook, "function");
      assert.equal(typeof mountPageTurnBookShell, "function");
      assert.equal(typeof solvePageTurn, "function");
    `,
  );
  run(process.execPath, ["verify.mjs"], temporaryRoot);

  writeFileSync(
    join(temporaryRoot, "consumer.ts"),
    `
      import {
        createPageTurnBook,
        type PageTurnBookHandle,
      } from "@ethical-tech/pageturn-book";

      declare const root: HTMLElement;
      const reader: PageTurnBookHandle = createPageTurnBook({
        root,
        bookId: "external-book",
        manifestUrl: "/books/external-book/manifest.json",
      });
      void reader.ready.catch(() => undefined);
      reader.destroy();
    `,
  );
  const typescriptCli = resolve(workspace, "node_modules/typescript/bin/tsc");
  run(
    process.execPath,
    [
      typescriptCli,
      "--noEmit",
      "--strict",
      "--target",
      "ES2022",
      "--lib",
      "ES2022,DOM,DOM.Iterable",
      "--module",
      "NodeNext",
      "--moduleResolution",
      "NodeNext",
      "consumer.ts",
    ],
    temporaryRoot,
  );

  const installedPackage = join(
    temporaryRoot,
    "node_modules",
    "@ethical-tech",
    "pageturn-book",
  );
  for (const required of [
    "dist/index.js",
    "dist/index.d.ts",
    "styles.css",
    "THIRD_PARTY_NOTICES.md",
    "README.md",
    "LICENSE",
  ]) {
    if (!existsSync(join(installedPackage, required))) {
      throw new Error(`Packed SDK is missing ${required}`);
    }
  }
  const installedManifest = JSON.parse(
    readFileSync(join(installedPackage, "package.json"), "utf8"),
  );
  if (installedManifest.version !== "3.0.0") {
    throw new Error(`Expected V3 package, received ${installedManifest.version}`);
  }
  if (installedManifest.license !== "SEE LICENSE IN LICENSE") {
    throw new Error("Packed SDK is missing explicit license metadata");
  }
  if (
    installedManifest.dependencies &&
    Object.keys(installedManifest.dependencies).length > 0
  ) {
    throw new Error("Packed SDK must not require unpublished workspace packages");
  }
  const compiledFiles = readdirSync(join(installedPackage, "dist"));
  if (compiledFiles.some((file) => file.includes(".test."))) {
    throw new Error("Packed SDK contains compiled unit tests");
  }

  console.log("Packed PageTurn Book V3 SDK verified in a clean consumer.");
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
