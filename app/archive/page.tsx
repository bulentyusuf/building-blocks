import type { Metadata } from "next";
import Link from "next/link";
import { draftMode } from "next/headers";
import { format } from "date-fns";
import { enGB } from "date-fns/locale";
import DateComponent from "../date";
import WidePage from "../wide-page";
import { type Crumb } from "../breadcrumb";
import { getAllPosts, getBrowseIntro } from "@/lib/api";
import type { ListPost } from "@/lib/types";
import { browsePageMetadata } from "@/lib/page-metadata";
import { widont } from "@/lib/typography";

export async function generateMetadata(): Promise<Metadata> {
  // Same slug the component passes to getBrowseIntro below. getBrowseIntro is
  // cache()-wrapped, so the two calls collapse into one request per render
  // — but only while the arguments match.
  const { isEnabled } = await draftMode();
  return browsePageMetadata({
    slug: "archive",
    title: "Archive",
    isDraftMode: isEnabled,
  });
}

export default async function ArchivePage() {
  const { isEnabled } = await draftMode();
  // Same arguments generateMetadata passes, so cache() collapses the two.
  const intro = await getBrowseIntro("archive", isEnabled);

  // getAllPosts returns ListPost[] already ordered date_DESC.
  const posts = await getAllPosts(isEnabled);

  // Group by year, preserving the incoming date_DESC order. Because posts is
  // already newest-first, each year's array is newest-first too — no re-sort.
  const byYear = new Map<number, ListPost[]>();
  for (const post of posts) {
    const year = new Date(post.date).getFullYear();
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(post);
  }
  const years = [...byYear.keys()].sort((a, b) => b - a); // newest year first

  // Oldest post anchors the header strapline. posts is date_DESC, so it is
  // the final item.
  const oldest = posts.length > 0 ? posts[posts.length - 1] : undefined;

  const crumbs: Crumb[] = [{ label: "Home", href: "/" }, { label: "Archive" }];

  return (
    <WidePage
      crumbs={crumbs}
      header={
        <>
          <h1 className="mb-3 text-4xl leading-tight md:text-5xl lg:text-6xl">
            Archive
          </h1>
          {/* Unlike the other browse pages, this standfirst is generated rather
            than written: the count and the earliest month come from the posts
            themselves and stay current without anyone editing them. A Page
            Intro entry can override it, but leaving that field empty is the
            better default — typed prose here would be stale by the next post. */}
          {intro?.standfirst ? (
            <p className="max-w-3xl text-lg leading-relaxed text-pretty">
              {intro.standfirst}
            </p>
          ) : (
            oldest && (
              <p className="max-w-3xl text-lg leading-relaxed text-pretty">
                {posts.length} {posts.length === 1 ? "post" : "posts"} since{" "}
                {format(new Date(oldest.date), "LLLL yyyy", { locale: enGB })},
                newest first.
              </p>
            )
          )}
        </>
      }
    >
      {years.length === 0 ? (
        <p className="text-lg text-brand-muted">No posts yet.</p>
      ) : (
        years.map((year) => {
          const yearPosts = byYear.get(year)!;
          return (
            <section key={year} className="mb-10 last:mb-0">
              {/* Section marker, deliberately subordinate to the h1. Bricolage
                  comes from the base layer; brand-muted keeps it legible in
                  both colour schemes without any scheme-specific code. */}
              <h2 className="mb-4 flex items-baseline gap-x-3 text-2xl text-brand-muted md:text-3xl tabular-nums">
                {year}
                {/* Uppercase and tracked, the same signal the category links
                    below and the footer headings use for a label. In sentence
                    case at body-muted it dressed as prose and read as the start
                    of one; as a tally it stays out of the way. Matches the tag
                    counts on /tags — the same phrase should not look like two
                    different things. */}
                <span className="font-ui text-xs font-normal uppercase tracking-wide text-brand-muted">
                  {yearPosts.length} {yearPosts.length === 1 ? "post" : "posts"}
                </span>
              </h2>
              <ul className="space-y-3">
                {yearPosts.map((post) => (
                  <li
                    key={post.slug}
                    className="flex flex-col gap-y-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-x-6"
                  >
                    <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <Link
                        href={`/posts/${post.slug}`}
                        className="hover:text-brand-crimson transition-colors duration-200"
                      >
                        {widont(post.title)}
                      </Link>
                      {post.category && (
                        <Link
                          href={`/categories/${post.category.slug}`}
                          className="font-ui text-sm uppercase tracking-wide text-brand-muted transition-colors duration-200 hover:text-brand-crimson"
                        >
                          {/* Screen readers run adjacent inline elements
                              together, so the title ran straight into the
                              category name. A word gives it a boundary. */}
                          <span className="sr-only">in </span>
                          {post.category.name}
                        </Link>
                      )}
                    </span>
                    <span className="shrink-0 text-sm tabular-nums text-brand-muted sm:text-right">
                      <DateComponent
                        dateString={post.date}
                        formatString="d MMM"
                      />
                      {/* The visible date drops the year because the section
                          heading carries it. Someone moving link to link skips
                          that heading, so restore it for them only. */}
                      <span className="sr-only"> {year}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </WidePage>
  );
}
