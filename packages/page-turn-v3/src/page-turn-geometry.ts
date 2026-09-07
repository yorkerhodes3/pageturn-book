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
  end: PageTurnPoint;
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

type Bounds = Readonly<{
  left: number;
  top: number;
  width: number;
  height: number;
}>;

type MutablePageTurnRect = {
  topLeft: MutablePoint;
  topRight: MutablePoint;
  bottomLeft: MutablePoint;
  bottomRight: MutablePoint;
};

type MutableIntersections = {
  top: MutablePoint | undefined;
  side: MutablePoint | undefined;
  bottom: MutablePoint | undefined;
};

type MutableCalculationState = {
  pointer: MutablePoint;
  angleRadians: number;
  pageRect: MutablePageTurnRect;
  intersections: MutableIntersections;
};

type MutablePolygon = {
  points: MutablePoint[];
  pool: readonly MutablePoint[];
};

type MutablePageTurnFrame = {
  direction: PageTurnDirection;
  corner: PageTurnCorner;
  page: { width: number; height: number };
  pointer: MutablePoint;
  progress: number;
  movingOrigin: MutablePoint;
  angleRadians: number;
  pageRect: MutablePageTurnRect;
  movingClip: MutablePoint[];
  revealedClip: MutablePoint[];
  underlayPosition: MutablePoint;
  shadow: {
    start: MutablePoint;
    end: MutablePoint;
    angleRadians: number;
    progress: number;
    widthFactor: number;
    opacityFactor: number;
  };
};

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

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function samePoint(first: PageTurnPoint, second: PageTurnPoint): boolean {
  return (
    Math.abs(first.x - second.x) <= EPSILON &&
    Math.abs(first.y - second.y) <= EPSILON
  );
}

function copyPoint(target: MutablePoint, source: PageTurnPoint): void {
  target.x = source.x;
  target.y = source.y;
}

function limitPointToCircle(
  centerX: number,
  centerY: number,
  radius: number,
  point: MutablePoint,
): boolean {
  const currentDistance = Math.hypot(
    point.x - centerX,
    point.y - centerY,
  );
  if (currentDistance <= radius || currentDistance <= EPSILON) {
    return false;
  }

  const scale = radius / currentDistance;
  point.x = centerX + (point.x - centerX) * scale;
  point.y = centerY + (point.y - centerY) * scale;
  return true;
}

function pointInBounds(bounds: Bounds, point: MutablePoint): boolean {
  return (
    point.x >= bounds.left &&
    point.x <= bounds.left + bounds.width &&
    point.y >= bounds.top &&
    point.y <= bounds.top + bounds.height
  );
}

function intersectLines(
  firstStart: PageTurnPoint,
  firstEnd: PageTurnPoint,
  secondStart: PageTurnPoint,
  secondEnd: PageTurnPoint,
  target: MutablePoint,
): boolean {
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
    return false;
  }

  target.x = -((firstC * secondB - secondC * firstB) / determinant);
  target.y = -((firstA * secondC - secondA * firstC) / determinant);
  return Number.isFinite(target.x) && Number.isFinite(target.y);
}

function intersectWithinBounds(
  bounds: Bounds,
  firstStart: PageTurnPoint,
  firstEnd: PageTurnPoint,
  secondStart: PageTurnPoint,
  secondEnd: PageTurnPoint,
  target: MutablePoint,
): boolean {
  return (
    intersectLines(
      firstStart,
      firstEnd,
      secondStart,
      secondEnd,
      target,
    ) && pointInBounds(bounds, target)
  );
}

function createMutablePolygon(capacity: number): MutablePolygon {
  const pool = Array.from({ length: capacity }, () => ({ x: 0, y: 0 }));
  return { points: [...pool], pool };
}

function appendPolygonPoint(
  polygon: MutablePolygon,
  count: number,
  point: PageTurnPoint | undefined,
): number {
  if (point === undefined) {
    return count;
  }
  const previous = polygon.points[count - 1];
  if (previous !== undefined && samePoint(previous, point)) {
    return count;
  }
  const target = polygon.pool[count];
  if (target === undefined) {
    throw new Error("Page-turn polygon capacity exceeded");
  }
  copyPoint(target, point);
  polygon.points[count] = target;
  return count + 1;
}

