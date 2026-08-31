export type V3MediaTreatment = "off" | "on" | "popout";

export type V3MediaFigure = Readonly<{
  id: string;
  chapterId: string;
  afterAnchor: string;
  src: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
}>;

export type V3PublicationMedia = Readonly<{
  defaultTreatment: V3MediaTreatment;
  figures: readonly V3MediaFigure[];
}>;

const ethicalAiMedia: V3PublicationMedia = {
  defaultTreatment: "popout",
  figures: [
    {
      id: "ai-ethics-frameworks",
      chapterId: "responsible-ai",
      afterAnchor:
        "list-ieee-ethically-aligned-design-the-engineering-pr-41441af64f",
      src: "../media/what-is-ethical-ai/ai-ethics-frameworks.webp",
      width: 1656,
      height: 1418,
      alt: "Circular diagram of ten landmark resources for building an AI ethics framework, including IEEE, EU, Montreal, Asilomar, Partnership on AI, OECD, Toronto, AI Now, FAT/ML, and Berkman Klein resources.",
      caption:
        "Figure 4. Ten landmark resources for building an AI ethics framework.",
    },
    {
      id: "colab-portfolio-maturity",
      chapterId: "colab",
      afterAnchor:
        "p-each-project-is-best-understood-through-three-le-e0fb4bfc09",
      src: "../media/what-is-ethical-ai/colab-portfolio-maturity.webp",
      width: 1778,
      height: 895,
      alt: "Horizontal bar chart showing the July 2026 maturity of ten Ethical Tech CoLab projects, from proposed through built and validated.",
      caption:
        "Figure 1. Maturity of the Ethical Tech CoLab portfolio, July 2026.",
    },
    {
      id: "colab-five-pillars",
      chapterId: "colab",
      afterAnchor:
        "list-ethics-before-algorithms-the-colab-treats-the-cu-6e7ce168d6",
      src: "../media/what-is-ethical-ai/colab-five-pillars.webp",
      width: 1791,
      height: 1008,
      alt: "Diagram of five pillars for legitimate humanitarian AI: humanity and do no harm, data minimization and privacy, real consent or none, transparency and honest uncertainty, and accountability and local governance, resting on international human rights law and humanitarian principles.",
      caption:
        "Figure 4. The five pillars of ethics of the Ethical Tech CoLab.",
    },
  ],
};

export function publicationMedia(
  bookId: string,
): V3PublicationMedia | undefined {
  return bookId === "what-is-ethical-ai" ? ethicalAiMedia : undefined;
}
