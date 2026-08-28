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
  };

export function publicationAppearanceVariables(
  appearance?: PublicationAppearance,
): Record<`--book-${string}`, string> {
  const cover = appearance?.cover ?? DEFAULT_COVER_APPEARANCE;
  const binding = appearance?.binding ?? DEFAULT_BINDING_APPEARANCE;
  const depth = {
    slim: "0.45rem",
    standard: "0.75rem",
    thick: "1.05rem",
  }[binding.depth];
  return {
    "--book-cover-background": cover.background,
    "--book-cover-foreground": cover.foreground,
    "--book-cover-accent": cover.accent,
    "--book-binding-color": binding.color,
    "--book-binding-accent": binding.accent,
    "--book-binding-depth": depth,
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

