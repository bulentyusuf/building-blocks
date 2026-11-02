import type { Metadata } from "next";
import { draftMode } from "next/headers";
import WidePage from "../wide-page";
import PostRow, { ROWS_PANEL } from "../post-row";
import { type Crumb } from "../breadcrumb";
import { getAllPosts, getGermanPostSlugs } from "@/lib/api";
import type { ListPost } from "@/lib/types";
import { browsePageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = browsePageMetadata({
  slug: "archive",
  title: "Archive",
});

export default async function ArchivePage() {
  const { isEnabled } = await draftMode();
  const [posts, germanSlugs] = await Promise.all([
    getAllPosts(isEnabled),
    getGermanPostSlugs(isEnabled),
  ]);
  const german = new Set(germanSlugs);

  // Posts arrive newest first, so each year's list does too.
  const byYear = new Map<number, ListPost[]>();
  for (const post of posts) {
    const year = new Date(post.date).getFullYear();
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(post);
  }
  const years = [...byYear.keys()].sort((a, b) => b - a); // newest year first

  const crumbs: Crumb[] = [{ label: "Home", href: "/" }, { label: "Archive" }];

  return (
    <WidePage
      crumbs={crumbs}
      heading={
        <h1 className="text-5xl leading-[0.98] font-[800] tracking-[-0.03em] md:text-6xl lg:text-7xl">
          Archive
        </h1>
      }
    >
      {years.length === 0 ? (
        <p className="text-lg text-brand-muted">No posts yet.</p>
      ) : (
        years.map((year) => {
          const yearPosts = byYear.get(year)!;
          return (
            <section key={year} className="mb-12 last:mb-0">
              {/* The year is the page's spine; the count is a muted label. */}
              <h2 className="mb-4 flex items-baseline gap-4">
                <span className="text-4xl leading-none font-[800] tracking-[-0.02em] tabular-nums md:text-5xl lg:text-[3.25rem]">
                  {year}
                </span>
                <span className="font-mono text-sm font-medium text-brand-muted">
                  <span aria-hidden="true">{"// "}</span>
                  {yearPosts.length} {yearPosts.length === 1 ? "post" : "posts"}
                </span>
              </h2>
              <ul className={ROWS_PANEL}>
                {yearPosts.map((post) => (
                  <PostRow
                    key={post.slug}
                    post={post}
                    german={german.has(post.slug)}
                    date="dayMonth"
                    showStrand
                  />
                ))}
              </ul>
            </section>
          );
        })
      )}
    </WidePage>
  );
}
