import type {
  PageTurnAppearanceInput,
  PageTurnAppearancePresetId,
  PageTurnBindingAppearance,
  PageTurnCoverAppearance,
  PageTurnPublicationAppearance,
  PageTurnResolvedAppearance,
} from "./publication-types.js";

export const DEFAULT_COVER_APPEARANCE: PageTurnCoverAppearance = {
  background: "#3d211d",
  foreground: "#f2dfb0",
  accent: "#b9914f",
};

export const DEFAULT_BINDING_APPEARANCE: Required<PageTurnBindingAppearance> = {
  material: "leather",
  color: "#301713",
  accent: "#b9914f",
  depth: "standard",
  hubs: 4,
  pageCount: 64,
  shelfLabel: "PAGETURN",
  boardThickness: "standard",
  spineStyle: "raised-hubs",
};

export const DEFAULT_PAGE_TURN_APPEARANCE: PageTurnResolvedAppearance = {
  preset: "default",
  cover: DEFAULT_COVER_APPEARANCE,
  binding: DEFAULT_BINDING_APPEARANCE,
  paper: {
    color: "#fffdf8",
    highlight: "#f4ecdf",
    edgeColor: "#d8cbb6",
    inkColor: "#29251f",
    age: 0.08,
    texture: 0.008,
    pattern: "plain",
    ruleColor: "#9db8d8",
    ruleSpacingRem: 1.5,
  },
  fan: {
    edgeStyle: "plain",
    stripeDark: "#b9ab91",
    stripeLight: "#f2eadc",
    stripeMid: "#d8cbb6",
  },
  typography: {
    bodyFamily: 'Georgia, "Times New Roman", serif',
    headingFamily: 'Georgia, "Times New Roman", serif',
    uiFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    lineHeight: 1.5,
    baseScale: 1,
    dropCap: true,
  },
  geometry: {
    gutterLift: 0.72,
    bottomLift: 0.5,
    foreEdgeLift: 0.42,
    cornerRoundness: 0.48,
    foldRadius: 0.82,
    foldShadow: 0.5,
    boardOverhang: 0.56,
  },
};

export type PageTurnAppearancePreset = Readonly<{
  id: Exclude<PageTurnAppearancePresetId, "custom">;
  label: string;
  description: string;
  appearance: PageTurnAppearanceInput;
}>;

