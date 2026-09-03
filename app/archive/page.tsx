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
      heading={
        <h1 className="text-4xl leading-tight md:text-5xl lg:text-6xl">
          Archive
        </h1>
      }
      // Unlike the other browse pages, this standfirst is generated rather
      // than written: the count and the earliest month come from the posts
      // themselves and stay current without anyone editing them. A Page
      // Intro entry can override it, but leaving that field empty is the
      // better default — typed prose here would be stale by the next post.
      // Both branches carry the M5 signature — max-w-[20rem] plus
      // text-right — since either one can be the rendered standfirst; see
      // app/wide-page.tsx for what the two classes are doing.
      standfirst={
        intro?.standfirst ? (
          <p className="md:max-w-[20rem] text-lg leading-relaxed md:text-right text-brand-muted text-pretty">
            {widont(intro.standfirst)}
          </p>
        ) : (
          oldest && (
            <p className="md:max-w-[20rem] text-lg leading-relaxed md:text-right text-brand-muted text-pretty">
              {widont(
                `${posts.length} ${posts.length === 1 ? "post" : "posts"} since ${format(new Date(oldest.date), "LLLL yyyy", { locale: enGB })}, newest first.`,
              )}
            </p>
          )
        )
      }
    >
      {years.length === 0 ? (
        <p className="text-lg text-brand-muted">No posts yet.</p>
      ) : (
        years.map((year) => {
          const yearPosts = byYear.get(year)!;
          return (
            <section key={year} className="mb-10 last:mb-0">
              {/* The year is body ink at heading scale, not muted — it is what
                  gives the page a spine now that the rows carry no other large
                  type. One step below the h1 at every breakpoint (30/36/48
                  against 36/48/60), so it reads as a section marker rather
                  than competing with the page title. Weight, face and tracking
                  all come from the base layer's h1-h3 rule; do not re-declare
                  them here. */}
              <h2 className="mb-2.5 flex items-baseline gap-4">
                <span className="text-3xl leading-none tabular-nums md:text-4xl lg:text-5xl">
                  {year}
                </span>
                <span className="font-ui text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-muted">
                  {yearPosts.length} {yearPosts.length === 1 ? "post" : "posts"}
                </span>
              </h2>
              {/* Date, title and category as three lanes rather than a wrapped
                  flex row, so the columns line up down the page like a table
                  rather than drifting with each row's own content width. Every
                  row applies the same fixed-width template, which is what
                  makes the lanes align without a single shared grid container
                  across the whole list.

                  Single column below sm, where there is no width for three
                  lanes — order re-sequences title first, then date, then
                  category, which is the reading order the row collapses to. */}
              <ul>
                {yearPosts.map((post) => (
                  <li
                    key={post.slug}
                    className="grid grid-cols-1 items-baseline gap-x-6 gap-y-1 border-t border-hairline py-3 last:border-b sm:grid-cols-[5rem_1fr_10rem]"
                  >
                    <span className="order-2 shrink-0 text-sm tabular-nums text-brand-muted sm:order-1">
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
                      className="order-1 text-xl hover:text-brand-crimson transition-colors duration-200 sm:order-2"
                    >
                      {widont(post.title)}
                    </Link>
                    {post.category && (
                      <Link
                        href={`/categories/${post.category.slug}`}
                        className="order-3 font-ui text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-muted transition-colors duration-200 hover:text-brand-crimson sm:justify-self-end sm:text-right"
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
