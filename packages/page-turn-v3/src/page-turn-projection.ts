import type {
  PageTurnFrame,
  PageTurnPoint,
} from "./page-turn-geometry.js";

export type ProjectedPageTurn = Readonly<{
  moving: Readonly<{
    translate: PageTurnPoint;
    angleRadians: number;
    clip: readonly PageTurnPoint[];
    path: string;
  }>;
  revealed: Readonly<{
    translate: PageTurnPoint;
    clip: readonly PageTurnPoint[];
    path: string;
  }>;
  foldShadow: Readonly<{
    origin: PageTurnPoint;
    angleRadians: number;
    length: number;
    width: number;
    opacity: number;
    gradient: "to-left" | "to-right";
    normalX: number;
    normalY: number;
  }>;
}>;

export type PageTurnProjectionOptions = Readonly<{
  foldCurvature?: number;
  includeClipPoints?: boolean;
  includeRevealedClip?: boolean;
}>;

type MutableProjectedPageTurn = {
  moving: {
    translate: { x: number; y: number };
    angleRadians: number;
    clip: PageTurnPoint[];
    path: string;
  };
  revealed: {
    translate: { x: number; y: number };
    clip: PageTurnPoint[];
    path: string;
  };
  foldShadow: {
    origin: { x: number; y: number };
    angleRadians: number;
    length: number;
    width: number;
    opacity: number;
    gradient: "to-left" | "to-right";
    normalX: number;
    normalY: number;
  };
};

const FOLD_CURVE_SINE = Array.from({ length: 9 }, (_, index) =>
  Math.sin((Math.PI * index) / 8),
);

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function samePoint(first: PageTurnPoint, second: PageTurnPoint): boolean {
  return (
    Math.abs(first.x - second.x) < 0.001 &&
    Math.abs(first.y - second.y) < 0.001
  );
}

function foldCurve(
  frame: PageTurnFrame,
  options: PageTurnProjectionOptions,
): readonly PageTurnPoint[] {
  const { start, end } = frame.shadow;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) {
    return [start, end];
  }
  let normalX = -dy / length;
  let normalY = dx / length;
  if (normalX > 0) {
    normalX *= -1;
    normalY *= -1;
  }
  const bend =
    Math.min(
      frame.page.width *
        (0.012 + 0.034 * clamp(options.foldCurvature ?? 0.72, 0, 1)),
      28,
    ) *
    Math.sin(Math.PI * frame.progress);
  const points: PageTurnPoint[] = [];
  for (let index = 0; index < 9; index += 1) {
    if (index === 0) {
      points.push(start);
      continue;
    }
    if (index === 8) {
      points.push(end);
      continue;
    }
    const t = index / 8;
    const offset = (FOLD_CURVE_SINE[index] ?? 0) * bend;
    points.push({
      x: clamp(
        start.x + dx * t + normalX * offset,
        0,
        frame.page.width,
      ),
      y: clamp(
        start.y + dy * t + normalY * offset,
        0,
        frame.page.height,
      ),
    });
  }
  return points;
}

function foldCurveControls(
  frame: PageTurnFrame,
  options: PageTurnProjectionOptions,
): readonly PageTurnPoint[] {
  const { start, end } = frame.shadow;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) {
    return [start, end];
  }
  let normalX = -dy / length;
  let normalY = dx / length;
  if (normalX > 0) {
    normalX *= -1;
    normalY *= -1;
  }
  const bend =
    Math.min(
      frame.page.width *
        (0.012 + 0.034 * clamp(options.foldCurvature ?? 0.72, 0, 1)),
      28,
    ) * Math.sin(Math.PI * frame.progress);
  return [
    start,
    {
      x: clamp(
        start.x + dx / 2 + normalX * bend * 2,
        0,
        frame.page.width,
      ),
      y: clamp(
        start.y + dy / 2 + normalY * bend * 2,
        0,
        frame.page.height,
      ),
    },
    end,
  ];
}

