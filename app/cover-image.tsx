import ContentfulImage from "../lib/contentful-image";
import Link from "next/link";
import { clsx as cn } from "clsx";
import { getBlurDataURL } from "@/lib/blur";
import { isPlaceholderTitle } from "@/lib/placeholder-title";
import type { CoverImage as CoverImageAsset } from "@/lib/types";

// The asset's alt text, or "" when it has none worth announcing. Same rule
// lib/rich-text.tsx applies to an embedded figure. [→ `announced-links`]
//
// "" rather than the filename, never a guess. On a LINKED cover the alt is
// inert for assistive tech anyway (see the Link below), but the post-page hero
// passes no slug and no href, so it renders no link and IS announced — which
// is the case that made this worth fixing rather than noting.
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

// No `title` prop (the post's title): it existed only to name the cover link
// via aria-label, the duplicate announcement removed below. [→ `announced-links`]
export default async function CoverImage({
  image,
  slug,
  href,
  sizes,
  wide,
  priority = false,
  hover = false,
}: {
  // The whole asset, not a url and an alt string — taking the asset makes
  // coverAltText above the only way alt is arrived at. [→ `announced-links`]
  //
  // On a LINKED cover the alt is deliberately inert for assistive tech (the
  // Link below's aria-hidden removes the whole subtree); it's there for
  // search crawlers, which read the DOM rather than the accessibility tree.
  // Not a contradiction — do not "fix" by removing either one.
  image: CoverImageAsset;
  slug?: string;
  // Link destination override. When omitted, a `slug` links to /posts/${slug}
  // (the default for post covers and cards). Pass `href` to point the cover
  // elsewhere — e.g. the categories thumbnails link to /categories/${slug}.
  href?: string;
  sizes?: string;
  // 3:2 mobile, 16:9 from md up. [→ `cover-frames`]
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
  // Cold-cache LQIP: a tiny blurred preview that next/image paints as the
  // image's own placeholder, cleared once the real bitmap decodes, so covers
  // show a full colour wash from first paint rather than a stark void.
  // Undefined when the fetch fails — the bg-brand-dark/5 tint on the wrapper
  // is the fallback, and placeholder drops to "empty" below.
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
      placeholder={blurDataURL ? "blur" : "empty"}
      blurDataURL={blurDataURL}
    />
  );
  return (
    // The shadow and the keyline below are complementary, not redundant: the
    // shadow (black at roughly 18% composited) separates the image on the
    // cream page at 1.52:1 but only 1.06:1 on a darker surface, where the
    // keyline is the half that still shows. The border stays unconditional —
    // one rule beats a per-surface exception. On cream the light keyline is
    // the page's own colour and near-invisible.
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
        {linkHref ? (
          // Mouse affordance only, hidden from assistive tech and the tab
          // order — every call site rendering this also renders a heading
          // link to the SAME destination beside it. [→ `announced-links`]
          // aria-hidden and tabIndex must move together: aria-hidden alone on
          // a focusable element is its own violation.
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
