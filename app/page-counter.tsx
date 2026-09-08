/**
 * The "N of M" position marker for a paginated listing. Renders inline, as the
 * trailing text of the route's own `<h1>` — `{heading} <PageCounter
 * currentPage totalPages />` — not as a separate line anywhere in the header.
 * Why it moved out of `ListingPage`, what the old objection was, and why the
 * author routes take it too are all in docs/decisions.md. [→ `page-counter`]
 *
 * Four things about the rendering, each load-bearing:
 *
 * - **18px Literata, not 60px Bricolage.** `font-normal`, `tracking-normal` and
 *   `font-body` each undo an inherited `h1` rule from `app/globals.css`'s base
 *   layer. Drop any one of them and the counter renders bold, tight or in the
 *   display face, reading as a co-headline rather than as metadata. Meta text
 *   sits in the body face sitewide — dates, bylines, breadcrumbs — and this is
 *   one more instance of that, not an exception to it.
 * - **No parentheses, no "Page".** Both forms were rendered side by side before
 *   choosing. Brackets read fussy at 18px and cost 12px of width; every budget
 *   below has that 12px spare if a later eye disagrees.
 * - **No margin.** Inline, any margin shoves whatever follows the counter
 *   inside its own line box.
 * - **`whitespace-nowrap`.** "2 of 5" breaking mid-string across the end of the
 *   heading's line is worse than the heading wrapping one word earlier.
 *
 * **The copy budget**, measured in a standalone Chromium harness at real
 * breakpoints with both faces loaded. The counter plus its leading space is
 * 42px. Desktop has 566px for heading text with that already subtracted, and
 * every live heading fits except "Information Architecture" (691px), which
 * overflowed the M5 cap before the counter existed. That is pre-existing: do
 * not fix it here, and do not shrink or hide the counter to compensate. Phone
 * has 298px, so "Machine-Readable" and "Content Modelling" push the counter
 * onto a line of its own. Accepted rather than hidden — `hidden md:inline` was
 * considered and rejected — because the phone is where a reader is least likely
 * to reach the pager, so orientation matters most there.
 *
 * `widont` (`lib/typography.ts`) runs on the heading text alone, before the
 * counter exists, and cannot be extended to bind them: a heading that cannot
 * wrap overflows its column instead of wrapping badly. Do not non-breaking-space
 * the counter onto the heading's last word.
 *
 * Returns null on page 1, so every route drops the element in unconditionally
 * and none decides for itself when its own page counts as paginated.
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
