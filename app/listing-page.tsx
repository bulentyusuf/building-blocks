import type { ReactNode } from "react";
import WidePage from "./wide-page";
import MoreStories from "./more-stories";
import Pagination from "./pagination";
import { type Crumb } from "./breadcrumb";
import { jsonLdHtml } from "@/lib/json-ld";
import type { CardPost } from "@/lib/types";

/**
 * The shell for every paginated listing. The header's content stays the
 * route's, and props pass straight through to WidePage with no local defaults.
 * [→ `listing-shell`, `page-counter`]
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
  crumbs?: Crumb[];
  heading: ReactNode;
  standfirst?: ReactNode;
  /** False only on the author routes. */
  splitHeader?: boolean;
  /** This page's slice. */
  posts: CardPost[];
  currentPage: number;
  totalPages: number;
  /** Tag slugs with a live page. */
  visibleTags: Set<string>;
  basePath: string;
  /** Omitted where empty is unreachable, which asserts it. */
  emptyMessage?: string;
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
