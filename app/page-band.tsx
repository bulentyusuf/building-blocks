import Breadcrumb, { type Crumb } from "./breadcrumb";

/**
 * The masthead band on every wide route — the four section fronts, every
 * category, tag and author listing, the index listing at /page/[page] and the
 * post page. This said "browsing pages" and omitted the post, which is the
 * retired axis contradicting the paragraph below it.
 *
 * Full-bleed on purpose, so it must sit OUTSIDE Container rather than inside
 * it, and it carries its own `max-w-5xl px-5` inner column so the h1's left
 * edge lines up with the cards that follow. The band is a sibling of the
 * sticky header, never part of it: on scroll the band leaves while the 52px
 * bar stays pinned. The band is a step darker than the bar, not the same
 * colour, so the seam where they meet is deliberate — 1.60:1 in light, 1.55:1
 * in dark. Both blues move between schemes to hold that step; globals.css
 * carries why.
 *
 * Which routes wear the band is the header measure, not what the reader is
 * doing. A wide header bands and a narrow one does not, so the colour marks the
 * one thing that changes the shape of the page. CLAUDE.md holds the assignment.
 *
 * The trail is optional because one banded route has nothing above it.
 * /page/[page] and / are one listing at two offsets and both are the root, so
 * neither carries a trail. Without it the h1 sits at the top of the band's
 * inset rather than below a nav that carries its own mb-4. That is correct and
 * not a spacing bug, because there is no trail for the heading to sit under.
 *
 * Every text colour inside is solid white, inherited from the root rather than
 * named per element — see the comment on the wrapper. No `text-white/N` — on brand-band
 * white is 16.60:1 light and 12.61:1 dark, whereas white/85 on the old header
 * navy was 7.93 light and 6.38 dark, and the second of those missed the AAA
 * floor that lib/palette-contrast.test.ts already enforces sitewide. Hierarchy
 * comes from size and face instead of tint, which the two-face system supports
 * better than an opacity ladder anyway. Decorative marks — the crumb
 * separators, the author portrait's ring — may still be translucent: they are
 * aria-hidden or non-textual and exempt under 1.4.3.
 *
 * No crimson anywhere inside. brand-crimson on brand-header is 1.35:1 in
 * light, so the accent that carries links everywhere else cannot come in here.
 */
export default function PageBand({
  crumbs,
  children,
  bleed = false,
}: {
  /** Omitted, or empty, on a banded route with nothing above it. */
  crumbs?: Crumb[];
  /** The band's editorial contents — an h1, a standfirst, whatever sits beside them. */
  children: React.ReactNode;
  /**
   * Deepens the bottom inset for a page whose next element pulls up into the
   * band. Only the post page sets it, so every other banded route renders the
   * inset it always had. See the note on the inset itself for the arithmetic.
   */
  bleed?: boolean;
}) {
  return (
    // text-white sits on the ROOT so the whole subtree inherits it. That is
    // load-bearing, not belt-and-braces: <body> carries text-brand-dark, so
    // anything placed in here without a colour class of its own inherits body
    // ink instead. The h1 shipped exactly that way and rendered at 1.01:1 on
    // the light band — invisible — while looking perfect in dark, where
    // brand-dark IS the off-white ink at 10.61:1. Children may still name
    // text-white for clarity; none of them may rely on doing so.
    <div className="bg-brand-band text-white">
      {/* The band adds ONE thing to the page: this inset. Everything between
          the breadcrumb and the standfirst is the spacing the unbanded pages
          already had — the nav's own mb-4, then the h1's mb-3 — and it stays
          that way. There is no `mt` on the header: adding one here sat on top
          of the breadcrumb's margin and pushed the heading 36px down a page
          that has always used 16.

          pt-8 is not a tuning knob and it never varies. It is Container's own
          pt-8, which is how far the breadcrumb sits below the sticky header on
          an about, privacy or search page. Matching it means the trail and the
          heading land at identical coordinates on EVERY page on the site, so a
          browse-to-post navigation moves nothing — and these are full document
          loads with a view transition across them, so any difference is
          animated rather than merely present. A tighter band looked better on
          its own and shifted the heading 16px on every such step.

          The BOTTOM is the half a page can spend, and only the post page does.
          Its cover pulls up 64px into the band, so pb-24 leaves 96 minus 64,
          which is 32, which is pt-8 again. The band's VISIBLE inset stays
          symmetric and the extra 64 is the part the cover covers. That is a
          derivation rather than a taste value, though the 64 itself is a
          preview call.

          The band therefore adds one thing to the page: colour, plus the
          bottom half of this inset. What sits below that edge is budgeted in
          app/wide-page.tsx, because it depends on whether the content brings
          its own leading. */}
      <div
        className={`max-w-5xl mx-auto px-5 pt-8 ${bleed ? "pb-24" : "pb-8"}`}
      >
        {crumbs && crumbs.length > 0 && (
          <Breadcrumb items={crumbs} tone="dark" />
        )}
        <header>{children}</header>
      </div>
    </div>
  );
}
