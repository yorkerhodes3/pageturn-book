export type PageTurnCoverAppearance = Readonly<{
  background: string;
  foreground: string;
  accent: string;
  subtitle?: string;
}>;

export type PageTurnBindingAppearance = Readonly<{
  material: "leather" | "cloth" | "paper";
  color: string;
  accent: string;
  depth: "slim" | "standard" | "thick";
  hubs: number;
  pageCount?: number;
  shelfLabel?: string;
  boardThickness?: "slim" | "standard" | "thick";
  spineStyle?: "flat" | "raised-hubs" | "exposed-stitch";
}>;

export type PageTurnPaperPattern = "plain" | "lined" | "grid";

export type PageTurnPaperAppearance = Readonly<{
  color: string;
  highlight: string;
  edgeColor: string;
  inkColor: string;
  age: number;
  texture: number;
  pattern: PageTurnPaperPattern;
  ruleColor: string;
  ruleSpacingRem: number;
}>;

export type PageTurnTypographyAppearance = Readonly<{
  bodyFamily: string;
  headingFamily: string;
  uiFamily: string;
  lineHeight: number;
  baseScale: number;
  dropCap: boolean;
}>;

export type PageTurnPageFanAppearance = Readonly<{
  edgeStyle: "plain" | "gold" | "red" | "marbled";
  stripeDark: string;
  stripeLight: string;
  stripeMid: string;
}>;

export type PageTurnGeometryAppearance = Readonly<{
  gutterLift: number;
  bottomLift: number;
  foreEdgeLift: number;
  cornerRoundness: number;
  foldRadius: number;
  foldShadow: number;
  boardOverhang: number;
}>;

export type PageTurnAppearancePresetId =
  | "default"
  | "antique-greek"
  | "historical-tome"
  | "modern-lab"
  | "lined-journal"
  | "grid-lab"
  | "handwritten-notebook"
  | "custom";

export type PageTurnPublicationAppearance = Readonly<{
  cover: PageTurnCoverAppearance;
  binding: PageTurnBindingAppearance;
  paper?: Partial<PageTurnPaperAppearance>;
  fan?: Partial<PageTurnPageFanAppearance>;
  typography?: Partial<PageTurnTypographyAppearance>;
  geometry?: Partial<PageTurnGeometryAppearance>;
  preset?: PageTurnAppearancePresetId;
}>;

export type PageTurnAppearanceInput = Readonly<{
  preset?: PageTurnAppearancePresetId;
  cover?: Partial<PageTurnCoverAppearance>;
  binding?: Partial<PageTurnBindingAppearance>;
  paper?: Partial<PageTurnPaperAppearance>;
  fan?: Partial<PageTurnPageFanAppearance>;
  typography?: Partial<PageTurnTypographyAppearance>;
  geometry?: Partial<PageTurnGeometryAppearance>;
}>;

export type PageTurnResolvedAppearance = Readonly<{
  preset: PageTurnAppearancePresetId;
  cover: PageTurnCoverAppearance;
  binding: Required<PageTurnBindingAppearance>;
  paper: PageTurnPaperAppearance;
  fan: PageTurnPageFanAppearance;
  typography: PageTurnTypographyAppearance;
  geometry: PageTurnGeometryAppearance;
}>;

export type PageTurnSemanticChapter = Readonly<{
  chapterId: string;
  title: string;
  href: string;
  firstAnchor: string;
}>;