function curvedPolygon(
  points: readonly PageTurnPoint[],
  curve: readonly PageTurnPoint[],
): readonly PageTurnPoint[] {
  const start = curve[0];
  const end = curve.at(-1);
  if (!start || !end || points.length < 3) {
    return points;
  }
  const result: PageTurnPoint[] = [];
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    const next = points[(index + 1) % points.length];
    if (!point || !next) {
      continue;
    }
    result.push(point);
    if (samePoint(point, start) && samePoint(next, end)) {
      result.push(...curve.slice(1, -1));
    } else if (samePoint(point, end) && samePoint(next, start)) {
      result.push(...curve.slice(1, -1).reverse());
    }
  }
  return result;
}

function pathPoint(point: PageTurnPoint): string {
  return `${point.x.toFixed(1)},${point.y.toFixed(1)}`;
}

function curvedPath(
  points: readonly PageTurnPoint[],
  curve: readonly PageTurnPoint[],
): string {
  const first = points[0];
  const curveStart = curve[0];
  const curveEnd = curve.at(-1);
  if (!first || !curveStart || !curveEnd) {
    return 'path("")';
  }
  let path = `path("M${pathPoint(first)}`;
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    const next = points[(index + 1) % points.length];
    if (!point || !next) {
      continue;
    }
    const forward = samePoint(point, curveStart) && samePoint(next, curveEnd);
    const backward = samePoint(point, curveEnd) && samePoint(next, curveStart);
    if (forward || backward) {
      if (curve.length === 3 && curve[1]) {
        path += `Q${pathPoint(curve[1])} ${pathPoint(next)}`;
        continue;
      }
      const start = forward ? curve[0] : curve.at(-1);
      const end = forward ? curve.at(-1) : curve[0];
      const afterStart = forward ? curve[1] : curve.at(-2);
      const beforeEnd = forward ? curve.at(-2) : curve[1];
      if (start && end && afterStart && beforeEnd) {
        const tangentScale = (curve.length - 1) / 3;
        const controlStart = {
          x: start.x + (afterStart.x - start.x) * tangentScale,
          y: start.y + (afterStart.y - start.y) * tangentScale,
        };
        const controlEnd = {
          x: end.x - (end.x - beforeEnd.x) * tangentScale,
          y: end.y - (end.y - beforeEnd.y) * tangentScale,
        };
        path +=
          `C${pathPoint(controlStart)} ${pathPoint(controlEnd)}` +
          ` ${pathPoint(end)}`;
        continue;
      }
    }
    if (index < points.length - 1) {
      path += `L${pathPoint(next)}`;
    }
  }
  return `${path}Z")`;
}

function rotateForCssProjection(
  point: PageTurnPoint,
  cosine: number,
  sine: number,
): PageTurnPoint {
  return {
    x: point.x * cosine + point.y * sine,
    y: point.y * cosine - point.x * sine,
  };
}

function movingClipPoint(
  frame: PageTurnFrame,
  point: PageTurnPoint,
  cosine: number,
  sine: number,
): PageTurnPoint {
  const relative =
    frame.direction === "forward"
      ? {
          x: point.x - frame.movingOrigin.x,
          y: point.y - frame.movingOrigin.y,
        }
      : {
          x: -point.x + frame.movingOrigin.x,
          y: point.y - frame.movingOrigin.y,
        };
  return rotateForCssProjection(relative, cosine, sine);
}

function revealedClipPoint(
  frame: PageTurnFrame,
  point: PageTurnPoint,
): PageTurnPoint {
  return frame.direction === "forward"
    ? { ...point }
    : { x: frame.page.width - point.x, y: point.y };
}

function toSpreadPoint(
  frame: PageTurnFrame,
  point: PageTurnPoint,
): PageTurnPoint {
  return {
    x:
      frame.direction === "forward"
        ? frame.page.width + point.x
        : frame.page.width - point.x,
    y: point.y,
  };
}

