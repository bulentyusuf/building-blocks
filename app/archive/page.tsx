import type { Metadata } from "next";
import Link from "next/link";
import { draftMode } from "next/headers";
import DateComponent, { formatMonthYear } from "../date";
import WidePage from "../wide-page";
import { StrandPill } from "../post-card";
import { type Crumb } from "../breadcrumb";
import { getAllPosts, getBrowseIntro, getGermanPostSlugs } from "@/lib/api";
import { GERMAN_LOCALE } from "@/lib/constants";
import type { ListPost } from "@/lib/types";
import { strandFor } from "@/lib/strands";
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

  const oldest = posts.length > 0 ? posts[posts.length - 1] : undefined;

  const crumbs: Crumb[] = [{ label: "Home", href: "/" }, { label: "Archive" }];

  return (
    <WidePage
      crumbs={crumbs}
      heading={
        <h1 className="text-5xl leading-[0.98] font-[800] tracking-[-0.03em] md:text-6xl lg:text-7xl">
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
              {/* A list panel: read, not pressed, so the quiet edge. Three fixed
                  lanes from sm, title first below it. [→ `post-page`] */}
              <ul className="overflow-hidden rounded-3xl border-2 border-edge-quiet bg-card">
                {yearPosts.map((post) => {
                  const strand = strandFor(post.category);
                  return (
                    <li
                      key={post.slug}
                      className="grid grid-cols-1 items-baseline gap-x-6 gap-y-1.5 px-5 py-3.5 even:bg-brand-bg sm:grid-cols-[4.75rem_1fr_auto] sm:px-7"
                    >
                      <span className="order-2 font-ui text-[0.9375rem] font-semibold tabular-nums text-brand-muted sm:order-1">
                        <DateComponent
                          dateString={post.date}
                          variant="dayMonth"
                        />
                        {/* The heading carries the year; restore it for link
                            navigation. */}
                        <span className="sr-only"> {year}</span>
                      </span>
                      <span className="order-1 sm:order-2">
                        <Link
                          href={`/posts/${post.slug}`}
                          className="font-ui text-xl leading-snug font-bold transition-colors duration-200 hover:text-brand-crimson"
                        >
                          {widont(post.title)}
                        </Link>
                        {/* The one place a browsing reader learns a German
                            version exists. Visible "DE" stays in the name.
                            [→ `locale`] */}
                        {german.has(post.slug) && (
                          <Link
                            href={`/de/posts/${post.slug}`}
                            hrefLang={GERMAN_LOCALE}
                            lang={GERMAN_LOCALE}
                            className="ml-2.5 whitespace-nowrap font-mono text-xs font-medium tracking-[0.06em] text-brand-muted transition-colors duration-200 hover:text-brand-crimson"
                          >
                            <span className="sr-only">Auf Deutsch lesen, </span>
                            DE
                          </Link>
                        )}
                      </span>
                      {strand && (
                        <Link
                          href={`/categories/${strand.slug}`}
                          className="order-3 justify-self-start sm:justify-self-end"
                        >
                          {/* Keeps the title from running into the strand. */}
                          <span className="sr-only">in </span>
                          <StrandPill strand={strand} />
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      )}
    </WidePage>
  );
}
