import type { Metadata } from "next";
import Link from "next/link";
import { draftMode } from "next/headers";
import DateComponent, { formatMonthYear } from "../date";
import WidePage from "../wide-page";
import { type Crumb } from "../breadcrumb";
import { getAllPosts, getBrowseIntro } from "@/lib/api";
import type { ListPost } from "@/lib/types";
import { browsePageMetadata } from "@/lib/page-metadata";
import { widont } from "@/lib/typography";

export async function generateMetadata(): Promise<Metadata> {
  // Same slug as the component. [→ `single-entry-cache`]
  const { isEnabled } = await draftMode();
  return browsePageMetadata({
    slug: "archive",
    title: "Archive",
    isDraftMode: isEnabled,
  });
}

export default async function ArchivePage() {
  const { isEnabled } = await draftMode();
  const intro = await getBrowseIntro("archive", isEnabled);

  const posts = await getAllPosts(isEnabled);

  // Posts arrive newest first, so each year's list does too.
  const byYear = new Map<number, ListPost[]>();
  for (const post of posts) {
    const year = new Date(post.date).getFullYear();
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(post);
  }
  const years = [...byYear.keys()].sort((a, b) => b - a); // newest year first

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
      // Generated from the posts, so it never goes stale; a browseIntro entry
      // can override it. Both branches carry the standfirst classes.
      // [→ `browse-copy`, `split-masthead`]
      standfirst={
        intro?.standfirst ? (
          <p className="md:max-w-[20rem] text-lg leading-relaxed md:text-right text-brand-muted text-pretty">
            {widont(intro.standfirst)}
          </p>
        ) : (
          oldest && (
            <p className="md:max-w-[20rem] text-lg leading-relaxed md:text-right text-brand-muted text-pretty">
              {widont(
                `${posts.length} ${posts.length === 1 ? "post" : "posts"} since ${formatMonthYear(oldest.date)}, newest first.`,
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
              {/* Body ink one step below the h1: the page's spine. Face and
                  weight come from the base layer. */}
              <h2 className="mb-2.5 flex items-baseline gap-4">
                <span className="text-3xl leading-none tabular-nums md:text-4xl lg:text-5xl">
                  {year}
                </span>
                <span className="font-ui text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-muted">
                  {yearPosts.length} {yearPosts.length === 1 ? "post" : "posts"}
                </span>
              </h2>
              {/* Three fixed lanes per row so columns align down the page. One
                  column below sm, title first. */}
              <ul>
                {yearPosts.map((post) => (
                  <li
                    key={post.slug}
                    className="grid grid-cols-1 items-baseline gap-x-6 gap-y-1 border-t border-hairline py-3 last:border-b sm:grid-cols-[5rem_1fr_10rem]"
                  >
                    <span className="order-2 shrink-0 text-sm tabular-nums text-brand-muted sm:order-1">
                      <DateComponent
                        dateString={post.date}
                        variant="dayMonth"
                      />
                      {/* The heading carries the year; restore it for link
                          navigation. */}
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
                        {/* Keeps the title from running into the category. */}
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
