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
}>;

export type PageTurnPublicationAppearance = Readonly<{
  cover: PageTurnCoverAppearance;
  binding: PageTurnBindingAppearance;
}>;

export type PageTurnSemanticChapter = Readonly<{
  chapterId: string;
  title: string;
  href: string;
  firstAnchor: string;
}>;
