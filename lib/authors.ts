import type { Post, ListPost } from "./types";
import { SITE_AUTHOR } from "./constants";
import { present } from "./links";

/** Authors in credit order, lead first, unpublished ones dropped. */
export function postAuthors<
  T extends Pick<Post | ListPost, "authorsCollection">,
>(
  post: T,
): NonNullable<NonNullable<T["authorsCollection"]>["items"][number]>[] {
  // Typed from T, so a list-sourced post keeps authors without `bio` and a bio
  // read off one fails to typecheck rather than rendering nothing.
  return (post.authorsCollection?.items ?? []).filter(present);
}

/**
 * A filter, not a query: Contentful cannot filter on `Array<Link>`.
 * [→ `authors-array`]
 */
export function postsByAuthor<
  T extends Pick<Post | ListPost, "authorsCollection">,
>(posts: T[], slug: string): T[] {
  return posts.filter((post) => postAuthors(post).some((a) => a.slug === slug));
}

/** Plain-text byline: "A", "A & B", "A, B & C". Empty falls back. */
export function formatAuthorsByline(
  authors: { name: string }[],
  fallback = SITE_AUTHOR,
): string {
  const names = authors.map((a) => a.name).filter(Boolean);
  if (names.length === 0) return fallback;
  if (names.length === 1) return names[0];
  const last = names.pop()!;
  return `${names.join(", ")} & ${last}`;
}
