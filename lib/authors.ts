import type { Post, ListPost, Author } from "./types";

/**
 * Authors on a post, in credit order, flattened out of Contentful's collection
 * wrapper. The first entry is the lead author.
 *
 * The null filter is not defensive padding. Contentful returns `null` items in
 * a link array when a referenced entry is unpublished, and an unpublished
 * author entry would otherwise throw the moment a caller reads `.slug`.
 */
export function postAuthors<
  T extends Pick<Post | ListPost, "authorsCollection">,
>(post: T): Author[] {
  return (post.authorsCollection?.items ?? []).filter(
    (a): a is Author => a != null,
  );
}

/**
 * Posts a person is credited on, in the order given.
 *
 * A filter rather than a query, and that is not laziness: `authors` is an
 * Array<Link>, so `where: { authors: { slug } }` does not exist — the same
 * wall postsWithTag hit in lib/tags.ts. The documented `linkedFrom` workaround
 * also returns no ordering, so it could not reproduce `date_DESC` either way.
 *
 * It takes the posts rather than fetching them because every caller already
 * holds the sitewide list. `getAllPosts` is `cache()`-wrapped now, so a fetcher
 * here would dedupe rather than duplicate, but passing the list in still keeps
 * the data flow visible at the call site.
 */
export function postsByAuthor<
  T extends Pick<Post | ListPost, "authorsCollection">,
>(posts: T[], slug: string): T[] {
  return posts.filter((post) => postAuthors(post).some((a) => a.slug === slug));
}
