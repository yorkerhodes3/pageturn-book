export const PAGE_TURN_TEXT_TARGET_VERSION = 1 as const;
export const PAGE_TURN_TEXT_TARGET_MAX_QUOTE_CODE_POINTS = 2_000;
export const PAGE_TURN_TEXT_TARGET_MAX_TOKEN_BYTES = 512;

const CHAPTER_HASH_PATTERN = /^[0-9a-f]{64}$/;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const TEXT_CONTEXT_CODE_POINTS = 32;
const TEXT_FRAGMENT_TERM_CODE_POINTS = 48;

export type PageTurnTextPoint = Readonly<{
  anchor: string;
  offset: number;
}>;

export type PageTurnTextQuote = Readonly<{
  exact: string;
  prefix: string;
  suffix: string;
}>;

export type PageTurnTextTargetV1 = Readonly<{
  version: typeof PAGE_TURN_TEXT_TARGET_VERSION;
  bookId: string;
  editionId: string;
  chapterId: string;
  chapterContentHash: string;
  start: PageTurnTextPoint;
  end: PageTurnTextPoint;
  quote: PageTurnTextQuote;
  checksum: string;
}>;

export type PageTurnTextSourceBlock = Readonly<{
  anchor: string;
  text: string;
}>;

export type PageTurnTextTargetContext = Readonly<{
  bookId: string;
  editionId: string;
  chapterId: string;
  chapterContentHash: string;
  blocks: readonly PageTurnTextSourceBlock[];
}>;

export type PageTurnTextTargetInput = PageTurnTextTargetContext &
  Readonly<{
    start: PageTurnTextPoint;
    end: PageTurnTextPoint;
  }>;

export type PageTurnDomTextTargetInput = PageTurnTextTargetContext &
  Readonly<{
    range: Range;
    scope: ParentNode;
  }>;

export type PageTurnTextTargetTokenV1 = Readonly<{
  version: typeof PAGE_TURN_TEXT_TARGET_VERSION;
  bookId: string;
  editionId: string;
  chapterId: string;
  chapterContentHashPrefix: string;
  start: PageTurnTextPoint;
  end: PageTurnTextPoint;
  checksum: string;
}>;

export type PageTurnTextTargetResolution =
  | Readonly<{
      state: "resolved";
      target: PageTurnTextTargetV1;
      strategy: "position" | "quote-context" | "unique-quote";
    }>
  | Readonly<{
      state: "unresolved";
      target: PageTurnTextTargetV1;
      reason:
        | "edition-mismatch"
        | "missing-anchor"
        | "position-mismatch"
        | "quote-mismatch"
        | "ambiguous-quote"
        | "invalid-target";
    }>;

export type PageTurnTextTargetTokenResolution =
  | Extract<PageTurnTextTargetResolution, { state: "resolved" }>
  | Readonly<{
      state: "unresolved";
      token: PageTurnTextTargetTokenV1;
      reason:
        | "edition-mismatch"
        | "missing-anchor"
        | "position-mismatch"
        | "quote-mismatch";
    }>;

type PreparedTarget = Omit<PageTurnTextTargetV1, "checksum">;

function assertNonEmpty(value: string, name: string): string {
  const normalized = value.trim();
  if (normalized === "") {
    throw new RangeError(`${name} must be a non-empty string`);
  }
  return normalized;
}

