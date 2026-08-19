import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { notFound, redirect } from "next/navigation";
import ContentfulImage from "@/lib/contentful-image";
import ListingPage from "../../../../listing-page";
import PageCounter from "../../../../page-counter";
import { type Crumb } from "../../../../breadcrumb";
import { RichText } from "@/lib/rich-text";
import {
  getAllAuthors,
  getAuthorBySlug,
  getPostsByAuthor,
  getVisibleTagSlugs,
} from "@/lib/api";
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
  const authors = await getAllAuthors(false);
  const perAuthor = await Promise.all(
    authors
      .filter((author) => author.slug)
      .map(async (author) => {
        const slug = author.slug as string;
        const posts = await getPostsByAuthor(slug, false);
        return pageRangeParams(posts.length, (page) => ({ slug, page }));
      }),
  );
  return perAuthor.flat();
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
  if (parsePageParam(page) === null) {
    return { title: "Page not found" };
  }

  const author = await getAuthorBySlug(slug, isEnabled);

  if (!author) {
    return { title: "Author not found" };
  }

  return listingMetadata({
    title: `${author.name}, Page ${page}`,
    description: `Posts by ${author.name} on ${SITE_TITLE}`,
    canonical: `${SITE_URL}/authors/${slug}/page/${page}`,
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

  // Independent queries, so they go out together — see the unpaginated page.
  const [posts, visibleTags] = await Promise.all([
    getPostsByAuthor(slug, isEnabled),
    getVisibleTagSlugs(isEnabled),
  ]);
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
