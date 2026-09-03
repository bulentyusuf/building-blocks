import type { ListPost, Post, Tag } from "./types";
import { postTags } from "./tags";

/**
 * How many related posts to surface. Matches the two-column grid in
 * MoreStories' `grid` variant (app/more-stories.tsx). Raising this needs a
 * layout change first, not just a bigger slice.
 */
export const RELATED_COUNT = 2;

type Candidate = Pick<
  Post | ListPost,
  "slug" | "date" | "category" | "tagsCollection" | "authorsCollection"
>;

// A shared category is worth roughly one shared tag of average rarity.
const CATEGORY_WEIGHT = 1;
// A shared author is a real signal but weaker than genre or topic overlap.
const AUTHOR_WEIGHT = 0.5;
// The ceiling on the recency nudge. Must stay below the rarity score of even
// the LEAST rare tag in the corpus, or a merely-recent post could outrank a
// genuinely well-matched older one. At today's ~21 posts the most common
// visible tag scores upward of 0.9; 0.3 has headroom under that and will
// keep having headroom as the archive grows, since rarity only rises as the
// denominator (posts sharing the tag) grows slower than the numerator
// (total posts).
const RECENCY_WEIGHT = 0.3;
const RECENCY_HALF_LIFE_DAYS = 180;

function tagRarity(posts: Candidate[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of postTags(post)) {
      counts.set(tag.slug, (counts.get(tag.slug) ?? 0) + 1);
    }
  }
  const total = posts.length;
  return new Map(
    [...counts].map(([slug, count]) => [slug, Math.log(total / count)]),
  );
}

function authorSlugs(post: Candidate): Set<string> {
  return new Set(
    (post.authorsCollection?.items ?? [])
      .filter((a): a is NonNullable<typeof a> => a != null && !!a.slug)
      .map((a) => a.slug as string),
  );
}

function score(
  current: Candidate,
  candidate: Candidate,
  rarity: Map<string, number>,
  now: number,
): number {
  const currentTags = new Set(postTags(current).map((t) => t.slug));
  const tagScore = postTags(candidate)
    .filter((t) => currentTags.has(t.slug))
    .reduce((sum, t) => sum + (rarity.get(t.slug) ?? 0), 0);

  const categoryScore =
    current.category?.slug && current.category.slug === candidate.category?.slug
      ? CATEGORY_WEIGHT
      : 0;

  const currentAuthors = authorSlugs(current);
  const authorScore = [...authorSlugs(candidate)].some((s) =>
    currentAuthors.has(s),
  )
    ? AUTHOR_WEIGHT
    : 0;

  const ageDays = (now - new Date(candidate.date).getTime()) / 86_400_000;
  const recencyScore =
    RECENCY_WEIGHT * Math.pow(0.5, ageDays / RECENCY_HALF_LIFE_DAYS);

  return tagScore + categoryScore + authorScore + recencyScore;
}

/**
 * The `count` posts most related to `current`, ranked by shared tags
 * (weighted by rarity across `allPosts`), then category, then author
 * overlap, then recency as a tiebreaker only.
 *
 * `allPosts` should be the full published set, current post included — the
 * rarity baseline needs the whole corpus, not the candidate pool with the
 * current post already removed, or every tag's count would be off by one.
 * `now` defaults to the real clock and is a parameter so tests can pin it.
 */
export function relatedPosts<T extends Candidate>(
  current: T,
  allPosts: T[],
  count = RELATED_COUNT,
  now = Date.now(),
): T[] {
  const rarity = tagRarity(allPosts);
  return allPosts
    .filter((p) => p.slug !== current.slug)
    .map((p) => ({ post: p, score: score(current, p, rarity, now) }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        new Date(b.post.date).getTime() - new Date(a.post.date).getTime() ||
        a.post.slug.localeCompare(b.post.slug),
    )
    .slice(0, count)
    .map((x) => x.post);
}
