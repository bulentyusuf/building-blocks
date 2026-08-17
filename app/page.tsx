import type { Metadata } from "next";
import Link from "next/link";
import { draftMode } from "next/headers";

import CoverImage from "./cover-image";
import Container from "./container";
import Pagination from "./pagination";
import PostRow from "./post-row";
import StoryCard, { CardMeta } from "./story-card";

import { getAllPosts } from "@/lib/api";
import {
  POSTS_PER_PAGE,
  SITE_URL,
  SITE_TITLE,
  SITE_DESCRIPTION,
} from "@/lib/constants";
import { totalPagesFor } from "@/lib/paginate";
import { createCoverNamer } from "@/lib/view-transition-name";
import type { ListPost } from "@/lib/types";
import { widont } from "@/lib/typography";

export const metadata: Metadata = {
  alternates: { canonical: SITE_URL },
};

// How many of the page's posts render as plates (a lead spanning the full
// width, then three more StoryCards in the grid) before the rest fall into
// the dated "Earlier" list. Fixed at four — 4 plates + 4 "Earlier" rows is
// POSTS_PER_PAGE — because the lead/grid split below is built for exactly
// that shape — changing this needs a design pass, not a constant bump.
const PLATE_COUNT = 4;

// The lead plate spans the full width and splits into title (left) and
// standfirst-plus-meta (right) — the one size distinction left in the
// design once the masthead itself carries the site name. The three grid
// plates below it are StoryCard (app/story-card.tsx), the same card the
// post page's Read Next teaser uses (round 3 §5).
function LeadPlate({
  post,
  priority = false,
  transitionName,
}: {
  post: ListPost;
  priority?: boolean;
  transitionName?: string;
}) {
  const cover = post.coverImage && (
    <CoverImage
      slug={post.slug}
      url={post.coverImage.url}
      alt={post.coverImage.title ?? ""}
      priority={priority}
      hover
      transitionName={transitionName}
      // Capped in px above the point the container stops growing. Container
      // is max-w-page with px-5, so content tops out at 1160px, and the lead
      // plate spans the whole of it.
      sizes="(max-width: 768px) 100vw, 1160px"
    />
  );

  return (
    <article>
      {cover && <div className="mb-6">{cover}</div>}
      <div className="grid gap-10 md:grid-cols-[1fr_380px]">
        <h2 className="text-[56px] leading-[1.04] tracking-[-0.028em] font-bold text-pretty">
          <Link
            href={`/posts/${post.slug}`}
            className="hover:text-brand-crimson transition-colors duration-200"
          >
            {widont(post.title)}
          </Link>
        </h2>
        <div>
          <p className="text-lg leading-relaxed text-pretty">{post.excerpt}</p>
          <div className="mt-3">
            <CardMeta date={post.date} category={post.category} />
          </div>
        </div>
      </div>
    </article>
  );
}

export default async function Page() {
  const { isEnabled } = await draftMode();
  const allPosts = await getAllPosts(isEnabled);

  // The first four posts render as plates — a lead, then three in the grid —
  // and whatever else fits the page budget falls into the dated "Earlier" list.
  const platePosts = allPosts.slice(0, PLATE_COUNT);
  const earlierPosts = allPosts.slice(PLATE_COUNT, POSTS_PER_PAGE);
  const totalPages = totalPagesFor(allPosts.length);

  // One name allocator for the whole page so a plate and an Earlier row (an
  // Earlier row carries no cover, so in practice this only ever guards the
  // three plates against each other) can never emit the same cover-{slug}
  // twice — a duplicate would invalidate the entire view transition.
  const coverName = createCoverNamer();

  return (
    <Container>
      {/* The masthead is home's h1 — the same signature every other index
          uses for the site itself — with the tagline as its standfirst and a
          rule closing the pair off from the listing below. No band: chrome is
          the sticky bar and the footer only, so this renders on cream like
          every other route's header now. */}
      <h1 className="site-masthead text-[96px] leading-[0.86] tracking-[-0.04em] font-extrabold text-pretty">
        {SITE_TITLE}
      </h1>
      <p className="mt-3 max-w-3xl text-xl leading-[1.45] text-brand-muted">
        {SITE_DESCRIPTION}
      </p>
      <div className="mt-8 border-t-[3px] border-brand-dark" />

      {platePosts.length > 0 && (
        <LeadPlate
          post={platePosts[0]}
          priority
          transitionName={coverName(platePosts[0].slug)}
        />
      )}

      {/* The lead's own three siblings, in the same 4-up grid every browse
          listing's card tier uses (app/more-stories.tsx) — three items never
          fill the fourth column, which is normal (see CLAUDE.md's "eight
          posts per page"). */}
      {platePosts.length > 1 && (
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
          {platePosts.slice(1).map((post) => (
            <StoryCard
              key={post.slug}
              post={post}
              transitionName={coverName(post.slug)}
            />
          ))}
        </div>
      )}

      {earlierPosts.length > 0 && (
        <section className="mt-16">
          <h2 className="border-b border-hairline pb-3 font-ui text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-muted">
            Earlier
          </h2>
          <ul className="divide-y divide-hairline">
            {earlierPosts.map((post) => (
              <PostRow
                key={post.slug}
                slug={post.slug}
                title={post.title}
                date={post.date}
              />
            ))}
          </ul>
        </section>
      )}

      <Pagination currentPage={1} totalPages={totalPages} basePath="/" />
    </Container>
  );
}
