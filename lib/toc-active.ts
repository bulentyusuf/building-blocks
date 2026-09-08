// Which ToC entry should be highlighted.
//
// The active section is the last heading whose top has passed the line just
// under the sticky header. That is the only question, and it is answered from
// live geometry across every heading.
//
// Do not add a "topmost heading currently intersecting the observer band
// wins" branch: that shape once made the ToC jump to the next section while
// the reader was still a screenful into the previous one, because a heading
// freshly scrolled into view could claim the highlight. The band's lower edge
// gets no vote.

/**
 * Where the activation line sits when the page's scroll offset cannot be read.
 *
 * Matches the `scroll-padding-top: 5rem` in globals.css. It is a fallback for a
 * computed value of `auto` (the initial value, so this is what a test harness
 * or a browser that dropped the rule reports), not a second opinion about the
 * offset — if the two disagree, globals.css is right and this is stale.
 */
export const FALLBACK_BAND_TOP_PX = 80;

/**
 * Sub-pixel slack. A ToC click parks the heading at exactly the scroll offset,
 * and fractional layout values would otherwise leave it a hair below the line
 * and hand the highlight to the previous section.
 */
export const BAND_TOLERANCE_PX = 4;

/**
 * The line a heading must cross to count as active, in px from the viewport top.
 *
 * Derived from the scroll container's own `scroll-padding-top` rather than
 * hardcoded, because that is the property parking a targeted heading — if the
 * two disagreed, clicking entry 7 would highlight entry 6. [→ `scroll-offset`]
 *
 * @param scrollPaddingTop The computed `scrollPaddingTop`, e.g. "80px" or "auto".
 */
export function activationBandTop(scrollPaddingTop: string): number {
  const offset = Number.parseFloat(scrollPaddingTop);
  const base =
    Number.isFinite(offset) && offset > 0 ? offset : FALLBACK_BAND_TOP_PX;
  return base + BAND_TOLERANCE_PX;
}

export interface HeadingPosition {
  /** The heading element's id, which is also its ToC slug. */
  id: string;
  /** Live getBoundingClientRect().top, read at decision time. */
  top: number;
}

/**
 * Returns the id to highlight, or "" for no highlight.
 *
 * @param positions Every heading, in document order.
 * @param bandTop   Distance in px from the viewport top to the line a heading
 *                  must cross to become active. Must be at least the page's
 *                  scroll-padding-top, or a heading parked there by a ToC click
 *                  will not count as passed — see activationBandTop, which
 *                  derives it and adds the tolerance.
 */
export function pickActiveHeading(
  positions: HeadingPosition[],
  bandTop: number,
): string {
  const passed = positions.filter((p) => p.top <= bandTop);

  // Every heading is still below the line, so the reader is above the first
  // one, in the lede. Nothing should be highlighted.
  if (passed.length === 0) return "";

  // The last heading passed is the section the reader is inside. `>=` adopts
  // the later element on a tie, which resolves to document order because
  // `positions` arrives in document order.
  return passed.reduce((best, p) => (p.top >= best.top ? p : best)).id;
}
