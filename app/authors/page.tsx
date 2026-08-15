import type { Metadata } from "next";
import Link from "next/link";
import { draftMode } from "next/headers";
import ContentfulImage from "@/lib/contentful-image";
import DateComponent from "../date";
import WidePage from "../wide-page";
import { type Crumb } from "../breadcrumb";
import { RichText } from "@/lib/rich-text";
import {
  getAllAuthors,
  getAuthorBySlug,
  getRecentPostsByAuthor,
  getBrowseIntro,
} from "@/lib/api";
import { browsePageMetadata } from "@/lib/page-metadata";
import { widont } from "@/lib/typography";

// How many recent posts to tease under each author. The full list lives on
// the individual author page (/authors/[slug]).
const PREVIEW_COUNT = 3;

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

  // One capped fetch per author, in parallel — same shape as the categories
  // index and for the same reason: the "All N posts" link needs the real
  // total even though the teaser itself is capped short of it.
  const previews = await Promise.all(
    authors.map(
      async (author) =>
        [
          author.slug,
          await getRecentPostsByAuthor(
            author.slug as string,
            PREVIEW_COUNT,
            isEnabled,
          ),
        ] as const,
    ),
  );
  const postsBySlug = new Map(previews);

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
            <p className="max-w-3xl text-lg leading-relaxed text-pretty">
              {intro.standfirst}
            </p>
          )}
        </>
      }
    >
      {/* Three cards in a two-column grid orphaned one into a row of its own.
          Same two-column pattern as the tags glossary instead — 340px|1fr,
          one hairline per author — which reads as an index at any author
          count rather than a grid that only balances at certain ones. */}
      <div>
        {authors.map((author, index) => {
          const { items: posts, total } = postsBySlug.get(author.slug) ?? {
            items: [],
            total: 0,
          };
          return (
            <article
              key={author.slug ?? author.name}
              className="border-b border-hairline py-[28px] first:pt-0 last:pb-0"
            >
              <div className="lg:grid lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-x-14">
                <div className="flex flex-col gap-3">
                  {author.picture?.url && (
                    // Decorative: the heading carries the name, so alt is
                    // empty to avoid screen-reader duplication.
                    <ContentfulImage
                      alt=""
                      src={author.picture.url}
                      width={72}
                      height={72}
                      className="h-[72px] w-[72px] shrink-0 rounded-full object-cover"
                      priority={index === 0}
                    />
                  )}
                  <h2 className="text-[34px] leading-[1.1] font-bold tracking-[-0.02em] text-pretty">
                    <Link
                      href={`/authors/${author.slug}`}
                      className="hover:text-brand-crimson transition-colors duration-200"
                    >
                      {widont(author.name)}
                    </Link>
                  </h2>

                  {author.bio && (
                    <div className="text-base leading-[1.55] text-brand-muted text-pretty">
                      <RichText content={author.bio} headings={[]} />
                    </div>
                  )}

                  {total > 0 && (
                    <Link
                      href={`/authors/${author.slug}`}
                      className="font-ui text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-crimson hover:underline"
                    >
                      All {total} {total === 1 ? "post" : "posts"} &rarr;
                    </Link>
                  )}
                </div>

                {posts.length > 0 && (
                  <ul className="mt-4 flex flex-col gap-[10px] border-t border-hairline pt-4 lg:mt-0 lg:border-t-0 lg:pt-1.5">
                    {posts.map((post) => (
                      <li
                        key={post.slug}
                        className="grid grid-cols-[96px_1fr] items-baseline gap-5"
                      >
                        <span className="text-sm tabular-nums text-brand-muted">
                          <DateComponent dateString={post.date} />
                        </span>
                        <Link
                          href={`/posts/${post.slug}`}
                          className="text-[19px] leading-[1.3] font-semibold text-pretty hover:text-brand-crimson transition-colors duration-200"
                        >
                          {widont(post.title)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </WidePage>
  );
}
