import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import ContentfulImage from "@/lib/contentful-image";
import ListingPage from "../../listing-page";
import { type Crumb } from "../../breadcrumb";
import { RichText } from "@/lib/rich-text";
import {
  getAllAuthors,
  getAuthorBySlug,
  getPostsByAuthor,
  getVisibleTagSlugs,
} from "@/lib/api";
import { SITE_TITLE, SITE_URL } from "@/lib/constants";
import { listingMetadata } from "@/lib/page-metadata";
import { pageItems, totalPagesFor } from "@/lib/paginate";
import { widont } from "@/lib/typography";

// Allow on-demand rendering of authors added after build time.
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

  // Independent queries, so they go out together. Awaited in sequence they
  // serialised the two slowest calls on this page for no reason.
  const [posts, visibleTags] = await Promise.all([
    getPostsByAuthor(slug, isEnabled),
    getVisibleTagSlugs(isEnabled),
  ]);

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

  return (
    <ListingPage
      crumbs={crumbs}
      posts={pageItems(posts, 1)}
      currentPage={1}
      totalPages={totalPagesFor(posts.length)}
      visibleTags={visibleTags}
      basePath={`/authors/${slug}`}
      emptyMessage="No posts by this author yet."
      jsonLd={jsonLd}
      // The one exception to the split masthead: this h1 already sits in a
      // flex row beside a 112px portrait, and a third element across that
      // line — the standfirst — is one too many. See app/wide-page.tsx.
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
          {/* Stays on the current ramp rather than the raised one the section
              fronts take: this h1 sits beside a 112px portrait, and the raised
              ramp overflows the row on a long name at md. */}
          <h1 className="text-4xl leading-tight md:text-5xl lg:text-6xl text-pretty">
            {widont(author.name)}
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
