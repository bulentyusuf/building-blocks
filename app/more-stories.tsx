import Link from "next/link";
import DateComponent from "./date";
import CoverImage from "./cover-image";
import TagPill from "./tag-pill";
import type { CardPost, CoverImage as CoverImageType, Tag } from "@/lib/types";
import { createCoverNamer } from "@/lib/view-transition-name";
import { postTags } from "@/lib/tags";
import { widont } from "@/lib/typography";

type Variant = "grid" | "list";

// Pills sit below the excerpt, not above the title. Above it they would be the
// first interactive thing in the card and would route the reader away from the
// listing before they reached the headline; worse, the count varies from one to
// three and wraps at three, so they would push each title down by a different
// amount and titles would stop aligning with the top of their cover images.
// Below the excerpt that variability lands at the foot of the card, where
// nothing depends on it.
//
// aria-label rather than a visible "Tagged" label. The post page carries one
// because it appears once there; repeated down a listing it is five identical
// labels of pure noise, and the pill shape already reads as a tag. Screen
// readers still need the row named, hence the label — without it this is an
// unexplained list of links on every card.
// Exported for the home hero, which is a listing item in everything but its
// component. One pill implementation means the pill changes in one place.
export function TagRow({
  tags,
  className,
}: {
  tags: Tag[];
  className: string;
}) {
  if (tags.length === 0) return null;

  return (
    <ul aria-label="Tags" className={`flex flex-wrap gap-2 ${className}`}>
      {tags.map((tag) => (
        <li key={tag.slug}>
          <TagPill tag={tag} size="compact" />
        </li>
      ))}
    </ul>
  );
}

