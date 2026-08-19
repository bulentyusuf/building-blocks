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

// Allow on-demand rendering of tags that clear the threshold after build time,
// so a tag reaching its second post doesn't 404 until the next deploy.
export const dynamicParams = true;

export async function generateStaticParams() {
  // Only tags the glossary shows. A tag below MIN_POSTS_PER_TAG has no pill and
  // no glossary entry, so a page for it would be unreachable from anywhere on
  // the site — and the page below 404s for exactly the same reason.
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

  // One fetch, read twice. The threshold check needs the sitewide list and the
  // post list is a filter over that same result, so fetching for each was two
  // identical requests — getAllPosts is not cache()-wrapped.
  const allPosts = await getAllPosts(isEnabled);
  const visible = visibleTagSlugs(allPosts);

  // A tag below the threshold is hidden from the glossary and renders no pills,
  // so serving a page for it would strand a URL nothing links to. One rule, and
  // it lives in visibleTagSlugs rather than here.
  if (!visible.has(slug)) {
    notFound();
  }

  const posts = postsWithTag(allPosts, slug);

  // Every post on this page carries this tag, so a pill repeating it on each
  // card says nothing. The other tags a post carries are still worth showing —
  // they are the reason a reader might leave sideways rather than down.
  const otherTags = new Set([...visible].filter((s) => s !== slug));

  const crumbs: Crumb[] = [
    { label: "Home", href: "/" },
    { label: "Tags", href: "/tags" },
    { label: tag.name },
  ];

  const totalPages = totalPagesFor(posts.length);

  return (
    // No emptyMessage: the threshold gate above guarantees at least
    // MIN_POSTS_PER_TAG posts by the time this renders.
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
            {tag.description}
          </p>
        )
      }
    />
  );
}
