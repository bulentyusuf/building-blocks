import { describe, it, expect } from "vitest";
import { postAuthors, postsByAuthor } from "./authors";
import type { Author } from "./types";

const author = (slug: string, name = slug): Author => ({
  name,
  slug,
  picture: { url: "https://images.ctfassets.net/placeholder.jpg" },
});

// Only the shape the helpers read. The real Post carries a dozen more fields
// none of this touches.
const post = (slug: string, ...authors: (Author | null)[]) => ({
  slug,
  authorsCollection: { items: authors },
});

describe("postAuthors", () => {
  it("flattens the collection wrapper, preserving order", () => {
    const a = author("a");
    const b = author("b");
    expect(postAuthors(post("p", a, b))).toEqual([a, b]);
  });

  it("returns an empty array when the field is absent entirely", () => {
    // The seven archived posts carry no authorsCollection at all.
    expect(postAuthors({ authorsCollection: undefined })).toEqual([]);
  });

  it("returns an empty array on an empty items array", () => {
    expect(postAuthors({ authorsCollection: { items: [] } })).toEqual([]);
  });

  it("drops a null item, which is what an unpublished author entry returns", () => {
    const a = author("a");
    expect(postAuthors(post("p", a, null))).toEqual([a]);
  });
});

describe("postsByAuthor", () => {
  it("keeps only posts crediting the author", () => {
    const a = post("a", author("x"), author("y"));
    const b = post("b", author("y"));
    const c = post("c", author("x"));

    expect(postsByAuthor([a, b, c], "x")).toEqual([a, c]);
  });

  it("preserves the caller's order rather than re-sorting", () => {
    // getAllPosts already returns date_DESC, so the filter must not disturb it.
    const first = post("first", author("x"));
    const second = post("second", author("x"));
    const third = post("third", author("x"));

    expect(
      postsByAuthor([third, first, second], "x").map((p) => p.slug),
    ).toEqual(["third", "first", "second"]);
  });

  it("returns nothing for a slug no post credits", () => {
    expect(postsByAuthor([post("a", author("x"))], "nope")).toEqual([]);
  });

  it("tolerates a post with no authors", () => {
    const empty = { slug: "u", authorsCollection: undefined };
    expect(postsByAuthor([empty, post("a", author("x"))], "x")).toHaveLength(1);
  });

  it("matches a post regardless of which position the author holds", () => {
    // Lead or not, the person is still credited — postsByAuthor does not
    // privilege authorsCollection.items[0].
    const lead = post("lead", author("x"), author("y"));
    const second = post("second", author("y"), author("x"));

    expect(postsByAuthor([lead, second], "x")).toEqual([lead, second]);
  });
});
