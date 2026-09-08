import Link from "next/link";
import DateComponent from "./date";
import CoverImage from "./cover-image";
import TagPill from "./tag-pill";
import type { CardPost, CoverImage as CoverImageType, Tag } from "@/lib/types";
import { postTags } from "@/lib/tags";
import { widont } from "@/lib/typography";

type Variant = "grid" | "list";

// Pills sit below the excerpt, not above the title: above it they'd be the
// first interactive thing in the card, routing the reader away before they
// reach the headline, and the count varies from one to three and wraps at
// three, so titles would stop aligning with the top of their cover images.
// [→ `tag-pills`]
//
// aria-label rather than a visible "Tagged" label — repeated down a listing a
// visible label is five identical words of pure noise, and the pill shape
// already reads as a tag; screen readers still need the row named.
//
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
  tags?: Tag[];
}) {
  const Heading = as;

  if (variant === "list") {
    return (
      // Symmetric vertical padding on every item, the first included, never
      // dropped: whatever sits above an item belongs this far from the cover
      // below it. [→ `listing-shell`]
      <article className="grid grid-cols-1 gap-5 py-10 md:grid-cols-[2fr_3fr] md:gap-8 md:items-start md:py-12">
        {coverImage && (
          <div>
            <CoverImage
              slug={slug}
              image={coverImage}
              priority={priority}
              hover
              // Capped in px above the point the container stops growing.
              // Container is max-w-5xl with px-5 (984px content), this grid is
              // [2fr_3fr] with a 32px gap: cover track is (984 - 32) * 2/5 =
              // 381px and never widens further. A bare 40vw kept growing with
              // the viewport — at 1440px it claimed 576px, requesting a 1152
              // derivative at DPR 2 where 828 covers it. The vw clause stays
              // for the fluid range below 1024px, where it is accurate.
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 40vw, 381px"
            />
          </div>
        )}
        <div>
          <Heading className="text-2xl md:text-3xl mb-2 leading-snug text-pretty">
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
          <p className="text-lg leading-relaxed text-pretty">
            {widont(excerpt)}
          </p>
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
          {/* wide: a bare 3:2 frame crops 15.6% off these 1920x1080 covers.
              [→ `cover-frames`] Also puts these cards on the same aspect as
              the hero above them. */}
          <CoverImage
            slug={slug}
            image={coverImage}
            wide
            priority={priority}
            hover
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 450px"
          />
        </div>
      )}
      {/* The grid variant's own ramp, matched to the list variant's so the two
          agree on card headline size. Stops all four cards forcing two lines
          at the 428px cell this grid resolves to inside the 984px content
          cap. */}
      <Heading className="text-2xl md:text-3xl mb-3 leading-snug text-pretty">
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
      <p className="text-lg leading-relaxed text-pretty">{widont(excerpt)}</p>
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
  visibleTags,
  openRule = true,
}: {
  morePosts: CardPost[];
  variant?: Variant;
  // Whether the run draws its own opening and closing hairlines. Defaults to
  // true for a list (every listing route) and false for a grid (ordinarily the
  // post page's Read Next teaser). Home passes it explicitly: it renders a
  // grid but IS a listing, and its pager draws no rule of its own — it expects
  // the run above to have closed itself, so an unruled grid leaves it
  // floating under nothing.
  ruled?: boolean;
  heading: string | null;
  // When true, the first post's cover image is fetched with priority. Use on
  // heroless listing pages (index page 2+, category pages) where that image is
  // the LCP. Leave false where a hero already owns priority (index page 1).
  priorityFirst?: boolean;
  // Pass to show tag pills; omit for no pills. The visibility set rather than
  // a boolean on purpose — a pill links to `/tags/[slug]`, which 404s below
  // MIN_POSTS_PER_TAG — so requiring the set makes it impossible to switch
  // pills on without deciding that question. Must be computed from ALL posts;
  // a category or author page's own subset would hide tags the glossary
  // shows. [→ `tag-pages`]
  visibleTags?: Set<string>;
  // Drops the opening rule, keeping the closing one — for a listing that
  // already has an edge above it from its own wide-page header. The CLOSING
  // rule is not optional either way; the pager below relies on it.
  // [→ `border-roles`]
  openRule?: boolean;
}) {
  // The list closes itself: border-y puts the same hairline above the first
  // item and below the last, so a single-page listing (where the pager
  // renders nothing) isn't open at both ends. Do not give the pager a border
  // too, or the two land in the same row and print a double line.
  // [→ `border-roles`]
  //
  // The item padding is NOT dropped with openRule=false: each item's
  // py-10 md:py-12 is the distance a hairline keeps from the cover below it,
  // and the wide-page header's own 3px rule plays a hairline's part here too.
  // [→ `listing-shell`]
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

  // [→ `page-axis`]
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
