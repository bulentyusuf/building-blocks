import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import ListingPage from "../../listing-page";
import { type Crumb } from "../../breadcrumb";
import {
  getAllCategories,
  getCategoryBySlug,
  getPostsByCategory,
  getVisibleTagSlugs,
} from "@/lib/api";
import { SITE_TITLE, SITE_URL } from "@/lib/constants";
import { listingMetadata } from "@/lib/page-metadata";
import { pageItems, totalPagesFor } from "@/lib/paginate";
import { widont } from "@/lib/typography";

// Allow on-demand rendering of categories added after build time, so a new
// category in Contentful doesn't 404 until the next deploy.
export const dynamicParams = true;

export async function generateStaticParams() {
  const categories = await getAllCategories(false);
  return categories.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { isEnabled } = await draftMode();
  const { slug } = await params;
  const category = await getCategoryBySlug(slug, isEnabled);

  if (!category) {
    return { title: "Category not found" };
  }

  return listingMetadata({
    title: category.name,
    description:
      category.description || `Posts in ${category.name} on ${SITE_TITLE}`,
    canonical: `${SITE_URL}/categories/${slug}`,
  });
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { isEnabled } = await draftMode();
  const { slug } = await params;

  const category = await getCategoryBySlug(slug, isEnabled);

  if (!category) {
    notFound();
  }

  const crumbs: Crumb[] = [
    { label: "Home", href: "/" },
    { label: "Categories", href: "/categories" },
    { label: category.name },
  ];

  // Independent queries, so they go out together. Awaited in sequence they
  // serialised the two slowest calls on this page for no reason.
  const [posts, visibleTags] = await Promise.all([
    getPostsByCategory(slug, isEnabled),
    getVisibleTagSlugs(isEnabled),
  ]);

  return (
    <ListingPage
      crumbs={crumbs}
      posts={pageItems(posts, 1)}
      currentPage={1}
      totalPages={totalPagesFor(posts.length)}
      visibleTags={visibleTags}
      basePath={`/categories/${slug}`}
      emptyMessage="No posts in this category yet."
    >
      <h1 className="mb-3 text-4xl leading-tight md:text-5xl lg:text-6xl text-pretty">
        {widont(category.name)}
      </h1>
      {category.description && (
        <p className="max-w-3xl text-lg leading-relaxed text-pretty">
          {category.description}
        </p>
      )}
    </ListingPage>
  );
}
