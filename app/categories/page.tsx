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

  // One capped fetch per category, in parallel.
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
            <p className="max-w-3xl text-lg leading-relaxed text-brand-muted text-pretty">
              {intro.standfirst}
            </p>
          )}
        </>
      }
    >
      {/* One card per category, two across on desktop, stacked on mobile. */}
      <div className="grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-10">
        {categories.map((category, index) => {
          const posts = postsBySlug.get(category.slug) ?? [];
          const thumbUrl = category.thumbnail?.url;
          const thumbAlt = category.thumbnail?.title ?? "";
          return (
            <article key={category.slug} className="flex flex-col min-w-0">
              <h2 className="mb-3 text-2xl leading-snug md:text-3xl text-pretty">
                <Link
                  href={`/categories/${category.slug}`}
                  className="hover:text-brand-crimson transition-colors duration-200"
                >
                  {widont(category.name)}
                </Link>
              </h2>

              {category.description && (
                <p className="mb-5 text-lg leading-relaxed text-brand-muted text-pretty">
                  {category.description}
                </p>
              )}

              {thumbUrl && (
                // Thumbnails render through the shared CoverImage so they inherit
                // its frame (border, blur underlay, shadow, aspect) rather than
                // duplicating it. Deliberately plain: no `hover` zoom, no
                // `wide`. The alt text is the asset's own title, for crawlers,
                // and the thumbnail's link is hidden from assistive tech, so
                // the h2 above it is still the single announced link to this
                // category.
                <div className="mb-5">
                  <CoverImage
                    url={thumbUrl}
                    alt={thumbAlt}
                    href={`/categories/${category.slug}`}
                    // Capped in px for the same reason as the listing covers in
                    // more-stories.tsx. This grid is two columns with a 40px
                    // gap inside the 984px container, so a thumbnail tops out
                    // at (984 - 40) / 2 = 472px. Left at 50vw it asked for
                    // 720px at a 1440px viewport, which at DPR 2 pulled the
                    // 1920 derivative instead of the 1080 that covers it.
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 472px"
                    priority={index === 0}
                  />
                </div>
              )}

              {posts.length > 0 ? (
                <>
                  <ul className="flex flex-col divide-y divide-hairline border-t border-hairline">
                    {posts.map((post) => (
                      <li key={post.slug} className="py-4">
                        <Link
                          href={`/posts/${post.slug}`}
                          className="block text-lg font-medium text-pretty hover:text-brand-crimson transition-colors duration-200"
                        >
                          {widont(post.title)}
                        </Link>
                        <div className="mt-1 text-sm text-brand-muted">
                          <DateComponent dateString={post.date} />
                        </div>
                        {post.excerpt && (
                          <p className="mt-1 text-base leading-relaxed text-brand-muted line-clamp-1">
                            {post.excerpt}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/categories/${category.slug}`}
                    className="mt-5 inline-block font-ui text-sm font-bold uppercase tracking-wide text-brand-crimson hover:underline"
                  >
                    See all in {category.name} &rarr;
                  </Link>
                </>
              ) : (
                <p className="text-lg text-brand-muted">No posts here yet.</p>
              )}
            </article>
          );
        })}
      </div>
    </WidePage>
  );
}
