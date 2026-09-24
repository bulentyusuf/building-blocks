import ContentfulImage from "../lib/contentful-image";
import Link from "next/link";
import { clsx as cn } from "clsx";
import { getBlurDataURL } from "@/lib/blur";
import { isPlaceholderTitle } from "@/lib/placeholder-title";
import type { CoverImage as CoverImageAsset } from "@/lib/types";

// The asset's alt text, or "" when it is only a filename. It matters on the
// post hero, which renders no link. [→ `announced-links`]
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

// No `title` prop: it only named the cover link. [→ `announced-links`]
export default async function CoverImage({
  image,
  slug,
  href,
  sizes,
  wide,
  priority = false,
  hover = false,
}: {
  // The whole asset, so coverAltText is the only way alt is set. On a linked
  // cover the alt is for crawlers only; keep both. [→ `announced-links`]
  image: CoverImageAsset;
  slug?: string;
  // Overrides the default /posts/${slug} destination.
  href?: string;
  sizes?: string;
  // [→ `cover-frames`]
  wide?: boolean;
  // The above-the-fold hero only.
  priority?: boolean;
  // Gentle hover zoom for listing cards; hover only, and no motion when
  // reduced motion is requested.
  hover?: boolean;
}) {
  // Blurred placeholder from first paint; the wrapper tint covers a failure.
  const blurDataURL = await getBlurDataURL(image.url);
  const alt = coverAltText(image);
  const linkHref = href ?? (slug ? `/posts/${slug}` : undefined);
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
        // No focus variant: focus never lands inside a hidden-from-tab link.
        "motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out motion-safe:group-hover:scale-[1.02] pointer-fine:motion-safe:will-change-transform":
          hover,
      })}
      src={image.url}
      placeholder={blurDataURL ? "blur" : "empty"}
      blurDataURL={blurDataURL}
    />
  );
  return (
    // Shadow and keyline split the job: the shadow separates on cream, the
    // keyline on darker ground.
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
          // Mouse only: the card's heading links to the same place. aria-hidden
          // and tabIndex move together. [→ `announced-links`]
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
