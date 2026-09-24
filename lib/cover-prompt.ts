import type { Post } from "./types";

// The prompt block that made this post's cover, matched on the asset URL, which
// embeds the asset id. Only this post's own blocks are searched.
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
