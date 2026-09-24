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

const PREVIEW_COUNT = 3;

export async function generateMetadata(): Promise<Metadata> {
  // [→ `single-entry-cache`]
  const { isEnabled } = await draftMode();
  return browsePageMetadata({
    slug: "categories",
    title: "Categories",
    isDraftMode: isEnabled,
  });
}

export default async function CategoriesPage() {
  const { isEnabled } = await draftMode();
  const intro = await getBrowseIntro("categories", isEnabled);

  // name_ASC order; add an order field rather than renaming to reorder.
  const categories = await getAllCategories(isEnabled);

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
      heading={
        <h1 className="text-4xl leading-tight md:text-5xl lg:text-6xl">
          Categories
        </h1>
      }
      standfirst={
        intro?.standfirst && (
          <p className="md:max-w-[20rem] text-lg leading-relaxed md:text-right text-brand-muted text-pretty">
            {widont(intro.standfirst)}
          </p>
        )
      }
    >
      <div className="grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-10">
        {categories.map((category, index) => {
          const posts = postsBySlug.get(category.slug) ?? [];
          const thumbnail = category.thumbnail;
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

              {thumbnail?.url && (
                // The shared CoverImage frame, without hover or wide; its link
                // is hidden, so the h2 stays the one announced link.
                <div className="mb-5">
                  <CoverImage
                    image={thumbnail}
                    href={`/categories/${category.slug}`}
                    // Capped where the column stops growing. [→ `priority-opaque`]
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
                            {widont(post.excerpt)}
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
