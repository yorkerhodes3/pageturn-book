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
    width: number;
    opacity: number;
    gradient: "to-left" | "to-right";
  }>;
}>;

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

  return {
    moving: {
      translate: movingTranslate,
      angleRadians: frame.angleRadians,
      clip: frame.movingClip.map((point) => movingClipPoint(frame, point)),
    },
    revealed: {
      translate: revealedTranslate,
      clip: frame.revealedClip.map((point) =>
        revealedClipPoint(frame, point),
      ),
    },
    foldShadow: {
      origin: shadowOrigin,
      angleRadians: frame.shadow.angleRadians + (3 * Math.PI) / 2,
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
