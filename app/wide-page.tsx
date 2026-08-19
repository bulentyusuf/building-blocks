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
 *   - `heading` and `standfirst`, side by side — see the split masthead note
 *     below — wrapped in a `<header>` carrying a fixed `mb-8`, which is what
 *     the band's own `pb-8` was.
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
 *   - `children`, under a `pt-6` gap — 24px of cream between the rule and the
 *     first content element, which is what Container's old "tight" top pad
 *     was. `contentOwnsLeading` suppresses THIS gap, not the header's margin.
 *
 * The band's inset was two numbers because it was two colours: `pb-8` of navy
 * below the header, then `pt-6` of cream below the band's edge. They are one
 * surface now and they still do not collapse, because the rule sits between
 * them — and which side each number falls on is the whole point. Folding both
 * into the header's bottom margin preserves the total and puts all of it above
 * the boundary, which leaves the first content element flush against a 3px
 * line on home, the post page and the four section fronts. The ruled listings
 * hide it, because their items carry `py-10 md:py-12` of their own, which is
 * also exactly why `contentOwnsLeading` exists and exactly which side it has
 * to act on. A prop meaning "the content below supplies its own space" cannot
 * be spent on the space above.
 *
 * Do not invent anything richer than the 3px rule. Any further replacement is
 * the band again with extra steps.
 *
 * **The split masthead.** `heading` and `standfirst` used to be one opaque
 * `header: ReactNode` a route assembled itself. They are two props now so
 * this shell can lay them out on one row — heading left, standfirst pinned to
 * the container's right edge via `justify-between` — rather than stacked, on
 * every route that has both.
 *
 * **This is M5 from a five-option mockup, chosen after a left-flowing row
 * shipped and was rejected on sight.** The left-flowing version put a fixed
 * `gap-10` between the heading and a standfirst that started wherever the
 * heading ended, on the reasoning that a wandering left edge was the point
 * rather than a defect. It looked like a mistake in review: a short heading
 * left the standfirst stranded in the middle of the row with nothing
 * anchoring it. `justify-between` is the fix — the standfirst's right edge is
 * now constant on every route — but `justify-between` alone reintroduces the
 * objection that sank right-anchoring the first time: a one-line standfirst
 * beside a short heading leaves a large empty gap in the middle. **The
 * standfirst's own `max-w-[20rem]` closes that gap**, by forcing most
 * standfirsts to wrap to two lines rather than trailing off as one short
 * line at the far margin — see the standfirst's own note in each route for
 * the character budget that keeps the wrap at two lines and not three. The
 * wrap and the anchor are one decision, not two; do not ship one without the
 * other.
 *
 * `flex-col` below `md` is required, not decorative: a 60px heading is 330px
 * wide at its widest, and a 390px phone has 350px of content, so there is no
 * room for a standfirst beside it there. `items-baseline-last` matters more
 * with a two-line standfirst than it would with one: plain `baseline` aligns
 * FIRST baselines, which would hang the standfirst's second line below the
 * heading; last baseline closes both blocks at the bottom instead.
 *
 * `standfirst` is optional — the post page's `h1` carries none — and the row
 * only renders when both `splitHeader` and `standfirst` are true, so a route
 * with nothing beside its heading falls back to the plain stack every narrow
 * route already uses. `splitHeader` defaults to true; the one place it is set
 * false is the author page, whose `h1` already sits in a flex row beside a
 * 112px portrait — a third element across that line is one too many, so it
 * keeps the stacked fallback instead. Do not give a narrow route this prop at
 * all — see "One axis, and it is the header measure" in CLAUDE.md.
 */
export default function WidePage({
  crumbs,
  heading,
  standfirst,
  splitHeader = true,
  children,
  contentOwnsLeading = false,
}: {
  /** Omitted, or empty, on a wide route with nothing above it (home, and the
   * index listing at page 1 — though only home renders through this shell
   * unpaginated; see app/listing-page.tsx for the paginated case). */
  crumbs?: Crumb[];
  /** The h1, plus anything meant to sit inline with it (a portrait, on the
   * author routes). */
  heading: ReactNode;
  /** The standfirst, when the route has one. Sits beside `heading` on one row
   * at `md` and up, stacked below it on mobile — see the split masthead note
   * above. Omit entirely for a route with nothing to say beside its heading. */
  standfirst?: ReactNode;
  /** False only on the author routes — see the split masthead note above. */
  splitHeader?: boolean;
  /**
   * Set when the content already carries its own space above its first
   * element, so the shell adds none below the rule. Every ruled listing does,
   * since each item is `py-10 md:py-12` — the distance a hairline keeps from
   * the cover below it, and the rule is playing a hairline's part. Adding the
   * gap on top made the rule-to-first-post distance differ from every
   * post-to-post distance under it.
   *
   * Nothing else sets it. The four section fronts open with a bare grid, home
   * with its hero, and the post page with its cover, and none of the three
   * brings a top margin — so all of them take the gap. Home and the post page
   * DID set it before the retirement, because their covers pulled up across
   * the band's edge and supplied their own leading that way. The pull-ups are
   * gone; the flag had to go with them.
   */
  contentOwnsLeading?: boolean;
  /** Everything below the header. */
  children: ReactNode;
}) {
  return (
    <Container>
      {crumbs && crumbs.length > 0 && <Breadcrumb items={crumbs} />}
      <header className="mb-8">
        {splitHeader && standfirst ? (
          <div className="flex flex-col gap-3 md:flex-row md:items-baseline-last md:justify-between md:gap-10">
            {heading}
            {/* Wrapped, and that wrapper is load-bearing rather than tidy
                markup. A caller passing a FRAGMENT of two elements here — as
                app/listing-page.tsx did, pairing a standfirst with the
                pagination caption — puts three children in this row instead of
                two, because a fragment generates no box of its own. Under the
                left-flowing layout that shipped in #414 the three simply flowed
                left and nothing looked wrong. Under justify-between they spread
                across the full measure, stranding the standfirst in the middle
                and pushing the caption to the right margin. It only showed on
                page 2 and later, because PageContext renders null on page 1.
                The wrapper makes the row two children whatever a caller
                passes. */}
            <div>{standfirst}</div>
          </div>
        ) : (
          <>
            {heading}
            {standfirst}
          </>
        )}
      </header>
      <div className="border-t-[3px] border-brand-dark" />
      <div className={contentOwnsLeading ? undefined : "pt-6"}>{children}</div>
    </Container>
  );
}
