import type { Post } from "./types";

// The id of the prompt block that made this post's cover, or undefined when
// the post has none. Drives the "Prompt" pill on the post hero and the anchor
// it jumps to.
//
// Matched on the asset URL rather than a flag on the prompt block: every
// cover prompt already carries its cover as the thumbnail, so the link needs
// no schema change and no editorial step. A Contentful asset URL embeds the
// asset id, so two URLs are equal exactly when the asset is the same. Only
// blocks embedded in this post's own body are searched, so a cover reused
// elsewhere cannot pull in another post's prompt.
export function coverPromptId(
  post: Pick<Post, "coverImage" | "content">,
): string | undefined {
  const coverUrl = post.coverImage?.url;
  if (!coverUrl) return undefined;
  const blocks = post.content?.links?.entries?.block ?? [];
  const match = blocks.find(
    (entry) =>
      entry?.__typename === "PromptBlock" && entry.image?.url === coverUrl,
  );
  return match?.sys.id;
}
