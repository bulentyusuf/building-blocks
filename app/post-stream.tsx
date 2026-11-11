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

/** This many posts show as cards: the feature card, then a wide pair and a
 *  row of three. Home stops there; other listings go on as rows. [→ `strands`] */
export const STREAM_POSTS = 6;

/** The latest post as a feature card, five more as cards, then every older
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
  // From xl: two across for 2 or 4 cards, three otherwise. Five sit 2 + 3 on
  // six columns, the newer pair wide, so size steps down with age. Below xl
  // the fifth takes the row side by side rather than sit alone. [→ `strands`]
  const five = previous.length === 5;
  const across = previous.length === 2 || previous.length === 4 ? 2 : 3;
  // The pair spans half the row, so it sizes and sets type as two across.
  const cardAcross = (i: number) =>
    !five ? across : i < 2 ? 2 : i === 4 ? "closing" : 3;
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
          {/* Whole class strings, so Tailwind sees each one. */}
          <ul
            className={
              five
                ? "grid gap-8 md:grid-cols-2 md:gap-9 xl:grid-cols-6"
                : across === 3
                  ? "grid gap-8 md:grid-cols-2 md:gap-9 xl:grid-cols-3"
                  : "grid gap-8 md:grid-cols-2 md:gap-9"
            }
          >
            {previous.map((post, i) => (
              <li
                key={post.slug}
                className={
                  !five
                    ? "flex"
                    : i < 2
                      ? "flex xl:col-span-3"
                      : i === 4
                        ? "flex md:col-span-2 xl:col-span-2"
                        : "flex xl:col-span-2"
                }
              >
                <PostCard
                  post={post}
                  showStrand={showStrand}
                  across={cardAcross(i)}
                />
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
