import { describe, expect, it } from "vitest";
import {
  PAGE_TURN_APPEARANCE_PRESETS,
  pageTurnAppearanceVariables,
  publicationAppearanceVariables,
  publicationPageFanCount,
  resolvePageTurnAppearance,
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

  it("provides distinct complete presets for appearance testing", () => {
    expect(PAGE_TURN_APPEARANCE_PRESETS.map(({ id }) => id)).toEqual([
      "default",
      "antique-greek",
      "historical-tome",
      "modern-lab",
      "lined-journal",
      "grid-lab",
      "handwritten-notebook",
    ]);

    const antique = resolvePageTurnAppearance(undefined, "antique-greek");
    const modern = resolvePageTurnAppearance(undefined, "modern-lab");
    const grid = resolvePageTurnAppearance(undefined, "grid-lab");
    expect(antique.paper.age).toBeGreaterThan(modern.paper.age);
    expect(antique.geometry.gutterLift).toBeGreaterThan(
      modern.geometry.gutterLift,
    );
    expect(antique.binding.depth).toBe("thick");
    expect(antique.fan.edgeStyle).toBe("marbled");
    expect(modern.binding.depth).toBe("slim");
    expect(grid.paper.pattern).toBe("grid");
  });

  it("maps resolved paper, type, binding, and geometry to V3 variables", () => {
    const appearance = resolvePageTurnAppearance(undefined, "lined-journal");
    const variables = pageTurnAppearanceVariables(appearance);

    expect(variables).toMatchObject({
      "--v3-page-paper": "#fffaf0",
      "--v3-page-ink": "#2d3336",
      "--v3-page-rule-color": "#9db8d8",
      "--v3-page-fan-dark": "#b9ab91",
      "--v3-binding-color": "#4c2c20",
      "--v3-fold-radius": "0.820",
    });
    expect(
      Number.parseFloat(variables["--v3-gutter-radius"] ?? ""),
    ).toBeGreaterThan(0.5);
  });

  it("clamps custom testing controls to safe visual ranges", () => {
    const custom = resolvePageTurnAppearance(undefined, "custom", {
      binding: { pageCount: 4 },
      paper: { age: 2, texture: -1, ruleSpacingRem: 9 },
      typography: { lineHeight: 3, baseScale: 0.2 },
      geometry: {
        gutterLift: 4,
        bottomLift: -1,
        foldRadius: 8,
      },
    });

    expect(custom.binding.pageCount).toBe(16);
    expect(custom.paper).toMatchObject({
      age: 1,
      texture: 0,
      ruleSpacingRem: 3,
    });
    expect(custom.typography).toMatchObject({
      lineHeight: 2,
      baseScale: 0.75,
    });
    expect(custom.geometry).toMatchObject({
      gutterLift: 1,
      bottomLift: 0,
      foldRadius: 1,
    });
  });

  it("derives board thickness from an overridden binding depth", () => {
    const custom = resolvePageTurnAppearance(
      {
        cover: {
          background: "#111111",
          foreground: "#eeeeee",
          accent: "#aaaaaa",
        },
        binding: {
          material: "cloth",
          color: "#222222",
          accent: "#aaaaaa",
          depth: "slim",
          hubs: 0,
        },
      },
      "custom",
      { binding: { depth: "thick" } },
    );

    expect(custom.binding).toMatchObject({
      depth: "thick",
      boardThickness: "thick",
    });
  });
});
