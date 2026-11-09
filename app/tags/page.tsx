import type { Metadata } from "next";
import Link from "next/link";
import { draftMode } from "next/headers";
import { ROWS_PANEL } from "../post-row";
import WidePage from "../wide-page";
import { type Crumb } from "../breadcrumb";
import { getAllPosts } from "@/lib/api";
import { groupPostsByTag, MIN_POSTS_PER_TAG } from "@/lib/tags";
import { browsePageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = browsePageMetadata({
  slug: "tags",
  title: "Tags",
});

export default async function TagsPage() {
  const { isEnabled } = await draftMode();
  const groups = groupPostsByTag(await getAllPosts(isEnabled));

  const crumbs: Crumb[] = [{ label: "Home", href: "/" }, { label: "Tags" }];

  return (
    <WidePage
      crumbs={crumbs}
      heading={
        <h1 className="text-5xl leading-[0.98] font-[800] tracking-[-0.03em] md:text-6xl lg:text-7xl">
          Tags
        </h1>
      }
    >
      {groups.length === 0 ? (
        <p className="text-lg text-brand-muted">
          No tags yet. A tag appears here once {MIN_POSTS_PER_TAG} posts carry
          it.
        </p>
      ) : (
        // An index, one row per tag, each tag page holding its posts.
        // [→ `tag-pages`]
        <div data-pagefind-ignore>
          <ul className={ROWS_PANEL}>
            {groups.map(({ tag, posts }) => (
              // The id keeps old /tags#slug links landing on their row.
              <li key={tag.slug} id={tag.slug} className="even:bg-brand-bg">
                <Link
                  href={`/tags/${tag.slug}`}
                  className="group flex min-h-11 items-baseline justify-between gap-x-4 px-5 py-3.5 sm:px-7"
                >
                  <span className="font-ui text-xl leading-snug font-bold transition-colors duration-200 group-hover:text-brand-crimson">
                    #{tag.name}
                  </span>
                  <span className="shrink-0 font-mono text-sm font-medium text-brand-muted">
                    <span aria-hidden="true">{"// "}</span>
                    {posts.length} {posts.length === 1 ? "post" : "posts"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </WidePage>
  );
}