export const PAGE_TURN_APPEARANCE_PRESETS: readonly PageTurnAppearancePreset[] = [
  {
    id: "default",
    label: "PageTurn default",
    description: "Balanced contemporary hardback with warm white paper.",
    appearance: {},
  },
  {
    id: "antique-greek",
    label: "Antique Greek volume",
    description: "Warm aged parchment, worn leather, and classical typography.",
    appearance: {
      cover: {
        background: "#56311d",
        foreground: "#ead9af",
        accent: "#b88942",
      },
      binding: {
        material: "leather",
        color: "#472717",
        accent: "#b88942",
        depth: "thick",
        boardThickness: "thick",
        spineStyle: "raised-hubs",
      },
      paper: {
        color: "#ead9af",
        highlight: "#f4e8ca",
        edgeColor: "#9f7040",
        inkColor: "#34281b",
        age: 0.82,
        texture: 0.16,
      },
      fan: {
        edgeStyle: "marbled",
        stripeDark: "#6f4729",
        stripeLight: "#d3ad65",
        stripeMid: "#98683d",
      },
      typography: {
        bodyFamily: 'Palatino Linotype, Book Antiqua, Georgia, serif',
        headingFamily: 'Palatino Linotype, Book Antiqua, Georgia, serif',
        lineHeight: 1.56,
        baseScale: 1.02,
      },
      geometry: {
        gutterLift: 0.82,
        bottomLift: 0.62,
        foreEdgeLift: 0.64,
        cornerRoundness: 0.74,
        foldRadius: 0.84,
        foldShadow: 0.74,
        boardOverhang: 0.76,
      },
    },
  },
  {
    id: "historical-tome",
    label: "Thick historical tome",
    description: "A large page block, deep binding, and pronounced gutter rise.",
    appearance: {
      cover: {
        background: "#2e1c15",
        foreground: "#eadab9",
        accent: "#a77d42",
      },
      binding: {
        material: "leather",
        color: "#25140f",
        accent: "#a77d42",
        depth: "thick",
        hubs: 6,
        pageCount: 900,
        boardThickness: "thick",
        spineStyle: "raised-hubs",
      },
      paper: {
        color: "#f0e2c2",
        highlight: "#f7edd5",
        edgeColor: "#8a6035",
        inkColor: "#2f281e",
        age: 0.64,
        texture: 0.12,
      },
      fan: {
        edgeStyle: "gold",
        stripeDark: "#8d6427",
        stripeLight: "#e0bd67",
        stripeMid: "#b98a35",
      },
      geometry: {
        gutterLift: 0.92,
        bottomLift: 0.78,
        foreEdgeLift: 0.78,
        cornerRoundness: 0.68,
        foldRadius: 0.88,
        foldShadow: 0.82,
        boardOverhang: 0.86,
      },
    },
  },
  {
    id: "modern-lab",
    label: "Thin modern lab book",
    description: "Crisp white stock, flat binding, and clean technical type.",
    appearance: {
      cover: {
        background: "#173944",
        foreground: "#f1f7f5",
        accent: "#74c8bd",
      },
      binding: {
        material: "cloth",
        color: "#14313a",
        accent: "#74c8bd",
        depth: "slim",
        hubs: 0,
        pageCount: 48,
        boardThickness: "slim",
        spineStyle: "flat",
      },
      paper: {
        color: "#ffffff",
        highlight: "#f8fbfb",
        edgeColor: "#d8e0df",
        inkColor: "#172126",
        age: 0,
        texture: 0.01,
      },
      typography: {
        bodyFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        headingFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        lineHeight: 1.48,
        baseScale: 0.96,
        dropCap: false,
      },
      geometry: {
        gutterLift: 0.32,
        bottomLift: 0.16,
        foreEdgeLift: 0.16,
        cornerRoundness: 0.2,
        foldRadius: 0.58,
        foldShadow: 0.38,
        boardOverhang: 0.28,
      },
    },
  },
  {
    id: "lined-journal",
    label: "Lined journal",
    description: "Warm journal stock with horizontal writing guides.",
    appearance: {
      cover: {
        background: "#5a3525",
        foreground: "#f3e7d3",
        accent: "#b78958",
      },
      binding: {
        material: "leather",
        color: "#4c2c20",
        accent: "#b78958",
        depth: "standard",
        spineStyle: "flat",
      },
      paper: {
        color: "#fffaf0",
        highlight: "#fffdf7",
        edgeColor: "#d9c9ae",
        inkColor: "#2d3336",
        pattern: "lined",
        ruleColor: "#9db8d8",
        ruleSpacingRem: 1.55,
        age: 0.14,
        texture: 0.04,
      },
      geometry: {
        gutterLift: 0.64,
        bottomLift: 0.42,
        foreEdgeLift: 0.36,
        cornerRoundness: 0.5,
      },
    },
  },
  {
    id: "grid-lab",
    label: "Grid lab notebook",
    description: "Cool white graph paper with a technical laboratory hand.",
    appearance: {
      cover: {
        background: "#263b37",
        foreground: "#ecf4f1",
        accent: "#8fb8ae",
      },
      binding: {
        material: "cloth",
        color: "#1f322f",
        accent: "#8fb8ae",
        depth: "slim",
        hubs: 0,
        boardThickness: "slim",
        spineStyle: "flat",
      },
      paper: {
        color: "#fbfefd",
        highlight: "#ffffff",
        edgeColor: "#cdd8d6",
        inkColor: "#182322",
        pattern: "grid",
        ruleColor: "#b8d0cc",
        ruleSpacingRem: 1.2,
        age: 0,
        texture: 0.015,
      },
      typography: {
        bodyFamily: 'IBM Plex Mono, Consolas, "Courier New", monospace',
        headingFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        lineHeight: 1.5,
        baseScale: 0.91,
        dropCap: false,
      },
      geometry: {
        gutterLift: 0.4,
        bottomLift: 0.22,
        foreEdgeLift: 0.2,
        cornerRoundness: 0.22,
        foldRadius: 0.62,
        foldShadow: 0.4,
        boardOverhang: 0.3,
      },
    },
  },
  {
    id: "handwritten-notebook",
    label: "Handwritten notebook",
    description: "Ruled paper with an informal handwritten type treatment.",
    appearance: {
      cover: {
        background: "#33455a",
        foreground: "#f4f0e7",
        accent: "#b7c4d3",
      },
      binding: {
        material: "paper",
        color: "#2b3b4d",
        accent: "#b7c4d3",
        depth: "slim",
        hubs: 0,
        boardThickness: "slim",
        spineStyle: "exposed-stitch",
      },
      paper: {
        color: "#fffaf1",
        highlight: "#fffdf8",
        edgeColor: "#d7c8ad",
        inkColor: "#273445",
        pattern: "lined",
        ruleColor: "#a8bdd2",
        ruleSpacingRem: 1.65,
        age: 0.08,
        texture: 0.035,
      },
      typography: {
        bodyFamily: '"Segoe Print", "Bradley Hand", cursive',
        headingFamily: '"Segoe Print", "Bradley Hand", cursive',
        lineHeight: 1.62,
        baseScale: 1.06,
        dropCap: false,
      },
      geometry: {
        gutterLift: 0.58,
        bottomLift: 0.38,
        foreEdgeLift: 0.3,
        cornerRoundness: 0.46,
        foldRadius: 0.7,
        foldShadow: 0.44,
        boardOverhang: 0.24,
      },
    },
  },
];

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function mergeAppearance(
  base: PageTurnResolvedAppearance,
  input: PageTurnAppearanceInput | undefined,
): PageTurnResolvedAppearance {
  if (!input) {
    return base;
  }
  return {
    preset: input.preset ?? base.preset,
    cover: { ...base.cover, ...input.cover },
    binding: { ...base.binding, ...input.binding },
    paper: { ...base.paper, ...input.paper },
    fan: { ...base.fan, ...input.fan },
    typography: { ...base.typography, ...input.typography },
    geometry: { ...base.geometry, ...input.geometry },
  };
}

