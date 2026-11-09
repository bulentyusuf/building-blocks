import PostCard, { FeatureCard } from "./post-card";
import PostRow, { ROWS_PANEL } from "./post-row";
import { postTags } from "@/lib/tags";
import type { ListPost } from "@/lib/types";

// A muted mono label, with the slashes kept out of its accessible name.
export function Label({ children }: { children: string }) {
  return (
    <h2 className="mb-5 font-mono text-sm font-medium tracking-normal text-brand-muted">
      <span aria-hidden="true">{"// "}</span>
      {children}
    </h2>
  );
}

/** This many posts show as cards: the feature card, then three rows of two.
 *  Home stops there; other listings go on as rows. [→ `strands`] */
export const STREAM_POSTS = 7;

/** The latest post as a feature card, six more as cards, then every older
 *  post as a row. Home, strand, tag and author pages share it. [→ `strands`] */
export default function PostStream({
  posts,
  visibleTags,
  showStrand,
  germanSlugs,
}: {
  posts: ListPost[];
  /** False on a strand page, whose cards and rows would repeat its strand. */
  showStrand: boolean;
  /** Posts with a German version, for the rows' DE marker. [→ `locale`] */
  germanSlugs: Set<string>;
  /** Computed from all posts, so a pill never links to a 404. */
  visibleTags: Set<string>;
}) {
  const [latest, ...previous] = posts.slice(0, STREAM_POSTS);
  const older = posts.slice(STREAM_POSTS);
  return (
    <>
      {latest && (
        <section className="mt-4">
          <Label>latest post</Label>
          <FeatureCard
            post={latest}
            tags={postTags(latest).filter((t) => visibleTags.has(t.slug))}
            showStrand={showStrand}
          />
        </section>
      )}
      {previous.length > 0 && (
        <section className="mt-16">
          <Label>previous posts</Label>
          {/* Three across from xl, for a fast scan. [→ `strands`] */}
          <ul className="grid gap-8 md:grid-cols-2 md:gap-9 xl:grid-cols-3">
            {previous.map((post) => (
              <li key={post.slug} className="flex">
                <PostCard post={post} showStrand={showStrand} across={3} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {older.length > 0 && (
        <section className="mt-16">
          <Label>older posts</Label>
          <ul className={ROWS_PANEL}>
            {older.map((post) => (
              <PostRow
                key={post.slug}
                post={post}
                german={germanSlugs.has(post.slug)}
                date="long"
                showStrand={showStrand}
              />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
