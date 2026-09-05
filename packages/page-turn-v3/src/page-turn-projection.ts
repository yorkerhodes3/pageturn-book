import type {
  PageTurnFrame,
  PageTurnPoint,
} from "./page-turn-geometry.js";

export type ProjectedPageTurn = Readonly<{
  moving: Readonly<{
    translate: PageTurnPoint;
    angleRadians: number;
    clip: readonly PageTurnPoint[];
  }>;
  revealed: Readonly<{
    translate: PageTurnPoint;
    clip: readonly PageTurnPoint[];
  }>;
  foldShadow: Readonly<{
    origin: PageTurnPoint;
    angleRadians: number;
    length: number;
    width: number;
    opacity: number;
    gradient: "to-left" | "to-right";
  }>;
}>;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function samePoint(first: PageTurnPoint, second: PageTurnPoint): boolean {
  return (
    Math.abs(first.x - second.x) < 0.001 &&
    Math.abs(first.y - second.y) < 0.001
  );
}

function foldCurve(frame: PageTurnFrame): readonly PageTurnPoint[] {
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
    Math.min(frame.page.width * 0.03, 18) *
    Math.sin(Math.PI * frame.progress);
  return Array.from({ length: 9 }, (_, index) => {
    if (index === 0) {
      return start;
    }
    if (index === 8) {
      return end;
    }
    const t = index / 8;
    const offset = Math.sin(Math.PI * t) * bend;
    return {
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
    };
  });
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

function rotateForCssProjection(
  point: PageTurnPoint,
  angleRadians: number,
): PageTurnPoint {
  return {
    x:
      point.x * Math.cos(angleRadians) +
      point.y * Math.sin(angleRadians),
    y:
      point.y * Math.cos(angleRadians) -
      point.x * Math.sin(angleRadians),
  };
}

function movingClipPoint(
  frame: PageTurnFrame,
  point: PageTurnPoint,
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
  return rotateForCssProjection(relative, frame.angleRadians);
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

export function projectPageTurn(frame: PageTurnFrame): ProjectedPageTurn {
  const movingTranslate = toSpreadPoint(frame, frame.movingOrigin);
  const revealedTranslate = toSpreadPoint(
    frame,
    frame.underlayPosition,
  );
  const shadowOrigin = toSpreadPoint(frame, frame.shadow.start);
  const shadowEnd = toSpreadPoint(frame, frame.shadow.end);
  const shadowDx = shadowEnd.x - shadowOrigin.x;
  const shadowDy = shadowEnd.y - shadowOrigin.y;
  const curve = foldCurve(frame);
  const movingClip = frame.movingClip.map((point) =>
    movingClipPoint(frame, point),
  );
  const movingCurve = curve.map((point) => movingClipPoint(frame, point));
  const revealedClip = frame.revealedClip.map((point) =>
    revealedClipPoint(frame, point),
  );
  const revealedCurve = curve.map((point) =>
    revealedClipPoint(frame, point),
  );

  return {
    moving: {
      translate: movingTranslate,
      angleRadians: frame.angleRadians,
      clip: curvedPolygon(movingClip, movingCurve),
    },
    revealed: {
      translate: revealedTranslate,
      clip: curvedPolygon(revealedClip, revealedCurve),
    },
    foldShadow: {
      origin: shadowOrigin,
      angleRadians: Math.atan2(shadowDy, shadowDx) - Math.PI / 2,
      length: Math.hypot(shadowDx, shadowDy),
      width: frame.page.width * frame.shadow.widthFactor,
      opacity: frame.shadow.opacityFactor,
      gradient:
        frame.direction === "forward" ? "to-right" : "to-left",
    },
  };
}

export function pageTurnPolygon(
  points: readonly PageTurnPoint[],
): string {
  return `polygon(${points
    .map((point) => `${point.x.toFixed(3)}px ${point.y.toFixed(3)}px`)
    .join(", ")})`;
}
