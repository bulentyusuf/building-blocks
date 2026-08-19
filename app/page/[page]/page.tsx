import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { notFound, redirect } from "next/navigation";

import ListingPage from "../../listing-page";
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

// The BrowseIntro key, and the one place it is written. Both halves of this
// route pass this same constant to getBrowseIntro for the reason /about and
// /privacy pass one SLUG: cache() collapses identical calls, not equivalent
// ones, so a second literal here is a second POST per render waiting to happen.
//
// It names the route rather than the content type, matching "archive",
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
  // to agree — otherwise a title and a canonical are built out of the raw
  // segment for a URL that is about to not exist.
  if (parsePageParam(page) === null) {
    return { title: "Page not found" };
  }

  // Same slug and same isEnabled the component passes below. getBrowseIntro is
  // cache()-wrapped, so the two calls collapse into one request per render, but
  // only while the arguments match — which is why draftMode() is resolved here
  // rather than defaulted.
  const { isEnabled } = await draftMode();
  const intro = await getBrowseIntro(INTRO_SLUG, isEnabled);

  // The description falls back to the site's, exactly as browsePageMetadata
  // does for the four section fronts. That helper cannot be reused here,
  // because it builds its canonical from the slug and this route's is per page.
  // Trimmed because a field holding only whitespace is an empty field.
  //
  // This is the one fallback in this route, and it is deliberate: a page with
  // no description at all is worse in a search result than one carrying the
  // site's, and SITE_DESCRIPTION is chrome rather than page copy, so it cannot
  // be mistaken for an edit nobody made. The standfirst below takes the
  // opposite line, and the note there says why.
  const description = intro?.metaDescription?.trim() || SITE_DESCRIPTION;

  return {
    title: `Latest Posts, Page ${page}`,
    description,
    alternates: { canonical: `${SITE_URL}/page/${page}` },
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

  // Home is the only link in the trail, because the last crumb is never one.
  // The earlier reasoning against a trail here assumed it would be, and so
  // concluded that both crumbs would point at /. They do not. The page number
  // stays out of it, since position is a state rather than a level and
  // PageContext captions the list with it.
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
      // Title case, matching the "Latest Posts" heading this page continues
      // on the index — and matching this page's own metadata title, which
      // has always read "Latest Posts, Page N". The h1 was the only one of
      // the three in sentence case.
      heading={
        <h1 className="text-4xl leading-tight md:text-5xl lg:text-6xl text-pretty">
          Latest Posts
        </h1>
      }
      // Never on / itself, where the masthead carries the site tagline
      // instead. A standfirst repeating across the pages of one listing is
      // already how every category reads.
      //
      // Rendered only when the entry has one, which is what the four section
      // fronts do, and there is deliberately no fallback: hard-coded copy
      // appearing in the CMS's slot is how the entry stops being the source of
      // truth, with nothing on the page saying which of the two you are
      // looking at. A fresh fork takes this path, because the fork seed is not
      // being given a latest-posts entry in this change.
      standfirst={
        intro?.standfirst && (
          <p className="text-lg leading-relaxed text-brand-muted text-pretty">
            {intro.standfirst}
          </p>
        )
      }
    />
  );
}
