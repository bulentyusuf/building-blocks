import PostCard, { FeatureCard } from "./post-card";
import { postTags } from "@/lib/tags";
import type { ListPost } from "@/lib/types";

// A mono label, with the slashes kept out of its accessible name.
export function Label({ children }: { children: string }) {
  return (
    <h2 className="mb-5 font-mono text-sm font-medium tracking-normal">
      <span aria-hidden="true">{"// "}</span>
      {children}
    </h2>
  );
}

/** The latest post as a feature card, then the rest as cards. Home and the
 *  strand pages share it. [→ `strands`] */
export default function PostStream({
  posts,
  visibleTags,
}: {
  posts: ListPost[];
  /** Computed from all posts, so a pill never links to a 404. */
  visibleTags: Set<string>;
}) {
  const [latest, ...previous] = posts;
  return (
    <>
      {latest && (
        <section className="mt-4">
          <Label>latest post</Label>
          <FeatureCard
            post={latest}
            tags={postTags(latest).filter((t) => visibleTags.has(t.slug))}
          />
        </section>
      )}
      {previous.length > 0 && (
        <section className="mt-16">
          <Label>previous posts</Label>
          <ul className="grid gap-8 md:grid-cols-2 md:gap-9">
            {previous.map((post) => (
              <li key={post.slug} className="flex">
                <PostCard post={post} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
