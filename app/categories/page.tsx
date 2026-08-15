import type { Metadata } from "next";
import Link from "next/link";
import { draftMode } from "next/headers";
import CoverImage from "../cover-image";
import DateComponent from "../date";
import WidePage from "../wide-page";
import { type Crumb } from "../breadcrumb";
import {
  getAllCategories,
  getRecentPostsByCategory,
  getBrowseIntro,
} from "@/lib/api";
import { browsePageMetadata } from "@/lib/page-metadata";
import { widont } from "@/lib/typography";

// How many recent posts to tease under each category. The full list lives on
// the individual category page (/categories/[slug]).
const PREVIEW_COUNT = 3;

export async function generateMetadata(): Promise<Metadata> {
  // Same slug the component passes to getBrowseIntro below. getBrowseIntro is
  // cache()-wrapped, so the two calls collapse into one request per render
  // — but only while the arguments match.
  const { isEnabled } = await draftMode();
  return browsePageMetadata({
    slug: "categories",
    title: "Categories",
    isDraftMode: isEnabled,
  });
}

export default async function CategoriesPage() {
  const { isEnabled } = await draftMode();
  // Same arguments generateMetadata passes, so cache() collapses the two.
  const intro = await getBrowseIntro("categories", isEnabled);

  // Categories come back ordered name_ASC, so "Main Quest" precedes "Side
  // Quests" (M before S). If a future category needs a different order, add an
  // explicit order field to the Category type rather than relying on the name.
  const categories = await getAllCategories(isEnabled);

  // One capped fetch per category, in parallel. Each entry carries both the
  // teaser slice AND the category's real total, which the capped `items`
  // alone cannot answer.
  const previews = await Promise.all(
    categories.map(
      async (c) =>
        [
          c.slug,
          await getRecentPostsByCategory(c.slug, PREVIEW_COUNT, isEnabled),
        ] as const,
    ),
  );
  const postsBySlug = new Map(previews);

  const crumbs: Crumb[] = [
    { label: "Home", href: "/" },
    { label: "Categories" },
  ];

  return (
    <WidePage
      crumbs={crumbs}
      header={
        <>
          <h1 className="mb-3 text-4xl leading-tight md:text-5xl lg:text-6xl">
            Categories
          </h1>
          {intro?.standfirst && (
            <p className="max-w-3xl text-lg leading-relaxed text-pretty">
              {intro.standfirst}
            </p>
          )}
        </>
      }
    >
      {/* One full-width block per category rather than a two-column card
          grid: with two categories, two columns made two thin strips and
          needed bespoke papercraft art to fill them, which clashed with the
          painterly post covers. The cover here is the category's own most
          recent post, which also retires the need for that art — there is no
          more per-category thumbnail field to keep populated. */}
      <div className="flex flex-col gap-16">
        {categories.map((category, index) => {
          const { items: posts, total } = postsBySlug.get(category.slug) ?? {
            items: [],
            total: 0,
          };
          const latestCover = posts[0]?.coverImage;
          return (
            <article
              key={category.slug}
              className="grid gap-14 lg:grid-cols-[1fr_420px] lg:items-start"
            >
              {latestCover ? (
                <CoverImage
                  url={latestCover.url}
                  alt={latestCover.title ?? ""}
                  href={`/categories/${category.slug}`}
                  // Capped at the point the 1fr track stops growing: at
                  // max-w-5xl's 984px content width, 420px fixed and a 56px
                  // gap leave 984 - 420 - 56 = 508px for the cover.
                  sizes="(max-width: 1024px) 100vw, 508px"
                  priority={index === 0}
                />
              ) : (
                // A category can exist with no posts yet (or none Contentful
                // has published), and then there is no "most recent cover" to
                // show. Decorative, matching CoverImage's own pending tint
                // rather than introducing a second placeholder treatment.
                <div
                  aria-hidden="true"
                  className="aspect-video rounded-xs bg-brand-dark/5"
                />
              )}
              <div className="flex flex-col gap-3">
                <h2 className="text-[52px] leading-none font-bold tracking-[-0.028em] text-pretty">
                  <Link
                    href={`/categories/${category.slug}`}
                    className="hover:text-brand-crimson transition-colors duration-200"
                  >
                    {widont(category.name)}
                  </Link>
                </h2>

                {category.description && (
                  <p className="text-lg leading-[1.5] text-brand-muted text-pretty">
                    {category.description}
                  </p>
                )}

                {total > 0 && (
                  <p className="font-ui text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-muted">
                    {total} {total === 1 ? "post" : "posts"}
                  </p>
                )}

                {posts.length > 0 ? (
                  <>
                    <ul className="flex flex-col gap-2 pt-2.5">
                      {posts.map((post) => (
                        <li
                          key={post.slug}
                          className="grid grid-cols-[78px_1fr] items-baseline gap-4"
                        >
                          <span className="text-sm tabular-nums text-brand-muted">
                            {/* No formatString override: unlike the archive,
                                there is no year heading nearby for "d MMM" to
                                borrow a year from, so this keeps the sitewide
                                long form. */}
                            <DateComponent dateString={post.date} />
                          </span>
                          <Link
                            href={`/posts/${post.slug}`}
                            className="text-lg leading-[1.3] font-semibold text-pretty hover:text-brand-crimson transition-colors duration-200"
                          >
                            {widont(post.title)}
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <p className="pt-2 text-right">
                      <Link
                        href={`/categories/${category.slug}`}
                        className="font-ui text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-crimson hover:underline"
                      >
                        All of {category.name} &rarr;
                      </Link>
                    </p>
                  </>
                ) : (
                  <p className="text-lg text-brand-muted">No posts here yet.</p>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </WidePage>
  );
}
