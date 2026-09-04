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

  // The empty state offers tags as a second entry point. groupPostsByTag
  // carries the MIN_POSTS_PER_TAG threshold, so a tag linked here can never be
  // one /tags/[slug] 404s on. This makes /search a data-fetching route where it
  // previously fetched nothing at all — unavoidable, since the threshold has to
  // be computed from posts — but getAllPosts is cached under the same "posts"
  // tag as every other route, so the page still revalidates on publish rather
  // than adding a fetch pattern of its own.
  const posts = await getAllPosts(isEnabled);
  const tags = groupPostsByTag(posts).map((group) => group.tag);

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
          {/* The two links below are the only ones on the site that sit INSIDE
              a run of body text without being inside .prose, so they are the
              only ones the sitewide "crimson reads fine on cream and needs no
              underline substitute" argument does not cover. Inside .prose the
              typography plugin underlines links by default; here nothing does.
              Crimson against brand-muted is 1.17:1 in light and 1.05:1 in
              dark, well under the 3:1 WCAG 1.4.1 wants when colour is the only
              thing marking a link, and hover:opacity is no help at rest. Hence
              the explicit underline, which matches what a prose link already
              looks like. */}
          <p className="mb-6 text-brand-muted">
            Search needs JavaScript. The index runs entirely in your browser, so
            no query ever leaves this page — which also means there is nothing
            to search with when scripts are turned off. The{" "}
            <a
              href="/archive"
              className="font-bold text-brand-crimson underline underline-offset-2 transition-opacity duration-200 hover:opacity-80"
            >
              archive
            </a>{" "}
            lists every post by year, and{" "}
            <a
              href="/categories"
              className="font-bold text-brand-crimson underline underline-offset-2 transition-opacity duration-200 hover:opacity-80"
            >
              categories
            </a>{" "}
            group them by subject.
          </p>
        </noscript>
        <SearchClient />
        {/* Empty state. Hidden by CSS as soon as the input has text (see
            globals.css). The tag list lives INSIDE this wrapper rather than
            beside it, for the same reason: .search-empty must stay the
            immediate next sibling of .pagefind-scope for the
            `.pagefind-scope:has(input:not(:placeholder-shown)) + .search-empty`
            rule to fire, so anything meant to disappear once the reader starts
            typing has to be inside the one element carrying that class, not a
            second sibling of its own. */}
        <div className="search-empty">
          {/* Inline SVG so currentColor picks up the ink colour. Knockout
              artwork: the hat, face and eye are gaps where the ground shows
              through the ink, which only reads on a light ground. In dark mode
              the cream ground is the glass's own silhouette, drawn inside the
              SVG (see search-emblem.tsx), so the whole magnifying glass is lit
              and there is no floating plate. The ink is forced to the light
              crimson #9E2238 in dark mode (never the token, which is lifted to
              #EC8494 for link legibility and looks washed out on cream): the
              emblem is on cream in both schemes, so it should be the same
              colour in both. p-8, shared by both schemes, sets a single emblem
              size across light and dark. */}
          <figure className="mx-auto mt-10 max-w-[16rem] p-8 text-brand-crimson dark:text-[#9E2238]">
            <SearchEmblem />
          </figure>
          {tags.length > 0 && (
            <div className="flex flex-col gap-3.5">
              <p
                id="tag-entry-label"
                className="font-ui text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-muted"
              >
                Or start from a tag
              </p>
              <ul
                aria-labelledby="tag-entry-label"
                className="flex flex-wrap gap-x-7 gap-y-3.5"
              >
                {tags.map((tag) => (
                  <li key={tag.slug}>
                    {/* The glossary's own size (app/tags/page.tsx's h2 runs
                        text-xl md:text-2xl) and this page's own link
                        treatment — the noscript block above uses exactly this
                        crimson and this hover. font-display because the
                        glossary gets it from the base layer's h1-h3 rule and
                        these are the same thing in a different wrapper.

                        Links rather than pills because the tag is the subject
                        here, not metadata about something else. See
                        docs/decisions.md's tag entry. */}
                    <Link
                      href={`/tags/${tag.slug}`}
                      className="font-display text-xl md:text-2xl font-bold text-brand-crimson transition-opacity duration-200 hover:opacity-80"
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
