import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { notFound, redirect } from "next/navigation";
import ContentfulImage from "@/lib/contentful-image";
import ListingPage from "../../../../listing-page";
import PageCounter from "../../../../page-counter";
import { type Crumb } from "../../../../breadcrumb";
import { RichText } from "@/lib/rich-text";
import { getAllAuthors, getAllPosts, getAuthorBySlug } from "@/lib/api";
import { postsByAuthor } from "@/lib/authors";
import { visibleTagSlugs } from "@/lib/tags";
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
  // One getAllPosts for every author, rather than one getPostsByAuthor call
  // per author — getPostsByAuthor no longer exists (see the component below),
  // and fetching the sitewide list once here is also strictly fewer requests
  // than the per-author query it replaces.
  const [authors, allPosts] = await Promise.all([
    getAllAuthors(false),
    getAllPosts(false),
  ]);
  return authors
    .filter((author) => author.slug)
    .flatMap((author) => {
      const slug = author.slug as string;
      const posts = postsByAuthor(allPosts, slug);
      return pageRangeParams(posts.length, (page) => ({ slug, page }));
    });
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
  const currentPage = parsePageParam(page);
  if (currentPage === null) {
    return { title: "Page not found" };
  }

  const author = await getAuthorBySlug(slug, isEnabled);

  if (!author) {
    return { title: "Author not found" };
  }

  return listingMetadata({
    // The parsed number, never the raw segment — see parsePageParam.
    title: `${author.name}, Page ${currentPage}`,
    description: `Posts by ${author.name} on ${SITE_TITLE}`,
    canonical: `${SITE_URL}/authors/${slug}/page/${currentPage}`,
    images: author.picture?.url ? [author.picture.url] : undefined,
  });
}

export default async function AuthorPaginatedPage({
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
  // Page 1 has a single canonical home at /authors/<slug>.
  if (pageNumber === 1) {
    redirect(`/authors/${slug}`);
  }

  const author = await getAuthorBySlug(slug, isEnabled);
  if (!author) {
    notFound();
  }

  const crumbs: Crumb[] = [
    { label: "Home", href: "/" },
    { label: "Authors", href: "/authors" },
    { label: author.name },
  ];

  // One fetch, read twice — see the unpaginated page for why.
  const allPosts = await getAllPosts(isEnabled);
  const posts = postsByAuthor(allPosts, slug);
  const visibleTags = visibleTagSlugs(allPosts);
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
      basePath={`/authors/${slug}`}
      // The one exception to the split masthead — see app/wide-page.tsx and
      // the unpaginated author page.
      splitHeader={false}
      heading={
        <div className="flex items-center gap-6">
          {author.picture?.url && (
            // No ring. This used to carry ring-white/25 so a dark-toned
            // portrait kept an edge against the navy band; on cream, like the
            // authors index card's own 80px portrait, a plain circle already
            // separates from the page.
            <ContentfulImage
              alt=""
              className="rounded-full object-cover h-28 w-28 shrink-0"
              width={112}
              height={112}
              src={author.picture.url}
            />
          )}
          <h1 className="text-4xl leading-tight md:text-5xl lg:text-6xl text-pretty">
            {widont(author.name)}{" "}
            <PageCounter currentPage={pageNumber} totalPages={totalPages} />
          </h1>
        </div>
      }
      standfirst={
        author.bio && (
          // In the header, like every other browse page's standfirst. Ordinary
          // RichText on cream needs no link treatment of its own — brand-crimson
          // reads fine here, which is what every other prose link on the site
          // already relies on.
          <div className="mt-4 max-w-3xl text-lg leading-relaxed text-brand-muted text-pretty">
            <RichText content={author.bio} headings={[]} />
          </div>
        )
      }
    />
  );
}
