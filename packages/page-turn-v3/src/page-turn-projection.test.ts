import { describe, expect, it } from "vitest";
import { solvePageTurn } from "./page-turn-geometry.js";
import {
  createPageTurnRuntimeProjector,
  pageTurnPolygon,
  projectPageTurn,
} from "./page-turn-projection.js";

const page = { width: 500, height: 700 };

function projected(direction: "forward" | "backward") {
  const result = solvePageTurn({
    page,
    direction,
    corner: "top",
    pointer: { x: 260, y: 120 },
  });
  if (result.status !== "ok") {
    throw new Error(`Expected solved frame, received ${result.reason}`);
  }
  return projectPageTurn(result.frame);
}

describe("projectPageTurn", () => {
  it("places a forward moving page and reveal on the right-hand leaf", () => {
    const projection = projected("forward");

    expect(projection.moving.translate).toEqual({ x: 760, y: 120 });
    expect(projection.revealed.translate).toEqual({ x: 500, y: 0 });
    expect(projection.moving.clip[0]).toEqual({ x: 0, y: 0 });
    expect(projection.moving.clip.length).toBeGreaterThan(4);
    expect(projection.revealed.clip.length).toBeGreaterThan(4);
    expect(projection.foldShadow.length).toBeGreaterThan(0);
    expect(projection.foldShadow.length).toBeLessThanOrEqual(
      Math.hypot(page.width, page.height),
    );
    expect(projection.foldShadow.gradient).toBe("to-right");
  });

  it("mirrors backward geometry onto the left-hand leaf", () => {
    const projection = projected("backward");

    expect(projection.moving.translate.x).toBeCloseTo(
      -61.3272443812862,
      9,
    );
    expect(projection.moving.translate.y).toBeCloseTo(
      -279.0011175342503,
      9,
    );
    expect(projection.revealed.translate).toEqual({ x: 0, y: 0 });
    expect(projection.foldShadow.gradient).toBe("to-left");
  });

  it.each([
    ["forward", "top", { x: 260, y: 120 }],
    ["forward", "bottom", { x: 260, y: 580 }],
    ["backward", "top", { x: 260, y: 120 }],
    ["backward", "bottom", { x: 260, y: 580 }],
  ] as const)(
    "projects a curved, finite %s %s fold",
    (direction, corner, pointer) => {
      const result = solvePageTurn({ page, direction, corner, pointer });
      if (result.status !== "ok") {
        throw new Error(`Expected solved frame, received ${result.reason}`);
      }
      const projection = projectPageTurn(result.frame);

      expect(projection.moving.clip.length).toBeGreaterThan(
        result.frame.movingClip.length,
      );
      expect(projection.revealed.clip.length).toBeGreaterThan(
        result.frame.revealedClip.length,
      );
      expect(projection.foldShadow.length).toBeGreaterThan(0);
      expect(projection.foldShadow.length).toBeLessThanOrEqual(
        Math.hypot(page.width, page.height),
      );
    },
  );

  it("shares the bowed edge during a three-intersection top fold", () => {
    const result = solvePageTurn({
      page: { width: 520, height: 760 },
      direction: "forward",
      corner: "top",
      pointer: { x: -300, y: 775 },
    });

    if (result.status !== "ok") {
      throw new Error(`Expected solved frame, received ${result.reason}`);
    }
    const projection = projectPageTurn(result.frame);

    expect(projection.moving.clip.length).toBeGreaterThan(
      result.frame.movingClip.length,
    );
    expect(projection.revealed.clip.length).toBeGreaterThan(
      result.frame.revealedClip.length,
    );
  });

  it("preserves a bowed edge at the one-pixel intersection margin", () => {
    const result = solvePageTurn({
      page: { width: 520, height: 760 },
      direction: "forward",
      corner: "top",
      pointer: { x: -260, y: 670 },
    });
    if (result.status !== "ok") {
      throw new Error(`Expected solved frame, received ${result.reason}`);
    }
    const projection = projectPageTurn(result.frame);

    expect(projection.moving.clip.length).toBeGreaterThan(
      result.frame.movingClip.length,
    );
    expect(projection.revealed.clip.length).toBeGreaterThan(
      result.frame.revealedClip.length,
    );
  });

  it("formats stable CSS pixel polygons", () => {
    expect(
      pageTurnPolygon([
        { x: 0, y: 1.23456 },
        { x: 20, y: 30 },
        { x: -4.2, y: 8 },
      ]),
    ).toBe(
      "polygon(0.000px 1.235px, 20.000px 30.000px, -4.200px 8.000px)",
    );
  });

  it("uses an analytic curved path for the active runtime projection", () => {
    const result = solvePageTurn({
      page,
      direction: "forward",
      corner: "top",
      pointer: { x: 260, y: 120 },
    });
    if (result.status !== "ok") {
      throw new Error(`Expected solved frame, received ${result.reason}`);
    }

    const projection = projectPageTurn(result.frame, {
      foldCurvature: 0.72,
      includeClipPoints: false,
      includeRevealedClip: false,
    });

    expect(projection.moving.clip).toEqual([]);
    expect(projection.moving.path).toMatch(/^path\("M.*Q.*Z"\)$/);
    expect(projection.revealed.clip).toEqual([]);
    expect(projection.revealed.path).toBe("");
  });

  it("matches reusable runtime projections across the reference grid", () => {
    const runtimeProject = createPageTurnRuntimeProjector(0.72);
    const options = {
      foldCurvature: 0.72,
      includeClipPoints: false,
      includeRevealedClip: false,
    };
    let firstProjection;

    for (const [direction, corner, pointer] of [
      ["forward", "top", { x: 495, y: 3 }],
      ["backward", "bottom", { x: 260, y: 580 }],
      ["forward", "bottom", { x: -300, y: 80 }],
      ["backward", "top", { x: 40, y: 350 }],
      ["forward", "top", { x: -350, y: 80 }],
    ] as const) {
      const result = solvePageTurn({ page, direction, corner, pointer });
      if (result.status !== "ok") {
        throw new Error(`Expected solved frame, received ${result.reason}`);
      }
      const runtimeProjection = runtimeProject(result.frame);
      firstProjection ??= runtimeProjection;
      expect(runtimeProjection).toBe(firstProjection);
      expect(runtimeProjection).toEqual(
        projectPageTurn(result.frame, options),
      );
    }
  });
});
