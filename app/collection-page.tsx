import type { ReactNode } from "react";
import Link from "next/link";
import Breadcrumb, { type Crumb } from "./breadcrumb";
import PostStream from "./post-stream";
import { jsonLdHtml } from "@/lib/json-ld";
import type { ListPost } from "@/lib/types";

/**
 * A tag or author page: a strand page with a trail and a visible h1, since no
 * chip names it. Every post, no pager, no description. [→ `listing-shell`]
 */
export default function CollectionPage({
  crumbs,
  heading,
  posts,
  visibleTags,
  closing,
  jsonLd,
}: {
  crumbs: Crumb[];
  /** The h1, plus anything inline with it (the author portrait). */
  heading: ReactNode;
  posts: ListPost[];
  /** Tag slugs with a live page. */
  visibleTags: Set<string>;
  /** The closing line's lead-in, before "Browse the archive". */
  closing: string;
  jsonLd?: unknown;
}) {
  return (
    <div className="mx-auto max-w-frame px-4 md:px-10 pt-8 pb-16">
      {jsonLd !== undefined && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }}
        />
      )}
      <Breadcrumb items={crumbs} />
      <header className="mb-10">{heading}</header>
      <PostStream posts={posts} visibleTags={visibleTags} />
      <p className="mt-12 text-center font-ui font-semibold text-brand-muted">
        {closing}{" "}
        <Link
          href="/archive"
          className="text-brand-crimson underline decoration-2 underline-offset-[3px] hover:decoration-4"
        >
          Browse the archive
        </Link>{" "}
        for the rest.
      </p>
    </div>
  );
}
