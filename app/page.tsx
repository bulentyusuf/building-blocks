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
  author,
  slug,
  tags,
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
  //
  // It renders through Avatar with the date still inside `meta`, exactly as it
  // did before the split — not pulled out onto its own line the way a card's
  // date is. An earlier version of this component did pull it out, to mirror
  // the card's element order (headline, date, standfirst, tags) exactly. That
  // was reverted: Avatar already takes name, picture and meta and the date was
  // already doing the right job inside it, so keeping the component whole beat
  // matching the card's sequence one field at a time. The date is grouped with
  // the author rather than standing alone as a deliberate, stated deviation
  // from the card mirror — not an oversight.
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

  // Cover first, then the split. In the old order this was a post page's
  // masthead rendered on the index — same elements, same order, same scale —
  // so home read as a preview of the article rather than as the top of a
  // list. The band above made that unmissable by putting a real masthead
  // directly over a masthead-shaped block that is not one.
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
        // Same device as the post page. No pull-up any more: Phase 1 of the
        // band retirement (CLAUDE.md) dropped the full-bleed band the cover
        // used to cross, so it renders as an ordinary block sitting directly
        // under WidePage's 3px rule, the same as any other wide route's first
        // element.
        //
        // mb-8 md:mb-10 rather than the post page's flat mb-10. What sits below
        // differs — a post's cover is followed by its body column, this one by a
        // headline — and the hero's own rhythm under the cover is not what this
        // change is about.
        <div className="mb-8 md:mb-10">
          <CoverImage
            slug={slug}
            url={coverImage.url}
            alt={coverImage.title ?? ""}
            wide
            priority
            sizes="(max-width: 768px) 100vw, 1024px"
          />
        </div>
      )}
      {/* Below the cover, an asymmetric split rather than an even one: the
          headline needs more room than the standfirst does. Left carries the
          headline and the byline; right the standfirst and the tag row.

          md:grid-cols-[3fr_2fr] at gap-x-16 measures a 566px left column
          inside the 984px container — measured against the six most recently
          published post titles (38 to 57 characters), not the seed's
          placeholder titles (17 to 31), which is what let an earlier version
          of this column ship four lines deep. An even 2fr/2fr split with the
          listing's own lg:gap-x-32 measured a 428px left column, which held
          only 30px text to two lines; the wider, asymmetric column is what
          the 40px cap below actually needs.

          gap-x-16 only, no lg: step. The listing's own two-column grids
          (more-stories.tsx, the taxonomy card index) widen their gutter at
          lg because their columns are already wide enough to spare the
          space; this one cannot afford to, since the extra width bought by a
          narrower gutter is what keeps the headline at two lines.

          Base-level grid, not md:grid — below md the two children stack as a
          single column, and gap-y-6 is the join between them (the byline
          block and the excerpt), a clear step above the h2's own mb-4 to the
          byline so the mobile stack reads as two groups rather than four
          equally-weighted items. md:gap-y-0 drops it once the grid goes
          two-column, where gap-x-16 is the only gap this row has. */}
      <div className="grid gap-y-6 md:grid-cols-[3fr_2fr] md:gap-x-16 md:gap-y-0">
        <div>
          {/* An h2, and so is every card title below, because the listing no
              longer renders a heading of its own. Home's outline is the site
              name at h1 and then one flat list of siblings, which is what
              makes the masthead structurally the top of the page rather than
              only visually it.

              Caps at 40px (lg:text-[2.5rem], off Tailwind's scale on
              purpose) rather than climbing to the 48px a full-width hero
              headline used to reach. Measured against the six most recently
              published titles in this 566px column: 48px holds two lines for
              a short title but runs to four for a long one, and three lines
              is already the four-line failure's twin as far as a hero
              reads. 40px holds every one of the six to two lines. lg:text-4xl
              (36px, on-scale) also clears two lines in this column and is
              the fallback if 2.5rem is ever found objectionable; do not go
              back to 48px in a split column at this container width. */}
          <h2 className="mb-4 text-2xl md:text-3xl lg:text-[2.5rem] leading-tight text-pretty">
            <Link
              href={`/posts/${slug}`}
              className="hover:text-brand-crimson transition-colors duration-200"
            >
              {widont(title)}
            </Link>
          </h2>
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
        </div>
        <div>
          <p className="text-lg leading-relaxed text-pretty">{excerpt}</p>
          {/* mt-3, not the mt-6 this carried before the split, which was
              tuned against a 40px avatar block sitting directly above the
              pills in the same column. The avatar is in the left column now,
              so what sits above the pills here is a text baseline — the
              excerpt — exactly as it is on a card. */}
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
  // Hero counts toward the page budget, so page 1 shows the hero plus
  // (POSTS_PER_PAGE - 1) cards.
  const morePosts = allPosts.slice(1, POSTS_PER_PAGE);
  const totalPages = totalPagesFor(allPosts.length);

  // Computed once and shared. The hero and the cards must agree on which tags
  // have a live page, and two calls could only ever diverge — a tag hidden on
  // a card and shown on the hero would be worse than showing none at all.
  const visibleTags = visibleTagSlugs(allPosts);

  return (
    // No crumbs, because this is the root — the last breadcrumb crumb is
    // never a link either, for the same reason: both would point at the page
    // the reader is already on.
    //
    // The masthead carries the site name, which is what every other index does
    // with the site as its subject. It is home's h1 now that the hero below is
    // an h2, so the outline and the visual hierarchy finally say the same
    // thing. The bar's own wordmark hides itself here through a rule in
    // globals.css keyed on .site-masthead, so the name is said once rather
    // than twice within 100px — see that rule's comment for why the class has
    // to move WITH the heading if this markup changes again.
    //
    // No font-display and no weight class. The base-layer rule in globals.css
    // gives h1 both, and as a <p> this rendered at 400 against the 700 of the
    // post headlines under it, which is what a per-component override would
    // have papered over.
    //
    // No contentOwnsLeading. It gated on the cover while the cover pulled up
    // across the band's bottom edge and supplied its own leading that way. The
    // pull-up is gone with the band, so the hero brings no top margin at all
    // and takes WidePage's own gap below the rule like every other route whose
    // content opens with a bare element. Setting it here would leave the cover
    // flush against a 3px line.
    <WidePage
      heading={
        // The full stop is wrapped in crimson when the title carries a
        // literal trailing one — true for the default "Be Useful." and for
        // any fork that keeps the convention, but not guaranteed: a
        // NEXT_PUBLIC_SITE_TITLE override (see lib/constants.ts) may not end
        // in a full stop, and this degrades to a plain heading rather than
        // assuming one.
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
      // The split masthead's standfirst: text-lg (18px) and text-brand-muted
      // like every other route's. max-w-[20rem] plus text-right is M5 — see
      // app/wide-page.tsx — and SITE_DESCRIPTION is written to hold two lines
      // at that width, same as every other route's standfirst.
      //
      // md: on both max-w-[20rem] and text-right: below md there is no split
      // row for either to be anchored against (WidePage stacks with flex-col),
      // so unprefixed they shrank this standfirst to a 320px box and
      // right-aligned its text inside it — a phantom right margin 30px short
      // of the page edge, sitting under a left-aligned h1. Full-width,
      // left-aligned on mobile instead. No text-pretty here, unlike the other
      // ten standfirsts sharing this signature — pre-existing, not touched by
      // this fix.
      standfirst={
        <p className="md:max-w-[20rem] text-lg leading-relaxed md:text-right text-brand-muted">
          {SITE_DESCRIPTION}
        </p>
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

          Home and /page/2 now differ in shape as well as in band, and
          deliberately: the browse routes are the site's lists, and the front
          page should not be a fifth copy of one. The grid is what makes home
          read as a front page rather than another listing. The hero stays an
          h2 and the cards stay h2 either way, so the flat outline the heading
          removal bought is unaffected by which variant renders beneath it. */}
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