export function projectPageTurn(
  frame: PageTurnFrame,
  options: PageTurnProjectionOptions = {},
): ProjectedPageTurn {
  const movingTranslate = toSpreadPoint(frame, frame.movingOrigin);
  const revealedTranslate = toSpreadPoint(
    frame,
    frame.underlayPosition,
  );
  const shadowOrigin = toSpreadPoint(frame, frame.shadow.start);
  const shadowEnd = toSpreadPoint(frame, frame.shadow.end);
  const shadowDx = shadowEnd.x - shadowOrigin.x;
  const shadowDy = shadowEnd.y - shadowOrigin.y;
  const shadowLength = Math.hypot(shadowDx, shadowDy);
  const includeClipPoints = options.includeClipPoints ?? true;
  const curve = includeClipPoints
    ? foldCurve(frame, options)
    : foldCurveControls(frame, options);
  const movingCosine = Math.cos(frame.angleRadians);
  const movingSine = Math.sin(frame.angleRadians);
  const movingClip = frame.movingClip.map((point) =>
    movingClipPoint(frame, point, movingCosine, movingSine),
  );
  const movingCurve = curve.map((point) =>
    movingClipPoint(frame, point, movingCosine, movingSine),
  );
  const includeRevealedClip = options.includeRevealedClip ?? true;
  const revealedClip = includeRevealedClip
    ? frame.revealedClip.map((point) => revealedClipPoint(frame, point))
    : [];
  const revealedCurve = includeRevealedClip
    ? curve.map((point) => revealedClipPoint(frame, point))
    : [];

  return {
    moving: {
      translate: movingTranslate,
      angleRadians: frame.angleRadians,
      clip: includeClipPoints ? curvedPolygon(movingClip, movingCurve) : [],
      path: curvedPath(movingClip, movingCurve),
    },
    revealed: {
      translate: revealedTranslate,
      clip: includeClipPoints ? curvedPolygon(revealedClip, revealedCurve) : [],
      path: includeRevealedClip ? curvedPath(revealedClip, revealedCurve) : "",
    },
    foldShadow: {
      origin: shadowOrigin,
      angleRadians: Math.atan2(shadowDy, shadowDx) - Math.PI / 2,
      length: shadowLength,
      width: frame.page.width * frame.shadow.widthFactor,
      opacity: frame.shadow.opacityFactor,
      normalX: shadowDy / shadowLength,
      normalY: -shadowDx / shadowLength,
      gradient:
        frame.direction === "forward" ? "to-right" : "to-left",
    },
  };
}

/**
 * Internal animation hot path for the analytic moving-clip projection. The
 * returned object and all nested values are overwritten by the next call.
 * Consume it synchronously and never retain it across frames.
 */