function finishPolygon(polygon: MutablePolygon, count: number): void {
  const first = polygon.points[0];
  const last = polygon.points[count - 1];
  polygon.points.length =
    count > 1 &&
    first !== undefined &&
    last !== undefined &&
    samePoint(first, last)
      ? count - 1
      : count;
}

class FoldCalculation {
  private angleRadians = 0;
  private readonly constrainedPointer: MutablePoint = { x: 0, y: 0 };
  private readonly pageRect: MutablePageTurnRect = {
    topLeft: { x: 0, y: 0 },
    topRight: { x: 0, y: 0 },
    bottomLeft: { x: 0, y: 0 },
    bottomRight: { x: 0, y: 0 },
  };
  private readonly intersectionPoints = {
    top: { x: 0, y: 0 },
    side: { x: 0, y: 0 },
    bottom: { x: 0, y: 0 },
  };
  private readonly intersections: MutableIntersections = {
    top: undefined,
    side: undefined,
    bottom: undefined,
  };
  private readonly state: MutableCalculationState = {
    pointer: this.constrainedPointer,
    angleRadians: 0,
    pageRect: this.pageRect,
    intersections: this.intersections,
  };
  private readonly bounds: Bounds;
  private readonly topLeft = { x: 0, y: 0 };
  private readonly topRight: MutablePoint;
  private readonly bottomLeft: MutablePoint;
  private readonly bottomRight: MutablePoint;

  constructor(
    private readonly page: PageTurnSize,
    private readonly corner: PageTurnCorner,
  ) {
    this.bounds = {
      left: -INTERSECTION_MARGIN,
      top: -INTERSECTION_MARGIN,
      width: page.width + INTERSECTION_MARGIN * 2,
      height: page.height + INTERSECTION_MARGIN * 2,
    };
    this.topRight = { x: page.width, y: 0 };
    this.bottomLeft = { x: 0, y: page.height };
    this.bottomRight = { x: page.width, y: page.height };
  }

  calculate(pointer: PageTurnPoint): MutableCalculationState | undefined {
    copyPoint(this.constrainedPointer, pointer);
    if (!this.update(this.constrainedPointer)) {
      return undefined;
    }

    const primaryCenterY =
      this.corner === "top" ? 0 : this.page.height;
    if (limitPointToCircle(
      0,
      primaryCenterY,
      this.page.width,
      this.constrainedPointer,
    )) {
      if (!this.update(this.constrainedPointer)) {
        return undefined;
      }
    }

    const checkPoint =
      this.corner === "top"
        ? this.pageRect.bottomRight
        : this.pageRect.topRight;
    const limitSource =
      this.corner === "top"
        ? this.pageRect.topLeft
        : this.pageRect.bottomLeft;

    if (checkPoint.x <= 0) {
      const diagonal = Math.hypot(this.page.width, this.page.height);
      copyPoint(this.constrainedPointer, limitSource);
      limitPointToCircle(
        0,
        this.corner === "top" ? this.page.height : 0,
        diagonal,
        this.constrainedPointer,
      );
      if (!this.update(this.constrainedPointer)) {
        return undefined;
      }
    }

    this.calculateIntersections(this.constrainedPointer);
    this.state.angleRadians = this.angleRadians;
    return this.state;
  }