function PostPreview({
  title,
  coverImage,
  date,
  excerpt,
  slug,
  variant,
  priority = false,
  as = "h3",
  transitionName,
  tags = [],
}: {
  title: string;
  coverImage?: CoverImageType;
  date: string;
  excerpt: string;
  slug: string;
  variant: Variant;
  priority?: boolean;
  as?: "h2" | "h3";
  transitionName?: string;
  tags?: Tag[];
}) {
  const Heading = as;

  if (variant === "list") {
    return (
      // Symmetric vertical padding on every item, the first included, and it
      // is never dropped. This is the list's rhythm: whatever sits above an
      // item — a hairline, or the bottom edge of the masthead band — belongs
      // this far from the cover below it. Zeroing it for the first item made
      // that post hug the band while every post after it breathed.
      <article className="grid grid-cols-1 gap-5 py-10 md:grid-cols-[2fr_3fr] md:gap-8 md:items-start md:py-12">
        {coverImage && (
          <div>
            <CoverImage
              slug={slug}
              url={coverImage.url}
              alt={coverImage.title ?? ""}
              priority={priority}
              hover
              transitionName={transitionName}
              // Capped in px above the point the container stops growing.
              // Container is max-w-5xl with px-5, so content tops out at 984px,
              // and this grid is [2fr_3fr] with a 32px gap — the cover track is
              // (984 - 32) * 2/5 = 381px and never widens again. A bare 40vw
              // kept growing with the viewport: at 1440px it claimed 576px, so
              // at DPR 2 the browser asked for 1152 and took the 1200
              // derivative where 828 covers it. The vw clause stays for the
              // fluid range below 1024px, where it is accurate.
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 40vw, 381px"
            />
          </div>
        )}
        <div>
          {/* The post title is the display element on a listing, not the page
              label above it — a "Tags" or "Archive" h1 carries less
              information than the post it sits above and should not be the
              largest type on the page. 32px at md matches the grid variant's
              own card size below, so the two listing shapes agree. */}
          <Heading className="text-2xl md:text-[32px] tracking-[-0.02em] leading-[1.12] mb-2 text-pretty">
            <Link
              href={`/posts/${slug}`}
              className="hover:text-brand-crimson transition-colors duration-200"
            >
              {widont(title)}
            </Link>
          </Heading>
          <div className="text-sm text-brand-muted mb-3 tabular-nums">
            <DateComponent dateString={date} />
          </div>
          <p className="text-lg leading-relaxed text-pretty">{excerpt}</p>
          <TagRow tags={tags} className="mt-3" />
        </div>
      </article>
    );
  }

  // Full height and column flow so the tag row below can take the slack.
  // Grid items stretch to their row's height by default, and without this the
  // pills sit directly under an excerpt whose length varies from card to
  // card, so two cards in one row end at different heights and the shorter
  // one leaves dead space above the listing's closing rule. Clamping the
  // excerpt was the alternative and it is worse, because these are
  // hand-written standfirsts and an ellipsis mid-sentence loses something a
  // ragged bottom edge does not.
  return (
    <article className="flex h-full flex-col">
      {coverImage && (
        <div className="mb-4">
          <CoverImage
            slug={slug}
            url={coverImage.url}
            alt={coverImage.title ?? ""}
            priority={priority}
            hover
            transitionName={transitionName}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 450px"
          />
        </div>
      )}
      {/* The list card's own ramp, so the two variants agree about how big a
          card headline is. They did not before: this was a flat text-3xl,
          the Vercel template's value from when the grid was only ever the
          post page's Read Next teaser, and as home's main listing that put
          the card headline within 6px of the hero at desktop and level with
          it on mobile, with nothing showing because the two variants never
          shared a page. It also stops all four cards forcing two lines at
          the 428px cell this grid resolves to inside the 984px content cap. */}
      {/* Same display-size rule as the list variant above: the post title,
          not the page label, is the largest type a listing shows. */}
      <Heading className="text-2xl md:text-[32px] tracking-[-0.02em] leading-[1.12] mb-3 text-pretty">
        <Link
          href={`/posts/${slug}`}
          className="hover:text-brand-crimson transition-colors duration-200"
        >
          {widont(title)}
        </Link>
      </Heading>
      <div className="text-sm text-brand-muted mb-4 tabular-nums">
        <DateComponent dateString={date} />
      </div>
      <p className="text-lg leading-relaxed text-pretty">{excerpt}</p>
      {/* mt-auto takes the slack so every pill row in a grid row lands on the
          same line; pt-4 keeps sixteen pixels above the pills on a card whose
          excerpt happens to fill the cell, where mt-auto alone would resolve
          to zero. */}
      <TagRow tags={tags} className="mt-auto pt-4" />
    </article>
  );
}

