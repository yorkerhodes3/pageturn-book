import { describe, expect, it } from "vitest";
import { compileMarkdown } from "./markdown.js";

describe("compileMarkdown", () => {
  it("preserves explicit IDs and creates deterministic block IDs", async () => {
    const source = `# Introduction {#intro}

This paragraph has a stable generated identity.

Another paragraph.
{#explicit-block}
`;
    const first = await compileMarkdown(source, "chapters/intro.md");
    const second = await compileMarkdown(source, "chapters/intro.md");

    expect(first.anchors).toEqual(second.anchors);
    expect(first.anchors[0]).toBe("intro");
    expect(first.anchors).toContain("explicit-block");
    expect(first.html).not.toContain("{#intro}");
    expect(first.sourceMap[0]?.source).toBe("chapters/intro.md");
  });

  it("does not change existing IDs after an unrelated following edit", async () => {
    const original = await compileMarkdown(
      "# Stable heading\n\nStable paragraph.",
      "chapter.md",
    );
    const changed = await compileMarkdown(
      "# Stable heading\n\nStable paragraph.\n\nA later addition.",
      "chapter.md",
    );

    expect(changed.anchors.slice(0, 2)).toEqual(original.anchors);
  });

  it("drops raw script content", async () => {
    const compiled = await compileMarkdown(
      "# Safe\n\n<script>alert('unsafe')</script>\n\nStill safe.",
      "chapter.md",
    );

    expect(compiled.html).not.toContain("<script");
    expect(compiled.html).not.toContain("alert(");
    expect(compiled.html).toContain("Still safe");
  });
});

