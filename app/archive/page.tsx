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
              {/* The year is masthead-scale ink, not muted — it is what gives
                  the page a spine now that the row itself carries no other
                  large type. The count beside it stays the small-caps label
                  treatment every tally on the site uses. */}
              <h2 className="mb-2.5 flex items-baseline gap-4">
                <span className="text-4xl font-extrabold leading-none tracking-[-0.03em] tabular-nums md:text-[56px]">
                  {year}
                </span>
                <span className="font-ui text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-muted">
                  {yearPosts.length} {yearPosts.length === 1 ? "post" : "posts"}
                </span>
              </h2>
              <ul>
                {yearPosts.map((post) => (
                  // Date | title | category as three columns from sm up, so
                  // the category sits in its own lane instead of competing
                  // inline with the title. flex-col below sm, where a fixed
                  // 96/150px pair of columns would not leave the title room to
                  // breathe; `order` re-sequences the same three children into
                  // title-first there. Every row carries its own top rule, and
                  // the last row of a year closes the group with a bottom one.
                  <li
                    key={post.slug}
                    className="flex flex-col gap-y-1 border-t border-hairline py-3.5 last:border-b sm:grid sm:grid-cols-[96px_1fr_150px] sm:items-baseline sm:gap-x-6 sm:gap-y-0"
                  >
                    <span className="order-2 text-sm tabular-nums text-brand-muted sm:order-1">
                      <DateComponent
                        dateString={post.date}
                        formatString="d MMM"
                      />
                      {/* The visible date drops the year because the section
                          heading carries it. Someone moving link to link skips
                          that heading, so restore it for them only. */}
                      <span className="sr-only"> {year}</span>
                    </span>
                    <Link
                      href={`/posts/${post.slug}`}
                      className="order-1 text-[21px] leading-[1.25] font-semibold text-pretty hover:text-brand-crimson transition-colors duration-200 sm:order-2"
                    >
                      {widont(post.title)}
                    </Link>
                    {post.category && (
                      <Link
                        href={`/categories/${post.category.slug}`}
                        className="order-3 font-ui text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-muted transition-colors duration-200 hover:text-brand-crimson sm:justify-self-end"
                      >
                        {/* Screen readers run adjacent inline elements
                            together, so the title ran straight into the
                            category name. A word gives it a boundary. */}
                        <span className="sr-only">in </span>
                        {post.category.name}
                      </Link>
                    )}
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