function presetAppearance(
  presetId: PageTurnAppearancePresetId,
): PageTurnAppearanceInput | undefined {
  return PAGE_TURN_APPEARANCE_PRESETS.find(({ id }) => id === presetId)
    ?.appearance;
}

export function resolvePageTurnAppearance(
  publication?: PageTurnAppearanceInput,
  presetId: PageTurnAppearancePresetId =
    publication?.preset ?? "default",
  overrides?: PageTurnAppearanceInput,
): PageTurnResolvedAppearance {
  let resolved = mergeAppearance(DEFAULT_PAGE_TURN_APPEARANCE, publication);
  if (presetId !== "default" && presetId !== "custom") {
    resolved = mergeAppearance(resolved, presetAppearance(presetId));
  }
  resolved = mergeAppearance(resolved, overrides);
  const publicationBinding = publication?.binding;
  const boardThickness =
    overrides?.binding?.boardThickness ??
    (presetId === "default" || presetId === "custom"
      ? (publicationBinding?.boardThickness ?? resolved.binding.depth)
      : undefined) ??
    resolved.binding.boardThickness;
  return {
    ...resolved,
    preset: overrides?.preset ?? presetId,
    binding: {
      ...resolved.binding,
      boardThickness,
      hubs: Math.round(clamp(resolved.binding.hubs, 0, 8)),
      pageCount: Math.round(clamp(resolved.binding.pageCount, 16, 1200)),
      ...(overrides?.binding?.pageCount !== undefined ||
      publicationBinding?.pageCount === undefined ||
      (presetId !== "default" && presetId !== "custom")
        ? {}
        : {
            pageCount: Math.round(
              clamp(publicationBinding.pageCount, 16, 1200),
            ),
          }),
      ...(publicationBinding?.shelfLabel === undefined
        ? {}
        : { shelfLabel: publicationBinding.shelfLabel }),
    },
    paper: {
      ...resolved.paper,
      age: clamp(resolved.paper.age, 0, 1),
      texture: clamp(resolved.paper.texture, 0, 1),
      ruleSpacingRem: clamp(resolved.paper.ruleSpacingRem, 0.5, 3),
    },
    typography: {
      ...resolved.typography,
      lineHeight: clamp(resolved.typography.lineHeight, 1.2, 2),
      baseScale: clamp(resolved.typography.baseScale, 0.75, 1.35),
    },
    geometry: {
      gutterLift: clamp(resolved.geometry.gutterLift, 0, 1),
      bottomLift: clamp(resolved.geometry.bottomLift, 0, 1),
      foreEdgeLift: clamp(resolved.geometry.foreEdgeLift, 0, 1),
      cornerRoundness: clamp(resolved.geometry.cornerRoundness, 0, 1),
      foldRadius: clamp(resolved.geometry.foldRadius, 0, 1),
      foldShadow: clamp(resolved.geometry.foldShadow, 0, 1),
      boardOverhang: clamp(resolved.geometry.boardOverhang, 0, 1),
    },
  };
}

