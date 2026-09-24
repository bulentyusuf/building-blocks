import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { notFound, redirect } from "next/navigation";
import ListingPage from "../../../../listing-page";
import PageCounter from "../../../../page-counter";
import { type Crumb } from "../../../../breadcrumb";
import { getAllPosts, getTagBySlug } from "@/lib/api";
import { postsWithTag, visibleTagSlugs } from "@/lib/tags";
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
  const posts = await getAllPosts(false);

  return [...visibleTagSlugs(posts)].flatMap((slug) =>
    pageRangeParams(postsWithTag(posts, slug).length, (page) => ({
      slug,
      page,
    })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; page: string }>;
}): Promise<Metadata> {
  const { isEnabled } = await draftMode();
  const { slug, page } = await params;
  // [→ `listing-shell`]
  const currentPage = parsePageParam(page);
  if (currentPage === null) {
    return { title: "Page not found" };
  }

  const tag = await getTagBySlug(slug, isEnabled);

  if (!tag) {
    return { title: "Tag not found" };
  }

  return listingMetadata({
    // The parsed number, never the raw segment.
    title: `${tag.name}, Page ${currentPage}`,
    description: tag.description || `Posts tagged ${tag.name} on ${SITE_TITLE}`,
    canonical: `${SITE_URL}/tags/${slug}/page/${currentPage}`,
  });
}

export default async function TagPaginatedPage({
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
  if (pageNumber === 1) {
    redirect(`/tags/${slug}`);
  }

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
  const otherTags = new Set([...visible].filter((s) => s !== slug));

  const crumbs: Crumb[] = [
    { label: "Home", href: "/" },
    { label: "Tags", href: "/tags" },
    { label: tag.name },
  ];

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
      visibleTags={otherTags}
      basePath={`/tags/${slug}`}
      heading={
        <h1 className="text-4xl leading-tight md:text-5xl lg:text-6xl text-pretty">
          {widont(tag.name)}{" "}
          <PageCounter currentPage={pageNumber} totalPages={totalPages} />
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
