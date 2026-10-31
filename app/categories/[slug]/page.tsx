import type { Metadata } from "next";
import Link from "next/link";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import PostStream from "../../post-stream";
import { getAllCategories, getAllPosts, getCategoryBySlug } from "@/lib/api";
import { visibleTagSlugs } from "@/lib/tags";
import { SITE_TITLE, SITE_URL } from "@/lib/constants";
import { listingMetadata } from "@/lib/page-metadata";

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

// A strand page is home with its header chip pressed: every post in the
// strand, no pager, trail or description. The chip names it. [→ `strands`]
export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { isEnabled } = await draftMode();
  const { slug } = await params;

  // Independent queries, so they go out together. Filtered in memory, like
  // postsByAuthor, because the cards need each post's category and authors.
  const [category, allPosts] = await Promise.all([
    getCategoryBySlug(slug, isEnabled),
    getAllPosts(isEnabled),
  ]);

  if (!category) {
    notFound();
  }

  const posts = allPosts.filter((post) => post.category?.slug === slug);

  return (
    <div className="mx-auto max-w-frame px-4 md:px-10 pt-6 pb-16">
      <h1 className="sr-only">{category.name}</h1>
      <PostStream posts={posts} visibleTags={visibleTagSlugs(allPosts)} />

      <p className="mt-12 text-center font-ui font-semibold text-brand-muted">
        {posts.length === 0
          ? "Nothing here yet. "
          : posts.length === 1
            ? `That’s the only ${category.name} post. `
            : `That’s all ${posts.length} ${category.name} posts. `}
        <Link
          href="/archive"
          className="text-brand-crimson underline decoration-2 underline-offset-[3px] hover:decoration-4"
        >
          Browse the archive
        </Link>{" "}
        for the rest.
      </p>
    </div>
  );
}
