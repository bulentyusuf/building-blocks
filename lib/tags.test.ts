import { describe, it, expect } from "vitest";
import {
  MIN_POSTS_PER_TAG,
  groupPostsByTag,
  postTags,
  postsWithTag,
  visibleTagSlugs,
} from "./tags";
import type { Tag } from "./types";

const tag = (slug: string, name = slug): Tag => ({ name, slug });

// Only the shape the helpers read. The real ListPost carries a dozen more
// fields none of this touches.
const post = (slug: string, ...tags: Tag[]) => ({
  slug,
  tagsCollection: { items: tags },
});

describe("postTags", () => {
  it("flattens the collection wrapper", () => {
    expect(postTags(post("a", tag("x")))).toEqual([tag("x")]);
  });

  it("returns an empty array when the field is absent", () => {
    // An untagged post comes back with no tagsCollection at all, not an empty
    // one, so the callers must not have to distinguish the two.
    expect(postTags({ tagsCollection: undefined })).toEqual([]);
  });
});

describe("null tag items", () => {
  // Contentful returns null in tagsCollection for an unpublished tag.
  const withNull = { slug: "n", tagsCollection: { items: [null, tag("x")] } };

  it("postTags drops a null item", () => {
    expect(postTags(withNull)).toEqual([tag("x")]);
  });

  it("visibleTagSlugs counts past a null item rather than throwing", () => {
    expect(visibleTagSlugs([withNull, post("b", tag("x"))])).toEqual(
      new Set(["x"]),
    );
  });
});

describe("visibleTagSlugs", () => {
  it("hides a tag carried by a single post", () => {
    const visible = visibleTagSlugs([post("a", tag("lonely"))]);
    expect(visible.has("lonely")).toBe(false);
  });

  it("shows a tag once it reaches the threshold", () => {
    const posts = Array.from({ length: MIN_POSTS_PER_TAG }, (_, i) =>
      post(`p${i}`, tag("shared")),
    );
    expect(visibleTagSlugs(posts).has("shared")).toBe(true);
  });

  it("counts each tag independently", () => {
    const visible = visibleTagSlugs([
      post("a", tag("shared"), tag("lonely")),
      post("b", tag("shared")),
    ]);
    expect(visible.has("shared")).toBe(true);
    expect(visible.has("lonely")).toBe(false);
  });
});

describe("postsWithTag", () => {
  it("keeps only posts carrying the tag", () => {
    const a = post("a", tag("ai"), tag("css"));
    const b = post("b", tag("css"));
    const c = post("c", tag("ai"));

    expect(postsWithTag([a, b, c], "ai")).toEqual([a, c]);
  });

  it("preserves the caller's order rather than re-sorting", () => {
    // getAllPosts already returns date_DESC, so the filter must not disturb it.
    const first = post("first", tag("ai"));
    const second = post("second", tag("ai"));
    const third = post("third", tag("ai"));

    expect(
      postsWithTag([third, first, second], "ai").map((p) => p.slug),
    ).toEqual(["third", "first", "second"]);
  });

  it("returns nothing for a tag no post carries", () => {
    expect(postsWithTag([post("a", tag("ai"))], "nope")).toEqual([]);
  });

  it("tolerates a post with no tags", () => {
    const untagged = { slug: "u", tagsCollection: undefined };
    expect(postsWithTag([untagged, post("a", tag("ai"))], "ai")).toHaveLength(
      1,
    );
  });
});

describe("groupPostsByTag", () => {
  it("groups posts under each tag and sorts tags A-Z", () => {
    const groups = groupPostsByTag([
      post("a", tag("zebra", "Zebra"), tag("apple", "Apple")),
      post("b", tag("zebra", "Zebra"), tag("apple", "Apple")),
    ]);
    expect(groups.map((g) => g.tag.slug)).toEqual(["apple", "zebra"]);
    expect(groups[0].posts.map((p) => p.slug)).toEqual(["a", "b"]);
  });

  it("preserves the order posts arrive in", () => {
    // getAllPosts returns date_DESC and the glossary must not disturb it, so
    // the grouping appends rather than sorting.
    const groups = groupPostsByTag([
      post("newest", tag("t")),
      post("middle", tag("t")),
      post("oldest", tag("t")),
    ]);
    expect(groups[0].posts.map((p) => p.slug)).toEqual([
      "newest",
      "middle",
      "oldest",
    ]);
  });

  it("omits tags below the threshold entirely", () => {
    const groups = groupPostsByTag([
      post("a", tag("shared"), tag("lonely")),
      post("b", tag("shared")),
    ]);
    expect(groups.map((g) => g.tag.slug)).toEqual(["shared"]);
  });

  it("returns nothing when no tag reaches the threshold", () => {
    expect(groupPostsByTag([post("a", tag("x")), post("b", tag("y"))])).toEqual(
      [],
    );
  });

  it("agrees with visibleTagSlugs, so pills never outlive their pages", () => {
    // Pills filter by visibleTagSlugs and link to /tags/<slug>. If the glossary
    // dropped a tag the pills still rendered, that link would point at a route
    // which 404s, because the tag page gates on the same helper.
    const posts = [
      post("a", tag("shared"), tag("lonely")),
      post("b", tag("shared")),
    ];
    const visible = visibleTagSlugs(posts);
    const grouped = new Set(groupPostsByTag(posts).map((g) => g.tag.slug));
    expect(grouped).toEqual(visible);
  });
});