  private update(pointer: PageTurnPoint): boolean {
    const angle = this.calculateAngle(pointer);
    if (angle === undefined) {
      return false;
    }
    this.angleRadians = angle;
    this.calculatePageRect(pointer, angle);
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
  ): void {
    const cosine = Math.cos(angleRadians);
    const sine = Math.sin(angleRadians);
    const horizontalX = this.page.width * cosine;
    const horizontalY = -this.page.width * sine;
    const verticalX = this.page.height * sine;
    const verticalY = this.page.height * cosine;

    if (this.corner === "top") {
      this.pageRect.topLeft.x = pointer.x;
      this.pageRect.topLeft.y = pointer.y;
      this.pageRect.topRight.x = pointer.x + horizontalX;
      this.pageRect.topRight.y = pointer.y + horizontalY;
      this.pageRect.bottomLeft.x = pointer.x + verticalX;
      this.pageRect.bottomLeft.y = pointer.y + verticalY;
      this.pageRect.bottomRight.x =
        pointer.x + horizontalX + verticalX;
      this.pageRect.bottomRight.y =
        pointer.y + horizontalY + verticalY;
      return;
    }

    this.pageRect.topLeft.x = pointer.x - verticalX;
    this.pageRect.topLeft.y = pointer.y - verticalY;
    this.pageRect.topRight.x = pointer.x + horizontalX - verticalX;
    this.pageRect.topRight.y = pointer.y + horizontalY - verticalY;
    this.pageRect.bottomLeft.x = pointer.x;
    this.pageRect.bottomLeft.y = pointer.y;
    this.pageRect.bottomRight.x = pointer.x + horizontalX;
    this.pageRect.bottomRight.y = pointer.y + horizontalY;
  }

  private calculateIntersections(pointer: PageTurnPoint): void {
    const topStart =
      this.corner === "top" ? pointer : this.pageRect.topLeft;
    const topEnd = this.pageRect.topRight;
    this.intersections.top = intersectWithinBounds(
      this.bounds,
      topStart,
      topEnd,
      this.topLeft,
      this.topRight,
      this.intersectionPoints.top,
    )
      ? this.intersectionPoints.top
      : undefined;

    const sideEnd =
      this.corner === "top"
        ? this.pageRect.bottomLeft
        : this.pageRect.topLeft;
    this.intersections.side = intersectWithinBounds(
      this.bounds,
      pointer,
      sideEnd,
      this.topRight,
      this.bottomRight,
      this.intersectionPoints.side,
    )
      ? this.intersectionPoints.side
      : undefined;

    this.intersections.bottom = intersectWithinBounds(
      this.bounds,
      this.pageRect.bottomLeft,
      this.pageRect.bottomRight,
      this.bottomLeft,
      this.bottomRight,
      this.intersectionPoints.bottom,
    )
      ? this.intersectionPoints.bottom
      : undefined;
  }
}

function fillMovingClip(
  state: MutableCalculationState,
  corner: PageTurnCorner,
  polygon: MutablePolygon,
): void {
  const { top, side, bottom } = state.intersections;
  const clipBottom = side === undefined;
  let count = appendPolygonPoint(polygon, 0, state.pageRect.topLeft);
  count = appendPolygonPoint(polygon, count, top);
  count = appendPolygonPoint(polygon, count, side);
  count = appendPolygonPoint(polygon, count, bottom);
  count = appendPolygonPoint(
    polygon,
    count,
    clipBottom || corner === "bottom"
      ? state.pageRect.bottomLeft
      : undefined,
  );
  finishPolygon(polygon, count);
}

function appendPolygonCoordinates(
  polygon: MutablePolygon,
  count: number,
  x: number,
  y: number,
): number {
  const scratch = polygon.pool.at(-1);
  if (scratch === undefined) {
    throw new Error("Page-turn polygon has no point capacity");
  }
  scratch.x = x;
  scratch.y = y;
  return appendPolygonPoint(polygon, count, scratch);
}

function fillRevealedClip(
  state: MutableCalculationState,
  page: PageTurnSize,
  corner: PageTurnCorner,
  polygon: MutablePolygon,
): void {
  const { top, side, bottom } = state.intersections;
  let count = appendPolygonPoint(polygon, 0, top);

  if (corner === "top") {
    count = appendPolygonCoordinates(polygon, count, page.width, 0);
  } else {
    if (top !== undefined) {
      count = appendPolygonCoordinates(polygon, count, page.width, 0);
    }
    count = appendPolygonCoordinates(
      polygon,
      count,
      page.width,
      page.height,
    );
  }

  if (side !== undefined) {
    count = appendPolygonPoint(polygon, count, side);
  } else if (corner === "top") {
    count = appendPolygonCoordinates(
      polygon,
      count,
      page.width,
      page.height,
    );
  }

  count = appendPolygonPoint(
    polygon,
    count,
    corner === "top" && side !== undefined ? undefined : bottom,
  );
  count = appendPolygonPoint(
    polygon,
    count,
    top,
  );
  finishPolygon(polygon, count);
}

