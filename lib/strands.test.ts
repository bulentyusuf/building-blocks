import { describe, it, expect } from "vitest";
import { currentStrand } from "./strands";

// The header presses one chip per page. [→ `strands`]
describe("currentStrand", () => {
  const postStrands = { "a-film": "films" };

  it("presses All on home and a strand on its own page", () => {
    expect(currentStrand("/", postStrands)).toEqual({
      slug: "all",
      onPost: false,
    });
    expect(currentStrand("/categories/films", postStrands)).toEqual({
      slug: "films",
      onPost: false,
    });
  });

  it("presses a post's strand in both languages, marked as a post", () => {
    for (const path of ["/posts/a-film", "/de/posts/a-film"])
      expect(currentStrand(path, postStrands)).toEqual({
        slug: "films",
        onPost: true,
      });
  });

  it("presses nothing elsewhere, or for a post it cannot place", () => {
    for (const path of ["/archive", "/categories", "/posts/unknown", "/tags/x"])
      expect(currentStrand(path, postStrands)).toBeNull();
  });
});
