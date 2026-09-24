import type { ListPost, Post } from "./types";
import { postTags } from "./tags";

/** Matches MoreStories' two-column grid; raising it is a layout change. */
export const RELATED_COUNT = 2;

type Candidate = Pick<
  Post | ListPost,
  "slug" | "date" | "category" | "tagsCollection" | "authorsCollection"
>;

// A shared category is worth roughly one shared tag of average rarity.
const CATEGORY_WEIGHT = 1;
// A shared author is a real signal but weaker than genre or topic overlap.
const AUTHOR_WEIGHT = 0.5;
// Must stay below the rarity score of the least rare tag, or recency could
// outrank a real match. Rarity only rises as the archive grows.
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

  // A future date would make recency grow past CATEGORY_WEIGHT, so clamp at
  // zero. A missing date becomes Infinity, scoring 0, never NaN in the sort.
  const timestamp = new Date(candidate.date).getTime();
  const ageDays = Number.isNaN(timestamp)
    ? Number.POSITIVE_INFINITY
    : Math.max(0, (now - timestamp) / 86_400_000);
  const recencyScore =
    RECENCY_WEIGHT * Math.pow(0.5, ageDays / RECENCY_HALF_LIFE_DAYS);

  return tagScore + categoryScore + authorScore + recencyScore;
}

/**
 * Ranked by rarity-weighted shared tags, then category, then author, with
 * recency as a tiebreaker. `allPosts` includes `current`, or every tag count is
 * off by one.
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