function isAtRest(
  pointer: PageTurnPoint,
  page: PageTurnSize,
  corner: PageTurnCorner,
): boolean {
  return (
    Math.hypot(
      pointer.x - page.width,
      pointer.y - (corner === "top" ? 0 : page.height),
    ) < REST_EPSILON
  );
}

const POINTER_AT_REST_RESULT: PageTurnResult = {
  status: "degenerate",
  reason: "pointer-at-rest",
};
const UNSOLVED_INTERSECTION_RESULT: PageTurnResult = {
  status: "degenerate",
  reason: "unsolved-intersection",
};

function clonePoint(point: PageTurnPoint): PageTurnPoint {
  return { x: point.x, y: point.y };
}

function cloneFrame(frame: PageTurnFrame): PageTurnFrame {
  return {
    direction: frame.direction,
    corner: frame.corner,
    page: { width: frame.page.width, height: frame.page.height },
    pointer: clonePoint(frame.pointer),
    progress: frame.progress,
    movingOrigin: clonePoint(frame.movingOrigin),
    angleRadians: frame.angleRadians,
    pageRect: {
      topLeft: clonePoint(frame.pageRect.topLeft),
      topRight: clonePoint(frame.pageRect.topRight),
      bottomLeft: clonePoint(frame.pageRect.bottomLeft),
      bottomRight: clonePoint(frame.pageRect.bottomRight),
    },
    movingClip: frame.movingClip.map(clonePoint),
    revealedClip: frame.revealedClip.map(clonePoint),
    underlayPosition: clonePoint(frame.underlayPosition),
    shadow: {
      start: clonePoint(frame.shadow.start),
      end: clonePoint(frame.shadow.end),
      angleRadians: frame.shadow.angleRadians,
      progress: frame.shadow.progress,
      widthFactor: frame.shadow.widthFactor,
      opacityFactor: frame.shadow.opacityFactor,
    },
  };
}

function cloneResult(result: PageTurnResult): PageTurnResult {
  return result.status === "ok"
    ? { status: "ok", frame: cloneFrame(result.frame) }
    : { status: "degenerate", reason: result.reason };
}

/**
 * Internal animation hot path. The successful result, frame, nested points, and
 * clip arrays are owned by the solver and overwritten by its next call. Consume
 * them synchronously and never retain them across frames.
 */