export function publicationPageFanCount(
  appearance?: PageTurnAppearanceInput,
): number {
  const pageCount =
    appearance?.binding?.pageCount ??
    DEFAULT_BINDING_APPEARANCE.pageCount;
  return Math.min(14, Math.max(5, Math.round(Math.sqrt(pageCount) * 1.6)));
}

export function publicationAppearanceVariables(
  appearance?: PageTurnAppearanceInput,
): Record<`--book-${string}`, string> {
  const resolved = resolvePageTurnAppearance(appearance);
  const depth = {
    slim: "0.65rem",
    standard: "1rem",
    thick: "1.45rem",
  }[resolved.binding.depth];
  const boardThickness = {
    slim: "0.16rem",
    standard: "0.25rem",
    thick: "0.36rem",
  }[resolved.binding.boardThickness];
  const textBlockDepth = Math.min(
    1.45,
    Math.max(
      0.55,
      0.42 + Math.sqrt(resolved.binding.pageCount) * 0.075,
    ),
  );
  return {
    "--book-cover-background": resolved.cover.background,
    "--book-cover-foreground": resolved.cover.foreground,
    "--book-cover-accent": resolved.cover.accent,
    "--book-binding-color": resolved.binding.color,
    "--book-binding-accent": resolved.binding.accent,
    "--book-binding-depth": depth,
    "--book-board-thickness": boardThickness,
    "--book-text-block-depth": `${textBlockDepth.toFixed(2)}rem`,
    "--book-page-count": String(resolved.binding.pageCount),
  };
}

