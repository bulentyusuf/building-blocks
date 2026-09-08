import Link from "next/link";
import { draftMode } from "next/headers";
import Container from "../container";
import Breadcrumb, { type Crumb } from "../breadcrumb";
import SearchClient from "./search-client";
import { getAllPosts } from "@/lib/api";
import { groupPostsByTag } from "@/lib/tags";

// [→ `pagefind-ui`]
export const metadata = {
  title: "Search",
  description: "Search every post on the site.",
  robots: { index: false },
};

export default async function SearchPage() {
  const { isEnabled } = await draftMode();

  // The empty state offers tags as a second entry point. groupPostsByTag
  // carries the MIN_POSTS_PER_TAG threshold, so a tag linked here can never be
  // one /tags/[slug] 404s on. getAllPosts is cached under the same "posts" tag
  // as every other route, so this revalidates on publish rather than adding a
  // fetch pattern of its own.
  const posts = await getAllPosts(isEnabled);
  const tags = groupPostsByTag(posts).map((group) => group.tag);

  const crumbs: Crumb[] = [{ label: "Home", href: "/" }, { label: "Search" }];

  return (
    <Container>
      {/* Wrapped, and sits before the <section>. [→ `breadcrumbs`] */}
      <div className="mx-auto max-w-2xl">
        <Breadcrumb items={crumbs} />
      </div>
      <section className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-4xl md:text-5xl">Search</h1>
        {/* Pagefind's UI is mounted in the browser, so with scripts off the
            input never appears and the page reads as broken rather than
            unavailable — says why, and points at two routes that don't need
            JavaScript. Placed BEFORE <SearchClient />, not between it and the
            emblem, or an element there would break the
            `.pagefind-scope + .search-empty` adjacency. Plain <a>, not
            <Link>: client navigation is meaningless in a noscript block. */}
        <noscript>
          {/* The two links below sit INSIDE a run of body text without being
              inside .prose, so nothing underlines them by default and the
              sitewide "crimson reads fine on cream" argument doesn't cover
              them. Crimson against brand-muted is 1.17:1 in light and 1.05:1
              in dark, under the 3:1 WCAG 1.4.1 wants when colour alone marks
              a link, and hover:opacity is no help at rest — hence the
              explicit underline. */}
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
        {/* Empty state, hidden by CSS as soon as the input has text. The tag
            list lives INSIDE this wrapper, not beside it: .search-empty must
            stay the immediate next sibling of .pagefind-scope for the rule to
            fire, so anything meant to disappear has to be inside the element
            carrying that class, not a second sibling of its own. */}
        <div className="search-empty">
          {/* Static SVG, not inline. [→ `search-emblem`] */}
          <figure className="mx-auto mt-10 max-w-[16rem] p-8">
            <img
              src="/search-emblem.svg"
              alt=""
              width={1735}
              height={1867}
              className="h-auto w-full"
            />
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
                    {/* Links, not pills: the tag is the subject here, not
                        metadata about something else. [→ `tag-pills`] Sized
                        to match the glossary's own h2. */}
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
