import type { ReactNode } from "react";
import WidePage from "./wide-page";
import MoreStories from "./more-stories";
import Pagination from "./pagination";
import { type Crumb } from "./breadcrumb";
import { jsonLdHtml } from "@/lib/json-ld";
import type { CardPost } from "@/lib/types";

/**
 * The shell every paginated listing shares — a category, tag or author page in
 * either its paginated or its unpaginated form, and the index listing at
 * /page/[page]. [→ `listing-shell`]
 *
 * The `<header>` is `children` rather than a set of props: reassembling
 * `name`/`description`/`avatar` here per route would need a conditional per
 * difference. `heading` and `standfirst` pass straight through to WidePage,
 * which lays them out side by side; so does `splitHeader`, for the author
 * routes' exception — no local default, so whatever a caller passes or omits
 * reaches WidePage exactly as given, and WidePage's own default resolves it.
 * [→ `page-counter`]
 */
export default function ListingPage({
  crumbs,
  heading,
  standfirst,
  splitHeader,
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
  /** The heading, passed straight through to WidePage. */
  heading: ReactNode;
  /** The standfirst, when this listing has one — a category or tag
   * description, an author bio. Passed straight through to WidePage. */
  standfirst?: ReactNode;
  /** Passed straight through to WidePage. False only on the author routes. */
  splitHeader?: boolean;
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
      // [→ `band-retirement`]
      contentOwnsLeading
      heading={heading}
      standfirst={standfirst}
      splitHeader={splitHeader}
    >
      {/* A script tag, so its position in the tree is irrelevant. */}
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
            // [→ `border-roles`]
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