export function createPageTurnRuntimeProjector(
  foldCurvature = 0.72,
): (frame: PageTurnFrame) => ProjectedPageTurn {
  const movingPointPool = Array.from(
    { length: 5 },
    () => ({ x: 0, y: 0 }),
  );
  const movingPoints = [...movingPointPool];
  const movingCurve = Array.from({ length: 3 }, () => ({ x: 0, y: 0 }));
  const emptyMovingClip: PageTurnPoint[] = [];
  const emptyRevealedClip: PageTurnPoint[] = [];
  const projection: MutableProjectedPageTurn = {
    moving: {
      translate: { x: 0, y: 0 },
      angleRadians: 0,
      clip: emptyMovingClip,
      path: "",
    },
    revealed: {
      translate: { x: 0, y: 0 },
      clip: emptyRevealedClip,
      path: "",
    },
    foldShadow: {
      origin: { x: 0, y: 0 },
      angleRadians: 0,
      length: 0,
      width: 0,
      opacity: 0,
      gradient: "to-right",
      normalX: 0,
      normalY: 0,
    },
  };

  const projectMovingPoint = (
    frame: PageTurnFrame,
    source: PageTurnPoint,
    target: { x: number; y: number },
    cosine: number,
    sine: number,
  ): void => {
    const relativeX =
      frame.direction === "forward"
        ? source.x - frame.movingOrigin.x
        : -source.x + frame.movingOrigin.x;
    const relativeY = source.y - frame.movingOrigin.y;
    target.x = relativeX * cosine + relativeY * sine;
    target.y = relativeY * cosine - relativeX * sine;
  };

  return (frame) => {
    const forward = frame.direction === "forward";
    projection.moving.translate.x = forward
      ? frame.page.width + frame.movingOrigin.x
      : frame.page.width - frame.movingOrigin.x;
    projection.moving.translate.y = frame.movingOrigin.y;
    projection.moving.angleRadians = frame.angleRadians;
    projection.revealed.translate.x = forward
      ? frame.page.width + frame.underlayPosition.x
      : frame.page.width - frame.underlayPosition.x;
    projection.revealed.translate.y = frame.underlayPosition.y;

    const cosine = Math.cos(frame.angleRadians);
    const sine = Math.sin(frame.angleRadians);
    movingPoints.length = 0;
    for (let index = 0; index < frame.movingClip.length; index += 1) {
      const source = frame.movingClip[index];
      const target = movingPointPool[index];
      if (source === undefined || target === undefined) {
        throw new Error("Page-turn moving clip exceeds runtime capacity");
      }
      projectMovingPoint(frame, source, target, cosine, sine);
      movingPoints[index] = target;
    }

    const curveStart = movingCurve[0];
    const curveControl = movingCurve[1];
    const curveEnd = movingCurve[2];
    if (
      curveStart === undefined ||
      curveControl === undefined ||
      curveEnd === undefined
    ) {
      throw new Error("Page-turn runtime curve is incomplete");
    }
    const shadowStart = frame.shadow.start;
    const shadowEnd = frame.shadow.end;
    const curveDx = shadowEnd.x - shadowStart.x;
    const curveDy = shadowEnd.y - shadowStart.y;
    const curveLength = Math.hypot(curveDx, curveDy);
    let curveNormalX = curveLength === 0 ? 0 : -curveDy / curveLength;
    let curveNormalY = curveLength === 0 ? 0 : curveDx / curveLength;
    if (curveNormalX > 0) {
      curveNormalX *= -1;
      curveNormalY *= -1;
    }
    const bend =
      Math.min(
        frame.page.width *
          (0.012 + 0.034 * clamp(foldCurvature, 0, 1)),
        28,
      ) * Math.sin(Math.PI * frame.progress);
    projectMovingPoint(
      frame,
      shadowStart,
      curveStart,
      cosine,
      sine,
    );
    curveControl.x = clamp(
      shadowStart.x + curveDx / 2 + curveNormalX * bend * 2,
      0,
      frame.page.width,
    );
    curveControl.y = clamp(
      shadowStart.y + curveDy / 2 + curveNormalY * bend * 2,
      0,
      frame.page.height,
    );
    projectMovingPoint(
      frame,
      curveControl,
      curveControl,
      cosine,
      sine,
    );
    projectMovingPoint(
      frame,
      shadowEnd,
      curveEnd,
      cosine,
      sine,
    );
    projection.moving.path = curvedPath(movingPoints, movingCurve);

    const shadowOriginX = forward
      ? frame.page.width + shadowStart.x
      : frame.page.width - shadowStart.x;
    const shadowEndX = forward
      ? frame.page.width + shadowEnd.x
      : frame.page.width - shadowEnd.x;
    const shadowDx = shadowEndX - shadowOriginX;
    const shadowDy = shadowEnd.y - shadowStart.y;
    const shadowLength = Math.hypot(shadowDx, shadowDy);
    projection.foldShadow.origin.x = shadowOriginX;
    projection.foldShadow.origin.y = shadowStart.y;
    projection.foldShadow.angleRadians =
      Math.atan2(shadowDy, shadowDx) - Math.PI / 2;
    projection.foldShadow.length = shadowLength;
    projection.foldShadow.width =
      frame.page.width * frame.shadow.widthFactor;
    projection.foldShadow.opacity = frame.shadow.opacityFactor;
    projection.foldShadow.normalX = shadowDy / shadowLength;
    projection.foldShadow.normalY = -shadowDx / shadowLength;
    projection.foldShadow.gradient = forward ? "to-right" : "to-left";
    return projection;
  };
}

export function pageTurnPolygon(
  points: readonly PageTurnPoint[],
): string {
  let polygon = "polygon(";
  for (const [index, point] of points.entries()) {
    if (index > 0) {
      polygon += ", ";
    }
    polygon += `${point.x.toFixed(3)}px ${point.y.toFixed(3)}px`;
  }
  return `${polygon})`;
}
