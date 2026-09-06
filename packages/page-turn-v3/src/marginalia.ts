export type PageTurnMarginaliaPlacementItem = Readonly<{
  id: string;
  requestedTop: number;
  height: number;
  createdAt: string;
}>;

export type PageTurnMarginaliaPlacement =
  | Readonly<{
      kind: "note";
      id: string;
      top: number;
      height: number;
    }>
  | Readonly<{
      kind: "group";
      id: string;
      memberIds: readonly string[];
      top: number;
      height: number;
    }>;

export type PageTurnMarginaliaPlacementOptions = Readonly<{
  top: number;
  bottom: number;
  gap?: number;
  groupHeight?: number;
  maximumVisibleNotes?: number;
}>;

type LayoutEntry = Readonly<{
  kind: "note" | "group";
  id: string;
  memberIds?: readonly string[];
  requestedTop: number;
  height: number;
}>;

function finite(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function sortedItems(
  items: readonly PageTurnMarginaliaPlacementItem[],
): PageTurnMarginaliaPlacementItem[] {
  return items
    .filter(
      ({ id, requestedTop, height, createdAt }) =>
        id !== "" &&
        createdAt !== "" &&
        Number.isFinite(requestedTop) &&
        Number.isFinite(height) &&
        height > 0,
    )
    .sort(
      (first, second) =>
        first.requestedTop - second.requestedTop ||
        first.createdAt.localeCompare(second.createdAt) ||
        first.id.localeCompare(second.id),
    );
}

function layout(
  entries: readonly LayoutEntry[],
  top: number,
  bottom: number,
  gap: number,
): PageTurnMarginaliaPlacement[] | undefined {
  const placed = entries.map((entry, index) => ({
    ...entry,
    top: Math.max(
      top,
      entry.requestedTop,
      index === 0
        ? top
        : (entries
            .slice(0, index)
            .reduce(
              (position, previous) =>
                Math.max(position, previous.requestedTop) + previous.height + gap,
              top,
            )),
    ),
  }));
  for (let index = 1; index < placed.length; index += 1) {
    const previous = placed[index - 1];
    const current = placed[index];
    if (previous && current) {
      current.top = Math.max(
        current.top,
        previous.top + previous.height + gap,
      );
    }
  }
  for (let index = placed.length - 1; index >= 0; index -= 1) {
    const current = placed[index];
    if (!current) {
      continue;
    }
    const next = placed[index + 1];
    current.top = Math.min(
      current.top,
      next ? next.top - gap - current.height : bottom - current.height,
    );
  }
  if ((placed[0]?.top ?? top) < top) {
    return undefined;
  }
  return placed.map((entry) =>
    entry.kind === "group"
      ? {
          kind: "group",
          id: entry.id,
          memberIds: entry.memberIds ?? [],
          top: entry.top,
          height: entry.height,
        }
      : {
          kind: "note",
          id: entry.id,
          top: entry.top,
          height: entry.height,
        },
  );
}

export function placePageTurnMarginalia(
  items: readonly PageTurnMarginaliaPlacementItem[],
  options: PageTurnMarginaliaPlacementOptions,
): PageTurnMarginaliaPlacement[] {
  const top = finite(options.top, 0);
  const bottom = finite(options.bottom, top);
  if (bottom <= top) {
    return [];
  }
  const gap = Math.max(0, finite(options.gap ?? 8, 8));
  const groupHeight = Math.max(1, finite(options.groupHeight ?? 28, 28));
  const maximumVisibleNotes = Math.max(
    0,
    Math.floor(finite(options.maximumVisibleNotes ?? 20, 20)),
  );
  const sorted = sortedItems(items);
  if (sorted.length === 0) {
    return [];
  }

  for (
    let visibleCount = Math.min(sorted.length, maximumVisibleNotes);
    visibleCount >= 0;
    visibleCount -= 1
  ) {
    const grouped = sorted.slice(visibleCount);
    const entries: LayoutEntry[] = sorted
      .slice(0, visibleCount)
      .map((item) => ({ ...item, kind: "note" as const }));
    if (grouped.length > 0) {
      entries.push({
        kind: "group",
        id: `group:${grouped.map(({ id }) => id).join(",")}`,
        memberIds: grouped.map(({ id }) => id),
        requestedTop: grouped[0]?.requestedTop ?? top,
        height: groupHeight,
      });
    }
    const result = layout(entries, top, bottom, gap);
    if (result) {
      return result;
    }
  }
  return [];
}
