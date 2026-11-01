import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import CollectionPage from "../../collection-page";
import { type Crumb } from "../../breadcrumb";
import { getAllPosts, getTagBySlug } from "@/lib/api";
import { postsWithTag, visibleTagSlugs } from "@/lib/tags";
import { SITE_TITLE, SITE_URL } from "@/lib/constants";
import { listingMetadata } from "@/lib/page-metadata";
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

  return (
    // No empty case: the threshold gate guarantees posts.
    <CollectionPage
      crumbs={crumbs}
      posts={posts}
      visibleTags={otherTags}
      closing={`That’s all ${posts.length} posts tagged ${tag.name}.`}
      heading={
        <h1 className="text-5xl leading-[0.98] font-[800] tracking-[-0.03em] text-pretty md:text-6xl lg:text-7xl">
          <span aria-hidden="true">#</span>
          {widont(tag.name)}
        </h1>
      }
    />
  );
}
