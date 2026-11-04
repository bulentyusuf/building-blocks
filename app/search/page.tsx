import Link from "next/link";
import { draftMode } from "next/headers";
import WidePage from "../wide-page";
import { type Crumb } from "../breadcrumb";
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
    <WidePage
      crumbs={crumbs}
      heading={
        <h1 className="text-5xl leading-[0.98] font-[800] tracking-[-0.03em] md:text-6xl lg:text-7xl">
          Search
        </h1>
      }
    >
      {/* Results up to 720px, the tag panel beside them from lg, where both
          fit; it stays while searching. [→ `page-axis`, `pagefind-ui`] */}
      <div className="lg:grid lg:grid-cols-[minmax(0,45rem)_minmax(17.5rem,22.5rem)] lg:items-start lg:justify-between lg:gap-16">
        <section>
          {/* Without scripts the input never appears, so say why. Before
              SearchClient, to keep the emblem's adjacency rule intact. */}
          <noscript>
            {/* Underlined: crimson against the muted text is 1.17:1 light and
                1.12:1 dark, far below 3:1. */}
            <p className="mb-6 text-brand-muted">
              Search needs JavaScript. The index runs entirely in your browser,
              so no query ever leaves this page — which also means there is
              nothing to search with when scripts are turned off. The{" "}
              <a
                href="/archive"
                className="font-bold text-brand-crimson underline underline-offset-2 transition-opacity duration-200 hover:opacity-80"
              >
                archive
              </a>{" "}
              lists every post by year.
            </p>
          </noscript>
          <SearchClient />
          {/* Hides on the first keystroke: the CSS rule needs it to be the
              next sibling of .pagefind-scope. */}
          <div className="search-empty">
            {/* Static SVG, not inline. Smaller on phones, so the tag panel
                shows above the fold. [→ `search-emblem`] */}
            <figure className="mx-auto mt-6 max-w-[9rem] p-4 sm:mt-10 sm:max-w-[16rem] sm:p-8">
              <img
                src="/search-emblem.svg"
                alt=""
                width={1735}
                height={1867}
                className="h-auto w-full"
              />
            </figure>
          </div>
        </section>
        {/* Sticky from lg, scrolling on its own if taller than the window.
            The top padding keeps the tape inside the scroll box, and the
            matching negative margin lines the panel up with the input. */}
        <aside className="mt-12 lg:sticky lg:top-20 lg:-mt-5 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:pt-5">
          {/* A taped note, the page's one strip of tape. [→ `pagefind-ui`] */}
          <div className="relative rounded-[18px] border-[3px] border-outline bg-card px-5.5 pt-6 pb-6">
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
                  className="mt-4 mb-5 flex flex-wrap gap-2 pointer-coarse:gap-y-3"
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
        </aside>
      </div>
    </WidePage>
  );
}
