import type { Metadata } from "next";
import Link from "next/link";
import { draftMode } from "next/headers";

import Date from "./date";
import CoverImage from "./cover-image";
import Avatar from "./avatar";
import BrowsePage from "./browse-page";
import MoreStories, { TagRow } from "./more-stories";
import Pagination from "./pagination";

import { getAllPosts } from "@/lib/api";
import { postTags, visibleTagSlugs } from "@/lib/tags";
import {
  POSTS_PER_PAGE,
  SITE_URL,
  SITE_TITLE,
  SITE_DESCRIPTION,
} from "@/lib/constants";
import { totalPagesFor } from "@/lib/paginate";
import { createCoverNamer } from "@/lib/view-transition-name";

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
  author,
  slug,
  tags,
  transitionName,
}: {
  title: string;
  coverImage?: CoverImageType;
  date: string;
  updatedDate?: string;
  excerpt: string;
  author?: Author;
  slug: string;
  /** Already filtered to tags with a live page, exactly as a card's are. */
  tags: Tag[];
  transitionName?: string;
}) {
  const showUpdated = updatedDate && updatedDate !== date;

  // Lead with the published date (matches the index cards). The updated
  // date is desktop-only so the mobile byline stays one tight line.
  //
  // No category. The site has two of them, so the label carries about one bit
  // and mostly repeats itself down the page, and the tag row directly beneath
  // is what actually tells one post from another. Putting it on the cards
  // instead was considered and rejected, because it would need a per-route
  // exception on /categories/[slug] and its paginated pages, where the category
  // is the page you are already on. Per-route exceptions are what the axis work
  // removed.
  //
  // The byline stays. It is the hero's other difference from a card and it
  // earns the space, because the site has three author personas and the film
  // and games posts are bylined to different ones. There is one hero, so unlike
  // the category it never repeats.
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

  // Cover first, then headline, excerpt and byline. In the old order this was
  // a post page's masthead rendered on the index — same elements, same order,
  // same scale — so home read as a preview of the article rather than as the
  // top of a list. The band above made that unmissable by putting a real
  // masthead directly over a masthead-shaped block that is not one.
  //
  // The cover keeps `wide` and `priority`. It is still the LCP element and it
  // is now the first painted image in document order as well, so it is
  // preloaded exactly as before and contentful-image.tsx still opens it at its
  // `instant` reveal state rather than waiting on hydration.
  //
  // The bottom margin is the listing item's own py-10 md:py-12, so the hero
  // sits exactly as far above the opening rule as every card sits above the
  // hairline below it. It was mb-section, 64px, which is the gap between two
  // page sections and left a visible hole under the pills once the hero
  // stopped being one.
  return (
    <section className="mx-auto max-w-5xl mb-10 md:mb-12">
      {coverImage && (
        <div className="mb-8 md:mb-10">
          <CoverImage
            slug={slug}
            url={coverImage.url}
            wide
            priority
            transitionName={transitionName}
            sizes="(max-width: 768px) 100vw, 1024px"
          />
        </div>
      )}
      <div>
        {/* An h2, and so is every card title below, because the listing no
            longer renders a heading of its own. Home's outline is the site
            name at h1 and then one flat list of siblings, which is what makes
            the masthead structurally the top of the page rather than only
            visually it.

            One step above a list card's text-2xl md:text-3xl and two below the
            masthead's ramp, which is the "closer to the card" end of the gap.
            At the wide h1 ramp it carried before, this was the same size as a
            post page's own headline, which is the whole reason it read as one. */}
        <h2 className="mb-4 text-3xl md:text-4xl leading-tight text-pretty">
          <Link
            href={`/posts/${slug}`}
            className="hover:text-brand-crimson transition-colors duration-200"
          >
            {widont(title)}
          </Link>
        </h2>
        <p className="text-lg leading-relaxed mb-6 text-pretty">{excerpt}</p>
        {author && (
          <div className="flex items-center">
            <Avatar
              name={author.name}
              slug={author.slug}
              picture={author.picture}
              meta={dateline}
            />
          </div>
        )}
        {/* Last, which is the same rule a card follows and not the same
            position. more-stories.tsx puts pills below the excerpt because a
            count that varies from one to three should land at the foot of the
            card where it pushes nothing around. A card's date sits above its
            excerpt and this hero's byline sits below one, so the foot here is
            after the byline. The two components order their middles
            differently on purpose.

            mt-6 rather than the card's mt-3, because what sits above differs
            too. A card's pills follow a text baseline, whereas these follow a
            40px avatar block, and 12px under that read as the pills belonging
            to the byline rather than to the post. */}
        <TagRow tags={tags} className="mt-6" />
      </div>
    </section>
  );
}

