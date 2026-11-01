import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import ContentfulImage from "@/lib/contentful-image";
import { RichText } from "@/lib/rich-text";
import CollectionPage from "../../collection-page";
import { type Crumb } from "../../breadcrumb";
import { getAllAuthors, getAllPosts, getAuthorBySlug } from "@/lib/api";
import { postsByAuthor } from "@/lib/authors";
import { visibleTagSlugs } from "@/lib/tags";
import { SITE_TITLE, SITE_URL } from "@/lib/constants";
import { listingMetadata } from "@/lib/page-metadata";
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

  // No /authors index to point at. [→ `listing-shell`]
  const crumbs: Crumb[] = [
    { label: "Home", href: "/" },
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

  return (
    <CollectionPage
      crumbs={crumbs}
      posts={posts}
      visibleTags={visibleTags}
      jsonLd={jsonLd}
      closing={
        posts.length === 0
          ? "No posts by this author yet."
          : posts.length === 1
            ? `That’s the only post by ${author.name}.`
            : `That’s all ${posts.length} posts by ${author.name}.`
      }
      heading={
        <>
          <div className="flex items-center gap-5 md:gap-7">
            {author.picture?.url && (
              <ContentfulImage
                alt=""
                className="h-20 w-20 shrink-0 rounded-full border-[3px] border-brand-dark object-cover md:h-28 md:w-28"
                width={112}
                height={112}
                src={author.picture.url}
              />
            )}
            <h1 className="text-5xl leading-[0.98] font-[800] tracking-[-0.03em] text-pretty md:text-6xl lg:text-7xl">
              {widont(author.name)}
            </h1>
          </div>
          {author.bio && (
            <div className="mt-6 max-w-2xl text-lg leading-relaxed text-pretty text-brand-muted">
              <RichText content={author.bio} headings={[]} />
            </div>
          )}
        </>
      }
    />
  );
}
