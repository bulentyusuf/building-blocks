import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { notFound, redirect } from "next/navigation";

import ListingPage from "../../listing-page";
import { type Crumb } from "../../breadcrumb";

import { getAllPosts } from "@/lib/api";
import { visibleTagSlugs } from "@/lib/tags";
import { SITE_URL, INDEX_STANDFIRST } from "@/lib/constants";
import {
  pageItems,
  pageRangeParams,
  parsePageParam,
  totalPagesFor,
} from "@/lib/paginate";

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
  return {
    title: `Latest Posts, Page ${page}`,
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
    >
      {/* Title case, matching the "Latest Posts" heading this page continues
          on the index — and matching this page's own metadata title, which
          has always read "Latest Posts, Page N". The h1 was the only one of
          the three in sentence case. */}
      <h1 className="mb-3 text-4xl leading-tight md:text-5xl lg:text-6xl text-pretty">
        Latest Posts
      </h1>
      {/* Never on / itself, where the band carries the site tagline instead. A
          standfirst repeating across the pages of one listing is already how
          every category reads. */}
      <p className="max-w-3xl text-lg leading-relaxed text-pretty">
        {INDEX_STANDFIRST}
      </p>
    </ListingPage>
  );
}
