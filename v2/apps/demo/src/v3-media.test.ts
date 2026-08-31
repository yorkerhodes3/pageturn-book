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

  it("leaves publications without pinned figure assets unconfigured", () => {
    expect(publicationMedia("plurality")).toBeUndefined();
  });
});
