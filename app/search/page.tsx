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

  // Tags for the empty state, through the same threshold as the glossary.
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
        {/* Without scripts the input never appears, so say why. Before
            SearchClient, to keep the emblem's adjacency rule intact. */}
        <noscript>
          {/* Underlined: crimson against the muted text is 1.17:1 light and
              1.05:1 dark, far below 3:1. */}
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
        {/* Everything that hides with the empty state lives inside it: the
              CSS rule needs it to be the next sibling of .pagefind-scope. */}
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
                    {/* Links, not pills. [→ `tag-pills`] */}
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
