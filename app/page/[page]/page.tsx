import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { notFound, redirect } from "next/navigation";

import ListingPage from "../../listing-page";
import PageCounter from "../../page-counter";
import { type Crumb } from "../../breadcrumb";

import { getAllPosts, getBrowseIntro } from "@/lib/api";
import { visibleTagSlugs } from "@/lib/tags";
import { SITE_URL, SITE_DESCRIPTION } from "@/lib/constants";
import {
  pageItems,
  pageRangeParams,
  parsePageParam,
  totalPagesFor,
} from "@/lib/paginate";
import { widont } from "@/lib/typography";

// The browseIntro key; both halves pass this constant.
// [→ `browse-copy`, `single-entry-cache`]
const INTRO_SLUG = "latest-posts";

export const dynamicParams = true;

export async function generateStaticParams() {
  const posts = await getAllPosts(false);
  // Page 1 lives at "/".
  return pageRangeParams(posts.length, (page) => ({ page }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ page: string }>;
}): Promise<Metadata> {
  const { page } = await params;
  // [→ `listing-shell`]
  const currentPage = parsePageParam(page);
  if (currentPage === null) {
    return { title: "Page not found" };
  }

  const { isEnabled } = await draftMode();
  const intro = await getBrowseIntro(INTRO_SLUG, isEnabled);

  // Site description fallback; this route's canonical is per page, so it does
  // not use browsePageMetadata. [→ `browse-copy`]
  const description = intro?.metaDescription?.trim() || SITE_DESCRIPTION;

  return {
    // The parsed number, never the raw segment. [→ `listing-shell`]
    title: `Latest Posts, Page ${currentPage}`,
    description,
    alternates: { canonical: `${SITE_URL}/page/${currentPage}` },
  };
}

export default async function IndexPage({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;
  const pageNumber = parsePageParam(page);

  if (pageNumber === null) {
    notFound();
  }
  if (pageNumber === 1) {
    redirect("/");
  }

  const { isEnabled } = await draftMode();
  const intro = await getBrowseIntro(INTRO_SLUG, isEnabled);
  const allPosts = await getAllPosts(isEnabled);
  const totalPages = totalPagesFor(allPosts.length);

  if (pageNumber > totalPages) {
    notFound();
  }

  const posts = pageItems(allPosts, pageNumber);

  // No emptyMessage: past the last page 404s. [→ `breadcrumbs`]
  const crumbs: Crumb[] = [
    { label: "Home", href: "/" },
    { label: "Latest Posts" },
  ];

  return (
    <ListingPage
      crumbs={crumbs}
      posts={posts}
      currentPage={pageNumber}
      totalPages={totalPages}
      visibleTags={visibleTagSlugs(allPosts)}
      basePath="/"
      heading={
        <h1 className="text-4xl leading-tight md:text-5xl lg:text-6xl text-pretty">
          Latest Posts{" "}
          <PageCounter currentPage={pageNumber} totalPages={totalPages} />
        </h1>
      }
      // No fallback. [→ `browse-copy`]
      standfirst={
        intro?.standfirst && (
          <p className="md:max-w-[20rem] text-lg leading-relaxed md:text-right text-brand-muted text-pretty">
            {widont(intro.standfirst)}
          </p>
        )
      }
    />
  );
}
