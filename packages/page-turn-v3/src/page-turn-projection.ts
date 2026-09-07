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
