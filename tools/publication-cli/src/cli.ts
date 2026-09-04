#!/usr/bin/env node

import { createBuildPlan, buildPublication, relativeEditionPath } from "./build.js";

type ParsedCommand =
  | {
      command: "build";
      sourceRoot: string;
      outputRoot: string;
      themeHref?: string;
      enhanceScriptHref?: string;
    }
  | {
      command: "validate";
      sourceRoot: string;
    }
  | {
      command: "help";
    };

function help(): string {
  return `Usage:
  ethical-tech-book build <source-dir> --out <output-dir> [options]
  ethical-tech-book validate <source-dir>

Options:
  --out <dir>               output root for immutable editions
  --theme <href>            stylesheet href included in generated chapter HTML
  --enhance-script <href>   module href included in generated chapter HTML
  -h, --help                show this help
`;
}

function parseArguments(argv: string[]): ParsedCommand {
  const [command, sourceRoot, ...rest] = argv;
  if (command === undefined || command === "-h" || command === "--help") {
    return { command: "help" };
  }
  if (command !== "build" && command !== "validate") {
    throw new Error(`Unknown command: ${command}`);
  }
  if (!sourceRoot || sourceRoot.startsWith("-")) {
    throw new Error(`${command} requires a source directory`);
  }
  if (command === "validate") {
    if (rest.length > 0) {
      throw new Error("validate does not accept additional options");
    }
    return { command, sourceRoot };
  }

  let outputRoot: string | undefined;
  let themeHref: string | undefined;
  let enhanceScriptHref: string | undefined;
  for (let index = 0; index < rest.length; index += 1) {
    const option = rest[index];
    const value = rest[index + 1];
    if (!value || value.startsWith("-")) {
      throw new Error(`${option} requires a value`);
    }
    switch (option) {
      case "--out":
        outputRoot = value;
        break;
      case "--theme":
        themeHref = value;
        break;
      case "--enhance-script":
        enhanceScriptHref = value;
        break;
      default:
        throw new Error(`Unknown option: ${option}`);
    }
    index += 1;
  }
  if (!outputRoot) {
    throw new Error("build requires --out <output-dir>");
  }
  return {
    command,
    sourceRoot,
    outputRoot,
    ...(themeHref === undefined ? {} : { themeHref }),
    ...(enhanceScriptHref === undefined ? {} : { enhanceScriptHref }),
  };
}

async function main(): Promise<void> {
  const command = parseArguments(process.argv.slice(2));
  if (command.command === "help") {
    process.stdout.write(help());
    return;
  }
  if (command.command === "validate") {
    const plan = await createBuildPlan(command.sourceRoot);
    process.stdout.write(
      `Valid: ${plan.config.bookId}/${plan.config.editionId} (${plan.chapters.length} chapters)\n`,
    );
    return;
  }

  const result = await buildPublication({
    sourceRoot: command.sourceRoot,
    outputRoot: command.outputRoot,
    ...(command.themeHref === undefined
      ? {}
      : { themeHref: command.themeHref }),
    ...(command.enhanceScriptHref === undefined
      ? {}
      : { enhanceScriptHref: command.enhanceScriptHref }),
  });
  process.stdout.write(
    `${result.unchanged ? "Unchanged" : "Built"}: ${relativeEditionPath(result, command.outputRoot)}\n`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`ethical-tech-book: ${message}\n`);
  process.exitCode = 1;
});

