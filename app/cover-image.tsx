import ContentfulImage from "../lib/contentful-image";
import Link from "next/link";
import { clsx as cn } from "clsx";
import { getBlurDataURL } from "@/lib/blur";
import { isPlaceholderTitle } from "@/lib/placeholder-title";
import type { CoverImage as CoverImageAsset } from "@/lib/types";

// The asset's alt text, or "" when it has none worth announcing.
//
// This is the same rule lib/rich-text.tsx applies to an embedded figure, and
// it is here because for a long time it was applied NOWHERE on a cover.
// isPlaceholderTitle had exactly one call site, and covers rendered
// `alt={coverImage.title ?? ""}` straight from the CMS — so the whole class of
// defect that helper was written for (a library of filename stems and
// generator output sitting in the title field) went unchecked on the largest
// image on every page.
//
// It could not have been checked, either: the cover selections in lib/api.ts
// asked for `url` and `title` and nothing else, and the guard needs the
// filename to compare against. That is why this landed as a query change and a
// prop change together.
//
// "" rather than the filename, never a guess. On a LINKED cover the alt is
// inert for assistive tech anyway (see the Link below), but the post-page hero
// passes no slug and no href, so it renders no link and IS announced — which
// is the case that made this worth fixing rather than noting.
//
// `description` is deliberately NOT consulted as a fallback. On an embedded
// figure that field is the caption, and CLAUDE.md's note on it — one field
// doing two jobs — is a warning, not a pattern to extend. A cover with no
// usable title is a content problem, and the warning below is how it surfaces.
function coverAltText(image: CoverImageAsset): string {
  if (isPlaceholderTitle(image.title, image.fileName)) {
    console.warn(
      `[cover-image] ${image.url} has no usable title (${JSON.stringify(
        image.title ?? null,
      )}), so it renders with empty alt text rather than a filename.`,
    );
    return "";
  }
  return image.title ?? "";
}

// No `title` prop, in the sense of the post's title. It existed solely to name
// the cover link via aria-label, which is exactly the duplicate announcement
// removed below — the link is hidden from assistive tech, so there is nothing
// left for a title to name. Callers pass their heading text to their own
// heading link instead.
//
// The separate `alt` prop below is the Contentful ASSET title, which is a
// different string for a different purpose. See its own note.
export default async function CoverImage({
  image,
  slug,
  href,
  sizes,
  wide,
  priority = false,
  hover = false,
}: {
  // The whole asset, not a url and an alt string.
  //
  // It took the two separately until August 2026, and that shape is what let
  // every call site hand the CMS title straight through as alt text with
  // nothing checking it. A component cannot guard a decision it is only shown
  // the answer to. Taking the asset makes coverAltText above the only way alt
  // is arrived at, and makes it structurally impossible for a caller to pass
  // one asset's url beside another's title.
  //
  // On a LINKED cover the alt is deliberately inert for assistive tech: the
  // Link below carries aria-hidden="true", which removes the whole subtree
  // from the accessibility tree including this image. The alt text is there
  // for search crawlers, which read the DOM rather than the accessibility
  // tree. That is not a contradiction and must not be "fixed" by removing
  // either one.
  image: CoverImageAsset;
  slug?: string;
  // Link destination override. When omitted, a `slug` links to /posts/${slug}
  // (the default for post covers and cards). Pass `href` to point the cover
  // elsewhere — e.g. the categories thumbnails link to /categories/${slug}.
  href?: string;
  sizes?: string;
  // When true, the image is 3:2 on mobile and 16:9 on desktop (md+). This is
  // the treatment for any cover rendered from a 1920x1080 source, which is
  // every post cover: the post hero, the home hero, and the listing cards in
  // the grid variant. 16:9 at a phone's full width is a letterbox strip, so
  // mobile takes the taller crop regardless.
  wide?: boolean;
  // Set on the above-the-fold hero image only (index + post page) so the
  // LCP element is fetched eagerly. Leave false for cards and grids.
  priority?: boolean;
  // Opt-in gentle zoom on hover, for interactive listing-card previews only.
  // Off for the homepage hero and post cover (not previews). Hover only, not
  // keyboard focus: the link below is out of the tab order, so focus cannot
  // land inside this group — see the note on the Link. Reduced-motion users
  // get no movement (motion-safe: prefix), no JS.
  hover?: boolean;
}) {
  // Cold-cache LQIP: a tiny blurred preview underlays the frame so covers show a
  // full colour wash from first paint rather than a stark void. Undefined when
  // the fetch fails — the bg-brand-dark/5 tint on the wrapper is the fallback.
  const blurDataURL = await getBlurDataURL(image.url);
  const alt = coverAltText(image);
  // Prefer an explicit href; otherwise fall back to the post route for a slug.
  // The frame is a link (with pointer cursor) whenever either is present.
  const linkHref = href ?? (slug ? `/posts/${slug}` : undefined);
  // Named for what it is rather than reusing `image`, which is now the asset
  // prop above.
  const picture = (
    <ContentfulImage
      alt={alt}
      priority={priority}
      fetchPriority={priority ? "high" : undefined}
      fill
      sizes={
        sizes || "(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
      }
      className={cn("object-cover", {
        // Hover only, no group-focus-within: the link below is removed from
        // the tab order (see there), so keyboard focus never lands inside this
        // group and the focus variant would be a dead rule claiming otherwise.
        // The card title carries the keyboard affordance instead.
        "motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out motion-safe:group-hover:scale-[1.02] pointer-fine:motion-safe:will-change-transform":
          hover,
      })}
      src={image.url}
    />
  );
  return (
    // The shadow and the keyline below are complementary, not redundant. The
    // shadow is black at roughly 18% composited, so it separates the image on
    // the cream page at 1.52:1 and does nothing on the band at 1.06:1. The
    // keyline is the other half, and it covers the ground the shadow cannot.
    // Only the post cover crosses onto navy, but the border is unconditional
    // because one rule beats a post-only exception and a cover on a listing is
    // one navigation from the same cover on a banded post. On cream the light
    // keyline is the page's own colour and near-invisible.
    <div className="shadow-lg sm:mx-0">
      <div
        className={cn(
          "relative overflow-hidden bg-brand-dark/5 border border-cover-keyline",
          wide ? "aspect-3/2 md:aspect-video" : "aspect-3/2",
          {
            "cursor-pointer": linkHref,
            group: hover,
            "motion-safe:transform-gpu": hover,
          },
        )}
      >
        {blurDataURL && (
          <div
            aria-hidden
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${blurDataURL})` }}
          />
        )}
        {linkHref ? (
          // Mouse affordance only, hidden from assistive tech and the tab
          // order. Every call site that passes a slug or href also renders a
          // heading link to the SAME destination immediately beside this one —
          // the card title in more-stories, the h1 on the home hero, the h2 on
          // the categories index. Named (it used aria-label={title}) that was
          // two adjacent links per card with identical accessible names: twice
          // the tab stops on every listing, and every title appearing twice in
          // a screen reader's link list with nothing to tell the pair apart.
          //
          // aria-hidden and tabIndex must move together. aria-hidden alone on a
          // focusable element is its own violation — a control reachable by
          // keyboard but absent from the accessibility tree.
          //
          // The post-page cover passes neither slug nor href, so it renders no
          // link at all and none of this applies.
          <Link
            href={linkHref}
            aria-hidden="true"
            tabIndex={-1}
            className="block h-full"
          >
            {picture}
          </Link>
        ) : (
          picture
        )}
      </div>
    </div>
  );
}