export default async function Page() {
  const { isEnabled } = await draftMode();
  const allPosts = await getAllPosts(isEnabled);

  const heroPost = allPosts[0];
  // Hero counts toward the page budget, so page 1 shows the hero plus
  // (POSTS_PER_PAGE - 1) cards.
  const morePosts = allPosts.slice(1, POSTS_PER_PAGE);
  const totalPages = totalPagesFor(allPosts.length);

  // One name allocator for the whole page so the hero and the cards below can
  // never emit the same cover-{slug} twice (a duplicate would invalidate the
  // entire view transition). First occurrence — the hero — wins.
  const coverName = createCoverNamer();

  // Computed once and shared. The hero and the cards must agree on which tags
  // have a live page, and two calls could only ever diverge — a tag hidden on
  // a card and shown on the hero would be worse than showing none at all.
  const visibleTags = visibleTagSlugs(allPosts);

  return (
    // No crumbs, because this is the root. No bleed either, so the hero's
    // cover sits below the band on cream rather than crossing its edge. Only
    // the post page bleeds. Whether home should follow now that its hero leads
    // with a cover is a design call nobody has taken, not a gap left here by
    // accident.
    //
    // The band carries the site masthead, which is what every other index does
    // with the site as its subject. It is home's h1 now that the hero below is
    // an h2, so the outline and the visual hierarchy finally say the same
    // thing. It stays unlinked, because a link on / points at the page the
    // reader is already on, which is why the last breadcrumb crumb is plain
    // text too. The bar's own wordmark hides itself here through a rule in
    // globals.css, so the name is said once rather than twice within 100px.
    //
    // No font-display and no weight class. The base-layer rule in globals.css
    // gives h1 both, and as a <p> this rendered at 400 against the 700 of the
    // post headlines under it, which is what a per-component override would
    // have papered over.
    //
    // Neither element names a colour. Both take white from the band's root, as
    // every other band's contents do.
    <BrowsePage
      header={
        <>
          <h1 className="site-masthead mb-3 text-4xl leading-tight md:text-5xl lg:text-6xl">
            {SITE_TITLE}
          </h1>
          <p className="max-w-3xl text-lg leading-relaxed">
            {SITE_DESCRIPTION}
          </p>
        </>
      }
    >
      {heroPost && (
        <HeroPost
          title={heroPost.title}
          coverImage={heroPost.coverImage}
          date={heroPost.date}
          updatedDate={heroPost.updatedDate}
          author={heroPost.author}
          slug={heroPost.slug}
          excerpt={heroPost.excerpt}
          tags={postTags(heroPost).filter((t) => visibleTags.has(t.slug))}
          transitionName={coverName(heroPost.slug)}
        />
      )}
      {/* No `heading`. With the hero already an h2 the heading was furniture
          between two things that are now siblings, and MoreStories reads its
          absence as "the page h1 is my parent", so the card titles step up to
          h2 and the whole index becomes one flat list. The rule above the
          first card still separates them: openRule defaults true here, and the
          gap above it is the hero's own bottom margin, which the heading never
          contributed to. Its mb-8 only ever sat between itself and the first
          card.

          This is also what finally makes home and /page/2 the same shape.
          They now differ only in what the band says. */}
      <MoreStories
        morePosts={morePosts}
        variant="list"
        heading={null}
        coverName={coverName}
        visibleTags={visibleTags}
      />
      <Pagination currentPage={1} totalPages={totalPages} basePath="/" />
    </BrowsePage>
  );
}
