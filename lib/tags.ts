import type { ListPost, Post, Tag } from "./types";

/**
 * A tag needs this many posts before it renders anywhere.
 *
 * Zero-post tags are dead entries. A one-post tag is worse than useless in a
 * glossary: it takes a heading and a gloss to say "this exists once", and the
 * reader has nowhere to go from it. Two is the point at which a tag starts
 * doing the job tags exist for, which is connecting posts to each other.
 */
export const MIN_POSTS_PER_TAG = 2;

/** Tags on a post, flattened out of Contentful's collection wrapper. */
export function postTags(post: Pick<Post | ListPost, "tagsCollection">): Tag[] {
  return post.tagsCollection?.items ?? [];
}

/**
 * Tag slugs that clear MIN_POSTS_PER_TAG across the given posts.
 *
 * Every surface must agree. The glossary hides a tag below the threshold, and
 * `/tags/[slug]` 404s for it, and the sitemap omits it — so a pill rendered
 * without this filter would link to a dead URL. One helper, all callers.
 */
export function visibleTagSlugs(
  posts: Array<Pick<Post | ListPost, "tagsCollection">>,
) {
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of postTags(post)) {
      counts.set(tag.slug, (counts.get(tag.slug) ?? 0) + 1);
    }
  }
  return new Set(
    [...counts.entries()]
      .filter(([, n]) => n >= MIN_POSTS_PER_TAG)
      .map(([slug]) => slug),
  );
}

/**
 * Posts carrying a tag, in the order given.
 *
 * A filter rather than a query, and that is not laziness: Contentful's GraphQL
 * cannot filter a collection on an `Array<Link>` field at all, so
 * `where: { tags: { slug } }` does not exist, and the documented `linkedFrom`
 * workaround returns no ordering so it could not reproduce `date_DESC`.
 *
 * It takes the posts rather than fetching them because every caller already
 * holds the `getAllPosts` result — it needs the sitewide list anyway, to decide
 * whether the tag clears `MIN_POSTS_PER_TAG`. Passing the list in is a
 * legibility choice now, not a correctness one, see `getAllPosts` in
 * `lib/api.ts`. Order is the caller's: getAllPosts already sorts `date_DESC`.
 */
export function postsWithTag<T extends Pick<Post | ListPost, "tagsCollection">>(
  posts: T[],
  slug: string,
): T[] {
  return posts.filter((post) => postTags(post).some((t) => t.slug === slug));
}

/**
 * Posts grouped under each visible tag, tags A–Z, posts newest first.
 *
 * Order comes from the caller: getAllPosts already sorts date_DESC, so the
 * grouping preserves it rather than re-sorting. Tags below the threshold are
 * dropped entirely, along with any tag carrying no posts.
 */
export function groupPostsByTag<
  T extends Pick<Post | ListPost, "tagsCollection">,
>(posts: T[]): Array<{ tag: Tag; posts: T[] }> {
  const visible = visibleTagSlugs(posts);
  const groups = new Map<string, { tag: Tag; posts: T[] }>();

  for (const post of posts) {
    for (const tag of postTags(post)) {
      if (!visible.has(tag.slug)) continue;
      const group = groups.get(tag.slug) ?? { tag, posts: [] };
      group.posts.push(post);
      groups.set(tag.slug, group);
    }
  }

  return [...groups.values()].sort((a, b) =>
    a.tag.name.localeCompare(b.tag.name, "en-GB"),
  );
}
