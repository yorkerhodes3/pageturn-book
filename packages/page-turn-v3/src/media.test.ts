import { describe, expect, it } from "vitest";
import type {
  PublicationMedia,
  PublicationMediaFigure,
  PublicationMediaStyle,
} from "@ethical-tech/book-publication-model";
import {
  defaultPageTurnBookMediaStyle,
  normalizePageTurnBookMediaDisplay,
  resolvePageTurnBookMediaUrl,
  resolvePageTurnBookMediaStyle,
  type PageTurnBookMediaFigure,
  type PageTurnBookMedia,
  type PageTurnBookMediaStyle,
} from "./media.js";

type Assert<T extends true> = T;
type SharedFigureContract = Assert<
  PublicationMediaFigure extends PageTurnBookMediaFigure ? true : false
>;
type SharedMediaContract = Assert<
  PublicationMedia extends PageTurnBookMedia ? true : false
>;
type SharedStyleContract = Assert<
  PublicationMediaStyle extends PageTurnBookMediaStyle
    ? PageTurnBookMediaStyle extends PublicationMediaStyle
      ? true
      : false
    : false
>;
const sharedContracts: [
  SharedFigureContract,
  SharedMediaContract,
  SharedStyleContract,
] = [true, true, true];

const transformablePortrait: PageTurnBookMediaFigure = {
  id: "portrait",
  chapterId: "one",
  afterAnchor: "p-one",
  src: "portrait.webp",
  width: 800,
  height: 1000,
  alt: "A portrait",
  caption: "Portrait",
  visualKind: "portrait",
  colorSemantics: "decorative",
  transformPermitted: true,
  exportPermitted: false,
  rights: {
    license: "CC BY-SA 4.0",
    attribution: "Example Person",
  },
  source: "Example archive",
  provenance: "Reviewed record",
  reviewedAt: "2026-09-06",
};

describe("PageTurn media policy", () => {
  it("stays assignable to the shared publication media schema", () => {
    expect(sharedContracts).toEqual([true, true, true]);
  });
  it("normalizes legacy display values without breaking modern values", () => {
    expect(normalizePageTurnBookMediaDisplay("off")).toBe("off");
    expect(normalizePageTurnBookMediaDisplay("on")).toBe("on-page");
    expect(normalizePageTurnBookMediaDisplay("popout")).toBe("pop-out");
    expect(normalizePageTurnBookMediaDisplay("on-page")).toBe("on-page");
    expect(normalizePageTurnBookMediaDisplay("pop-out")).toBe("pop-out");
  });

  it("fails closed without explicit transform rights and complete rights", () => {
    expect(
      resolvePageTurnBookMediaStyle(
        { ...transformablePortrait, transformPermitted: false },
        "duotone",
        true,
      ),
    ).toBe("original");
    const { rights: _rights, ...withoutRights } = transformablePortrait;
    expect(
      resolvePageTurnBookMediaStyle(withoutRights, "monochrome", true),
    ).toBe("original");
    expect(
      resolvePageTurnBookMediaStyle(
        { ...transformablePortrait, provenance: "" },
        "monochrome",
        true,
      ),
    ).toBe("original");
  });

  it("requires a user choice to transform color-essential figures", () => {
    const essential = {
      ...transformablePortrait,
      visualKind: "diagram" as const,
      colorSemantics: "essential" as const,
      style: "duotone" as const,
    };
    expect(resolvePageTurnBookMediaStyle(essential, "duotone")).toBe(
      "original",
    );
    expect(resolvePageTurnBookMediaStyle(essential, "duotone", true)).toBe(
      "duotone",
    );
    expect(
      defaultPageTurnBookMediaStyle(essential, {
        defaultDisplay: "on-page",
        defaultStyle: "book-toned",
        figures: [essential],
      }),
    ).toBe("original");
  });

  it("allows configured photo defaults only when rights permit transforms", () => {
    expect(
      defaultPageTurnBookMediaStyle(transformablePortrait, {
        defaultDisplay: "on-page",
        defaultStyle: "book-toned",
        figures: [transformablePortrait],
      }),
    ).toBe("book-toned");
  });

  it("resolves host and manifest media against their explicit captured bases", () => {
    const hostBase = new URL("https://host.example/sdk/");
    const manifestBase = new URL(
      "https://cdn.example/book/demo/2026-09/manifest.json",
    );

    expect(
      resolvePageTurnBookMediaUrl(
        "../media/figure.webp",
        "host",
        hostBase,
        manifestBase,
      ),
    ).toBe("https://host.example/media/figure.webp");
    expect(
      resolvePageTurnBookMediaUrl(
        "media/figure.webp",
        "manifest",
        hostBase,
        manifestBase,
      ),
    ).toBe(
      "https://cdn.example/book/demo/2026-09/media/figure.webp",
    );
  });
});
