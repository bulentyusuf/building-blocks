import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import ContentfulImage from "@/lib/contentful-image";
import ListingPage from "../../listing-page";
import PageCounter from "../../page-counter";
import { type Crumb } from "../../breadcrumb";
import { RichText } from "@/lib/rich-text";
import { getAllAuthors, getAllPosts, getAuthorBySlug } from "@/lib/api";
import { postsByAuthor } from "@/lib/authors";
import { visibleTagSlugs } from "@/lib/tags";
import { SITE_TITLE, SITE_URL } from "@/lib/constants";
import { listingMetadata } from "@/lib/page-metadata";
import { pageItems, totalPagesFor } from "@/lib/paginate";
import { widont } from "@/lib/typography";

export const dynamicParams = true;

export async function generateStaticParams() {
  const authors = await getAllAuthors(false);
  return authors
    .filter((author) => author.slug)
    .map((author) => ({ slug: author.slug as string }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { isEnabled } = await draftMode();
  const { slug } = await params;
  const author = await getAuthorBySlug(slug, isEnabled);

  if (!author) {
    return { title: "Author not found" };
  }

  return listingMetadata({
    title: author.name,
    description: `Posts by ${author.name} on ${SITE_TITLE}`,
    canonical: `${SITE_URL}/authors/${slug}`,
    images: author.picture?.url ? [author.picture.url] : undefined,
  });
}

export default async function AuthorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { isEnabled } = await draftMode();
  const { slug } = await params;

  const author = await getAuthorBySlug(slug, isEnabled);

  if (!author) {
    notFound();
  }

  const crumbs: Crumb[] = [
    { label: "Home", href: "/" },
    { label: "Authors", href: "/authors" },
    { label: author.name },
  ];

  // Filtered in memory; there is no getPostsByAuthor. [→ `authors-array`]
  const allPosts = await getAllPosts(isEnabled);
  const posts = postsByAuthor(allPosts, slug);
  const visibleTags = visibleTagSlugs(allPosts);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: author.name,
      url: `${SITE_URL}/authors/${slug}`,
      image: author.picture?.url,
    },
  };

  const totalPages = totalPagesFor(posts.length);

  return (
    <ListingPage
      crumbs={crumbs}
      posts={pageItems(posts, 1)}
      currentPage={1}
      totalPages={totalPages}
      visibleTags={visibleTags}
      basePath={`/authors/${slug}`}
      emptyMessage="No posts by this author yet."
      jsonLd={jsonLd}
      // The split masthead's exception: the h1 already shares a row with the
      // portrait. [→ `split-masthead`]
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
          {/* The standard ramp: the raised one overflows beside the portrait. */}
          <h1 className="text-4xl leading-tight md:text-5xl lg:text-6xl text-pretty">
            {widont(author.name)}{" "}
            <PageCounter currentPage={1} totalPages={totalPages} />
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
