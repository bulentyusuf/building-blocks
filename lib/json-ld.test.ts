import { describe, it, expect } from "vitest";
import { jsonLdHtml, postAuthorNode, postContributorNodes } from "./json-ld";
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

describe("postAuthorNode", () => {
  it("deep-equals the literal the page emitted before this change", () => {
    const node = postAuthorNode({ name: "Bulent Yusuf", slug: "bulent-yusuf" });
    expect(node).toEqual({
      "@type": "Person",
      name: "Bulent Yusuf",
      url: `${SITE_URL}/authors/bulent-yusuf`,
    });
  });

  it("falls back to SITE_AUTHOR with no author, and omits url rather than emitting it undefined", () => {
    const node = postAuthorNode(undefined);
    expect(node).toEqual({ "@type": "Person", name: SITE_AUTHOR });

    // JSON.stringify drops undefined values, so a parsed-object assertion alone
    // would not catch a url key that is present but undefined. Assert against
    // the serialised string instead.
    const serialised = jsonLdHtml({ author: node });
    expect(serialised).not.toContain('"url"');
  });
});

describe("postContributorNodes", () => {
  it("returns undefined for an empty list, and the key is absent from the serialised output", () => {
    expect(postContributorNodes([])).toBeUndefined();

    // The known-bad control: an empty ARRAY here would serialise as
    // "contributor":[] and every parsed-object assertion would still pass.
    const serialised = jsonLdHtml({
      author: postAuthorNode(undefined),
      contributor: postContributorNodes([]),
    });
    expect(serialised).not.toContain("contributor");
  });

  it("returns a one-element array for one contributor", () => {
    const nodes = postContributorNodes([
      { name: "Genial Yeti", slug: "genial-yeti" },
    ]);
    expect(nodes).toEqual([
      {
        "@type": "Person",
        name: "Genial Yeti",
        url: `${SITE_URL}/authors/genial-yeti`,
      },
    ]);
  });

  it("omits url for a contributor with no slug", () => {
    const nodes = postContributorNodes([{ name: "No Slug" }]);
    expect(nodes).toEqual([{ "@type": "Person", name: "No Slug" }]);
  });
});
