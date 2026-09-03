import { describe, it, expect } from "vitest";
import { relatedPosts, RELATED_COUNT } from "./related";

const PINNED_NOW = new Date("2026-09-03T12:00:00Z").getTime();

const makePost = ({
  slug,
  date = "2026-01-01T00:00:00Z",
  tags = [],
  categorySlug,
  authorSlugs = [],
}: {
  slug: string;
  date?: string;
  tags?: string[];
  categorySlug?: string;
  authorSlugs?: string[];
}) => ({
  slug,
  date,
  category: categorySlug
    ? { name: categorySlug, slug: categorySlug }
    : undefined,
  tagsCollection: { items: tags.map((t) => ({ name: t, slug: t })) },
  authorsCollection: {
    items: authorSlugs.map((a) => ({
      name: a,
      slug: a,
      picture: { url: "" },
    })),
  },
});

describe("relatedPosts", () => {
  describe("known-bad control (rarity weighting vs flat counting)", () => {
    it("ranks a post sharing one rare tag above a post sharing one common tag", () => {
      // 10 posts total:
      // - "common" tag shared by 6 posts: x, y, d1, d2, d3, d4
      // - "rare" tag shared by 2 posts: x, z
      // - o1, o2 carry unrelated tags to round the corpus to 10
      const current = makePost({
        slug: "x",
        tags: ["common", "rare"],
        date: "2026-01-01T00:00:00Z",
      });
      const postCommonOnly = makePost({
        slug: "y",
        tags: ["common"],
        date: "2026-01-02T00:00:00Z",
      });
      const postRareOnly = makePost({
        slug: "z",
        tags: ["rare"],
        date: "2026-01-01T00:00:00Z",
      });

      const corpus = [
        current,
        postCommonOnly,
        postRareOnly,
        makePost({ slug: "d1", tags: ["common"] }),
        makePost({ slug: "d2", tags: ["common"] }),
        makePost({ slug: "d3", tags: ["common"] }),
        makePost({ slug: "d4", tags: ["common"] }),
        makePost({ slug: "o1", tags: ["other-1"] }),
        makePost({ slug: "o2", tags: ["other-2"] }),
        makePost({ slug: "o3", tags: ["other-3"] }),
      ];

      expect(corpus).toHaveLength(10);

      // A flat counter scores x-y and x-z equally (1 shared tag each).
      // The rarity-weighted scorer computes:
      // rarity(common) = log(10/6) ≈ 0.511
      // rarity(rare)   = log(10/2) ≈ 1.609
      // Even with y slightly newer than z, z decisively beats y.
      const results = relatedPosts(current, corpus, 2, PINNED_NOW);

      expect(results[0].slug).toBe("z");
      expect(results[1].slug).toBe("y");
    });
  });

  describe("self-exclusion", () => {
    it("never includes the current post in its own results", () => {
      const current = makePost({ slug: "current", tags: ["tech", "ai"] });
      const other = makePost({ slug: "other", tags: ["tech", "ai"] });
      const corpus = [current, other];

      const results = relatedPosts(current, corpus, 2, PINNED_NOW);
      expect(results.some((p) => p.slug === "current")).toBe(false);
      expect(results.map((p) => p.slug)).toEqual(["other"]);
    });
  });

  describe("category weighting", () => {
    it("ranks a category match above no match at all when neither shares tags", () => {
      const current = makePost({
        slug: "current",
        categorySlug: "main-quest",
        tags: ["alpha"],
      });
      const sameCategory = makePost({
        slug: "same-cat",
        categorySlug: "main-quest",
        tags: ["beta"],
      });
      const differentCategory = makePost({
        slug: "diff-cat",
        categorySlug: "side-quest",
        tags: ["gamma"],
      });

      const results = relatedPosts(
        current,
        [current, differentCategory, sameCategory],
        2,
        PINNED_NOW,
      );

      expect(results[0].slug).toBe("same-cat");
    });
  });

  describe("author overlap weighting", () => {
    it("boosts posts that share an author", () => {
      const current = makePost({
        slug: "current",
        authorSlugs: ["bulent-yusuf"],
      });
      const sharedAuthor = makePost({
        slug: "shared-author",
        authorSlugs: ["bulent-yusuf"],
      });
      const differentAuthor = makePost({
        slug: "diff-author",
        authorSlugs: ["trippy-robot"],
      });

      const results = relatedPosts(
        current,
        [current, differentAuthor, sharedAuthor],
        2,
        PINNED_NOW,
      );

      expect(results[0].slug).toBe("shared-author");
    });
  });

  describe("recency behavior", () => {
    it("breaks ties between candidates with identical tag and category matches using date", () => {
      const current = makePost({
        slug: "current",
        tags: ["games"],
        categorySlug: "reviews",
      });
      const newer = makePost({
        slug: "newer",
        tags: ["games"],
        categorySlug: "reviews",
        date: "2026-06-01T00:00:00Z",
      });
      const older = makePost({
        slug: "older",
        tags: ["games"],
        categorySlug: "reviews",
        date: "2025-01-01T00:00:00Z",
      });

      const results = relatedPosts(
        current,
        [current, older, newer],
        2,
        PINNED_NOW,
      );

      expect(results[0].slug).toBe("newer");
      expect(results[1].slug).toBe("older");
    });

    it("never lets recency overpower an older post with a genuine tag match", () => {
      // 10 posts total so tag rarity has a realistic floor
      const current = makePost({
        slug: "current",
        tags: ["niche-topic"],
        date: "2026-09-01T00:00:00Z",
      });
      // 1 year old (365+ days ago), but has a genuine tag match
      const olderMatched = makePost({
        slug: "older-matched",
        tags: ["niche-topic"],
        date: "2025-09-01T00:00:00Z",
      });
      // Published yesterday (1 day ago), but zero tag or category overlap
      const yesterdayUnrelated = makePost({
        slug: "yesterday-unrelated",
        tags: ["completely-unrelated"],
        date: "2026-09-02T00:00:00Z",
      });

      const dummyPosts = Array.from({ length: 7 }, (_, i) =>
        makePost({ slug: `dummy-${i}`, tags: ["dummy"] }),
      );

      const corpus = [current, olderMatched, yesterdayUnrelated, ...dummyPosts];

      const results = relatedPosts(current, corpus, 2, PINNED_NOW);

      // The 1-year-old post with the tag match MUST win over the yesterday post with 0 matches
      expect(results[0].slug).toBe("older-matched");
    });
  });

  describe("small corpus handling", () => {
    it("returns whatever is available when fewer than RELATED_COUNT candidates exist", () => {
      const current = makePost({ slug: "p1" });
      const onlyOther = makePost({ slug: "p2" });

      const results = relatedPosts(
        current,
        [current, onlyOther],
        2,
        PINNED_NOW,
      );
      expect(results).toHaveLength(1);
      expect(results[0].slug).toBe("p2");
    });

    it("returns empty array when current is the only post", () => {
      const current = makePost({ slug: "solo" });
      const results = relatedPosts(current, [current], 2, PINNED_NOW);
      expect(results).toEqual([]);
    });
  });
});
