export type PageTurnRect = Readonly<{
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}>;

export type PageTurnSelectionActionPlacement =
  | Readonly<{ mode: "adjacent" | "dock"; left: number; top: number }>
  | Readonly<{ mode: "hidden" }>;

export type PageTurnSelectionActionPlacementInput = Readonly<{
  selectionRects: readonly PageTurnRect[];
  bounds: PageTurnRect;
  viewport: PageTurnRect;
  toolbarSize: Readonly<{ width: number; height: number }>;
  exclusions?: readonly PageTurnRect[];
  touch?: boolean;
  gap?: number;
  safeAreaBottom?: number;
}>;

function rect(
  left: number,
  top: number,
  width: number,
  height: number,
): PageTurnRect {
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
  };
}

function intersects(first: PageTurnRect, second: PageTurnRect): boolean {
  return (
    first.left < second.right &&
    first.right > second.left &&
    first.top < second.bottom &&
    first.bottom > second.top
  );
}

function expand(value: PageTurnRect, amount: number): PageTurnRect {
  return rect(
    value.left - amount,
    value.top - amount,
    value.width + amount * 2,
    value.height + amount * 2,
  );
}

function intersection(
  first: PageTurnRect,
  second: PageTurnRect,
): PageTurnRect | undefined {
  const left = Math.max(first.left, second.left);
  const top = Math.max(first.top, second.top);
  const right = Math.min(first.right, second.right);
  const bottom = Math.min(first.bottom, second.bottom);
  return right > left && bottom > top
    ? rect(left, top, right - left, bottom - top)
    : undefined;
}

export function pageTurnSelectionRectUnion(
  rects: readonly PageTurnRect[],
): PageTurnRect | undefined {
  const usable = rects.filter(
    ({ left, top, right, bottom, width, height }) =>
      [left, top, right, bottom, width, height].every(Number.isFinite) &&
      width > 0 &&
      height > 0,
  );
  if (usable.length === 0) {
    return undefined;
  }
  const left = Math.min(...usable.map((value) => value.left));
  const top = Math.min(...usable.map((value) => value.top));
  const right = Math.max(...usable.map((value) => value.right));
  const bottom = Math.max(...usable.map((value) => value.bottom));
  return rect(left, top, right - left, bottom - top);
}

export function placePageTurnSelectionActions(
  input: PageTurnSelectionActionPlacementInput,
): PageTurnSelectionActionPlacement {
  const selection = pageTurnSelectionRectUnion(input.selectionRects);
  const available = intersection(input.bounds, input.viewport);
  if (!selection || !available) {
    return { mode: "hidden" };
  }
  const width = Math.min(input.toolbarSize.width, available.width);
  const height = input.toolbarSize.height;
  if (width <= 0 || height <= 0 || height > available.height) {
    return { mode: "hidden" };
  }
  const gap = input.gap ?? 10;
  const selectionCollision = expand(selection, input.touch ? 18 : 2);
  const exclusions = input.exclusions ?? [];
  const left = Math.min(
    available.right - width,
    Math.max(available.left, selection.left + (selection.width - width) / 2),
  );
  const candidates = [
    rect(left, selection.top - gap - height, width, height),
    rect(left, selection.bottom + gap, width, height),
  ];
  const clear = (candidate: PageTurnRect) =>
    candidate.left >= available.left &&
    candidate.right <= available.right &&
    candidate.top >= available.top &&
    candidate.bottom <= available.bottom &&
    !intersects(candidate, selectionCollision) &&
    !exclusions.some((excluded) => intersects(candidate, excluded));
  const adjacent = candidates.find(clear);
  if (adjacent) {
    return { mode: "adjacent", left: adjacent.left, top: adjacent.top };
  }

  const dock = rect(
    available.left + (available.width - width) / 2,
    available.bottom - (input.safeAreaBottom ?? 12) - height,
    width,
    height,
  );
  return clear(dock)
    ? { mode: "dock", left: dock.left, top: dock.top }
    : { mode: "hidden" };
}
