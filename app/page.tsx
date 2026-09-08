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
  /** Already filtered to tags with a live page, exactly as a card's are. */
  tags: Tag[];
}) {
  const showUpdated = updatedDate && updatedDate !== date;

  // Lead with the published date (matches the index cards). The updated date
  // is desktop-only so the mobile byline stays one tight line. No category —
  // [→ `card-meta`]. Date grouped inside Avatar's `meta`, not its own line.
  // [→ `home-hero`]
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

  // The cover keeps `wide` and `priority` — still the LCP element.
  // [→ `priority-opaque`]
  //
  // The bottom margin is the listing item's own py-10 md:py-12, matching
  // every card's own gap above the hairline below it. It was mb-section
  // (64px, the gap between page sections), which left a visible hole under
  // the pills once the hero stopped being one.
  return (
    <section className="mx-auto max-w-5xl mb-10 md:mb-12">
      {coverImage && (
        // No pull-up: it renders as an ordinary block under WidePage's 3px
        // rule, like any other wide route's first element. [→ `band-retirement`]
        //
        // mb-8 md:mb-10 rather than the post page's flat mb-10 — what sits
        // below differs (body column there, headline here).
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
      {/* Synced in width and gutter with MoreStories' two-column grid below.
          [→ `home-hero`] */}
      <div className="grid gap-y-6 md:grid-cols-2 md:gap-x-16 lg:gap-x-32 md:gap-y-0">
        <div>
          {/* An h2 — the listing renders no heading of its own, so home's
              outline is the site name at h1 then one flat list of siblings.
              [→ `page-axis`]
              Capped at 40px, not 48px. [→ `home-hero`] Measured against the
              six most recently published titles in this 566px column: 48px
              holds two lines for a short title but runs to four for a long
              one; 40px holds every one of the six to two. */}
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
          {/* mt-3, not the pre-split mt-6. [→ `home-hero`] */}
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
  // [→ `posts-per-page`]
  const morePosts = allPosts.slice(1, POSTS_PER_PAGE);
  const totalPages = totalPagesFor(allPosts.length);

  // Computed once and shared. The hero and the cards must agree on which tags
  // have a live page, and two calls could only ever diverge — a tag hidden on
  // a card and shown on the hero would be worse than showing none at all.
  const visibleTags = visibleTagSlugs(allPosts);

  return (
    // No crumbs: the root, same reason the last breadcrumb is never a link.
    // [→ `page-axis`]
    //
    // The masthead carries the site name and is home's h1. The bar's own
    // wordmark hides itself here through a rule in globals.css keyed on
    // .site-masthead — the class must move WITH the heading if this markup
    // changes again. [→ `wide-page-shell`]
    //
    // No font-display, no weight class: the element being a heading is the
    // mechanism. [→ `page-axis`]
    //
    // No contentOwnsLeading — the pull-up it used to gate on is gone with the
    // band. [→ `band-retirement`]
    <WidePage
      heading={
        // The full stop is wrapped in crimson when the title carries a
        // literal trailing one; a NEXT_PUBLIC_SITE_TITLE override may not,
        // and degrades to a plain heading rather than assuming one.
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
      // Every class here is load-bearing, both md: prefixes included.
      // [→ `split-masthead`]
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
      {/* No `heading`: MoreStories reads its absence as "the page h1 is my
          parent", stepping card titles up to h2 for one flat list.
          [→ `page-axis`] openRule defaults true here; the gap above the
          first card is the hero's own bottom margin, not the (absent)
          heading's mb-8. */}
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
