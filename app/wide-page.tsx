import type { ReactNode } from "react";
import Container from "./container";
import Breadcrumb, { type Crumb } from "./breadcrumb";

/**
 * The shell every wide route renders through — the four section fronts, all six
 * taxonomy listings, the index listing at /page/[page], the post page and home.
 * Which routes are wide is settled by the header measure, not here — see "One
 * axis, and it is the header measure" in CLAUDE.md.
 *
 * Until Phase 1 of the band retirement (CLAUDE.md) this rendered the trail and
 * `header` inside a full-bleed navy `<PageBand>`, a sibling of `<Container>`
 * rather than a child of it. That band is gone: `#2b1c3f` (Phase 2's aubergine)
 * cannot carry it, since pure black beneath it reaches only 1.34:1 against the
 * chrome ramp `lib/palette-contrast.test.ts` still enforces, so retiring the
 * band had to happen regardless of the palette and had to happen first.
 *
 * Everything the band drew now happens on one cream surface, inside one
 * `<Container>`:
 *
 *   - The breadcrumb, if any.
 *   - `header` — the h1, a standfirst, whatever sits beside them — wrapped in
 *     a `<header>` carrying the one spacing value below that replaces the
 *     band's own two-part inset (its `pt-8`/`pb-8` plus Container's separate
 *     `pt-6` "tight" gap, which summed to two numbers because they were two
 *     colours). `contentOwnsLeading` still selects between them: `mb-8` when
 *     the content brings its own leading (every listing, whose items carry
 *     `py-10 md:py-12` of their own), `mb-14` when it does not (the four
 *     section fronts, whose grids have none).
 *   - A 3px rule, `border-brand-dark`, standing in for the band's own
 *     boundary — the colour step from navy to cream that once marked "the
 *     masthead ends here" for free. On one cream surface that step is gone,
 *     so every wide route needs an explicit line where the band's edge used
 *     to fall. One rule at one surface, not two hundred pixels of colour, and
 *     it is what keeps this from being a home special case: without it, home
 *     alone would need something marking where its masthead stops and the
 *     hero begins, since every other route already draws a hairline of its
 *     own somewhere in its listing. This is that same idea done once, here,
 *     for the one boundary no route already draws — the header's own close.
 *     It inherits `--color-brand-dark`, so it inverts with the scheme exactly
 *     as the ink itself does and needs no dark-mode override.
 *   - `children`, immediately after.
 *
 * Do not invent anything richer than the 3px rule. Any further replacement is
 * the band again with extra steps.
 */
export default function WidePage({
  crumbs,
  header,
  children,
  contentOwnsLeading = false,
}: {
  /** Omitted, or empty, on a wide route with nothing above it (home, and the
   * index listing at page 1 — though only home renders through this shell
   * unpaginated; see app/listing-page.tsx for the paginated case). */
  crumbs?: Crumb[];
  /** The masthead's contents — the h1, a standfirst, whatever sits beside them. */
  header: ReactNode;
  /**
   * Set when the content already carries its own space above its first
   * element — every listing does, since each item is `py-10 md:py-12`. The
   * four section fronts do not, so they take the larger gap.
   */
  contentOwnsLeading?: boolean;
  /** Everything below the header. */
  children: ReactNode;
}) {
  return (
    <Container>
      {crumbs && crumbs.length > 0 && <Breadcrumb items={crumbs} />}
      <header className={contentOwnsLeading ? "mb-8" : "mb-14"}>
        {header}
      </header>
      <div className="border-t-[3px] border-brand-dark" />
      {children}
    </Container>
  );
}
