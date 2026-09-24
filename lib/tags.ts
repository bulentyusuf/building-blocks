import type { ListPost, Post, Tag } from "./types";

/** A one-post tag connects nothing, so two is the floor for rendering it. */
export const MIN_POSTS_PER_TAG = 2;

export function postTags(post: Pick<Post | ListPost, "tagsCollection">): Tag[] {
  return post.tagsCollection?.items ?? [];
}

/**
 * Slugs clearing the threshold across the given posts. The glossary, the
 * sitemap and `/tags/[slug]` all read this, so no pill links to a 404.
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
 * A filter, not a query: Contentful cannot filter on an `Array<Link>` field.
 * Order is the caller's. [→ `tag-pages`]
 */
export function postsWithTag<T extends Pick<Post | ListPost, "tagsCollection">>(
  posts: T[],
  slug: string,
): T[] {
  return posts.filter((post) => postTags(post).some((t) => t.slug === slug));
}

/** Posts under each visible tag, tags A–Z, caller's post order kept. */
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
