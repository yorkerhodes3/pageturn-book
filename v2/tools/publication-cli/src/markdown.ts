import { createHash } from "node:crypto";
import type { Properties } from "hast";
import type {
  Blockquote,
  Code,
  Content,
  Data,
  Heading,
  List,
  Paragraph,
  Root,
  Table,
} from "mdast";
import { toString } from "mdast-util-to-string";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

type AddressableNode = Heading | Paragraph | Blockquote | Code | List | Table;

type HtmlData = Data & {
  hProperties?: Properties;
};

export type SourceRange = {
  start: {
    line: number;
    column: number;
  };
  end: {
    line: number;
    column: number;
  };
};

export type SourceMapEntry = {
  anchor: string;
  source: string;
  range?: SourceRange;
};

export type CompiledHeading = {
  depth: number;
  title: string;
  anchor: string;
};

export type CompiledMarkdown = {
  html: string;
  anchors: string[];
  headings: CompiledHeading[];
  sourceMap: SourceMapEntry[];
};

const explicitIdPattern = /^\{#([a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?)\}$/;
const trailingIdPattern =
  /\s+\{#([a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?)\}\s*$/;

function isAddressable(node: Content): node is AddressableNode {
  return [
    "heading",
    "paragraph",
    "blockquote",
    "code",
    "list",
    "table",
  ].includes(node.type);
}

function hashText(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 10);
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function slugify(value: string): string {
  const slug = normalizeText(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
  return slug || "block";
}

function nodePrefix(node: AddressableNode): string {
  switch (node.type) {
    case "heading":
      return "h";
    case "paragraph":
      return "p";
    case "blockquote":
      return "quote";
    case "code":
      return "code";
    case "list":
      return "list";
    case "table":
      return "table";
  }
}

function stripTrailingId(node: Heading | Paragraph): string | undefined {
  const match = trailingIdPattern.exec(toString(node));
  if (!match?.[1]) {
    return undefined;
  }

  for (let index = node.children.length - 1; index >= 0; index -= 1) {
    const child = node.children[index];
    if (!child) {
      continue;
    }
    if (child.type === "text") {
      child.value = child.value.replace(trailingIdPattern, "").trimEnd();
      return match[1];
    }
  }
  return undefined;
}

function setAnchor(node: AddressableNode, anchor: string): void {
  const data = (node.data ??= {}) as HtmlData;
  data.hProperties = {
    ...data.hProperties,
    id: anchor,
  };
}

function sourceRange(node: AddressableNode): SourceRange | undefined {
  const position = node.position;
  if (!position) {
    return undefined;
  }
  return {
    start: {
      line: position.start.line,
      column: position.start.column,
    },
    end: {
      line: position.end.line,
      column: position.end.column,
    },
  };
}

function removeExplicitBlockMarkers(
  root: Root,
): Map<AddressableNode, string> {
  const explicitIds = new Map<AddressableNode, string>();
  const kept: Content[] = [];
  let previousAddressable: AddressableNode | undefined;

  for (const node of root.children) {
    if (node.type === "paragraph") {
      const marker = explicitIdPattern.exec(normalizeText(toString(node)));
      if (marker?.[1]) {
        if (!previousAddressable) {
          throw new Error(
            `Explicit block ID ${marker[1]} has no preceding addressable block`,
          );
        }
        explicitIds.set(previousAddressable, marker[1]);
        continue;
      }
    }

    if (node.type === "heading" || node.type === "paragraph") {
      const trailingId = stripTrailingId(node);
      if (trailingId) {
        explicitIds.set(node, trailingId);
      }
    }

    kept.push(node);
    if (isAddressable(node)) {
      previousAddressable = node;
    }
  }

  root.children = kept;
  return explicitIds;
}

function assignAnchors(
  root: Root,
  source: string,
): Omit<CompiledMarkdown, "html"> {
  const explicitIds = removeExplicitBlockMarkers(root);
  const anchors: string[] = [];
  const headings: CompiledHeading[] = [];
  const sourceMap: SourceMapEntry[] = [];
  const used = new Map<string, number>();

  for (const node of root.children) {
    if (!isAddressable(node)) {
      continue;
    }

    const text = normalizeText(toString(node));
    const explicit = explicitIds.get(node);
    const generatedBase =
      node.type === "heading"
        ? `${nodePrefix(node)}-${slugify(text)}`
        : `${nodePrefix(node)}-${slugify(text)}-${hashText(text)}`;
    const base = explicit ?? generatedBase;
    const count = used.get(base) ?? 0;
    const anchor = count === 0 ? base : `${base}-${count + 1}`;
    used.set(base, count + 1);
    setAnchor(node, anchor);
    anchors.push(anchor);

    const range = sourceRange(node);
    sourceMap.push({
      anchor,
      source,
      ...(range === undefined ? {} : { range }),
    });

    if (node.type === "heading") {
      headings.push({
        depth: node.depth,
        title: text,
        anchor,
      });
    }
  }

  if (anchors.length === 0) {
    throw new Error(`${source} contains no addressable content`);
  }

  return { anchors, headings, sourceMap };
}

export async function compileMarkdown(
  markdown: string,
  source: string,
): Promise<CompiledMarkdown> {
  const sanitizeSchema = {
    ...defaultSchema,
    // Raw HTML is not parsed and generated IDs are restricted to safe
    // lowercase identifiers, so the manifest and HTML can share exact anchors.
    clobberPrefix: "",
  };
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeStringify);
  const tree = processor.parse(markdown) as Root;
  const metadata = assignAnchors(tree, source);
  const transformed = await processor.run(tree);
  const html = processor.stringify(transformed);

  return {
    html,
    ...metadata,
  };
}
