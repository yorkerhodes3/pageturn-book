import { describe, expect, it } from "vitest";
import {
  pageTurnSelectionRectUnion,
  placePageTurnSelectionActions,
  type PageTurnRect,
} from "./selection-actions.js";

function rect(
  left: number,
  top: number,
  width: number,
  height: number,
): PageTurnRect {
  return { left, top, right: left + width, bottom: top + height, width, height };
}

describe("selection action placement", () => {
  it("unites usable range fragments and prefers a centered position above", () => {
    expect(
      pageTurnSelectionRectUnion([
        rect(100, 200, 80, 18),
        rect(80, 220, 120, 18),
        rect(0, 0, 0, 0),
      ]),
    ).toEqual(rect(80, 200, 120, 38));
    expect(
      placePageTurnSelectionActions({
        selectionRects: [rect(100, 200, 80, 18)],
        bounds: rect(20, 40, 500, 500),
        viewport: rect(0, 0, 600, 600),
        toolbarSize: { width: 180, height: 44 },
      }),
    ).toEqual({ mode: "adjacent", left: 50, top: 146 });
  });

  it("flips below, clamps horizontally, and avoids exclusions", () => {
    expect(
      placePageTurnSelectionActions({
        selectionRects: [rect(15, 48, 40, 20)],
        bounds: rect(20, 40, 400, 400),
        viewport: rect(0, 0, 440, 480),
        toolbarSize: { width: 180, height: 44 },
        exclusions: [rect(20, 0, 400, 42)],
      }),
    ).toEqual({ mode: "adjacent", left: 20, top: 78 });
  });

  it("uses a bottom-safe-area dock or yields when even the dock collides", () => {
    const input = {
      selectionRects: [rect(100, 100, 120, 30)],
      bounds: rect(0, 0, 360, 640),
      viewport: rect(0, 0, 360, 640),
      toolbarSize: { width: 240, height: 44 },
      exclusions: [rect(0, 40, 360, 500)],
      touch: true,
      safeAreaBottom: 24,
    } as const;
    expect(placePageTurnSelectionActions(input)).toEqual({
      mode: "dock",
      left: 60,
      top: 572,
    });
    expect(
      placePageTurnSelectionActions({
        ...input,
        exclusions: [...input.exclusions, rect(0, 560, 360, 80)],
      }),
    ).toEqual({ mode: "hidden" });
  });
});
