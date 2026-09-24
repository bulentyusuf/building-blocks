import type { Metadata } from "next";
import Link from "next/link";
import { draftMode } from "next/headers";

import Date from "./date";
import CoverImage from "./cover-image";
import Avatar from "./avatar";
import WidePage from "./wide-page";
import MoreStories, { TagRow } from "./more-stories";
import Pagination from "./pagination";

import { getAllPosts } from "@/lib/api";
import { postTags, visibleTagSlugs } from "@/lib/tags";
import { postAuthors } from "@/lib/authors";
import {
  POSTS_PER_PAGE,
  SITE_URL,
  SITE_TITLE,
  SITE_DESCRIPTION,
} from "@/lib/constants";
import { totalPagesFor } from "@/lib/paginate";

export const metadata: Metadata = {
  alternates: { canonical: SITE_URL },
};
import type { Author, CoverImage as CoverImageType, Tag } from "@/lib/types";
import { widont } from "@/lib/typography";

function HeroPost({
  title,
  coverImage,
  date,
  updatedDate,
  excerpt,
  authors,
  slug,
  tags,
}: {
  title: string;
  coverImage?: CoverImageType;
  date: string;
  updatedDate?: string;
  excerpt: string;
  authors: Author[];
  slug: string;
  /** Already filtered to tags with a live page. */
  tags: Tag[];
}) {
  const showUpdated = updatedDate && updatedDate !== date;

  // Updated date on desktop only. Kept inside Avatar's meta.
  // [→ `card-meta`, `home-hero`]
  const dateline = (
    <>
      <Date dateString={date} />
      {showUpdated && (
        <span className="hidden sm:inline">
          {" · "}Updated <Date dateString={updatedDate!} />
        </span>
      )}
    </>
  );

  // The bottom margin matches a listing item's padding. The cover is the LCP.
  // [→ `priority-opaque`]
  return (
    <section className="mx-auto max-w-5xl mb-10 md:mb-12">
      {coverImage && (
        // An ordinary block under the rule. [→ `band-retirement`]
        <div className="mb-8 md:mb-10">
          <CoverImage
            slug={slug}
            image={coverImage}
            wide
            priority
            sizes="(max-width: 768px) calc(100vw - 2.5rem), 1024px"
          />
        </div>
      )}
      {/* [→ `home-hero`] */}
      <div className="grid gap-y-6 md:grid-cols-2 md:gap-x-16 lg:gap-x-32 md:gap-y-0">
        <div>
          {/* An h2 under the masthead h1, capped at 40px so long titles hold
              two lines. [→ `page-axis`, `home-hero`] */}
          <h2 className="mb-4 text-2xl md:text-3xl lg:text-[2.5rem] leading-tight text-pretty">
            <Link
              href={`/posts/${slug}`}
              className="hover:text-brand-crimson transition-colors duration-200"
            >
              {widont(title)}
            </Link>
          </h2>
          <div className="flex items-center">
            <Avatar authors={authors} meta={dateline} />
          </div>
        </div>
        <div>
          <p className="text-lg leading-relaxed text-pretty">
            {widont(excerpt)}
          </p>
          <TagRow tags={tags} className="mt-3" />
        </div>
      </div>
    </section>
  );
}

export default async function Page() {
  const { isEnabled } = await draftMode();
  const allPosts = await getAllPosts(isEnabled);

  const heroPost = allPosts[0];
  const morePosts = allPosts.slice(1, POSTS_PER_PAGE);
  const totalPages = totalPagesFor(allPosts.length);

  // Computed once so the hero and the cards agree on which tags have a page.
  const visibleTags = visibleTagSlugs(allPosts);

  return (
    // No crumbs on the root. The masthead is home's h1 and carries
    // .site-masthead, which the bar's wordmark rule keys on, so the class moves
    // with the heading. No weight class, no contentOwnsLeading.
    // [→ `page-axis`, `wide-page-shell`]
    <WidePage
      heading={
        // Crimson full stop only when the title really ends in one.
        <h1 className="site-masthead text-5xl leading-[0.95] tracking-[-0.025em] md:text-6xl lg:text-7xl">
          {SITE_TITLE.endsWith(".") ? (
            <>
              {SITE_TITLE.slice(0, -1)}
              <span className="text-brand-crimson">.</span>
            </>
          ) : (
            SITE_TITLE
          )}
        </h1>
      }
      // Every class is load-bearing. [→ `split-masthead`]
      standfirst={
        <p className="md:max-w-[20rem] text-lg leading-relaxed md:text-right text-brand-muted text-pretty">
          {widont(SITE_DESCRIPTION)}
        </p>
      }
    >
      {heroPost && (
        <HeroPost
          title={heroPost.title}
          coverImage={heroPost.coverImage}
          date={heroPost.date}
          updatedDate={heroPost.updatedDate}
          authors={postAuthors(heroPost)}
          slug={heroPost.slug}
          excerpt={heroPost.excerpt}
          tags={postTags(heroPost).filter((t) => visibleTags.has(t.slug))}
        />
      )}
      {/* No heading, so card titles step up to h2. [→ `page-axis`] */}
      <MoreStories
        morePosts={morePosts}
        variant="grid"
        ruled
        heading={null}
        visibleTags={visibleTags}
      />
      <Pagination currentPage={1} totalPages={totalPages} basePath="/" />
    </WidePage>
  );
}