export function createPageTurnRuntimeFrameSolver(
  page: PageTurnSize,
  corner: PageTurnCorner,
  options: Readonly<{ includeRevealedClip?: boolean }> = {},
): (direction: PageTurnDirection, pointer: PageTurnPoint) => PageTurnResult {
  assertPositiveFinite(page.width, "page.width");
  assertPositiveFinite(page.height, "page.height");
  const calculation = new FoldCalculation(page, corner);
  const includeRevealedClip = options.includeRevealedClip ?? true;
  const movingPolygon = createMutablePolygon(5);
  const revealedPolygon = createMutablePolygon(6);
  if (!includeRevealedClip) {
    revealedPolygon.points.length = 0;
  }
  const frame: MutablePageTurnFrame = {
    direction: "forward",
    corner,
    page: { width: page.width, height: page.height },
    pointer: { x: 0, y: 0 },
    progress: 0,
    movingOrigin: { x: 0, y: 0 },
    angleRadians: 0,
    pageRect: {
      topLeft: { x: 0, y: 0 },
      topRight: { x: 0, y: 0 },
      bottomLeft: { x: 0, y: 0 },
      bottomRight: { x: 0, y: 0 },
    },
    movingClip: movingPolygon.points,
    revealedClip: revealedPolygon.points,
    underlayPosition: { x: 0, y: 0 },
    shadow: {
      start: { x: 0, y: 0 },
      end: { x: 0, y: 0 },
      angleRadians: 0,
      progress: 0,
      widthFactor: 0,
      opacityFactor: 0,
    },
  };
  const solvedResult: PageTurnResult = { status: "ok", frame };

  return (direction, pointer) => {
    assertFinitePoint(pointer, "pointer");
    if (isAtRest(pointer, page, corner)) {
      return POINTER_AT_REST_RESULT;
    }

    const state = calculation.calculate(pointer);
    if (state === undefined) {
      return UNSOLVED_INTERSECTION_RESULT;
    }

    fillMovingClip(state, corner, movingPolygon);
    if (includeRevealedClip) {
      fillRevealedClip(state, page, corner, revealedPolygon);
    }
    const foldStart =
      corner === "top"
        ? state.intersections.top
        : (state.intersections.side ?? state.intersections.top);
    const foldEnd =
      corner === "top"
        ? (state.intersections.side ?? state.intersections.bottom)
        : state.intersections.bottom;
    if (
      movingPolygon.points.length < 3 ||
      (includeRevealedClip && revealedPolygon.points.length < 3) ||
      foldStart === undefined ||
      foldEnd === undefined ||
      samePoint(foldStart, foldEnd)
    ) {
      return UNSOLVED_INTERSECTION_RESULT;
    }

    const foldDx = foldEnd.x - foldStart.x;
    const foldDy = foldEnd.y - foldStart.y;
    const foldLength = Math.hypot(foldDx, foldDy);
    if (foldLength <= EPSILON) {
      return UNSOLVED_INTERSECTION_RESULT;
    }
    const unsignedShadowAngle = Math.acos(
      clamp(foldDx / foldLength, -1, 1),
    );
    if (!Number.isFinite(unsignedShadowAngle)) {
      return UNSOLVED_INTERSECTION_RESULT;
    }

    const progress = clamp(
      Math.abs((state.pointer.x - page.width) / (2 * page.width)),
      0,
      1,
    );
    const forward = direction === "forward";
    frame.direction = direction;
    copyPoint(frame.pointer, state.pointer);
    frame.progress = progress;
    copyPoint(
      frame.movingOrigin,
      forward ? state.pageRect.topLeft : state.pageRect.topRight,
    );
    frame.angleRadians = forward
      ? -state.angleRadians
      : state.angleRadians;
    copyPoint(frame.pageRect.topLeft, state.pageRect.topLeft);
    copyPoint(frame.pageRect.topRight, state.pageRect.topRight);
    copyPoint(frame.pageRect.bottomLeft, state.pageRect.bottomLeft);
    copyPoint(frame.pageRect.bottomRight, state.pageRect.bottomRight);
    frame.underlayPosition.x = forward ? 0 : page.width;
    frame.underlayPosition.y = 0;
    copyPoint(frame.shadow.start, foldStart);
    copyPoint(frame.shadow.end, foldEnd);
    frame.shadow.angleRadians = forward
      ? unsignedShadowAngle
      : Math.PI - unsignedShadowAngle;
    frame.shadow.progress = progress;
    const foldIntensity = Math.sin(Math.PI * progress);
    frame.shadow.widthFactor = 0.018 + 0.055 * foldIntensity;
    frame.shadow.opacityFactor = 0.1 + 0.28 * foldIntensity;
    return solvedResult;
  };
}

export function solvePageTurn(input: PageTurnInput): PageTurnResult {
  assertPositiveFinite(input.page.width, "page.width");
  assertPositiveFinite(input.page.height, "page.height");
  const solve = createPageTurnRuntimeFrameSolver(
    input.page,
    input.corner,
  );
  return cloneResult(solve(input.direction, input.pointer));
}

export function createPageTurnFrameSolver(
  page: PageTurnSize,
  corner: PageTurnCorner,
  options: Readonly<{ includeRevealedClip?: boolean }> = {},
): (direction: PageTurnDirection, pointer: PageTurnPoint) => PageTurnResult {
  assertPositiveFinite(page.width, "page.width");
  assertPositiveFinite(page.height, "page.height");
  const solve = createPageTurnRuntimeFrameSolver(page, corner, options);
  return (direction, pointer) =>
    cloneResult(solve(direction, pointer));
}
