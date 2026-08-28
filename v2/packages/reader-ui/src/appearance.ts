import type {
  PublicationAppearance,
  PublicationBindingAppearance,
  PublicationCoverAppearance,
} from "@ethical-tech/book-publication-model";

export const DEFAULT_COVER_APPEARANCE: Readonly<PublicationCoverAppearance> = {
  background: "#3d211d",
  foreground: "#f2dfb0",
  accent: "#b9914f",
};

export const DEFAULT_BINDING_APPEARANCE: Readonly<PublicationBindingAppearance> =
  {
    material: "leather",
    color: "#301713",
    accent: "#b9914f",
    depth: "standard",
    hubs: 4,
    pageCount: 64,
  };

export function publicationPageFanCount(
  appearance?: PublicationAppearance,
): number {
  const pageCount =
    appearance?.binding.pageCount ??
    DEFAULT_BINDING_APPEARANCE.pageCount ??
    64;
  return Math.min(14, Math.max(5, Math.round(Math.sqrt(pageCount) * 1.6)));
}

export function publicationAppearanceVariables(
  appearance?: PublicationAppearance,
): Record<`--book-${string}`, string> {
  const cover = appearance?.cover ?? DEFAULT_COVER_APPEARANCE;
  const binding = appearance?.binding ?? DEFAULT_BINDING_APPEARANCE;
  const depth = {
    slim: "0.65rem",
    standard: "1rem",
    thick: "1.45rem",
  }[binding.depth];
  const boardThickness = {
    slim: "0.16rem",
    standard: "0.25rem",
    thick: "0.36rem",
  }[binding.depth];
  const pageCount = binding.pageCount ?? 64;
  const textBlockDepth = Math.min(
    1.45,
    Math.max(0.55, 0.42 + Math.sqrt(pageCount) * 0.075),
  );
  return {
    "--book-cover-background": cover.background,
    "--book-cover-foreground": cover.foreground,
    "--book-cover-accent": cover.accent,
    "--book-binding-color": binding.color,
    "--book-binding-accent": binding.accent,
    "--book-binding-depth": depth,
    "--book-board-thickness": boardThickness,
    "--book-text-block-depth": `${textBlockDepth.toFixed(2)}rem`,
    "--book-page-count": String(pageCount),
  };
}

export function applyPublicationAppearance(
  host: HTMLElement,
  appearance?: PublicationAppearance,
): void {
  const binding = appearance?.binding ?? DEFAULT_BINDING_APPEARANCE;
  for (const [property, value] of Object.entries(
    publicationAppearanceVariables(appearance),
  )) {
    host.style.setProperty(property, value);
  }
  host.dataset.bookBindingMaterial = binding.material;
  host.dataset.bookBindingDepth = binding.depth;
  host.dataset.bookBindingHubs = String(binding.hubs);
}
