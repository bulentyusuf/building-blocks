import type { Post, ListPost, Contributor } from "./types";

/**
 * Contributors on a post, flattened out of Contentful's collection wrapper and
 * deduplicated against the primary author.
 *
 * The dedupe is not defensive tidying, it is the only thing standing between
 * the editor and a post that reads "By Bulent" directly above "With Bulent".
 * Contentful cannot express "any author except the one in the author field" as
 * a validation, so the rule has to live here. Matching is on slug because that
 * is the identity the rest of the site routes on, and an entry without one
 * cannot collide with a linked byline anyway.
 */
export function postContributors(
  post: Pick<Post | ListPost, "contributorsCollection"> & {
    author?: { slug?: string };
  },
): Contributor[] {
  const primary = post.author?.slug;
  return (post.contributorsCollection?.items ?? []).filter(
    (c) => !primary || c.slug !== primary,
  );
}

/**
 * Posts a person contributed to, in the order given.
 *
 * A filter rather than a query, and for the same reason postsWithTag is one.
 * Contentful's GraphQL cannot filter a collection on an Array<Link> field, so
 * `where: { contributors: { slug } }` does not exist, and the linkedFrom
 * workaround returns no ordering so it could not reproduce date_DESC.
 *
 * It takes the posts rather than fetching them. getAllPosts is not
 * cache()-wrapped, so a fetcher in here would issue a second identical request
 * on every caller that already holds the list, which every caller does.
 *
 * No caller today — the "contributed to" section on author pages this backed
 * was cancelled 2 September 2026, see CLAUDE.md. Kept anyway: it is six lines,
 * documents the Array<Link> filtering constraint at the point someone would
 * next hit it, and deleting it would only invite the same query to be
 * attempted from scratch.
 */
export function postsWithContributor<
  T extends Pick<Post | ListPost, "contributorsCollection">,
>(posts: T[], slug: string): T[] {
  return posts.filter((post) =>
    (post.contributorsCollection?.items ?? []).some((c) => c.slug === slug),
  );
}
