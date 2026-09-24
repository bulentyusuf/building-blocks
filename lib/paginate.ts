// Pagination arithmetic, free of next/navigation so 404s and redirects stay
// visible in the route. [→ `listing-shell`]

import { POSTS_PER_PAGE } from "./constants";

/**
 * A `[page]` segment as a number, or null. Both the component and
 * `generateMetadata` read it through this. It accepts `2.0` and friends, so
 * render what it returns, never the raw segment, or every spelling becomes its
 * own canonical. [→ `listing-shell`]
 */
export function parsePageParam(page: string): number | null {
  const pageNumber = Number(page);
  return Number.isInteger(pageNumber) && pageNumber >= 1 ? pageNumber : null;
}

/** Never 0: an empty listing still has a page 1 for its empty state. */
export function totalPagesFor(count: number): number {
  return Math.max(1, Math.ceil(count / POSTS_PER_PAGE));
}

/**
 * Page 1 matches the unpaginated route's slice, so its redirect is only
 * canonicalisation.
 */
export function pageItems<T>(items: T[], currentPage: number): T[] {
  const start = (currentPage - 1) * POSTS_PER_PAGE;
  return items.slice(start, start + POSTS_PER_PAGE);
}

/** From 2: page 1 lives at the unpaginated route. */
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
