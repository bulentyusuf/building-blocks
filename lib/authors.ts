import type { Post, ListPost } from "./types";

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
>(
  post: T,
): NonNullable<NonNullable<T["authorsCollection"]>["items"][number]>[] {
  // The return type is derived from T rather than fixed to Author[] because
  // ListPost narrows its items to Omit<Author, "bio">, and a predicate of
  // `a is Author` widened that straight back. A bio read off a list-sourced
  // post then typechecked and rendered nothing, which is the exact failure the
  // Omit on ListPost exists to prevent. bio is optional on Author, so the Omit
  // never blocked assignment, only property access, and only this signature
  // preserves that.
  return (post.authorsCollection?.items ?? []).filter(
    (a): a is NonNullable<typeof a> => a != null,
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
 * It takes the posts rather than fetching them, because `getAllPosts` is not
 * `cache()`-wrapped — a fetcher wrapping it here would be a second identical
 * request on every caller, all of which already hold the sitewide list.
 */
export function postsByAuthor<
  T extends Pick<Post | ListPost, "authorsCollection">,
>(posts: T[], slug: string): T[] {
  return posts.filter((post) => postAuthors(post).some((a) => a.slug === slug));
}
