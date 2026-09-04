import { describe, expect, it } from "vitest";
import {
  solvePageTurn,
  type PageTurnFrame,
  type PageTurnPoint,
} from "./page-turn-geometry.js";

const page = { width: 500, height: 700 };

function expectFinitePoint(point: PageTurnPoint): void {
  expect(Number.isFinite(point.x)).toBe(true);
  expect(Number.isFinite(point.y)).toBe(true);
}

function expectPointClose(
  actual: PageTurnPoint,
  expected: PageTurnPoint,
): void {
  expect(actual.x).toBeCloseTo(expected.x, 9);
  expect(actual.y).toBeCloseTo(expected.y, 9);
}

function pointAt(
  points: readonly PageTurnPoint[],
  index: number,
): PageTurnPoint {
  const point = points[index];
  if (point === undefined) {
    throw new Error(`Expected polygon point at index ${index}`);
  }
  return point;
}

function expectFiniteFrame(frame: PageTurnFrame): void {
  expectFinitePoint(frame.pointer);
  expectFinitePoint(frame.movingOrigin);
  expectFinitePoint(frame.underlayPosition);
  expectFinitePoint(frame.shadow.start);
  expect(Number.isFinite(frame.angleRadians)).toBe(true);
  expect(Number.isFinite(frame.shadow.angleRadians)).toBe(true);
  expect(frame.progress).toBeGreaterThanOrEqual(0);
  expect(frame.progress).toBeLessThanOrEqual(1);
  expect(frame.shadow.widthFactor).toBeGreaterThanOrEqual(0);
  expect(frame.shadow.opacityFactor).toBeGreaterThanOrEqual(0);
  for (const point of [
    frame.pageRect.topLeft,
    frame.pageRect.topRight,
    frame.pageRect.bottomLeft,
    frame.pageRect.bottomRight,
    ...frame.movingClip,
    ...frame.revealedClip,
  ]) {
    expectFinitePoint(point);
  }
}

function solvedFrame(
  input: Parameters<typeof solvePageTurn>[0],
): PageTurnFrame {
  const result = solvePageTurn(input);
  if (result.status !== "ok") {
    throw new Error(`Expected solved frame, received ${result.reason}`);
  }
  return result.frame;
}

