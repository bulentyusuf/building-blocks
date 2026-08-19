/**
 * The "N of M" position marker for a paginated listing. Renders inline, as
 * the trailing text of the route's own `<h1>` — `{heading} <PageCounter
 * currentPage totalPages />` — not as a separate line anywhere in the header.
 *
 * This reverses a decision recorded in CLAUDE.md ("Page position captions
 * the list, not the heading"): the counter used to be `PageContext`, a block
 * rendered by `app/listing-page.tsx` after the standfirst, on its own line.
 * That mechanism broke under M5's `justify-between` row (CLAUDE.md, "The
 * masthead splits into heading and standfirst") in a way worse than the
 * visible bug it caused. The visible bug: `ListingPage` paired the
 * standfirst and the caption in a React fragment, which generates no box, so
 * the split-masthead row saw three children instead of two and
 * `justify-between` spread all three across the full measure, stranding the
 * standfirst in the middle. That part was already fixed by wrapping the slot
 * (`app/wide-page.tsx`) before this change. The deeper problem survived the
 * fix: with the caption as the standfirst column's last line,
 * `md:items-baseline-last` aligned the heading against the CAPTION's
 * baseline rather than the standfirst's, which is what actually shoved the
 * standfirst upward relative to the heading — clutter was never the real
 * complaint, misalignment was. Inline in the `h1`, the heading has exactly
 * one baseline again, so `items-baseline-last` closes against the
 * standfirst's own last line, which is what the layout was tuned for.
 *
 * The old objection to putting position in the header — recorded in the
 * entry this reverses — was that it split the heading from its standfirst
 * and landed under the portrait on author pages instead of under the
 * heading it referred to. Both of those were about the caption being a
 * separate BLOCK. Inline text inside the `h1` cannot split anything, because
 * it is no longer a block at all, and it cannot land in the wrong place on
 * an author page because it is part of the same line as the name. The
 * objection is answered, not overridden.
 *
 * Four things about the rendering, each load-bearing:
 *
 * - **18px Literata, not 60px Bricolage.** `font-normal` and `tracking-normal`
 *   undo the `font-weight: 700` and `letter-spacing: -0.005em` `app/globals.css`
 *   gives every `h1` at the base layer — both are inherited properties, so a
 *   plain child span would render bold and tight, reading as a co-headline
 *   rather than as metadata. `font-body` undoes the h1 rule's own
 *   `font-family: var(--font-display)` for the same reason — inherited, and
 *   Bricolage at any weight is still the wrong face for a meta string. Meta
 *   text sits in the body face sitewide (dates, bylines, breadcrumbs), and
 *   this is one more instance of that rule, not an exception to it.
 * - **No parentheses, no "Page".** "Page 2 of 5" as a caption becomes "2 of
 *   5" inline: the word "Page" is redundant once the string is visibly
 *   attached to a heading rather than floating on its own line, and
 *   parenthesising it back (Category Name (2 of 5)) was rendered side by
 *   side with the plain version before choosing — brackets read fussy at
 *   18px and cost 12px of width for a heading ramp that is already tight.
 *   The parenthesised form is the fallback if a later eye disagrees; every
 *   budget below has 12px of headroom to spare for it.
 * - **No margin.** The retired `PageContext` carried `mt-5`, which only made
 *   sense stacked on its own line. Inline, any margin would just shove
 *   whatever follows the counter inside its own line box.
 * - **`whitespace-nowrap`.** "2 of 5" wrapping mid-string across the end of
 *   the heading's line is worse than the heading itself wrapping one word
 *   earlier to make room.
 *
 * **The copy budget.** Measured in a standalone Chromium harness reproducing
 * these exact classes at real breakpoints, with Bricolage and Literata loaded
 * from Google Fonts and the load verified: the counter plus its leading space
 * measures 42px at 18px Literata. Desktop (60px Bricolage, 984px content
 * beside a 320px standfirst) has 566px for heading text alone with the
 * counter already subtracted; every live heading fits except
 * "Information Architecture" (691px), which already overflowed the M5 cap
 * with no counter at all and is a pre-existing condition — do not fix it
 * here, and do not try to shrink or hide the counter to compensate. Phone
 * (36px, 350px of content) has 298px; "Machine-Readable" and
 * "Content Modelling" push the counter onto a line of its own there. That is
 * accepted rather than hidden (`hidden md:inline` was considered and
 * rejected): the phone is the device where a reader is least likely to
 * reach the pager, so it is the one place orientation matters most. It is
 * also probably moot in practice, since `POSTS_PER_PAGE` is 5 and both tags
 * need a sixth published post before a page 2 exists to counter at all.
 *
 * `widont` (`lib/typography.ts`) runs on the heading text alone, before the
 * counter exists, and cannot be extended to bind them: a heading that cannot
 * wrap overflows its column instead of wrapping badly, which is the whole
 * reason `widont` stays a no-op below three words in the first place. Do not
 * try to non-breaking-space the counter onto the heading's last word.
 *
 * Renders nothing on page 1, exactly as `PageContext` did, so every route
 * drops the element into its heading unconditionally and none of them
 * decides for itself when a page counts as paginated. The author routes take
 * it too, on consistency: `splitHeader={false}` already exists as the
 * documented shape for "the author routes are different" if this is ever
 * found to read badly beside the 112px portrait, so a second exception on
 * that prop is cheaper than special-casing this component.
 */
export default function PageCounter({
  currentPage,
  totalPages,
}: {
  currentPage: number;
  totalPages: number;
}) {
  if (currentPage <= 1) return null;
  return (
    <span className="font-body font-normal tracking-normal text-lg text-brand-muted whitespace-nowrap">
      {currentPage} of {totalPages}
    </span>
  );
}
