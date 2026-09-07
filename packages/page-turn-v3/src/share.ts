import type {
  PageTurnTextPoint,
  PageTurnTextSourceBlock,
  PageTurnTextTargetV1,
} from "./text-target.js";

export const PAGE_TURN_SHARE_QUOTE_MAX_CHARACTERS = 2_000;
export const PAGE_TURN_SHARE_CONTEXT_DEFAULT_CHARACTERS = 240;
export const PAGE_TURN_SHARE_CONTEXT_MAX_CHARACTERS = 240;

export type PageTurnSharePolicy = Readonly<{
  location: "public" | "disabled";
  quote: Readonly<{
    permitted: boolean;
    maximumCharacters: number;
  }>;
  visual: Readonly<{
    permitted: boolean;
    maximumContextCharacters: number;
    sourceImages: "none" | "same-origin-approved";
  }>;
}>;

export type PageTurnResolvedSharePolicy = Readonly<{
  policy: PageTurnSharePolicy;
  source: "configured" | "missing" | "invalid";
  valid: boolean;
  message: string;
}>;

export type PageTurnShareCapabilities = Readonly<{
  location: boolean;
  quote: boolean;
  visual: boolean;
  sourceImages: boolean;
}>;

export type PageTurnShareContext = Readonly<{
  before: string;
  after: string;
}>;

export type PageTurnSharePayload = Readonly<{
  title: string;
  url: string;
  quote?: string;
  text: string;
  clipboardText: string;
  disclosure: string;
}>;

const ANCHOR_ONLY_POLICY: PageTurnSharePolicy = {
  location: "public",
  quote: { permitted: false, maximumCharacters: 0 },
  visual: {
    permitted: false,
    maximumContextCharacters: 0,
    sourceImages: "none",
  },
};

const DISABLED_POLICY: PageTurnSharePolicy = {
  ...ANCHOR_ONLY_POLICY,
  location: "disabled",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isBoundedInteger(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= minimum &&
    value <= maximum
  );
}

export function resolvePageTurnSharePolicy(
  value?: PageTurnSharePolicy,
): PageTurnResolvedSharePolicy {
  if (value === undefined) {
    return {
      policy: ANCHOR_ONLY_POLICY,
      source: "missing",
      valid: true,
      message:
        "No publication excerpt policy was supplied. Only the public passage link can be shared.",
    };
  }
  const candidate: unknown = value;
  const quote = isRecord(candidate) && candidate.quote;
  const visual = isRecord(candidate) && candidate.visual;
  const valid =
    isRecord(candidate) &&
    (candidate.location === "public" || candidate.location === "disabled") &&
    isRecord(quote) &&
    typeof quote.permitted === "boolean" &&
    isBoundedInteger(
      quote.maximumCharacters,
      quote.permitted ? 2 : 0,
      PAGE_TURN_SHARE_QUOTE_MAX_CHARACTERS,
    ) &&
    (!quote.permitted || quote.maximumCharacters >= 2) &&
    isRecord(visual) &&
    typeof visual.permitted === "boolean" &&
    isBoundedInteger(
      visual.maximumContextCharacters,
      0,
      PAGE_TURN_SHARE_CONTEXT_MAX_CHARACTERS,
    ) &&
    (visual.sourceImages === "none" ||
      visual.sourceImages === "same-origin-approved") &&
    !(visual.permitted && !quote.permitted);
  if (!valid) {
    return {
      policy: DISABLED_POLICY,
      source: "invalid",
      valid: false,
      message:
        "The publication share policy is invalid. Sharing is disabled to protect publication rights.",
    };
  }
  return {
    policy: value,
    source: "configured",
    valid: true,
    message:
      value.location === "disabled"
        ? "This publication does not permit public location sharing."
        : value.quote.permitted
          ? value.visual.permitted
            ? "This publication permits bounded quote and text-only visual sharing. Source images are not included or exported."
            : "This publication permits bounded quote sharing without images."
          : "This publication permits public passage links only.",
  };
}

export function pageTurnShareCapabilities(
  resolved: PageTurnResolvedSharePolicy,
): PageTurnShareCapabilities {
  const location = resolved.valid && resolved.policy.location === "public";
  const quote = location && resolved.policy.quote.permitted;
  const visual = quote && resolved.policy.visual.permitted;
  return {
    location,
    quote,
    visual,
    sourceImages: false,
  };
}

function codePoints(value: string): string[] {
  return Array.from(value);
}

function pointGlobalOffset(
  blocks: readonly PageTurnTextSourceBlock[],
  point: PageTurnTextPoint,
): number | undefined {
  let offset = 0;
  for (const [index, block] of blocks.entries()) {
    if (block.anchor === point.anchor) {
      const length = codePoints(block.text).length;
      return point.offset <= length ? offset + point.offset : undefined;
    }
    offset += codePoints(block.text).length;
    if (index < blocks.length - 1) {
      offset += 1;
    }
  }
  return undefined;
}

