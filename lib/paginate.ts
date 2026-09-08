// Listing pagination arithmetic, in one place. Deliberately free of
// next/navigation: a route's 404 and redirect decisions are control flow and
// belong visible in the route. These are the sums. [→ `listing-shell`]

import { POSTS_PER_PAGE } from "./constants";

/**
 * A `[page]` route segment as a page number, or null when it is not one.
 * Both the component and `generateMetadata` must read the segment through
 * this, so they agree. [→ `listing-shell`]
 *
 * Looser than the canonical form on purpose, because `Number()` accepts far
 * more than digits: `2.0`, `%202`, `+2`, `2e0` and `0x2` all parse as 2.
 * Tightening that is a duplicate-URL decision nobody has taken.
 *
 * The RETURN VALUE, not the raw segment, is what every caller must render:
 * interpolating the raw segment into a title or canonical lets every spelling
 * declare itself canonical, and with `dynamicParams` at its default the
 * accepted set is unbounded, so each trailing zero would mint its own ISR
 * entry for identical content. Never interpolate the raw `[page]` segment
 * into anything a reader or a crawler sees — use what this returns.
 */
export function parsePageParam(page: string): number | null {
  const pageNumber = Number(page);
  return Number.isInteger(pageNumber) && pageNumber >= 1 ? pageNumber : null;
}

/**
 * How many pages a listing of `count` items spans.
 *
 * Never returns 0. An empty listing still has a page 1 to render its empty
 * state on, and a totalPages of 0 would make every page number out of range.
 */
export function totalPagesFor(count: number): number {
  return Math.max(1, Math.ceil(count / POSTS_PER_PAGE));
}

/**
 * The slice of `items` belonging on `currentPage`, 1-indexed.
 *
 * Page 1 is items 0..N-1, so the unpaginated route and page 1 of the paginated
 * one produce the same slice — which is what makes the page-1 redirect in the
 * paginated routes a canonicalisation rather than a behaviour change.
 */
export function pageItems<T>(items: T[], currentPage: number): T[] {
  const start = (currentPage - 1) * POSTS_PER_PAGE;
  return items.slice(start, start + POSTS_PER_PAGE);
}

/**
 * Static params for pages 2..totalPages of one listing.
 *
 * Starts at 2 because page 1 lives at the unpaginated route and the paginated
 * one redirects there; generating it would pre-render a permanent redirect.
 */
export function pageRangeParams<T>(
  count: number,
  make: (page: string) => T,
): T[] {
  const params: T[] = [];
  for (let page = 2; page <= totalPagesFor(count); page++) {
    params.push(make(String(page)));
  }
  return params;
}
