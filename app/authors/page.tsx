import type { Metadata } from "next";
import Link from "next/link";
import { draftMode } from "next/headers";
import ContentfulImage from "@/lib/contentful-image";
import WidePage from "../wide-page";
import { type Crumb } from "../breadcrumb";
import { RichText } from "@/lib/rich-text";
import { getAllAuthors, getAuthorBySlug, getBrowseIntro } from "@/lib/api";
import { browsePageMetadata } from "@/lib/page-metadata";
import { widont } from "@/lib/typography";

export async function generateMetadata(): Promise<Metadata> {
  // Same slug the component passes to getBrowseIntro below. getBrowseIntro is
  // cache()-wrapped, so the two calls collapse into one request per render
  // — but only while the arguments match.
  const { isEnabled } = await draftMode();
  return browsePageMetadata({
    slug: "authors",
    title: "Authors",
    isDraftMode: isEnabled,
  });
}

export default async function AuthorsPage() {
  const { isEnabled } = await draftMode();
  // Same arguments generateMetadata passes, so cache() collapses the two.
  const intro = await getBrowseIntro("authors", isEnabled);

  const list = await getAllAuthors(isEnabled);
  // Each author's full record (with bio) in parallel, mirroring the categories
  // index fetching a preview per category.
  const authors = (
    await Promise.all(
      list.map((a) => getAuthorBySlug(a.slug as string, isEnabled)),
    )
  ).filter((a): a is NonNullable<typeof a> => Boolean(a));

  const crumbs: Crumb[] = [{ label: "Home", href: "/" }, { label: "Authors" }];

  return (
    <WidePage
      crumbs={crumbs}
      header={
        <>
          <h1 className="mb-3 text-4xl leading-tight md:text-5xl lg:text-6xl">
            Authors
          </h1>
          {intro?.standfirst && (
            <p className="max-w-3xl text-lg leading-relaxed text-brand-muted text-pretty">
              {intro.standfirst}
            </p>
          )}
        </>
      }
    >
      <div className="grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-10">
        {authors.map((author) => (
          <article
            key={author.slug ?? author.name}
            className="flex flex-col min-w-0"
          >
            <div className="mb-5 flex items-center gap-4">
              {author.picture?.url && (
                // Decorative: the heading carries the name, so alt is empty to
                // avoid screen-reader duplication, same as the category cards.
                <ContentfulImage
                  alt=""
                  src={author.picture.url}
                  width={80}
                  height={80}
                  className="rounded-full object-cover h-20 w-20 shrink-0"
                />
              )}
              <h2 className="text-2xl leading-snug md:text-3xl text-pretty">
                <Link
                  href={`/authors/${author.slug}`}
                  className="hover:text-brand-crimson transition-colors duration-200"
                >
                  {widont(author.name)}
                </Link>
              </h2>
            </div>

            {author.bio && (
              <div className="mb-5 text-lg leading-relaxed text-brand-muted text-pretty">
                <RichText content={author.bio} headings={[]} />
              </div>
            )}

            <Link
              href={`/authors/${author.slug}`}
              className="mt-auto inline-block font-ui text-sm font-bold uppercase tracking-wide text-brand-crimson hover:underline"
            >
              View posts by {author.name} &rarr;
            </Link>
          </article>
        ))}
      </div>
    </WidePage>
  );
}
