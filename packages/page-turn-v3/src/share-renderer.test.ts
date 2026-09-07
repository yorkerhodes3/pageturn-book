import { describe, expect, it } from "vitest";
import {
  PAGE_TURN_SHARE_CANVAS_MAX_BYTES,
  PAGE_TURN_SHARE_IMAGE_MAX_AREA,
  PAGE_TURN_SHARE_IMAGE_MAX_EDGE,
  pageTurnShareCanvasPlan,
  pageTurnShareQuoteLayout,
} from "./share-renderer.js";

describe("PageTurn visual share renderer budgets", () => {
  it("uses one bounded deterministic canvas plan", () => {
    const first = pageTurnShareCanvasPlan();
    const second = pageTurnShareCanvasPlan();
    expect(second).toEqual(first);
    expect(Math.max(first.width, first.height)).toBeLessThanOrEqual(
      PAGE_TURN_SHARE_IMAGE_MAX_EDGE,
    );
    expect(first.area).toBeLessThanOrEqual(PAGE_TURN_SHARE_IMAGE_MAX_AREA);
    expect(first.estimatedCanvasBytes).toBeLessThanOrEqual(
      PAGE_TURN_SHARE_CANVAS_MAX_BYTES,
    );
  });

  it("allocates every code point of a maximum-length ordinary quote", () => {
    const context = {
      font: "",
      measureText(value: string) {
        const size = Number.parseInt(
          this.font.match(/(\d+)px/u)?.[1] ?? "12",
          10,
        );
        return { width: Array.from(value).length * size * 0.65 };
      },
    } as CanvasRenderingContext2D;
    const quote = `A${"\n".repeat(1_998)}B`;
    const layout = pageTurnShareQuoteLayout(context, quote, 918, 676);

    expect(layout.height).toBeLessThanOrEqual(676);
    expect(layout.fontSize).toBeGreaterThanOrEqual(12);
    expect(layout.lines.join("").replaceAll("↵", "\n")).toBe(quote);
  });

  it("refuses to horizontally compress an illegible extreme-glyph quote", () => {
    const context = {
      font: "",
      measureText(value: string) {
        return { width: Array.from(value).length * 80 };
      },
    } as unknown as CanvasRenderingContext2D;

    expect(() =>
      pageTurnShareQuoteLayout(context, "﷽".repeat(2_000), 918, 676),
    ).toThrow(/cannot fit legibly/u);
  });
});
