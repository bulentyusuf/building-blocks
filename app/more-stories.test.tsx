/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, afterEach, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { CardPost } from "@/lib/types";

// more-stories imports cover-image, which imports lib/blur.ts, which is
// "server-only" — and that throws the moment it is evaluated outside a React
// Server Component, before any of these tests run. The fixtures below never
// render an image, but the import is hoisted regardless. Same stub as
// lib/blur.test.ts uses, for the same reason.
vi.mock("server-only", () => ({}));

const { default: MoreStories } = await import("./more-stories");

afterEach(cleanup);

// No coverImage on purpose. BrowseCard renders CoverImage only when one is
// present, so omitting it keeps next/image out of these tests entirely — the
// tag row is what is under test, not image optimisation.
function post(slug: string, tags: string[] = []): CardPost {
  return {
    slug,
    title: `Post ${slug}`,
    date: "2026-01-01",
    excerpt: `Excerpt for ${slug}`,
    tagsCollection: {
      items: tags.map((t) => ({ name: t, slug: t.toLowerCase() })),
    },
  };
}

describe("MoreStories tag pills", () => {
  it("renders no tag row when visibleTags is not passed", () => {
    render(<MoreStories morePosts={[post("a", ["Design"])]} />);

    // The post itself still renders — this is about the pills being absent,
    // not the card failing.
    expect(screen.getByText("Post a")).toBeDefined();
    expect(screen.queryByRole("list", { name: "Tags" })).toBeNull();
  });

  it("renders no tag row for a post carrying no tags", () => {
    render(
      <MoreStories morePosts={[post("a")]} visibleTags={new Set(["design"])} />,
    );

    expect(screen.queryByRole("list", { name: "Tags" })).toBeNull();
  });

  it("drops tags that are not in the visible set", () => {
    // The invariant this prop exists for. A pill links to /tags/<slug>, and
    // that route 404s for a tag below MIN_POSTS_PER_TAG, so rendering an
    // unfiltered tag would produce a link to a dead URL.
    render(
      <MoreStories
        morePosts={[post("a", ["Design", "Orphan"])]}
        visibleTags={new Set(["design"])}
      />,
    );

    expect(screen.getByRole("link", { name: "Design" })).toBeDefined();
    expect(screen.queryByRole("link", { name: "Orphan" })).toBeNull();
  });

  it("names the tag row for screen readers and links each pill to its tag page", () => {
    render(
      <MoreStories
        morePosts={[post("a", ["Design"])]}
        visibleTags={new Set(["design"])}
      />,
    );

    expect(screen.getByRole("list", { name: "Tags" })).toBeDefined();
    expect(
      screen.getByRole("link", { name: "Design" }).getAttribute("href"),
    ).toBe("/tags/design");
  });

  it("renders a tag row per post, not one for the whole list", () => {
    render(
      <MoreStories
        morePosts={[post("a", ["Design"]), post("b", ["Design"])]}
        visibleTags={new Set(["design"])}
      />,
    );

    expect(screen.getAllByRole("list", { name: "Tags" })).toHaveLength(2);
  });
});