function assertOffset(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative safe integer`);
  }
  return value;
}

function codePoints(value: string): string[] {
  return Array.from(value);
}

function codePointLength(value: string): number {
  return codePoints(value).length;
}

function sliceCodePoints(value: string, start: number, end?: number): string {
  return codePoints(value).slice(start, end).join("");
}

export function normalizePageTurnText(value: string): string {
  return value.normalize("NFC").replace(/\s+/gu, " ").trim();
}

export function pageTurnTextOffsetAt(
  value: string,
  utf16Offset: number,
): number {
  if (
    !Number.isSafeInteger(utf16Offset) ||
    utf16Offset < 0 ||
    utf16Offset > value.length
  ) {
    throw new RangeError("Text offset must be within the source string");
  }
  const prefix = value
    .slice(0, utf16Offset)
    .normalize("NFC")
    .replace(/\s+/gu, " ")
    .trimStart();
  return codePointLength(
    utf16Offset === value.length ? prefix.trimEnd() : prefix,
  );
}

export function pageTurnTextSegmentRange(
  source: string,
  segments: readonly string[],
  startIndex: number,
  count: number,
): Readonly<{ start: number; end: number }> {
  if (
    !Number.isSafeInteger(startIndex) ||
    !Number.isSafeInteger(count) ||
    startIndex < 0 ||
    count <= 0 ||
    startIndex + count > segments.length
  ) {
    throw new RangeError("Text segment range is invalid");
  }
  const normalizedSource = normalizePageTurnText(source);
  let cursor = 0;
  let rangeStart: number | undefined;
  let rangeEnd: number | undefined;
  segments.forEach((segment, index) => {
    const normalizedSegment = normalizePageTurnText(segment);
    const match = normalizedSource.indexOf(normalizedSegment, cursor);
    if (match < 0) {
      throw new RangeError(`Text segment ${index} is unavailable in its source`);
    }
    const segmentStart = codePointLength(normalizedSource.slice(0, match));
    const segmentEnd = segmentStart + codePointLength(normalizedSegment);
    if (index === startIndex) {
      rangeStart = segmentStart;
    }
    if (index === startIndex + count - 1) {
      rangeEnd = segmentEnd;
    }
    cursor = match + normalizedSegment.length;
  });
  if (rangeStart === undefined || rangeEnd === undefined) {
    throw new RangeError("Text segment range could not be resolved");
  }
  return { start: rangeStart, end: rangeEnd };
}

function normalizedBlocks(
  blocks: readonly PageTurnTextSourceBlock[],
): readonly PageTurnTextSourceBlock[] {
  const anchors = new Set<string>();
  return blocks.map((block, index) => {
    const anchor = assertNonEmpty(block.anchor, `blocks[${index}].anchor`);
    if (anchors.has(anchor)) {
      throw new RangeError(`Text target source anchor is duplicated: ${anchor}`);
    }
    anchors.add(anchor);
    return {
      anchor,
      text: normalizePageTurnText(block.text),
    };
  });
}

function chapterStream(
  blocks: readonly PageTurnTextSourceBlock[],
): Readonly<{
  points: readonly PageTurnTextPoint[];
  text: readonly string[];
}> {
  const text: string[] = [];
  const points: PageTurnTextPoint[] = [];
  blocks.forEach((block, blockIndex) => {
    const characters = codePoints(block.text);
    characters.forEach((character, offset) => {
      text.push(character);
      points.push({ anchor: block.anchor, offset });
    });
    if (blockIndex < blocks.length - 1) {
      text.push("\n");
      points.push({ anchor: block.anchor, offset: characters.length });
    }
  });
  const finalBlock = blocks.at(-1);
  if (finalBlock) {
    points.push({
      anchor: finalBlock.anchor,
      offset: codePointLength(finalBlock.text),
    });
  }
  return { points, text };
}

function matchingIndices(
  source: readonly string[],
  search: readonly string[],
): number[] {
  if (search.length === 0 || search.length > source.length) {
    return [];
  }
  const matches: number[] = [];
  for (let index = 0; index <= source.length - search.length; index += 1) {
    if (
      search.every(
        (character, offset) => source[index + offset] === character,
      )
    ) {
      matches.push(index);
    }
  }
  return matches;
}

function sourceRange(element: HTMLElement): Readonly<{
  start: number;
  end: number;
}> {
  const start = Number(element.dataset.v3SourceStart);
  const end = Number(element.dataset.v3SourceEnd);
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    end < start
  ) {
    throw new RangeError("Rendered source block has invalid text offsets");
  }
  return { start, end };
}

function sourceElement(node: Node): HTMLElement | undefined {
  const element = node instanceof Element ? node : node.parentElement;
  return (
    element?.closest<HTMLElement>(
      "[data-source-anchor][data-v3-source-start][data-v3-source-end]",
    ) ?? undefined
  );
}

function rawOffsetWithin(
  source: HTMLElement,
  container: Node,
  offset: number,
): number {
  if (!source.contains(container) && source !== container) {
    throw new RangeError("Selection boundary is outside its source block");
  }
  const range = source.ownerDocument.createRange();
  range.selectNodeContents(source);
  range.setEnd(container, offset);
  return range.toString().length;
}

function nearestExactOffset(
  source: string,
  exact: string,
  approximate: number,
  minimum: number,
  maximum: number,
): number | undefined {
  const sourceCharacters = codePoints(source);
  const exactCharacters = codePoints(exact);
  return matchingIndices(sourceCharacters, exactCharacters)
    .filter(
      (index) =>
        index >= minimum && index + exactCharacters.length <= maximum,
    )
    .sort(
      (left, right) =>
        Math.abs(left - approximate) - Math.abs(right - approximate),
    )[0];
}

function selectedSourceText(
    range: Range,
    renderedBlocks: readonly HTMLElement[],
    startElement: HTMLElement,
    endElement: HTMLElement,
): string {
    const startIndex = renderedBlocks.indexOf(startElement);
    const endIndex = renderedBlocks.indexOf(endElement);
    if (startIndex < 0 || endIndex < startIndex) {
      throw new RangeError("Text target source order is invalid");
    }
    const segments = renderedBlocks
      .slice(startIndex, endIndex + 1)
      .flatMap((element) => {
        if (!range.intersectsNode(element)) {
          return [];
        }
        const selected = element.ownerDocument.createRange();
        selected.selectNodeContents(element);
        if (element === startElement) {
          selected.setStart(range.startContainer, range.startOffset);
        }
        if (element === endElement) {
          selected.setEnd(range.endContainer, range.endOffset);
        }
        const text = normalizePageTurnText(selected.toString());
        return text === "" ? [] : [text];
      });
    return normalizePageTurnText(segments.join(" "));
}

export async function capturePageTurnTextTarget(
  input: PageTurnDomTextTargetInput,
): Promise<PageTurnTextTargetV1> {
  if (input.range.collapsed) {
    throw new RangeError("Text target selection must not be collapsed");
  }
  const renderedBlocks = Array.from(
    input.scope.querySelectorAll<HTMLElement>(
      "[data-source-anchor][data-v3-source-start][data-v3-source-end]",
    ),
  );
  const startElement = sourceElement(input.range.startContainer);
  const endElement = sourceElement(input.range.endContainer);
  if (
    !startElement ||
    !endElement ||
    !renderedBlocks.includes(startElement) ||
    !renderedBlocks.includes(endElement)
  ) {
    throw new RangeError("Text target selection is outside the source scope");
  }
  const startAnchor = assertNonEmpty(
    startElement.dataset.sourceAnchor ?? "",
    "selection.start.anchor",
  );
  const endAnchor = assertNonEmpty(
    endElement.dataset.sourceAnchor ?? "",
    "selection.end.anchor",
  );
  const startSpan = sourceRange(startElement);
  const endSpan = sourceRange(endElement);
  const startRawText = startElement.textContent ?? "";
  const endRawText = endElement.textContent ?? "";
  let startOffset =
    startSpan.start +
    pageTurnTextOffsetAt(
      startRawText,
      rawOffsetWithin(
        startElement,
        input.range.startContainer,
        input.range.startOffset,
      ),
    );
  let endOffset =
    endSpan.start +
    pageTurnTextOffsetAt(
      endRawText,
      rawOffsetWithin(
        endElement,
        input.range.endContainer,
        input.range.endOffset,
      ),
    );
  const exact = selectedSourceText(
    input.range,
    renderedBlocks,
    startElement,
    endElement,
  );
  if (startAnchor === endAnchor && startElement === endElement) {
    const block = normalizedBlocks(input.blocks).find(
      ({ anchor }) => anchor === startAnchor,
    );
    if (!block) {
      throw new RangeError("Text target source anchor is unavailable");
    }
    const matched = nearestExactOffset(
      block.text,
      exact,
      startOffset,
      Math.min(startSpan.start, endSpan.start),
      Math.max(startSpan.end, endSpan.end),
    );
    if (matched === undefined) {
      throw new RangeError("Selected text does not match its source block");
    }
    startOffset = matched;
    endOffset = matched + codePointLength(exact);
  }
  const target = await createPageTurnTextTarget({
    bookId: input.bookId,
    editionId: input.editionId,
    chapterId: input.chapterId,
    chapterContentHash: input.chapterContentHash,
    start: { anchor: startAnchor, offset: startOffset },
    end: { anchor: endAnchor, offset: endOffset },
    blocks: input.blocks,
  });
  if (normalizePageTurnText(target.quote.exact) !== exact) {
    throw new RangeError("Selected text does not match its exact target");
  }
  return target;
}

function rawOffsetAtNormalizedOffset(
  value: string,
  normalizedOffset: number,
): number {
  let result = 0;
  for (let offset = 0; offset <= value.length; offset += 1) {
    if (
      offset > 0 &&
      offset < value.length &&
      /[\uDC00-\uDFFF]/u.test(value[offset] ?? "")
    ) {
      continue;
    }
    const current = pageTurnTextOffsetAt(value, offset);
    if (current > normalizedOffset) {
      return result;
    }
    result = offset;
  }
  return result;
}

function domBoundaryAtRawOffset(
  source: HTMLElement,
  rawOffset: number,
): Readonly<{ node: Text; offset: number }> {
  const walker = source.ownerDocument.createTreeWalker(
    source,
    NodeFilter.SHOW_TEXT,
  );
  let consumed = 0;
  for (
    let current = walker.nextNode();
    current !== null;
    current = walker.nextNode()
  ) {
    const text = current as Text;
    const next = consumed + text.data.length;
    if (rawOffset <= next) {
      return { node: text, offset: rawOffset - consumed };
    }
    consumed = next;
  }
  throw new RangeError("Text target offset has no DOM boundary");
}

export function pageTurnTextTargetRanges(
  target: PageTurnTextTargetV1,
  blocks: readonly PageTurnTextSourceBlock[],
  scope: ParentNode,
): Range[] {
  const normalized = normalizedBlocks(blocks);
  const startIndex = normalized.findIndex(
    ({ anchor }) => anchor === target.start.anchor,
  );
  const endIndex = normalized.findIndex(
    ({ anchor }) => anchor === target.end.anchor,
  );
  if (startIndex < 0 || endIndex < startIndex) {
    return [];
  }
  const blockIndices = new Map(
    normalized.map(({ anchor }, index) => [anchor, index]),
  );
  const ranges: Range[] = [];
  for (const element of scope.querySelectorAll<HTMLElement>(
    "[data-source-anchor][data-v3-source-start][data-v3-source-end]",
  )) {
    const chapterScope = element.closest<HTMLElement>("[data-v3-chapter]");
    if (
      chapterScope &&
      chapterScope.dataset.v3Chapter !== target.chapterId
    ) {
      continue;
    }
    const anchor = element.dataset.sourceAnchor;
    const blockIndex = anchor === undefined ? undefined : blockIndices.get(anchor);
    if (
      anchor === undefined ||
      blockIndex === undefined ||
      blockIndex < startIndex ||
      blockIndex > endIndex
    ) {
      continue;
    }
    const span = sourceRange(element);
    const block = normalized[blockIndex];
    if (!block) {
      continue;
    }
    const requestedStart =
      blockIndex === startIndex ? target.start.offset : 0;
    const requestedEnd =
      blockIndex === endIndex ? target.end.offset : codePointLength(block.text);
    const intersectionStart = Math.max(span.start, requestedStart);
    const intersectionEnd = Math.min(span.end, requestedEnd);
    if (intersectionStart >= intersectionEnd) {
      continue;
    }
    const rawText = element.textContent ?? "";
    const start = domBoundaryAtRawOffset(
      element,
      rawOffsetAtNormalizedOffset(
        rawText,
        intersectionStart - span.start,
      ),
    );
    const end = domBoundaryAtRawOffset(
      element,
      rawOffsetAtNormalizedOffset(
        rawText,
        intersectionEnd - span.start,
      ),
    );
    const range = element.ownerDocument.createRange();
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);
    ranges.push(range);
  }
  return ranges;
}

function targetText(
  blocks: readonly PageTurnTextSourceBlock[],
  start: PageTurnTextPoint,
  end: PageTurnTextPoint,
): PageTurnTextQuote {
  const startIndex = blocks.findIndex(({ anchor }) => anchor === start.anchor);
  const endIndex = blocks.findIndex(({ anchor }) => anchor === end.anchor);
  if (startIndex < 0 || endIndex < 0) {
    throw new RangeError("Text target source anchor is unavailable");
  }
  if (startIndex > endIndex) {
    throw new RangeError("Text target end precedes its start");
  }
  const startBlock = blocks[startIndex];
  const endBlock = blocks[endIndex];
  if (!startBlock || !endBlock) {
    throw new RangeError("Text target source block is unavailable");
  }
  const startLength = codePointLength(startBlock.text);
  const endLength = codePointLength(endBlock.text);
  const startOffset = assertOffset(start.offset, "start.offset");
  const endOffset = assertOffset(end.offset, "end.offset");
  if (startOffset > startLength || endOffset > endLength) {
    throw new RangeError("Text target offset exceeds its source block");
  }
  if (startIndex === endIndex && startOffset >= endOffset) {
    throw new RangeError("Text target must select a non-empty range");
  }

  const segments =
    startIndex === endIndex
      ? [sliceCodePoints(startBlock.text, startOffset, endOffset)]
      : [
          sliceCodePoints(startBlock.text, startOffset),
          ...blocks
            .slice(startIndex + 1, endIndex)
            .map(({ text }) => text),
          sliceCodePoints(endBlock.text, 0, endOffset),
        ];
  const exact = segments.join("\n");
  const exactLength = codePointLength(exact);
  if (
    exactLength < 2 ||
    exactLength > PAGE_TURN_TEXT_TARGET_MAX_QUOTE_CODE_POINTS
  ) {
    throw new RangeError(
      `Text target quote must contain 2-${PAGE_TURN_TEXT_TARGET_MAX_QUOTE_CODE_POINTS} code points`,
    );
  }
  return {
    exact,
    prefix: sliceCodePoints(
      startBlock.text,
      Math.max(0, startOffset - TEXT_CONTEXT_CODE_POINTS),
      startOffset,
    ),
    suffix: sliceCodePoints(
      endBlock.text,
      endOffset,
      endOffset + TEXT_CONTEXT_CODE_POINTS,
    ),
  };
}

function preparedTarget(input: PageTurnTextTargetInput): PreparedTarget {
  const bookId = assertNonEmpty(input.bookId, "bookId");
  const editionId = assertNonEmpty(input.editionId, "editionId");
  const chapterId = assertNonEmpty(input.chapterId, "chapterId");
  const chapterContentHash = input.chapterContentHash.trim().toLowerCase();
  if (!CHAPTER_HASH_PATTERN.test(chapterContentHash)) {
    throw new RangeError(
      "chapterContentHash must be a 64-character SHA-256 hexadecimal string",
    );
  }
  const blocks = normalizedBlocks(input.blocks);
  let start = {
    anchor: assertNonEmpty(input.start.anchor, "start.anchor"),
    offset: assertOffset(input.start.offset, "start.offset"),
  };
  let end = {
    anchor: assertNonEmpty(input.end.anchor, "end.anchor"),
    offset: assertOffset(input.end.offset, "end.offset"),
  };
  let startIndex = blocks.findIndex(({ anchor }) => anchor === start.anchor);
  let endIndex = blocks.findIndex(({ anchor }) => anchor === end.anchor);
  while (
    startIndex >= 0 &&
    startIndex < endIndex &&
    start.offset === codePointLength(blocks[startIndex]?.text ?? "")
  ) {
    startIndex += 1;
    const block = blocks[startIndex];
    if (block) {
      start = { anchor: block.anchor, offset: 0 };
    }
  }
  while (endIndex > startIndex && end.offset === 0) {
    endIndex -= 1;
    const block = blocks[endIndex];
    if (block) {
      end = {
        anchor: block.anchor,
        offset: codePointLength(block.text),
      };
    }
  }
  return {
    version: PAGE_TURN_TEXT_TARGET_VERSION,
    bookId,
    editionId,
    chapterId,
    chapterContentHash,
    start,
    end,
    quote: targetText(blocks, start, end),
  };
}

function checksumJson(target: PreparedTarget): string {
  return JSON.stringify({
    v: target.version,
    b: target.bookId,
    e: target.editionId,
    c: target.chapterId,
    h: target.chapterContentHash,
    sa: target.start.anchor,
    so: target.start.offset,
    ea: target.end.anchor,
    eo: target.end.offset,
    x: target.quote.exact,
    p: target.quote.prefix,
    s: target.quote.suffix,
  });
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  if (!BASE64URL_PATTERN.test(value)) {
    throw new Error("Text target token contains invalid base64url");
  }
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(
    value.replaceAll("-", "+").replaceAll("_", "/") + padding,
  );
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function checksum(target: PreparedTarget): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(checksumJson(target)),
  );
  return bytesToBase64Url(new Uint8Array(digest).slice(0, 12));
}

export async function validatePageTurnTextTarget(
  value: unknown,
): Promise<PageTurnTextTargetV1> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Text target must be an object");
  }
  const target = value as Record<string, unknown>;
  const start = target.start as Record<string, unknown> | undefined;
  const end = target.end as Record<string, unknown> | undefined;
  const quote = target.quote as Record<string, unknown> | undefined;
  const hasExactKeys = (
    record: Record<string, unknown>,
    keys: readonly string[],
  ) =>
    Object.keys(record).length === keys.length &&
    keys.every((key) => key in record);
  const hasCanonicalContext = (text: string) =>
    text.normalize("NFC") === text &&
    !/[^\S ]/u.test(text) &&
    !/ {2,}/u.test(text);
  const hasCanonicalExact = (text: string) => {
    const segments = text.split("\n");
    return (
      segments[0] !== "" &&
      segments.at(-1) !== "" &&
      segments.every(
        (segment) =>
          segment === "" || normalizePageTurnText(segment) === segment,
      )
    );
  };
  if (
    !hasExactKeys(target, [
      "version",
      "bookId",
      "editionId",
      "chapterId",
      "chapterContentHash",
      "start",
      "end",
      "quote",
      "checksum",
    ]) ||
    target.version !== PAGE_TURN_TEXT_TARGET_VERSION ||
    typeof target.bookId !== "string" ||
    typeof target.editionId !== "string" ||
    typeof target.chapterId !== "string" ||
    typeof target.chapterContentHash !== "string" ||
    !CHAPTER_HASH_PATTERN.test(target.chapterContentHash) ||
    typeof start !== "object" ||
    start === null ||
    !hasExactKeys(start, ["anchor", "offset"]) ||
    typeof start.anchor !== "string" ||
    !Number.isSafeInteger(start.offset) ||
    Number(start.offset) < 0 ||
    typeof end !== "object" ||
    end === null ||
    !hasExactKeys(end, ["anchor", "offset"]) ||
    typeof end.anchor !== "string" ||
    !Number.isSafeInteger(end.offset) ||
    Number(end.offset) < 0 ||
    typeof quote !== "object" ||
    quote === null ||
    !hasExactKeys(quote, ["exact", "prefix", "suffix"]) ||
    typeof quote.exact !== "string" ||
    !hasCanonicalExact(quote.exact) ||
    codePointLength(quote.exact) === 0 ||
    codePointLength(quote.exact) >
      PAGE_TURN_TEXT_TARGET_MAX_QUOTE_CODE_POINTS ||
    typeof quote.prefix !== "string" ||
    !hasCanonicalContext(quote.prefix) ||
    codePointLength(quote.prefix) > TEXT_CONTEXT_CODE_POINTS ||
    typeof quote.suffix !== "string" ||
    !hasCanonicalContext(quote.suffix) ||
    codePointLength(quote.suffix) > TEXT_CONTEXT_CODE_POINTS ||
    typeof target.checksum !== "string" ||
    !/^[A-Za-z0-9_-]{16}$/.test(target.checksum) ||
    (start.anchor === end.anchor &&
      Number(end.offset) <= Number(start.offset))
  ) {
    throw new Error("Text target is invalid");
  }
  const parsed: PageTurnTextTargetV1 = {
    version: PAGE_TURN_TEXT_TARGET_VERSION,
    bookId: assertNonEmpty(target.bookId, "target.bookId"),
    editionId: assertNonEmpty(target.editionId, "target.editionId"),
    chapterId: assertNonEmpty(target.chapterId, "target.chapterId"),
    chapterContentHash: target.chapterContentHash,
    start: {
      anchor: assertNonEmpty(start.anchor, "target.start.anchor"),
      offset: Number(start.offset),
    },
    end: {
      anchor: assertNonEmpty(end.anchor, "target.end.anchor"),
      offset: Number(end.offset),
    },
    quote: {
      exact: quote.exact,
      prefix: quote.prefix,
      suffix: quote.suffix,
    },
    checksum: target.checksum,
  };
  if (
    parsed.checksum !==
    (await checksum({
      version: parsed.version,
      bookId: parsed.bookId,
      editionId: parsed.editionId,
      chapterId: parsed.chapterId,
      chapterContentHash: parsed.chapterContentHash,
      start: parsed.start,
      end: parsed.end,
      quote: parsed.quote,
    }))
  ) {
    throw new Error("Text target checksum is invalid");
  }
  return parsed;
}

export async function createPageTurnTextTarget(
  input: PageTurnTextTargetInput,
): Promise<PageTurnTextTargetV1> {
  const prepared = preparedTarget(input);
  return {
    ...prepared,
    checksum: await checksum(prepared),
  };
}

function tokenJson(token: PageTurnTextTargetTokenV1): string {
  return JSON.stringify({
    v: token.version,
    b: token.bookId,
    e: token.editionId,
    c: token.chapterId,
    h: token.chapterContentHashPrefix,
    sa: token.start.anchor,
    so: token.start.offset,
    ea: token.end.anchor,
    eo: token.end.offset,
    q: token.checksum,
  });
}

export function encodePageTurnTextTarget(
  target: PageTurnTextTargetV1,
): string {
  const token: PageTurnTextTargetTokenV1 = {
    version: target.version,
    bookId: target.bookId,
    editionId: target.editionId,
    chapterId: target.chapterId,
    chapterContentHashPrefix: target.chapterContentHash.slice(0, 32),
    start: target.start,
    end: target.end,
    checksum: target.checksum,
  };
  const encoded = `v1.${bytesToBase64Url(new TextEncoder().encode(tokenJson(token)))}`;
  if (
    new TextEncoder().encode(encoded).byteLength >
    PAGE_TURN_TEXT_TARGET_MAX_TOKEN_BYTES
  ) {
    throw new RangeError("Text target token exceeds 512 bytes");
  }
  return encoded;
}

function parsedToken(value: unknown): PageTurnTextTargetTokenV1 {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Text target token payload must be an object");
  }
  const token = value as Record<string, unknown>;
  if (
    token.v !== PAGE_TURN_TEXT_TARGET_VERSION ||
    typeof token.b !== "string" ||
    typeof token.e !== "string" ||
    typeof token.c !== "string" ||
    typeof token.h !== "string" ||
    !/^[0-9a-f]{32}$/.test(token.h) ||
    typeof token.sa !== "string" ||
    !Number.isSafeInteger(token.so) ||
    Number(token.so) < 0 ||
    typeof token.ea !== "string" ||
    !Number.isSafeInteger(token.eo) ||
    Number(token.eo) < 0 ||
    typeof token.q !== "string" ||
    !BASE64URL_PATTERN.test(token.q)
  ) {
    throw new Error("Text target token payload is invalid");
  }
  return {
    version: PAGE_TURN_TEXT_TARGET_VERSION,
    bookId: assertNonEmpty(token.b, "token.bookId"),
    editionId: assertNonEmpty(token.e, "token.editionId"),
    chapterId: assertNonEmpty(token.c, "token.chapterId"),
    chapterContentHashPrefix: token.h,
    start: {
      anchor: assertNonEmpty(token.sa, "token.start.anchor"),
      offset: Number(token.so),
    },
    end: {
      anchor: assertNonEmpty(token.ea, "token.end.anchor"),
      offset: Number(token.eo),
    },
    checksum: token.q,
  };
}

export function decodePageTurnTextTarget(
  encoded: string,
): PageTurnTextTargetTokenV1 {
  if (
    new TextEncoder().encode(encoded).byteLength >
      PAGE_TURN_TEXT_TARGET_MAX_TOKEN_BYTES ||
    !encoded.startsWith("v1.")
  ) {
    throw new Error("Text target token is invalid");
  }
  const json = new TextDecoder("utf-8", { fatal: true }).decode(
    base64UrlToBytes(encoded.slice(3)),
  );
  const token = parsedToken(JSON.parse(json) as unknown);
  if (json !== tokenJson(token)) {
    throw new Error("Text target token is not canonically encoded");
  }
  return token;
}

function encodeTextFragmentTerm(value: string): string {
  return encodeURIComponent(value)
    .replaceAll("-", "%2D")
    .replaceAll(",", "%2C")
    .replaceAll("&", "%26");
}

export function pageTurnTextFragment(target: PageTurnTextTargetV1): string {
  const exact = codePoints(target.quote.exact.replaceAll("\n", " "));
  const prefix = codePoints(target.quote.prefix).slice(-32).join("");
  const suffix = codePoints(target.quote.suffix).slice(0, 32).join("");
  const termLength =
    exact.length > TEXT_FRAGMENT_TERM_CODE_POINTS
      ? Math.min(
          TEXT_FRAGMENT_TERM_CODE_POINTS,
          Math.floor(exact.length / 2),
        )
      : exact.length;
  const start = exact.slice(0, termLength).join("");
  const end = exact.length > termLength ? exact.slice(-termLength).join("") : "";
  const terms = [
    prefix === "" ? "" : `${encodeTextFragmentTerm(prefix)}-,`,
    encodeTextFragmentTerm(start),
    end === "" ? "" : `,${encodeTextFragmentTerm(end)}`,
    suffix === "" ? "" : `,-${encodeTextFragmentTerm(suffix)}`,
  ].join("");
  return `:~:text=${terms}`;
}

export function pageTurnTextTargetUrl(
  baseUrl: string | URL,
  target: PageTurnTextTargetV1,
): URL {
  const url = new URL(baseUrl.toString());
  url.searchParams.set("book", target.bookId);
  url.searchParams.set("edition", target.editionId);
  url.searchParams.set("chapter", target.chapterId);
  url.searchParams.set("selection", encodePageTurnTextTarget(target));
  url.hash =
    `${encodeURIComponent(target.start.anchor)}` +
    pageTurnTextFragment(target);
  if (url.href.length > 2_048) {
    url.hash = encodeURIComponent(target.start.anchor);
  }
  if (url.href.length > 2_048) {
    throw new RangeError("Text target URL exceeds 2,048 characters");
  }
  return url;
}

function unresolved(
  target: PageTurnTextTargetV1,
  reason: Extract<PageTurnTextTargetResolution, { state: "unresolved" }>["reason"],
): PageTurnTextTargetResolution {
  return { state: "unresolved", target, reason };
}

export async function resolvePageTurnTextTarget(
  target: PageTurnTextTargetV1,
  context: PageTurnTextTargetContext,
): Promise<PageTurnTextTargetResolution> {
  if (
    target.bookId !== context.bookId ||
    target.editionId !== context.editionId ||
    target.chapterId !== context.chapterId
  ) {
    return unresolved(target, "edition-mismatch");
  }
  if (
    target.checksum !==
    (await checksum({
      version: target.version,
      bookId: target.bookId,
      editionId: target.editionId,
      chapterId: target.chapterId,
      chapterContentHash: target.chapterContentHash,
      start: target.start,
      end: target.end,
      quote: target.quote,
    }))
  ) {
    return unresolved(target, "invalid-target");
  }
  const blocks = normalizedBlocks(context.blocks);
  const startBlockIndex = blocks.findIndex(
    ({ anchor }) => anchor === target.start.anchor,
  );
  const endBlockIndex = blocks.findIndex(
    ({ anchor }) => anchor === target.end.anchor,
  );
  if (
    startBlockIndex < 0 ||
    endBlockIndex < startBlockIndex
  ) {
    return unresolved(target, "missing-anchor");
  }
  let positioned: PageTurnTextTargetV1 | undefined;
  try {
    positioned = await createPageTurnTextTarget({
      ...context,
      start: target.start,
      end: target.end,
    });
  } catch {
    positioned = undefined;
  }
  if (
    positioned &&
    positioned.quote.exact === target.quote.exact &&
    positioned.quote.prefix === target.quote.prefix &&
    positioned.quote.suffix === target.quote.suffix
  ) {
    return { state: "resolved", target: positioned, strategy: "position" };
  }

  const stream = chapterStream(
    blocks.slice(startBlockIndex, endBlockIndex + 1),
  );
  const quote = codePoints(target.quote.exact);
  const matches = matchingIndices(stream.text, quote);
  const contextual = matches.filter((index) => {
    const prefix = stream.text
      .slice(Math.max(0, index - codePointLength(target.quote.prefix)), index)
      .join("");
    const suffix = stream.text
      .slice(
        index + quote.length,
        index + quote.length + codePointLength(target.quote.suffix),
      )
      .join("");
    return (
      prefix.endsWith(target.quote.prefix) &&
      suffix.startsWith(target.quote.suffix)
    );
  });
  const candidates = contextual.length > 0 ? contextual : matches;
  if (candidates.length !== 1) {
    return unresolved(
      target,
      candidates.length > 1
        ? "ambiguous-quote"
        : "quote-mismatch",
    );
  }
  const match = candidates[0];
  const start = match === undefined ? undefined : stream.points[match];
  const end =
    match === undefined ? undefined : stream.points[match + quote.length];
  if (!start || !end) {
    return unresolved(target, "position-mismatch");
  }
  const resolvedTarget = await createPageTurnTextTarget({
    ...context,
    start,
    end,
  });
  return {
    state: "resolved",
    target: resolvedTarget,
    strategy: contextual.length === 1 ? "quote-context" : "unique-quote",
  };
}

export async function resolvePageTurnTextTargetToken(
  encoded: string,
  context: PageTurnTextTargetContext,
): Promise<PageTurnTextTargetTokenResolution> {
  const token = decodePageTurnTextTarget(encoded);
  if (
    token.bookId !== context.bookId ||
    token.editionId !== context.editionId ||
    token.chapterId !== context.chapterId ||
    !context.chapterContentHash.toLowerCase().startsWith(
      token.chapterContentHashPrefix,
    )
  ) {
    return { state: "unresolved", token, reason: "edition-mismatch" };
  }
  let reconstructed: PageTurnTextTargetV1;
  try {
    reconstructed = await createPageTurnTextTarget({
      ...context,
      start: token.start,
      end: token.end,
    });
  } catch (error) {
    return {
      state: "unresolved",
      token,
      reason:
        error instanceof RangeError &&
        error.message.includes("source anchor is unavailable")
          ? "missing-anchor"
          : "position-mismatch",
    };
  }
  if (reconstructed.checksum !== token.checksum) {
    return { state: "unresolved", token, reason: "quote-mismatch" };
  }
  return { state: "resolved", target: reconstructed, strategy: "position" };
}
