import { describe, expect, test } from "vitest";
import { placePageTurnMarginalia } from "./marginalia.js";

describe("placePageTurnMarginalia", () => {
  test("sorts deterministically and maintains separation", () => {
    expect(
      placePageTurnMarginalia(
        [
          { id: "later", requestedTop: 30, height: 20, createdAt: "2026-02-01" },
          { id: "second", requestedTop: 10, height: 20, createdAt: "2026-01-02" },
          { id: "first", requestedTop: 10, height: 20, createdAt: "2026-01-01" },
        ],
        { top: 0, bottom: 100, gap: 5 },
      ),
    ).toEqual([
      { kind: "note", id: "first", top: 10, height: 20 },
      { kind: "note", id: "second", top: 35, height: 20 },
      { kind: "note", id: "later", top: 60, height: 20 },
    ]);
  });

  test("backtracks upward when the final note exceeds the safe area", () => {
    expect(
      placePageTurnMarginalia(
        [
          { id: "one", requestedTop: 70, height: 20, createdAt: "2026-01-01" },
          { id: "two", requestedTop: 80, height: 20, createdAt: "2026-01-02" },
        ],
        { top: 10, bottom: 100, gap: 5 },
      ),
    ).toEqual([
      { kind: "note", id: "one", top: 55, height: 20 },
      { kind: "note", id: "two", top: 80, height: 20 },
    ]);
  });

  test("collapses an overflowing tail into one accessible group", () => {
    const result = placePageTurnMarginalia(
      Array.from({ length: 5 }, (_, index) => ({
        id: `note-${index}`,
        requestedTop: 10,
        height: 30,
        createdAt: `2026-01-0${index + 1}`,
      })),
      { top: 0, bottom: 100, gap: 5, groupHeight: 20 },
    );
    expect(result).toEqual([
      { kind: "note", id: "note-0", top: 10, height: 30 },
      { kind: "note", id: "note-1", top: 45, height: 30 },
      {
        kind: "group",
        id: "group:note-2,note-3,note-4",
        memberIds: ["note-2", "note-3", "note-4"],
        top: 80,
        height: 20,
      },
    ]);
  });

  test("filters invalid geometry and observes the visible-note cap", () => {
    const result = placePageTurnMarginalia(
      [
        { id: "a", requestedTop: 0, height: 10, createdAt: "1" },
        { id: "b", requestedTop: 20, height: 10, createdAt: "2" },
        { id: "bad", requestedTop: Number.NaN, height: 10, createdAt: "3" },
      ],
      { top: 0, bottom: 100, maximumVisibleNotes: 1 },
    );
    expect(result.map(({ kind }) => kind)).toEqual(["note", "group"]);
  });
});
