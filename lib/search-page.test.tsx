import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// The page pulls in a client component that loads Pagefind's bundle from
// /pagefind at mount. Nothing here runs that effect — renderToStaticMarkup only
// produces the server HTML, which is exactly the markup a scripts-off visitor
// receives — but next/link is stubbed to keep this a unit test of the page's
// own structure.
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

describe("Pagefind's own bundle", () => {
  // Both files used to be created in a useEffect, so nothing about search
  // existed in the server HTML and the browser could not begin fetching either
  // until hydration had finished — four sequential round-trips (module, core,
  // WASM, index) before the input did anything, with the stylesheet arriving
  // after first paint and reflowing the page.
  //
  // Asserting on the server markup is the whole point: this is the difference
  // between the two designs, and it is invisible to every other test here.
  it("is requested from the server HTML, not after hydration", () => {
    expect(html).toContain("/pagefind/pagefind-component-ui.css");
    expect(html).toContain("/pagefind/pagefind-component-ui.js");
  });

  it("keeps both tags in the shape React will actually hoist", () => {
    // React refuses to hoist either element under conditions that are easy to
    // reintroduce by accident, and it refuses QUIETLY — the tag renders in
    // place, the fetch goes back to being late, and every other assertion here
    // still passes because the href is present either way. So both are checked
    // by the evidence that React treated them as resources rather than by the
    // props that ask it to.
    //
    // A stylesheet needs `precedence`, and React signs a hoisted one with
    // data-precedence. Drop the prop and that attribute goes with it.
    expect(html).toMatch(
      /<link rel="stylesheet" href="\/pagefind\/pagefind-component-ui\.css" data-precedence="[^"]+"\s*\/?>/,
    );

    // A script needs `async` and, critically, NEITHER onLoad nor onError —
    // isHostHoistableType rejects a script carrying one. That is why the
    // failure listener lives on a separate element created in the effect, and
    // this is what fails if a later edit moves it back onto this tag.
    const script = html.match(
      /<script[^>]*pagefind-component-ui\.js[^>]*><\/script>/,
    );
    expect(
      script,
      "the module script is missing from the server HTML",
    ).not.toBeNull();
    expect(script![0]).toContain('type="module"');
    expect(script![0]).toContain("async");

    // Both are emitted ahead of the page's own markup, which is what hoisting
    // means here: the browser starts fetching during the initial parse rather
    // than after hydration.
    expect(html.indexOf("pagefind-component-ui.js")).toBeLessThan(
      html.indexOf("pagefind-scope"),
    );
  });
});
