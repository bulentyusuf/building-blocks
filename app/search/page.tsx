import Link from "next/link";
import { draftMode } from "next/headers";
import Container from "../container";
import Breadcrumb, { type Crumb } from "../breadcrumb";
import SearchClient from "./search-client";
import TagPill from "../tag-pill";
import Tape from "../tape";
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
        <h1 className="mb-7 text-5xl leading-[0.98] font-[800] tracking-[-0.03em] md:text-6xl lg:text-7xl">
          Search
        </h1>
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
          {/* A taped note, the page's one strip of tape. [→ `pagefind-ui`] */}
          <div className="relative mt-6 rounded-[18px] border-[3px] border-brand-dark bg-card px-5.5 pt-6 pb-6">
            <Tape />
            {tags.length > 0 && (
              <>
                <p
                  id="tag-entry-label"
                  className="font-ui text-xl leading-tight font-[800]"
                >
                  Or start from a tag
                </p>
                <ul
                  aria-labelledby="tag-entry-label"
                  className="mt-4 mb-5 flex flex-wrap gap-2"
                >
                  {tags.map((tag) => (
                    <li key={tag.slug}>
                      <TagPill tag={tag} size="compact" />
                    </li>
                  ))}
                </ul>
              </>
            )}
            <p className="leading-relaxed text-brand-muted">
              Or browse every post in the{" "}
              <Link
                href="/archive"
                className="text-brand-crimson underline decoration-2 underline-offset-[3px] hover:decoration-4"
              >
                archive
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </Container>
  );
}
