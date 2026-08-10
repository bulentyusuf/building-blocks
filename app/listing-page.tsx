import type { ReactNode } from "react";
import WidePage from "./wide-page";
import MoreStories from "./more-stories";
import Pagination from "./pagination";
import PageContext from "./page-context";
import { type Crumb } from "./breadcrumb";
import { jsonLdHtml } from "@/lib/json-ld";
import type { CardPost } from "@/lib/types";

/**
 * The shell every paginated listing shares — a category, tag or author page in
 * either its paginated or its unpaginated form, and the index listing at
 * /page/[page].
 *
 * Those six routes rendered the same tree with the same props and differed only
 * in their `<header>`: a plain heading for a category or tag, a heading beside a
 * portrait for an author. So the header is `children` rather than a set of
 * props. Passing `name`, `description` and `avatar` and reassembling them here
 * would mean a conditional per difference, which is how a shared component
 * becomes harder to read than the six copies it replaced.
 *
 * What is genuinely uniform lives here: the band, the position caption, the
 * listing itself, the pager, and the empty state.
 *
 * `children` is therefore purely editorial — a heading and a standfirst, nothing
 * navigational. The "Page N of M" caption is rendered here rather than passed
 * in, because it belongs to the list and this component already holds the two
 * numbers. PageContext returns null on page 1, so it is rendered unconditionally
 * and no route decides whether its own page counts as paginated.
 *
 * The position caption goes into the band as its last line rather than into
 * the flow above the list — app/page-context.tsx carries why. It is rendered
 * here rather than passed in, because this component already holds both
 * numbers and PageContext returns null on page 1, so no route decides whether
 * its own page counts as paginated.
 */
export default function ListingPage({
  crumbs,
  children,
  posts,
  currentPage,
  totalPages,
  visibleTags,
  basePath,
  emptyMessage,
  jsonLd,
}: {
  /** Omitted by the index listing, which has nothing above it. */
  crumbs?: Crumb[];
  /** The band's contents: the heading, and whatever belongs beside it. */
  children: ReactNode;
  /** This page's slice, not the whole listing. */
  posts: CardPost[];
  currentPage: number;
  totalPages: number;
  /** Tag slugs with a live page, so no pill can link to a 404. */
  visibleTags: Set<string>;
  /** Page 1's URL. Pagination appends `/page/N` for the rest. */
  basePath: string;
  /**
   * Shown instead of the listing when there is nothing to show. Omitted by the
   * routes where empty is unreachable — a tag page 404s below its post
   * threshold, and a paginated page 404s past its last page — so leaving it out
   * asserts that, rather than quietly rendering an empty list.
   */
  emptyMessage?: string;
  /** Serialised into a ld+json script when present. Only the author page has one. */
  jsonLd?: unknown;
}) {
  return (
    <WidePage
      crumbs={crumbs}
      // The listing's own item padding is the space under the band — see the
      // prop's note. The empty state below carries its own instead.
      contentOwnsLeading
      header={
        <>
          {children}
          <PageContext currentPage={currentPage} totalPages={totalPages} />
        </>
      }
    >
      {/* Stays here rather than in the band: it is a script tag, so its
          position in the tree is irrelevant. */}
      {jsonLd !== undefined && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }}
        />
      )}
      {emptyMessage !== undefined && posts.length === 0 ? (
        <p className="mx-auto max-w-5xl pt-6 text-lg text-brand-muted">
          {emptyMessage}
        </p>
      ) : (
        <>
          <MoreStories
            morePosts={posts}
            variant="list"
            heading={null}
            priorityFirst
            visibleTags={visibleTags}
            // The band closes the page above this list, so the listing's own
            // opening rule would draw a second edge just below the first. It
            // still closes at the bottom, which is what the pager sits under.
            openRule={false}
          />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            basePath={basePath}
          />
        </>
      )}
    </WidePage>
  );
}
