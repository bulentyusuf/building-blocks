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
  // One sitewide fetch; there is no getPostsByAuthor.
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
  // [→ `listing-shell`]
  const currentPage = parsePageParam(page);
  if (currentPage === null) {
    return { title: "Page not found" };
  }

  const author = await getAuthorBySlug(slug, isEnabled);

  if (!author) {
    return { title: "Author not found" };
  }

  return listingMetadata({
    // The parsed number, never the raw segment.
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
      // [→ `split-masthead`]
      splitHeader={false}
      heading={
        <div className="flex items-center gap-6">
          {author.picture?.url && (
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
          <div className="mt-4 max-w-3xl text-lg leading-relaxed text-brand-muted text-pretty">
            <RichText content={author.bio} headings={[]} />
          </div>
        )
      }
    />
  );
}
