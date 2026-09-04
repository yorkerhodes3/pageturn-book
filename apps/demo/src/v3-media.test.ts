import { describe, expect, it } from "vitest";
import { publicationMedia } from "./v3-media.js";

describe("V3 publication media", () => {
  it("registers the three pinned Ethical AI figures as pop-outs", () => {
    const media = publicationMedia("what-is-ethical-ai");

    expect(media?.defaultTreatment).toBe("popout");
    expect(media?.figures.map(({ id }) => id)).toEqual([
      "ai-ethics-frameworks",
      "colab-portfolio-maturity",
      "colab-five-pillars",
    ]);
    expect(
      media?.figures.every(
        ({ src, width, height, alt }) =>
          src.startsWith("../media/what-is-ethical-ai/") &&
          width > 0 &&
          height > 0 &&
          alt.length > 40,
      ),
    ).toBe(true);
  });

  it("maps only the explicitly licensed Plurality figures", () => {
    const media = publicationMedia("plurality");

    expect(media?.defaultTreatment).toBe("popout");
    expect(media?.figures).toHaveLength(11);
    expect(
      media?.figures.every(
        ({ src, replaceAnchors }) =>
          src.includes(
            "pluralitybook/plurality/86158859464aee75633acd854c656928121a7fd8/figs/",
          ) && replaceAnchors?.length === 2,
      ),
    ).toBe(true);
  });

  it("leaves publications without reviewed figure assets unconfigured", () => {
    expect(publicationMedia("vango")).toBeUndefined();
  });
});
