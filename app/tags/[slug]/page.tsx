import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import ListingPage from "../../listing-page";
import PageCounter from "../../page-counter";
import { type Crumb } from "../../breadcrumb";
import { getAllPosts, getTagBySlug } from "@/lib/api";
import { postsWithTag, visibleTagSlugs } from "@/lib/tags";
import { SITE_TITLE, SITE_URL } from "@/lib/constants";
import { listingMetadata } from "@/lib/page-metadata";
import { pageItems, totalPagesFor } from "@/lib/paginate";
import { widont } from "@/lib/typography";

// A tag reaching its second post gets a page without a deploy.
export const dynamicParams = true;

export async function generateStaticParams() {
  // Only tags the glossary shows. [→ `tag-pages`]
  const posts = await getAllPosts(false);
  return [...visibleTagSlugs(posts)].map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { isEnabled } = await draftMode();
  const { slug } = await params;
  const tag = await getTagBySlug(slug, isEnabled);

  if (!tag) {
    return { title: "Tag not found" };
  }

  return listingMetadata({
    title: tag.name,
    description: tag.description || `Posts tagged ${tag.name} on ${SITE_TITLE}`,
    canonical: `${SITE_URL}/tags/${slug}`,
  });
}

export default async function TagPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { isEnabled } = await draftMode();
  const { slug } = await params;

  const tag = await getTagBySlug(slug, isEnabled);
  if (!tag) {
    notFound();
  }

  const allPosts = await getAllPosts(isEnabled);
  const visible = visibleTagSlugs(allPosts);

  if (!visible.has(slug)) {
    notFound();
  }

  const posts = postsWithTag(allPosts, slug);

  // Each card's own tag pill would repeat the page; the others still show.
  const otherTags = new Set([...visible].filter((s) => s !== slug));

  const crumbs: Crumb[] = [
    { label: "Home", href: "/" },
    { label: "Tags", href: "/tags" },
    { label: tag.name },
  ];

  const totalPages = totalPagesFor(posts.length);

  return (
    // No emptyMessage: the threshold gate guarantees posts.
    <ListingPage
      crumbs={crumbs}
      posts={pageItems(posts, 1)}
      currentPage={1}
      totalPages={totalPages}
      visibleTags={otherTags}
      basePath={`/tags/${slug}`}
      heading={
        <h1 className="text-4xl leading-tight md:text-5xl lg:text-6xl text-pretty">
          {widont(tag.name)}{" "}
          <PageCounter currentPage={1} totalPages={totalPages} />
        </h1>
      }
      standfirst={
        tag.description && (
          <p className="md:max-w-[20rem] text-lg leading-relaxed md:text-right text-brand-muted text-pretty">
            {widont(tag.description)}
          </p>
        )
      }
    />
  );
}
