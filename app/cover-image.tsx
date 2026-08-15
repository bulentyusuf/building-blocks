import ContentfulImage from "../lib/contentful-image";
import Link from "next/link";
import { clsx as cn } from "clsx";
import { getBlurDataURL } from "@/lib/blur";

// No `title` prop, in the sense of the post's title. It existed solely to name
// the cover link via aria-label, which is exactly the duplicate announcement
// removed below — the link is hidden from assistive tech, so there is nothing
// left for a title to name. Callers pass their heading text to their own
// heading link instead.
//
// The separate `alt` prop below is the Contentful ASSET title, which is a
// different string for a different purpose. See its own note.
export default async function CoverImage({
  url,
  alt = "",
  slug,
  href,
  sizes,
  priority = false,
  hover = false,
  transitionName,
}: {
  url: string;
  // The asset's Contentful `title`, rendered as the image's alt text. Defaults
  // to "" so an asset with no title renders exactly what it rendered before
  // this prop existed, and so the site degrades to decorative rather than to a
  // filename when the field is unset.
  //
  // On a LINKED cover this is deliberately inert for assistive tech: the Link
  // below carries aria-hidden="true", which removes the whole subtree from the
  // accessibility tree including this image. The alt text is there for search
  // crawlers, which read the DOM rather than the accessibility tree. That is
  // not a contradiction and must not be "fixed" by removing either one.
  alt?: string;
  slug?: string;
  // Link destination override. When omitted, a `slug` links to /posts/${slug}
  // (the default for post covers and cards). Pass `href` to point the cover
  // elsewhere — e.g. the categories thumbnails link to /categories/${slug}.
  href?: string;
  sizes?: string;
  // Set on the above-the-fold hero image only (index + post page) so the
  // LCP element is fetched eagerly. Leave false for cards and grids.
  priority?: boolean;
  // Opt-in gentle zoom on hover, for interactive listing-card previews only.
  // Off for the homepage hero and post cover (not previews). Hover only, not
  // keyboard focus: the link below is out of the tab order, so focus cannot
  // land inside this group — see the note on the Link. Reduced-motion users
  // get no movement (motion-safe: prefix), no JS.
  hover?: boolean;
  // Cross-document view-transition name for the cover morph. Set by callers
  // that want this cover to morph into its counterpart on the next page (a
  // card into the post hero). Must be unique per rendered page and match the
  // name on the destination cover. Lives on the outer shadow wrapper — never
  // on the scaling/transform-gpu inner wrapper, which would fight the morph.
  transitionName?: string;
}) {
  // Cold-cache LQIP: a tiny blurred preview underlays the frame so covers show a
  // full colour wash from first paint rather than a stark void. Undefined when
  // the fetch fails — the bg-brand-dark/5 tint on the wrapper is the fallback.
  const blurDataURL = await getBlurDataURL(url);
  // Prefer an explicit href; otherwise fall back to the post route for a slug.
  // The frame is a link (with pointer cursor) whenever either is present.
  const linkHref = href ?? (slug ? `/posts/${slug}` : undefined);
  const image = (
    <ContentfulImage
      alt={alt}
      priority={priority}
      fetchPriority={priority ? "high" : undefined}
      fill
      sizes={
        sizes || "(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
      }
      // No object-cover: the source art is authored at 16:9, the frame below
      // is aspect-video, and the two ratios matching is what makes this a
      // stretch-to-fit no-op rather than a crop. A wide focus-area crop
      // belongs in the Contentful Images API request (fit=fill&f=…), never in
      // this class.
      className={cn({
        // Hover only, no group-focus-within: the link below is removed from
        // the tab order (see there), so keyboard focus never lands inside this
        // group and the focus variant would be a dead rule claiming otherwise.
        // The card title carries the keyboard affordance instead.
        "motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out motion-safe:group-hover:scale-[1.02] pointer-fine:motion-safe:will-change-transform":
          hover,
      })}
      src={url}
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
    <div
      className="shadow-lg sm:mx-0"
      style={
        transitionName ? { viewTransitionName: transitionName } : undefined
      }
    >
      <div
        className={cn(
          // Every cover is 16:9, the source art's native ratio, on every
          // breakpoint. Nothing here should crop it — see the note on the
          // image's className above.
          "relative overflow-hidden bg-brand-dark/5 border border-cover-keyline aspect-video",
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
            {image}
          </Link>
        ) : (
          image
        )}
      </div>
    </div>
  );
}
