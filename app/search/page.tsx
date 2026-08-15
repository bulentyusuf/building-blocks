import Link from "next/link";
import { draftMode } from "next/headers";
import Container from "../container";
import Breadcrumb, { type Crumb } from "../breadcrumb";
import SearchClient from "./search-client";
import SearchEmblem from "./search-emblem";
import { getAllPosts } from "@/lib/api";
import { groupPostsByTag } from "@/lib/tags";

// noindex: a search page is thin content by definition and search engines
// should discover posts directly, not via this page.
export const metadata = {
  title: "Search",
  description: "Search every post on the site.",
  robots: { index: false },
};

export default async function SearchPage() {
  const { isEnabled } = await draftMode();
  // groupPostsByTag already carries the visibility threshold and the A–Z
  // sort the glossary uses — reused here for its tag list alone, so a tag
  // linked from the empty state can never be one /tags/[slug] 404s on.
  const tags = groupPostsByTag(await getAllPosts(isEnabled)).map(
    (g) => g.tag,
  );

  const crumbs: Crumb[] = [{ label: "Home", href: "/" }, { label: "Search" }];

  return (
    <Container>
      {/* Constrained to the section's own measure. Container is max-w-5xl, so
          an unwrapped breadcrumb starts 176px left of the heading it labels.
          Must sit BEFORE the <section>: the empty-state emblem is hidden by a
          .pagefind-scope + .search-empty sibling selector, both inside the
          section — a breadcrumb placed within would break that adjacency. */}
      <div className="mx-auto max-w-2xl">
        <Breadcrumb items={crumbs} />
      </div>
      <section className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-4xl md:text-5xl">Search</h1>
        {/* Pagefind's UI is mounted in the browser, so with scripts off the
            input never appears and the page reads as broken rather than
            unavailable. Says why, and points at the two routes that browse the
            same posts without needing JavaScript.

            Placed BEFORE <SearchClient />, not between it and the emblem: the
            empty state is hidden by a `.pagefind-scope + .search-empty`
            adjacent-sibling rule in globals.css, and an element inserted
            between the two would break it, leaving the emblem on screen while
            results are showing. Plain <a> rather than <Link>, since client
            navigation is meaningless in a noscript block. */}
        <noscript>
          <p className="mb-6 text-brand-muted">
            Search needs JavaScript. The index runs entirely in your browser, so
            no query ever leaves this page — which also means there is nothing
            to search with when scripts are turned off. The{" "}
            <a
              href="/archive"
              className="font-bold text-brand-crimson transition-opacity duration-200 hover:opacity-80"
            >
              archive
            </a>{" "}
            lists every post by year, and{" "}
            <a
              href="/categories"
              className="font-bold text-brand-crimson transition-opacity duration-200 hover:opacity-80"
            >
              categories
            </a>{" "}
            group them by subject.
          </p>
        </noscript>
        <SearchClient />
        {/* Empty state. The whole wrapper is hidden by CSS as soon as the
            input has text (see globals.css) — it must stay the immediate
            next sibling of <SearchClient />'s .pagefind-scope root for that
            `.pagefind-scope + .search-empty` rule to match, which is why the
            tag list below lives INSIDE this div rather than as a further
            sibling: one empty-state block, not a second thing to hide. */}
        <div className="search-empty mt-10">
          {/* Inline SVG so currentColor picks up the ink colour. Knockout
              artwork: the hat, face and eye are gaps where the ground shows
              through the ink, which only reads on a light ground. In dark
              mode the cream ground is the glass's own silhouette, drawn
              inside the SVG (see search-emblem.tsx), so the whole magnifying
              glass is lit and there is no floating plate. The ink is forced
              to the light crimson #9E2238 in dark mode (never the token,
              which is lifted to #EC8494 for link legibility and looks washed
              out on cream): the emblem is on cream in both schemes, so it
              should be the same colour in both. p-8, shared by both schemes,
              sets a single emblem size across light and dark. */}
          <figure className="mx-auto max-w-[16rem] p-8 text-brand-crimson dark:text-[#9E2238]">
            <SearchEmblem />
          </figure>
          {/* Something actionable before the reader types, rather than the
              emblem standing alone. aria-label rather than a visible heading
              beside "Or start from a tag" — the label already says what the
              list is. */}
          {tags.length > 0 && (
            <div className="mx-auto flex max-w-2xl flex-col gap-3.5">
              <p className="font-ui text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-muted">
                Or start from a tag
              </p>
              <ul
                aria-label="Tags"
                className="flex flex-wrap gap-x-7 gap-y-3.5"
              >
                {tags.map((tag) => (
                  <li key={tag.slug}>
                    <Link
                      href={`/tags/${tag.slug}`}
                      className="text-[21px] font-semibold text-brand-crimson transition-opacity duration-200 hover:opacity-80"
                    >
                      {tag.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </Container>
  );
}
