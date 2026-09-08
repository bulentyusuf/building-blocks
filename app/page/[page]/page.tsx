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

// The BrowseIntro key, and the one place it is written — both halves of this
// route must pass this same constant. [→ `browse-copy`, `single-entry-cache`]
// Names the route rather than the content type, matching "archive",
// "categories", "tags" and "authors". No schema change was needed for it.
const INTRO_SLUG = "latest-posts";

// Render pages added after build on demand; out-of-range pages 404 below.
export const dynamicParams = true;

export async function generateStaticParams() {
  const posts = await getAllPosts(false);
  // Page 1 lives at "/", so only build 2..totalPages here.
  return pageRangeParams(posts.length, (page) => ({ page }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ page: string }>;
}): Promise<Metadata> {
  const { page } = await params;
  // The component 404s on anything that is not a page number, so metadata has
  // to agree. [→ `listing-shell`]
  const currentPage = parsePageParam(page);
  if (currentPage === null) {
    return { title: "Page not found" };
  }

  // Same slug and same isEnabled the component passes below, so the two
  // cache()-wrapped calls collapse into one request per render.
  const { isEnabled } = await draftMode();
  const intro = await getBrowseIntro(INTRO_SLUG, isEnabled);

  // Falls back to the site's description, not browsePageMetadata's (that
  // helper builds its canonical from the slug and this route's is per page).
  // [→ `browse-copy`]
  const description = intro?.metaDescription?.trim() || SITE_DESCRIPTION;

  return {
    // The parsed number, never the raw segment: `Number()` accepts `0x2` and
    // `2.000` as readily as `2`. [→ parsePageParam in lib/paginate.ts]
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
  // Page 1 has a single canonical home at "/".
  if (pageNumber === 1) {
    redirect("/");
  }

  const { isEnabled } = await draftMode();
  // Same arguments generateMetadata passes, so cache() collapses the two.
  const intro = await getBrowseIntro(INTRO_SLUG, isEnabled);
  const allPosts = await getAllPosts(isEnabled);
  const totalPages = totalPagesFor(allPosts.length);

  if (pageNumber > totalPages) {
    notFound();
  }

  const posts = pageItems(allPosts, pageNumber);

  // Home is the only link in the trail, since the last crumb is never one.
  // [→ `breadcrumbs`]
  //
  // No `emptyMessage`, because the guard above 404s past the last page, so
  // empty is unreachable and omitting the prop asserts that.
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
      // Title case, matching this page's own metadata title above.
      heading={
        <h1 className="text-4xl leading-tight md:text-5xl lg:text-6xl text-pretty">
          Latest Posts{" "}
          <PageCounter currentPage={pageNumber} totalPages={totalPages} />
        </h1>
      }
      // Never on / itself, where the masthead carries the site tagline
      // instead. Rendered only when the entry has one, deliberately with no
      // fallback. [→ `browse-copy`]
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
