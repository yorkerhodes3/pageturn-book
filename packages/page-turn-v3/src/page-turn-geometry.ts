/*
 * Fold geometry in this file is adapted from StPageFlip 2.0.7.
 * Copyright (c) 2020 Nodlik. Used under the MIT License.
 * See ../THIRD_PARTY_NOTICES.md.
 */

export type PageTurnPoint = Readonly<{
  x: number;
  y: number;
}>;

export type PageTurnSize = Readonly<{
  width: number;
  height: number;
}>;

export type PageTurnDirection = "forward" | "backward";
export type PageTurnCorner = "top" | "bottom";

export type PageTurnRect = Readonly<{
  topLeft: PageTurnPoint;
  topRight: PageTurnPoint;
  bottomLeft: PageTurnPoint;
  bottomRight: PageTurnPoint;
}>;

export type PageTurnShadow = Readonly<{
  start: PageTurnPoint;
  angleRadians: number;
  progress: number;
  widthFactor: number;
  opacityFactor: number;
}>;

export type PageTurnFrame = Readonly<{
  direction: PageTurnDirection;
  corner: PageTurnCorner;
  page: PageTurnSize;
  pointer: PageTurnPoint;
  progress: number;
  movingOrigin: PageTurnPoint;
  angleRadians: number;
  pageRect: PageTurnRect;
  movingClip: readonly PageTurnPoint[];
  revealedClip: readonly PageTurnPoint[];
  underlayPosition: PageTurnPoint;
  shadow: PageTurnShadow;
}>;

export type PageTurnDegenerateReason =
  | "pointer-at-rest"
  | "unsolved-intersection";

export type PageTurnResult =
  | Readonly<{
      status: "ok";
      frame: PageTurnFrame;
    }>
  | Readonly<{
      status: "degenerate";
      reason: PageTurnDegenerateReason;
    }>;

export type PageTurnInput = Readonly<{
  page: PageTurnSize;
  direction: PageTurnDirection;
  corner: PageTurnCorner;
  pointer: PageTurnPoint;
}>;

type MutablePoint = {
  x: number;
  y: number;
};

type Segment = readonly [PageTurnPoint, PageTurnPoint];

type Bounds = Readonly<{
  left: number;
  top: number;
  width: number;
  height: number;
}>;

type Intersections = Readonly<{
  top?: PageTurnPoint;
  side?: PageTurnPoint;
  bottom?: PageTurnPoint;
}>;

type CalculationState = Readonly<{
  pointer: PageTurnPoint;
  angleRadians: number;
  pageRect: PageTurnRect;
  intersections: Intersections;
}>;

const EPSILON = 1e-9;
const REST_EPSILON = 1;
const INTERSECTION_MARGIN = 1;

function assertPositiveFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive finite number`);
  }
}

function assertFinitePoint(point: PageTurnPoint, name: string): void {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new RangeError(`${name} must contain finite x and y coordinates`);
  }
}

function distance(first: PageTurnPoint, second: PageTurnPoint): number {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function samePoint(first: PageTurnPoint, second: PageTurnPoint): boolean {
  return (
    Math.abs(first.x - second.x) <= EPSILON &&
    Math.abs(first.y - second.y) <= EPSILON
  );
}

function rotatePoint(
  point: PageTurnPoint,
  origin: PageTurnPoint,
  angleRadians: number,
): PageTurnPoint {
  return {
    x:
      point.x * Math.cos(angleRadians) +
      point.y * Math.sin(angleRadians) +
      origin.x,
    y:
      point.y * Math.cos(angleRadians) -
      point.x * Math.sin(angleRadians) +
      origin.y,
  };
}

function limitPointToCircle(
  center: PageTurnPoint,
  radius: number,
  point: PageTurnPoint,
): Readonly<{ point: PageTurnPoint; limited: boolean }> {
  const currentDistance = distance(center, point);
  if (currentDistance <= radius || currentDistance <= EPSILON) {
    return { point, limited: false };
  }

  const scale = radius / currentDistance;
  return {
    point: {
      x: center.x + (point.x - center.x) * scale,
      y: center.y + (point.y - center.y) * scale,
    },
    limited: true,
  };
}

function pointInBounds(bounds: Bounds, point: PageTurnPoint): boolean {
  return (
    point.x >= bounds.left &&
    point.x <= bounds.left + bounds.width &&
    point.y >= bounds.top &&
    point.y <= bounds.top + bounds.height
  );
}

function intersectLines(
  first: Segment,
  second: Segment,
): PageTurnPoint | undefined {
  const [firstStart, firstEnd] = first;
  const [secondStart, secondEnd] = second;
  const firstA = firstStart.y - firstEnd.y;
  const secondA = secondStart.y - secondEnd.y;
  const firstB = firstEnd.x - firstStart.x;
  const secondB = secondEnd.x - secondStart.x;
  const firstC =
    firstStart.x * firstEnd.y - firstEnd.x * firstStart.y;
  const secondC =
    secondStart.x * secondEnd.y - secondEnd.x * secondStart.y;
  const determinant = firstA * secondB - secondA * firstB;

  if (Math.abs(determinant) <= EPSILON) {
    return undefined;
  }

  const point = {
    x: -((firstC * secondB - secondC * firstB) / determinant),
    y: -((firstA * secondC - secondA * firstC) / determinant),
  };
  return Number.isFinite(point.x) && Number.isFinite(point.y)
    ? point
    : undefined;
}

function intersectWithinBounds(
  bounds: Bounds,
  first: Segment,
  second: Segment,
): PageTurnPoint | undefined {
  const point = intersectLines(first, second);
  return point !== undefined && pointInBounds(bounds, point)
    ? point
    : undefined;
}

function angleBetween(first: Segment, second: Segment): number | undefined {
  const firstA = first[0].y - first[1].y;
  const secondA = second[0].y - second[1].y;
  const firstB = first[1].x - first[0].x;
  const secondB = second[1].x - second[0].x;
  const denominator =
    Math.hypot(firstA, firstB) * Math.hypot(secondA, secondB);
  if (denominator <= EPSILON) {
    return undefined;
  }

  return Math.acos(
    clamp(
      (firstA * secondA + firstB * secondB) / denominator,
      -1,
      1,
    ),
  );
}

function compactPolygon(
  points: readonly (PageTurnPoint | undefined)[],
): readonly PageTurnPoint[] {
  const result: MutablePoint[] = [];
  for (const point of points) {
    if (point === undefined) {
      continue;
    }
    const previous = result.at(-1);
    if (!previous || !samePoint(previous, point)) {
      result.push({ x: point.x, y: point.y });
    }
  }
  if (
    result.length > 1 &&
    result[0] !== undefined &&
    result.at(-1) !== undefined &&
    samePoint(result[0], result.at(-1) as MutablePoint)
  ) {
    result.pop();
  }
  return result;
}

class FoldCalculation {
  private angleRadians = 0;
  private pageRect: PageTurnRect | undefined;

  constructor(
    private readonly page: PageTurnSize,
    private readonly corner: PageTurnCorner,
  ) {}

  calculate(pointer: PageTurnPoint): CalculationState | undefined {
    let constrainedPointer = { x: pointer.x, y: pointer.y };
    if (!this.update(constrainedPointer)) {
      return undefined;
    }

    const primaryCenter =
      this.corner === "top"
        ? { x: 0, y: 0 }
        : { x: 0, y: this.page.height };
    const oppositeCenter =
      this.corner === "top"
        ? { x: 0, y: this.page.height }
        : { x: 0, y: 0 };

    const primaryLimit = limitPointToCircle(
      primaryCenter,
      this.page.width,
      constrainedPointer,
    );
    if (primaryLimit.limited) {
      constrainedPointer = { ...primaryLimit.point };
      if (!this.update(constrainedPointer)) {
        return undefined;
      }
    }

    const currentRect = this.pageRect;
    if (currentRect === undefined) {
      return undefined;
    }
    const checkPoint =
      this.corner === "top"
        ? currentRect.bottomRight
        : currentRect.topRight;
    const limitSource =
      this.corner === "top" ? currentRect.topLeft : currentRect.bottomLeft;

    if (checkPoint.x <= 0) {
      const diagonal = Math.hypot(this.page.width, this.page.height);
      const oppositeLimit = limitPointToCircle(
        oppositeCenter,
        diagonal,
        limitSource,
      );
      constrainedPointer = { ...oppositeLimit.point };
      if (!this.update(constrainedPointer)) {
        return undefined;
      }
    }

    if (this.pageRect === undefined) {
      return undefined;
    }

    return {
      pointer: constrainedPointer,
      angleRadians: this.angleRadians,
      pageRect: this.pageRect,
      intersections: this.calculateIntersections(
        constrainedPointer,
        this.pageRect,
      ),
    };
  }

  private update(pointer: PageTurnPoint): boolean {
    const angle = this.calculateAngle(pointer);
    if (angle === undefined) {
      return false;
    }
    this.angleRadians = angle;
    this.pageRect = this.calculatePageRect(pointer, angle);
    return true;
  }

  private calculateAngle(pointer: PageTurnPoint): number | undefined {
    const horizontal = this.page.width - pointer.x + 1;
    const vertical =
      this.corner === "bottom"
        ? this.page.height - pointer.y
        : pointer.y;
    const length = Math.hypot(vertical, horizontal);
    if (length <= EPSILON) {
      return undefined;
    }

    let angle = 2 * Math.acos(clamp(horizontal / length, -1, 1));
    if (vertical < 0) {
      angle = -angle;
    }
    if (!Number.isFinite(angle)) {
      return undefined;
    }
    const distanceFromFlat = Math.PI - angle;
    if (distanceFromFlat >= 0 && distanceFromFlat < 0.003) {
      return undefined;
    }
    return this.corner === "bottom" ? -angle : angle;
  }

  private calculatePageRect(
    pointer: PageTurnPoint,
    angleRadians: number,
  ): PageTurnRect {
    const points =
      this.corner === "top"
        ? [
            { x: 0, y: 0 },
            { x: this.page.width, y: 0 },
            { x: 0, y: this.page.height },
            { x: this.page.width, y: this.page.height },
          ]
        : [
            { x: 0, y: -this.page.height },
            { x: this.page.width, y: -this.page.height },
            { x: 0, y: 0 },
            { x: this.page.width, y: 0 },
          ];
    const topLeft = points[0];
    const topRight = points[1];
    const bottomLeft = points[2];
    const bottomRight = points[3];
    if (!topLeft || !topRight || !bottomLeft || !bottomRight) {
      throw new Error("Page rectangle basis is incomplete");
    }
    return {
      topLeft: rotatePoint(topLeft, pointer, angleRadians),
      topRight: rotatePoint(topRight, pointer, angleRadians),
      bottomLeft: rotatePoint(bottomLeft, pointer, angleRadians),
      bottomRight: rotatePoint(bottomRight, pointer, angleRadians),
    };
  }

  private calculateIntersections(
    pointer: PageTurnPoint,
    pageRect: PageTurnRect,
  ): Intersections {
    const bounds: Bounds = {
      left: -INTERSECTION_MARGIN,
      top: -INTERSECTION_MARGIN,
      width: this.page.width + INTERSECTION_MARGIN * 2,
      height: this.page.height + INTERSECTION_MARGIN * 2,
    };
    const topEdge: Segment = [
      { x: 0, y: 0 },
      { x: this.page.width, y: 0 },
    ];
    const sideEdge: Segment = [
      { x: this.page.width, y: 0 },
      { x: this.page.width, y: this.page.height },
    ];
    const bottomEdge: Segment = [
      { x: 0, y: this.page.height },
      { x: this.page.width, y: this.page.height },
    ];

    const top =
      this.corner === "top"
        ? intersectWithinBounds(bounds, [pointer, pageRect.topRight], topEdge)
        : intersectWithinBounds(
            bounds,
            [pageRect.topLeft, pageRect.topRight],
            topEdge,
          );
    const side =
      this.corner === "top"
        ? intersectWithinBounds(
            bounds,
            [pointer, pageRect.bottomLeft],
            sideEdge,
          )
        : intersectWithinBounds(
            bounds,
            [pointer, pageRect.topLeft],
            sideEdge,
          );
    const bottom = intersectWithinBounds(
      bounds,
      [pageRect.bottomLeft, pageRect.bottomRight],
      bottomEdge,
    );

    return {
      ...(top === undefined ? {} : { top }),
      ...(side === undefined ? {} : { side }),
      ...(bottom === undefined ? {} : { bottom }),
    };
  }
}

function movingClip(
  state: CalculationState,
  corner: PageTurnCorner,
): readonly PageTurnPoint[] {
  const { top, side, bottom } = state.intersections;
  const clipBottom = side === undefined;
  return compactPolygon([
    state.pageRect.topLeft,
    top,
    side,
    bottom,
    clipBottom || corner === "bottom"
      ? state.pageRect.bottomLeft
      : undefined,
  ]);
}

function revealedClip(
  state: CalculationState,
  page: PageTurnSize,
  corner: PageTurnCorner,
): readonly PageTurnPoint[] {
  const { top, side, bottom } = state.intersections;
  const points: Array<PageTurnPoint | undefined> = [top];

  if (corner === "top") {
    points.push({ x: page.width, y: 0 });
  } else {
    if (top !== undefined) {
      points.push({ x: page.width, y: 0 });
    }
    points.push({ x: page.width, y: page.height });
  }

  if (side !== undefined) {
    points.push(side);
  } else if (corner === "top") {
    points.push({ x: page.width, y: page.height });
  }

  points.push(bottom, top);
  return compactPolygon(points);
}

function shadowSegment(
  intersections: Intersections,
  corner: PageTurnCorner,
): Segment | undefined {
  const start =
    corner === "top"
      ? intersections.top
      : (intersections.side ?? intersections.top);
  const end =
    corner === "top"
      ? (intersections.side ?? intersections.bottom)
      : intersections.bottom;
  return start !== undefined && end !== undefined && !samePoint(start, end)
    ? [start, end]
    : undefined;
}

function isAtRest(
  pointer: PageTurnPoint,
  page: PageTurnSize,
  corner: PageTurnCorner,
): boolean {
  const restingCorner = {
    x: page.width,
    y: corner === "top" ? 0 : page.height,
  };
  return distance(pointer, restingCorner) < REST_EPSILON;
}

export function solvePageTurn(input: PageTurnInput): PageTurnResult {
  assertPositiveFinite(input.page.width, "page.width");
  assertPositiveFinite(input.page.height, "page.height");
  assertFinitePoint(input.pointer, "pointer");

  if (isAtRest(input.pointer, input.page, input.corner)) {
    return { status: "degenerate", reason: "pointer-at-rest" };
  }

  const state = new FoldCalculation(input.page, input.corner).calculate(
    input.pointer,
  );
  if (state === undefined) {
    return { status: "degenerate", reason: "unsolved-intersection" };
  }

  const moving = movingClip(state, input.corner);
  const revealed = revealedClip(state, input.page, input.corner);
  const foldSegment = shadowSegment(state.intersections, input.corner);
  if (moving.length < 3 || revealed.length < 3 || foldSegment === undefined) {
    return { status: "degenerate", reason: "unsolved-intersection" };
  }

  const unsignedShadowAngle = angleBetween(foldSegment, [
    { x: 0, y: 0 },
    { x: input.page.width, y: 0 },
  ]);
  if (unsignedShadowAngle === undefined) {
    return { status: "degenerate", reason: "unsolved-intersection" };
  }

  const progress = clamp(
    Math.abs(
      (state.pointer.x - input.page.width) / (2 * input.page.width),
    ),
    0,
    1,
  );
  const forward = input.direction === "forward";

  return {
    status: "ok",
    frame: {
      direction: input.direction,
      corner: input.corner,
      page: { ...input.page },
      pointer: state.pointer,
      progress,
      movingOrigin: forward
        ? state.pageRect.topLeft
        : state.pageRect.topRight,
      angleRadians: forward
        ? -state.angleRadians
        : state.angleRadians,
      pageRect: state.pageRect,
      movingClip: moving,
      revealedClip: revealed,
      underlayPosition: forward
        ? { x: 0, y: 0 }
        : { x: input.page.width, y: 0 },
      shadow: {
        start: foldSegment[0],
        angleRadians: forward
          ? unsignedShadowAngle
          : Math.PI - unsignedShadowAngle,
        progress,
        widthFactor: 0.75 * progress,
        opacityFactor: 1 - progress,
      },
    },
  };
}