export function pageTurnAppearanceVariables(
  appearance: PageTurnResolvedAppearance,
): Record<`--v3-${string}`, string> {
  const boardThickness = {
    slim: 0.24,
    standard: 0.4,
    thick: 0.58,
  }[appearance.binding.boardThickness];
  const spineWidth =
    appearance.binding.spineStyle === "flat"
      ? 0.42
      : appearance.binding.spineStyle === "exposed-stitch"
        ? 0.56
        : appearance.binding.depth === "thick"
          ? 0.9
          : 0.7;
  const gutterRadius = 0.18 + appearance.geometry.gutterLift * 1.25;
  const bottomLift = 0.04 + appearance.geometry.bottomLift * 0.34;
  const foreEdgeWidth = 0.35 + appearance.geometry.foreEdgeLift * 0.9;
  const outerRadius = 0.18 + appearance.geometry.cornerRoundness * 0.68;
  const boardOverhang = 0.35 + appearance.geometry.boardOverhang * 0.75;
  const pageBlockDepth = Math.min(
    1.5,
    Math.max(
      0.45,
      0.34 + Math.sqrt(appearance.binding.pageCount) * 0.04,
    ),
  );
  return {
    "--v3-cover-background": appearance.cover.background,
    "--v3-cover-foreground": appearance.cover.foreground,
    "--v3-cover-accent": appearance.cover.accent,
    "--v3-binding-color": appearance.binding.color,
    "--v3-binding-accent": appearance.binding.accent,
    "--v3-board-thickness": `${boardThickness.toFixed(2)}rem`,
    "--v3-board-overhang": `${boardOverhang.toFixed(2)}rem`,
    "--v3-spine-width": `${spineWidth.toFixed(2)}rem`,
    "--v3-page-paper": appearance.paper.color,
    "--v3-page-paper-highlight": appearance.paper.highlight,
    "--v3-page-edge": appearance.paper.edgeColor,
    "--v3-page-ink": appearance.paper.inkColor,
    "--v3-page-age": appearance.paper.age.toFixed(3),
    "--v3-page-age-color":
      `rgb(158 103 43 / ${(appearance.paper.age * 0.2).toFixed(3)})`,
    "--v3-page-texture": appearance.paper.texture.toFixed(3),
    "--v3-page-texture-color":
      `rgb(83 55 26 / ${appearance.paper.texture.toFixed(3)})`,
    "--v3-page-rule-color": appearance.paper.ruleColor,
    "--v3-page-rule-spacing": `${appearance.paper.ruleSpacingRem.toFixed(2)}rem`,
    "--v3-page-fan-dark": appearance.fan.stripeDark,
    "--v3-page-fan-light": appearance.fan.stripeLight,
    "--v3-page-fan-mid": appearance.fan.stripeMid,
    "--v3-body-font": appearance.typography.bodyFamily,
    "--v3-heading-font": appearance.typography.headingFamily,
    "--v3-ui-font": appearance.typography.uiFamily,
    "--v3-line-height": appearance.typography.lineHeight.toFixed(3),
    "--v3-base-type-scale": appearance.typography.baseScale.toFixed(3),
    "--v3-gutter-radius": `${gutterRadius.toFixed(2)}rem`,
    "--v3-gutter-shadow-width": `${(0.8 + appearance.geometry.gutterLift * 2.5).toFixed(2)}rem`,
    "--v3-page-bottom-lift": `${bottomLift.toFixed(2)}rem`,
    "--v3-page-bottom-blur": `${(0.12 + appearance.geometry.bottomLift * 0.38).toFixed(2)}rem`,
    "--v3-page-bottom-shadow-height":
      `${(0.45 + appearance.geometry.bottomLift * 1.35).toFixed(2)}rem`,
    "--v3-fore-edge-width": `${foreEdgeWidth.toFixed(2)}rem`,
    "--v3-page-outer-radius": `${outerRadius.toFixed(2)}rem`,
    "--v3-fold-radius": appearance.geometry.foldRadius.toFixed(3),
    "--v3-fold-shadow": appearance.geometry.foldShadow.toFixed(3),
    "--v3-page-count": String(appearance.binding.pageCount),
    "--v3-page-block-depth": `${pageBlockDepth.toFixed(2)}rem`,
  };
}

export function applyPageTurnAppearance(
  host: HTMLElement,
  appearance: PageTurnResolvedAppearance,
): void {
  for (const [property, value] of Object.entries(
    pageTurnAppearanceVariables(appearance),
  )) {
    host.style.setProperty(property, value);
  }
  host.dataset.v3AppearanceTheme = appearance.preset;
  host.dataset.v3PagePattern = appearance.paper.pattern;
  host.dataset.v3PageEdgeStyle = appearance.fan.edgeStyle;
  host.dataset.v3BindingMaterial = appearance.binding.material;
  host.dataset.v3SpineStyle = appearance.binding.spineStyle;
  host.dataset.v3DropCap = String(appearance.typography.dropCap);
}

export function applyPublicationAppearance(
  host: HTMLElement,
  appearance?: PageTurnPublicationAppearance,
): void {
  const resolved = resolvePageTurnAppearance(appearance);
  for (const [property, value] of Object.entries(
    publicationAppearanceVariables(appearance),
  )) {
    host.style.setProperty(property, value);
  }
  applyPageTurnAppearance(host, resolved);
  host.dataset.bookBindingMaterial = resolved.binding.material;
  host.dataset.bookBindingDepth = resolved.binding.depth;
  host.dataset.bookBindingHubs = String(resolved.binding.hubs);
}