describe("solvePageTurn", () => {
  it.each([
    ["forward", "top", { x: 260, y: 120 }],
    ["forward", "bottom", { x: 260, y: 580 }],
    ["backward", "top", { x: 260, y: 120 }],
    ["backward", "bottom", { x: 260, y: 580 }],
  ] as const)(
    "solves finite %s %s-corner geometry",
    (direction, corner, pointer) => {
      const frame = solvedFrame({ page, direction, corner, pointer });

      expectFiniteFrame(frame);
      expect(frame.movingClip.length).toBeGreaterThanOrEqual(3);
      expect(frame.revealedClip.length).toBeGreaterThanOrEqual(3);
      expect(frame.direction).toBe(direction);
      expect(frame.corner).toBe(corner);
    },
  );

  it("keeps directional projection symmetric around one fold solution", () => {
    const pointer = { x: 210, y: 160 };
    const forward = solvedFrame({
      page,
      direction: "forward",
      corner: "top",
      pointer,
    });
    const backward = solvedFrame({
      page,
      direction: "backward",
      corner: "top",
      pointer,
    });

    expect(backward.pointer).toEqual(forward.pointer);
    expect(backward.pageRect).toEqual(forward.pageRect);
    expect(backward.movingClip).toEqual(forward.movingClip);
    expect(backward.revealedClip).toEqual(forward.revealedClip);
    expect(backward.angleRadians).toBeCloseTo(-forward.angleRadians, 12);
    expect(backward.shadow.angleRadians).toBeCloseTo(
      Math.PI - forward.shadow.angleRadians,
      12,
    );
    expect(forward.underlayPosition).toEqual({ x: 0, y: 0 });
    expect(backward.underlayPosition).toEqual({ x: page.width, y: 0 });
  });

  it("matches the StPageFlip 2.0.7 reference frames", () => {
    const top = solvedFrame({
      page,
      direction: "forward",
      corner: "top",
      pointer: { x: 260, y: 120 },
    });
    const bottom = solvedFrame({
      page,
      direction: "forward",
      corner: "bottom",
      pointer: { x: 260, y: 580 },
    });

    expect(top.progress).toBeCloseTo(0.24, 12);
    expect(top.angleRadians).toBeCloseTo(-0.9239729619211545, 12);
    expect(top.shadow.angleRadians).toBeCloseTo(1.1104709738745484, 12);
    expectPointClose(pointAt(top.movingClip, 1), {
      x: 350.6244813278008,
      y: 0,
    });
    expectPointClose(pointAt(top.movingClip, 2), {
      x: 500,
      y: 301.24896265560176,
    });
    expectPointClose(pointAt(top.revealedClip, 0), {
      x: 350.6244813278008,
      y: 0,
    });
    expectPointClose(pointAt(top.revealedClip, 2), {
      x: 500,
      y: 301.24896265560176,
    });

    expect(bottom.progress).toBeCloseTo(0.24, 12);
    expect(bottom.angleRadians).toBeCloseTo(0.9239729619211545, 12);
    expect(bottom.shadow.angleRadians).toBeCloseTo(2.0311216797152447, 12);
    expectPointClose(pointAt(bottom.movingClip, 1), {
      x: 500,
      y: 398.7510373443982,
    });
    expectPointClose(pointAt(bottom.movingClip, 2), {
      x: 350.6244813278009,
      y: 700,
    });
    expectPointClose(pointAt(bottom.revealedClip, 0), {
      x: 500,
      y: 700,
    });
    expectPointClose(pointAt(bottom.revealedClip, 2), {
      x: 350.6244813278009,
      y: 700,
    });
  });

  it("keeps a near-corner reveal local instead of spanning page height", () => {
    const frame = solvedFrame({
      page,
      direction: "forward",
      corner: "top",
      pointer: { x: 495, y: 3 },
    });

    expect(frame.revealedClip).toHaveLength(3);
    expect(
      Math.max(...frame.revealedClip.map((point) => point.y)),
    ).toBeLessThan(10);
  });

  it("mirrors equivalent top and bottom folds across the page height", () => {
    const top = solvedFrame({
      page,
      direction: "forward",
      corner: "top",
      pointer: { x: 260, y: 120 },
    });
    const bottom = solvedFrame({
      page,
      direction: "forward",
      corner: "bottom",
      pointer: { x: 260, y: page.height - 120 },
    });

    expectPointClose(bottom.pageRect.bottomLeft, {
      x: top.pageRect.topLeft.x,
      y: page.height - top.pageRect.topLeft.y,
    });
    expectPointClose(bottom.pageRect.bottomRight, {
      x: top.pageRect.topRight.x,
      y: page.height - top.pageRect.topRight.y,
    });
    expectPointClose(bottom.pageRect.topLeft, {
      x: top.pageRect.bottomLeft.x,
      y: page.height - top.pageRect.bottomLeft.y,
    });
    expectPointClose(bottom.pageRect.topRight, {
      x: top.pageRect.bottomRight.x,
      y: page.height - top.pageRect.bottomRight.y,
    });
  });

  it("constrains an extreme pointer to the binding-corner radius", () => {
    const frame = solvedFrame({
      page,
      direction: "forward",
      corner: "top",
      pointer: { x: -1_000, y: -1_000 },
    });

    expect(Math.hypot(frame.pointer.x, frame.pointer.y)).toBeLessThanOrEqual(
      page.width + 1e-7,
    );
    expectFiniteFrame(frame);
  });

  it("solves the bottom-corner vertical-axis singularity explicitly", () => {
    const frame = solvedFrame({
      page,
      direction: "forward",
      corner: "bottom",
      pointer: { x: 0, y: 0 },
    });

    expect(frame.pointer.x).toBe(0);
    expect(frame.pointer.y).toBeCloseTo(200, 9);
    expect(frame.progress).toBeCloseTo(0.5, 12);
    expectFiniteFrame(frame);
  });

  it("increases progress as the free edge crosses the binding", () => {
    const early = solvedFrame({
      page,
      direction: "forward",
      corner: "top",
      pointer: { x: 430, y: 35 },
    });
    const middle = solvedFrame({
      page,
      direction: "forward",
      corner: "top",
      pointer: { x: 40, y: 100 },
    });
    const late = solvedFrame({
      page,
      direction: "forward",
      corner: "top",
      pointer: { x: -350, y: 80 },
    });

    expect(early.progress).toBeLessThan(middle.progress);
    expect(middle.progress).toBeLessThan(late.progress);
  });

  it.each([
    ["top", { x: page.width, y: 0 }],
    ["bottom", { x: page.width, y: page.height }],
  ] as const)("reports a resting %s corner explicitly", (corner, pointer) => {
    expect(
      solvePageTurn({
        page,
        direction: "forward",
        corner,
        pointer,
      }),
    ).toEqual({ status: "degenerate", reason: "pointer-at-rest" });
  });

  it.each([
    [{ width: 0, height: 700 }, { x: 1, y: 1 }, "page.width"],
    [{ width: 500, height: -1 }, { x: 1, y: 1 }, "page.height"],
    [{ width: 500, height: 700 }, { x: Number.NaN, y: 1 }, "pointer"],
    [
      { width: 500, height: 700 },
      { x: 1, y: Number.POSITIVE_INFINITY },
      "pointer",
    ],
  ] as const)("rejects invalid geometry input %#", (size, pointer, message) => {
    expect(() =>
      solvePageTurn({
        page: size,
        direction: "forward",
        corner: "top",
        pointer,
      }),
    ).toThrow(message);
  });

  it("returns only finite frames or typed degeneracy across a pointer grid", () => {
    let solved = 0;
    for (const direction of ["forward", "backward"] as const) {
      for (const corner of ["top", "bottom"] as const) {
        for (let x = -page.width; x <= page.width; x += 100) {
          for (let y = -100; y <= page.height + 100; y += 100) {
            const result = solvePageTurn({
              page,
              direction,
              corner,
              pointer: { x, y },
            });
            if (result.status === "ok") {
              solved += 1;
              expectFiniteFrame(result.frame);
            } else {
              expect([
                "pointer-at-rest",
                "unsolved-intersection",
              ]).toContain(result.reason);
            }
          }
        }
      }
    }
    expect(solved).toBeGreaterThan(100);
  });
});
