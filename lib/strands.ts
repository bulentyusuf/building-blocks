// The three strands are Contentful categories with fixed slugs. Class strings
// are literal so Tailwind's scanner finds them. [→ `strands`]
export type Strand = {
  slug: string;
  label: string;
  /** Pill and pressed-chip fill. Cream text sits on it in both schemes. */
  fill: string;
  /** The hard shadow under a card or chip, lifted in dark mode. */
  shadow: string;
  /** A card's shadow: 3px on mobile, 4px from md. */
  cardShadow: string;
  /** The feature card's: 3px on mobile, 6px from md. */
  featureShadow: string;
};

export const STRANDS: Strand[] = [
  {
    slug: "blogging",
    label: "Blogging",
    fill: "bg-strand-blogging",
    shadow: "shadow-[4px_4px_0_var(--color-strand-blogging-shadow)]",
    cardShadow:
      "shadow-[3px_3px_0_var(--color-strand-blogging-shadow)] md:shadow-[4px_4px_0_var(--color-strand-blogging-shadow)]",
    featureShadow:
      "shadow-[3px_3px_0_var(--color-strand-blogging-shadow)] md:shadow-[6px_6px_0_var(--color-strand-blogging-shadow)]",
  },
  {
    slug: "films",
    label: "Films",
    fill: "bg-strand-films",
    shadow: "shadow-[4px_4px_0_var(--color-strand-films-shadow)]",
    cardShadow:
      "shadow-[3px_3px_0_var(--color-strand-films-shadow)] md:shadow-[4px_4px_0_var(--color-strand-films-shadow)]",
    featureShadow:
      "shadow-[3px_3px_0_var(--color-strand-films-shadow)] md:shadow-[6px_6px_0_var(--color-strand-films-shadow)]",
  },
  {
    slug: "games-and-gadgets",
    label: "Games & Gadgets",
    fill: "bg-strand-games",
    shadow: "shadow-[4px_4px_0_var(--color-strand-games-shadow)]",
    cardShadow:
      "shadow-[3px_3px_0_var(--color-strand-games-shadow)] md:shadow-[4px_4px_0_var(--color-strand-games-shadow)]",
    featureShadow:
      "shadow-[3px_3px_0_var(--color-strand-games-shadow)] md:shadow-[6px_6px_0_var(--color-strand-games-shadow)]",
  },
];

/** A post's strand, or Blogging's colours under its own name when the
 *  category is not one of the three. Null when the post has no category. */
export function strandFor(
  category: { name: string; slug: string } | null | undefined,
): Strand | null {
  if (!category) return null;
  const strand = STRANDS.find((s) => s.slug === category.slug);
  return strand ?? { ...STRANDS[0], slug: category.slug, label: category.name };
}
