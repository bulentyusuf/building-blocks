import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { notFound, redirect } from "next/navigation";
import ListingPage from "../../../../listing-page";
import { type Crumb } from "../../../../breadcrumb";
import {
  getAllCategories,
  getCategoryBySlug,
  getPostsByCategory,
  getVisibleTagSlugs,
} from "@/lib/api";
import { SITE_TITLE, SITE_URL } from "@/lib/constants";
import { listingMetadata } from "@/lib/page-metadata";
import {
  pageItems,
  pageRangeParams,
  parsePageParam,
  totalPagesFor,
} from "@/lib/paginate";
import { widont } from "@/lib/typography";

export const dynamicParams = true;

export async function generateStaticParams() {
  const categories = await getAllCategories(false);
  const perCategory = await Promise.all(
    categories.map(async (category) => {
      const posts = await getPostsByCategory(category.slug, false);
      return pageRangeParams(posts.length, (page) => ({
        slug: category.slug,
        page,
      }));
    }),
  );
  return perCategory.flat();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; page: string }>;
}): Promise<Metadata> {
  const { isEnabled } = await draftMode();
  const { slug, page } = await params;
  // Metadata has to make the same judgement the component does, or a title and
  // a canonical get built out of a segment that is about to 404.
  if (parsePageParam(page) === null) {
    return { title: "Page not found" };
  }

  const category = await getCategoryBySlug(slug, isEnabled);

  if (!category) {
    return { title: "Category not found" };
  }

  return listingMetadata({
    title: `${category.name}, Page ${page}`,
    description:
      category.description || `Posts in ${category.name} on ${SITE_TITLE}`,
    canonical: `${SITE_URL}/categories/${slug}/page/${page}`,
  });
}

export default async function CategoryPaginatedPage({
  params,
}: {
  params: Promise<{ slug: string; page: string }>;
}) {
  const { isEnabled } = await draftMode();
  const { slug, page } = await params;
  const pageNumber = parsePageParam(page);

  if (pageNumber === null) {
    notFound();
  }
  // Page 1 has a single canonical home at /categories/<slug>.
  if (pageNumber === 1) {
    redirect(`/categories/${slug}`);
  }

  const category = await getCategoryBySlug(slug, isEnabled);
  if (!category) {
    notFound();
  }

  const crumbs: Crumb[] = [
    { label: "Home", href: "/" },
    { label: "Categories", href: "/categories" },
    { label: category.name },
  ];

  // Independent queries, so they go out together — see the unpaginated page.
  const [posts, visibleTags] = await Promise.all([
    getPostsByCategory(slug, isEnabled),
    getVisibleTagSlugs(isEnabled),
  ]);
  const totalPages = totalPagesFor(posts.length);

  if (pageNumber > totalPages) {
    notFound();
  }

  return (
    <ListingPage
      crumbs={crumbs}
      posts={pageItems(posts, pageNumber)}
      currentPage={pageNumber}
      totalPages={totalPages}
      visibleTags={visibleTags}
      basePath={`/categories/${slug}`}
    >
      <h1 className="mb-3 text-4xl leading-tight md:text-5xl lg:text-6xl text-pretty">
        {widont(category.name)}
      </h1>
      {category.description && (
        <p className="max-w-3xl text-lg leading-relaxed text-brand-muted text-pretty">
          {category.description}
        </p>
      )}
    </ListingPage>
  );
}