function pointAtGlobalOffset(
  blocks: readonly PageTurnTextSourceBlock[],
  requested: number,
): PageTurnTextPoint | undefined {
  let offset = 0;
  for (const [index, block] of blocks.entries()) {
    const length = codePoints(block.text).length;
    if (requested <= offset + length) {
      return { anchor: block.anchor, offset: requested - offset };
    }
    offset += length;
    if (index < blocks.length - 1) {
      offset += 1;
    }
  }
  return undefined;
}

export function pageTurnShareTargetEnd(
  target: PageTurnTextTargetV1,
  blocks: readonly PageTurnTextSourceBlock[],
  maximumCharacters: number,
): PageTurnTextPoint | undefined {
  if (
    !Number.isSafeInteger(maximumCharacters) ||
    maximumCharacters < 2 ||
    maximumCharacters > PAGE_TURN_SHARE_QUOTE_MAX_CHARACTERS
  ) {
    throw new RangeError("Share quote limit must contain 2-2000 code points");
  }
  if (codePoints(target.quote.exact).length <= maximumCharacters) {
    return target.end;
  }
  const start = pointGlobalOffset(blocks, target.start);
  if (start === undefined) {
    throw new RangeError("Share target start is unavailable");
  }
  const permitted = codePoints(target.quote.exact)
    .slice(0, maximumCharacters)
    .join("")
    .replace(/\n+$/u, "");
  const permittedLength = codePoints(permitted).length;
  if (permittedLength < 2) {
    return undefined;
  }
  const end = pointAtGlobalOffset(blocks, start + permittedLength);
  if (!end) {
    throw new RangeError("Share target end is unavailable");
  }
  return end;
}

export function pageTurnShareContext(
  target: PageTurnTextTargetV1,
  blocks: readonly PageTurnTextSourceBlock[],
  maximumCharacters = PAGE_TURN_SHARE_CONTEXT_DEFAULT_CHARACTERS,
): PageTurnShareContext {
  if (
    !isBoundedInteger(
      maximumCharacters,
      0,
      PAGE_TURN_SHARE_CONTEXT_MAX_CHARACTERS,
    )
  ) {
    throw new RangeError("Share context limit must contain 0-240 code points");
  }
  if (maximumCharacters === 0) {
    return { before: "", after: "" };
  }
  const stream = codePoints(blocks.map(({ text }) => text).join("\n"));
  const start = pointGlobalOffset(blocks, target.start);
  const end = pointGlobalOffset(blocks, target.end);
  if (start === undefined || end === undefined || end < start) {
    throw new RangeError("Share target context is unavailable");
  }
  const beforeLimit = Math.floor(maximumCharacters / 2);
  const afterLimit = maximumCharacters - beforeLimit;
  return {
    before: stream
      .slice(Math.max(0, start - beforeLimit), start)
      .join("")
      .trimStart(),
    after: stream.slice(end, end + afterLimit).join("").trimEnd(),
  };
}

export function createPageTurnSharePayload(input: Readonly<{
  title: string;
  authors: readonly string[];
  chapterTitle: string;
  editionId: string;
  sourceUrl: string;
  citation?: string;
  quote?: string;
}>): PageTurnSharePayload {
  const attribution =
    input.authors.length > 0
      ? `${input.title} — ${input.authors.join(", ")}`
      : input.title;
  const metadata = [
    attribution,
    `Chapter: ${input.chapterTitle}`,
    `Edition: ${input.editionId}`,
    `Source: ${input.citation ?? input.sourceUrl}`,
  ].join("\n");
  const text =
    input.quote === undefined ? metadata : `“${input.quote}”\n\n${metadata}`;
  return {
    title: `${input.title}: ${input.chapterTitle}`,
    url: input.sourceUrl,
    ...(input.quote === undefined ? {} : { quote: input.quote }),
    text,
    clipboardText: `${text}\n${input.sourceUrl}`,
    disclosure:
      input.quote === undefined
        ? "Only this public anchor link and publication citation will leave the browser. Selected text, exact selectors, private notes, highlights, and images are excluded."
        : "The displayed public quote, exact-passage link, publication citation, and any displayed generated image may leave the browser. Private notes and stored highlights are excluded.",
  };
}

export async function shareReadingLocation(
  title: string,
  url: string,
  text?: string,
): Promise<string> {
  try {
    if (typeof navigator.share === "function") {
      await navigator.share({
        title,
        url,
        ...(text === undefined ? {} : { text }),
      });
      return "Reading location shared";
    }
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(
        text === undefined ? url : `${text}\n\n${url}`,
      );
      return "Reading link copied";
    }
    return "Copy the page address to share this location";
  } catch (error) {
    return error instanceof DOMException && error.name === "AbortError"
      ? "Sharing cancelled"
      : error instanceof Error
        ? `Sharing failed: ${error.message}`
        : "Sharing failed";
  }
}
