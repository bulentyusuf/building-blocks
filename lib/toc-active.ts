// The active entry is the last heading whose top has passed the line under the
// sticky header. Do not let a heading entering the lower viewport win: that
// once jumped the highlight a screenful early.

/** Fallback for a computed `auto`. globals.css is the source of truth. */
export const FALLBACK_BAND_TOP_PX = 80;

/** Sub-pixel slack, so a heading parked exactly on the line counts as passed. */
export const BAND_TOLERANCE_PX = 4;

/**
 * The activation line in px from the viewport top, read from `html`'s
 * scroll-padding-top so a clicked heading lands on it. [→ `scroll-offset`]
 */
export function activationBandTop(scrollPaddingTop: string): number {
  const offset = Number.parseFloat(scrollPaddingTop);
  const base =
    Number.isFinite(offset) && offset > 0 ? offset : FALLBACK_BAND_TOP_PX;
  return base + BAND_TOLERANCE_PX;
}

export interface HeadingPosition {
  id: string;
  top: number;
}

/** The id to highlight, or "" in the lede. `positions` in document order. */
export function pickActiveHeading(
  positions: HeadingPosition[],
  bandTop: number,
): string {
  const passed = positions.filter((p) => p.top <= bandTop);

  if (passed.length === 0) return "";

  // `>=` breaks a tie toward the later heading in document order.
  return passed.reduce((best, p) => (p.top >= best.top ? p : best)).id;
}
