import { describe, expect, it } from "vitest";
import { publicationAppearanceVariables } from "./appearance.js";

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
        shelfLabel: "ETHICAL TECHNOLOGY",
      },
    });

    expect(variables).toEqual({
      "--book-cover-background": "#3d211d",
      "--book-cover-foreground": "#f2dfb0",
      "--book-cover-accent": "#b9914f",
      "--book-binding-color": "#301713",
      "--book-binding-accent": "#b9914f",
      "--book-binding-depth": "1.05rem",
    });
  });
});