export default function MoreStories({
  morePosts,
  variant = "list",
  ruled = variant === "list",
  heading,
  priorityFirst = false,
  coverName = createCoverNamer(),
  visibleTags,
  openRule = true,
}: {
  morePosts: CardPost[];
  variant?: Variant;
  // Whether the run draws its own opening and closing hairlines. Defaults to
  // true for a list, which is every listing route, and false for a grid,
  // which is the post page's Read Next teaser. Home is the exception that
  // needs it explicitly: it renders a grid but it IS a listing, and the pager
  // below it draws no rule of its own precisely because it expects the run
  // above to have closed itself. An unruled grid there leaves the pager
  // floating under nothing.
  ruled?: boolean;
  heading: string | null;
  // When true, the first post's cover image is fetched with priority. Use on
  // heroless listing pages (index page 2+, category pages) where that image is
  // the LCP. Leave false where a hero already owns priority (index page 1).
  priorityFirst?: boolean;
  // Per-render view-transition-name allocator. Pages with a hero pass their own
  // namer so the hero and any repeated card share one name only once (see
  // lib/view-transition-name.ts). Standalone listings get a fresh namer by
  // default, which is enough to dedupe within this list.
  coverName?: (slug: string) => string | undefined;
  // Pass to show tag pills; omit for no pills. It is the visibility set rather
  // than a boolean on purpose: a pill links to `/tags/[slug]`, and that route
  // 404s for a tag below MIN_POSTS_PER_TAG, so an unfiltered pill can point at
  // a dead URL. Requiring the set makes it impossible to switch pills on
  // without deciding that question.
  //
  // A tag page passes this set minus its own slug: every post there carries
  // that tag, so repeating it on each card says nothing.
  //
  // The set must be computed from ALL posts, via visibleTagSlugs(getAllPosts()).
  // Deriving it from the posts on one category or author page counts a subset
  // and would hide tags the glossary shows.
  visibleTags?: Set<string>;
  // Drops the opening rule, keeping the closing one. For a listing that already
  // has an edge above it — the banded browsing pages, where the navy block ends
  // where the list begins — the top rule draws a second boundary a few pixels
  // under the first. The item padding stays: see the note under `container` for
  // why the two must not move together. The CLOSING rule is not optional either
  // way, because the pager below relies on it.
  openRule?: boolean;
}) {
  // The list closes itself. divide-y rules between items left the first one
  // with nothing above it, so a listing began mid-air and only ended because
  // the pager happened to draw a rule above itself — which meant a single-page
  // listing, where the pager renders nothing, was open at both ends.
  //
  // border-y here puts the same hairline above the first item and below the
  // last, so the whole run reads as one evenly ruled block on every page and
  // owns its own edges. The pager no longer draws that closing rule; it keeps
  // its top padding and sits below this one. Do not give it a border again, or
  // the two land in the same row and print a double line.
  //
  // Ruled by default on a list and unruled by default on a grid, because the
  // grid variant is ordinarily a teaser block on the post page, not a listing,
  // and has no rules between its cells to continue. Home is the one caller
  // that renders a grid and passes ruled explicitly: it IS a listing, and its
  // pager below relies on this run having closed itself exactly as the list
  // variant does.
  //
  // openRule=false drops the top half only. A banded page already ends the navy
  // block where the list starts, so the opening rule lands just under that edge
  // and reads as a stray line rather than the start of anything.
  //
  // The item padding is NOT dropped with it. Each item is py-10 md:py-12, so a
  // hairline sits that far from the cover below it; the band's bottom edge is
  // playing the same role, and it should sit the same distance away. Zeroing it
  // made the first post hug the band while every post after it breathed — the
  // rhythm broke at exactly the point the reader starts reading. The page that
  // owns the band contributes no gap of its own instead (WidePage).
  //
  // A ruled grid carries that same py-10 md:py-12 as its own container inset
  // rather than on each cell, for the same reason: a grid cell has no padding
  // of its own, so without it the opening rule would sit flush against the
  // first row of covers and the rhythm would break at exactly the point the
  // reader starts reading.
  const container =
    variant === "list"
      ? `flex flex-col divide-y divide-hairline${
          ruled ? ` border-hairline ${openRule ? "border-y" : "border-b"}` : ""
        }`
      : `grid grid-cols-1 md:grid-cols-2 md:gap-x-16 lg:gap-x-32 gap-y-20 md:gap-y-32${
          ruled
            ? ` border-hairline ${openRule ? "border-y" : "border-b"} py-10 md:py-12`
            : ""
        }`;

  // When the section renders its own h2 heading, post titles sit one level
  // below it (h3). With no section heading, the page h1 is the parent, so post
  // titles step up to h2 to avoid skipping a level.
  const titleAs = heading ? "h3" : "h2";

  return (
    <section className="mx-auto max-w-5xl">
      {heading && (
        <h2 className="mb-8 text-4xl md:text-5xl leading-tight text-pretty">
          {widont(heading)}
        </h2>
      )}
      <div className={container}>
        {morePosts.map((post, i) => (
          <PostPreview
            key={post.slug}
            title={post.title}
            coverImage={post.coverImage}
            date={post.date}
            slug={post.slug}
            excerpt={post.excerpt}
            variant={variant}
            priority={priorityFirst && i === 0}
            as={titleAs}
            transitionName={coverName(post.slug)}
            tags={
              visibleTags
                ? postTags(post).filter((t) => visibleTags.has(t.slug))
                : []
            }
          />
        ))}
      </div>
    </section>
  );
}
