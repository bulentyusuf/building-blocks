import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { CardPost } from "@/lib/types";

// The page pulls in a client component that loads Pagefind's bundle from
// /pagefind at mount. Nothing here runs that effect — renderToStaticMarkup only
// produces the server HTML, which is exactly the markup a scripts-off visitor
// receives — but next/link and the emblem are stubbed to keep this a unit test
// of the page's own structure.
vi.mock("../app/search/search-emblem", () => ({
  default: () => <svg data-testid="emblem" />,
}));
vi.mock("next/headers", () => ({
  draftMode: async () => ({ isEnabled: false }),
}));

function post(slug: string, tags: string[]): CardPost {
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

// The empty-state tag list needs post data only to compute which tags clear
// groupPostsByTag's visibility threshold — the real fetcher would hit
// Contentful, so this stands in with a fixture carrying one tag above
// threshold (Design, on two posts) and one below it (Once, on a single post),
// the same way lib/tags.test.ts exercises the threshold.
vi.mock("@/lib/api", () => ({
  getAllPosts: async () => [
    post("a", ["Design"]),
    post("b", ["Design", "Once"]),
  ],
}));

const SearchPage = (await import("../app/search/page")).default;

const html = renderToStaticMarkup(await SearchPage());

describe("search page without JavaScript", () => {
  it("explains why search is unavailable", () => {
    // Pagefind mounts its input in the browser, so with scripts off the page
    // would otherwise show a heading, no search box, and no reason why.
    expect(html).toContain("<noscript>");
    expect(html).toMatch(/Search needs JavaScript/);
  });

  it("offers the two routes that browse posts without scripts", () => {
    const noscript = html.slice(
      html.indexOf("<noscript>"),
      html.indexOf("</noscript>"),
    );
    expect(noscript).toContain('href="/archive"');
    expect(noscript).toContain('href="/categories"');
  });

  it("keeps .search-empty as the immediate next sibling of .pagefind-scope", () => {
    // globals.css hides the empty-state emblem with
    // `.pagefind-scope:has(input:not(:placeholder-shown)) + .search-empty`.
    // Anything rendered between the two breaks that adjacency and strands the
    // emblem on screen while results are showing, which is why the noscript
    // block sits above the search component rather than below it.
    const scopeEnd = html.indexOf('class="pagefind-scope"');
    expect(scopeEnd).toBeGreaterThan(-1);

    const between = html.slice(scopeEnd, html.indexOf("search-empty"));
    // Exactly one element closes between the scope div opening and the
    // wrapper: the scope div itself. A stray sibling would add another
    // top-level close.
    expect(between).not.toContain("<noscript>");
    expect(between.indexOf("</div>")).toBeGreaterThan(-1);
  });

  it("puts the noscript message before the search component", () => {
    expect(html.indexOf("<noscript>")).toBeLessThan(
      html.indexOf('class="pagefind-scope"'),
    );
  });

  it("offers a tag above the visibility threshold as an entry point", () => {
    expect(html).toContain("Or start from a tag");
    expect(html).toContain('href="/tags/design"');
  });

  it("omits a tag below the visibility threshold", () => {
    // Linking it would 404 — /tags/[slug] hides the same tags the glossary
    // does, via the same helper.
    expect(html).not.toContain('href="/tags/once"');
  });

  it("keeps the tag list inside .search-empty, not a further sibling", () => {
    // Otherwise it would sit on screen after a search whose results replace
    // the emblem, rather than hiding with it.
    const emptyStart = html.indexOf('class="search-empty');
    const emptyEnd = html.indexOf("</div>", html.lastIndexOf('href="/tags/'));
    const wrapper = html.slice(emptyStart, emptyEnd);

    expect(wrapper).toContain("Or start from a tag");
  });
});
