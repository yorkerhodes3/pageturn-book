import { describe, expect, it } from "vitest";
import {
  publicationAppearanceVariables,
  publicationPageFanCount,
} from "./appearance.js";

describe("publicationAppearanceVariables", () => {
  it("maps shelf and reader appearance to the shared CSS contract", () => {
    const variables = publicationAppearanceVariables({
      cover: {
        background: "#3d211d",
        foreground: "#f2dfb0",
        accent: "#b9914f",
      },
      binding: {
        material: "leather",
        color: "#301713",
        accent: "#b9914f",
        depth: "thick",
        hubs: 5,
        pageCount: 46,
        shelfLabel: "ETHICAL TECHNOLOGY",
      },
    });

    expect(variables).toEqual({
      "--book-cover-background": "#3d211d",
      "--book-cover-foreground": "#f2dfb0",
      "--book-cover-accent": "#b9914f",
      "--book-binding-color": "#301713",
      "--book-binding-accent": "#b9914f",
      "--book-binding-depth": "1.45rem",
      "--book-board-thickness": "0.36rem",
      "--book-text-block-depth": "0.93rem",
      "--book-page-count": "46",
    });
  });

  it("bounds rendered fan layers while preserving page-count differences", () => {
    const appearance = (pageCount: number) => ({
      cover: {
        background: "#3d211d",
        foreground: "#f2dfb0",
        accent: "#b9914f",
      },
      binding: {
        material: "leather" as const,
        color: "#301713",
        accent: "#b9914f",
        depth: "thick" as const,
        hubs: 5,
        pageCount,
      },
    });

    expect(publicationPageFanCount(appearance(7))).toBe(5);
    expect(publicationPageFanCount(appearance(22))).toBe(8);
    expect(publicationPageFanCount(appearance(46))).toBe(11);
    expect(publicationPageFanCount(appearance(400))).toBe(14);
  });
});
