import { describe, it, expect } from "vitest";
import { jsonLdHtml, postAuthorsNode } from "./json-ld";
import { SITE_AUTHOR, SITE_URL } from "./constants";

describe("jsonLdHtml", () => {
  it("escapes the three HTML-significant characters", () => {
    const out = jsonLdHtml({ v: "<script>a & b</script>" });
    expect(out).not.toContain("<");
    expect(out).not.toContain(">");
    expect(out).not.toContain("&");
    expect(out).toContain("\\u003c");
    expect(out).toContain("\\u003e");
    expect(out).toContain("\\u0026");
  });
});

describe("postAuthorsNode", () => {
  it("falls back to SITE_AUTHOR with no url for zero authors", () => {
    const node = postAuthorsNode([]);
    expect(node).toEqual({ "@type": "Person", name: SITE_AUTHOR });
    expect(Array.isArray(node)).toBe(false);
  });

  it("returns a bare object, not a one-element array, for a single author", () => {
    // Criterion 1: every post on the site today has exactly one author, and
    // this is the case that must render byte-identical JSON-LD to before
    // `authors` existed. A one-element array here would deep-equal nothing
    // useful and pass a looser assertion, which is why this checks
    // Array.isArray directly rather than trusting a shape match alone.
    const node = postAuthorsNode([
      { name: "Bulent Yusuf", slug: "bulent-yusuf" },
    ]);
    expect(Array.isArray(node)).toBe(false);
    expect(node).toEqual({
      "@type": "Person",
      name: "Bulent Yusuf",
      url: `${SITE_URL}/authors/bulent-yusuf`,
    });
  });

  it("omits url for a single author with no slug", () => {
    const node = postAuthorsNode([{ name: "No Slug" }]);
    expect(node).toEqual({ "@type": "Person", name: "No Slug" });
  });

  it("returns an array of Person nodes for two authors", () => {
    const node = postAuthorsNode([
      { name: "Trippy Robot", slug: "trippy-robot" },
      { name: "Bulent Yusuf", slug: "bulent-yusuf" },
    ]);
    expect(Array.isArray(node)).toBe(true);
    expect(node).toEqual([
      {
        "@type": "Person",
        name: "Trippy Robot",
        url: `${SITE_URL}/authors/trippy-robot`,
      },
      {
        "@type": "Person",
        name: "Bulent Yusuf",
        url: `${SITE_URL}/authors/bulent-yusuf`,
      },
    ]);
  });

  it("returns an array of three, preserving order", () => {
    const node = postAuthorsNode([
      { name: "A", slug: "a" },
      { name: "B", slug: "b" },
      { name: "C", slug: "c" },
    ]);
    expect(Array.isArray(node) && node.map((n) => n.name)).toEqual([
      "A",
      "B",
      "C",
    ]);
  });

  it("the empty-array known-bad control: a naive [] would serialise as an array, not the bare object", () => {
    // The failure mode this whole file exists to catch: swapping
    // postAuthorsNode's zero-author branch for `authors.map(...)` over an
    // empty array silently returns [] instead of the SITE_AUTHOR fallback,
    // and a parsed-object-only assertion could still pass if it only checked
    // "is this an object with a name field" loosely. Pin both the type and
    // the content together.
    const node = postAuthorsNode([]);
    expect(node).not.toEqual([]);
    expect((node as { name: string }).name).toBe(SITE_AUTHOR);
  });
});
