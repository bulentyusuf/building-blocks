import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

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

// Two posts carry "design", clearing MIN_POSTS_PER_TAG; one carries "solo"
// alone, so the empty state's own filtering is under test here rather than
// trusted from groupPostsByTag's unit tests alone — a tag rendered on this
// page that /tags/[slug] then 404s on is exactly the bug the threshold exists
// to prevent.
vi.mock("@/lib/api", () => ({
  getAllPosts: async () => [
    { tagsCollection: { items: [{ name: "Design", slug: "design" }] } },
    { tagsCollection: { items: [{ name: "Design", slug: "design" }] } },
    { tagsCollection: { items: [{ name: "Solo", slug: "solo" }] } },
  ],
}));

const { default: SearchPage } = await import("../app/search/page");

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
    // globals.css hides the empty-state wrapper (emblem plus tag list) with
    // `.pagefind-scope:has(input:not(:placeholder-shown)) + .search-empty`.
    // Anything rendered between the two breaks that adjacency and strands the
    // wrapper on screen while results are showing, which is why the noscript
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
});

describe("search page tag entry point", () => {
  it("offers a link for every tag that clears the visibility threshold", () => {
    expect(html).toContain("Or start from a tag");
    expect(html).toContain('href="/tags/design"');
    expect(html).toContain(">Design<");
  });

  it("drops a tag below MIN_POSTS_PER_TAG", () => {
    // "Solo" is carried by a single post in the fixture above, one short of
    // the threshold — the same guarantee /tags and every other surface give,
    // so a tag entry here can never be one /tags/[slug] 404s on.
    expect(html).not.toContain("/tags/solo");
    expect(html).not.toContain(">Solo<");
  });

  it("names the list from the visible label, not a second aria-label", () => {
    expect(html).toContain('id="tag-entry-label"');
    expect(html).toContain('aria-labelledby="tag-entry-label"');
    expect(html).not.toContain('aria-label="Tags"');
  });

  it("keeps the tag list inside .search-empty, not beside it", () => {
    // The wrapper is what globals.css hides on the first keystroke (see the
    // adjacency test above); a tag list rendered as a sibling instead would
    // survive a search rather than disappearing with the rest of the empty
    // state.
    const wrapperOpen = html.indexOf('class="search-empty"');
    const tagLabel = html.indexOf("Or start from a tag");
    expect(wrapperOpen).toBeGreaterThan(-1);
    expect(tagLabel).toBeGreaterThan(wrapperOpen);
  });
});
