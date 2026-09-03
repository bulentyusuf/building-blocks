import type { Author, ListPost, Post } from "./types";

/** Authors on a post, flattened out of Contentful's collection wrapper. */
export function postAuthors(
  post: Pick<Post | ListPost, "authorsCollection">,
): Author[] {
  return post.authorsCollection?.items ?? [];
}
