import { describe, expect, it } from "vitest";
import { bookshelfStackLayout } from "./bookshelf.js";

describe("bookshelfStackLayout", () => {
  it("sizes a shelf row around cumulative binding widths", () => {
    const layout = bookshelfStackLayout([1200, 1200, 1200, 1200]);

    expect(layout.bottomsRem).toEqual([0.45, 4.43, 8.41, 12.39]);
    expect(layout.rowHeightRem).toBeCloseTo(17.77, 2);
    expect(layout.rowHeightRem).toBeGreaterThan(
      (layout.bottomsRem.at(-1) ?? 0) + 3.8,
    );
  });

  it("retains the standard row height for compact stacks", () => {
    expect(bookshelfStackLayout([18, 19, 24]).rowHeightRem).toBe(14.8);
  });
});
