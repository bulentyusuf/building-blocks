"use client";
import Image, { type ImageProps } from "next/image";
import { useCallback, useState } from "react";
import { clsx as cn } from "clsx";
import { CONTENTFUL_IMAGE_HOST } from "./contentful-host";

type ContentfulImageProps = Omit<ImageProps, "loader" | "src"> & {
  src: string;
};

// The transform query params below are only meaningful for assets served from
// Contentful's Images API, so we host-check before appending them rather than
// trusting whatever URL the CMS hands us. Anything else is returned untouched
// (CSP img-src is the hard backstop on what can load).

const contentfulLoader = ({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}) => {
  try {
    const url = new URL(src);
    if (url.hostname !== CONTENTFUL_IMAGE_HOST) return src;
  } catch {
    return src;
  }
  return `${src}?w=${width}&q=${quality || 75}&fm=webp`;
};

export default function ContentfulImage({
  className,
  onLoad,
  ...props
}: ContentfulImageProps) {
  // Reveal the image only once its bitmap is genuinely ready; the blur underlay
  // (rendered by the caller) shows through during the brief 'pending' window, so
  // there is never a white frame. The 300ms fade runs only for the network path
  // — cached images that are already complete at hydration reveal instantly, no
  // fade theatre. The `@media (scripting: none)` rule in globals.css forces img
  // opacity to 1, keeping images visible without JS.
  //   'pending' = not yet shown (blur underlay visible)
  //   'instant' = already complete at hydration (cached) -> show with no fade
  //   'fade'    = arrived over the network -> crossfade in
  //
  // A `priority` image starts at 'instant', so it ships opaque in the server
  // HTML and never waits on JavaScript. That is not a tidy-up: 'pending' emits
  // opacity-0, and Chromium's Largest Contentful Paint algorithm skips fully
  // transparent elements, so the LCP candidate on every page that has one — the
  // home hero, the post cover, the first card of a heroless listing — was not
  // the moment its (preloaded) bitmap arrived but the moment React hydrated and
  // flipped the class. On a slow device that is seconds later, and invisible
  // from the code because the image genuinely did arrive early. `@media
  // (scripting: none)` covers scripts-off but not the pre-hydration window,
  // which is exactly where LCP lands.
  //
  // Nothing is lost visually. Before its bitmap arrives an <img> paints
  // nothing, so the blur underlay still shows through; the only casualty is the
  // fade, which is reveal theatre the LCP element should not be paying for.
  // Lazy body images keep the whole state machine.
  const [reveal, setReveal] = useState<"pending" | "instant" | "fade">(
    props.priority ? "instant" : "pending",
  );

  // Stable identity matters more than it looks. An inline arrow here is a new
  // ref on every render, so React detaches and re-attaches it each time and
  // runs this again — on the one component that appears once per image on
  // every page. It is harmless only because the setter below bails on an equal
  // value; useCallback makes it free instead of merely survivable.
  const revealIfComplete = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete) setReveal((r) => (r === "pending" ? "instant" : r));
  }, []);

  return (
    <Image
      loader={contentfulLoader}
      {...props}
      className={cn(
        className,
        reveal === "fade" && "transition-opacity duration-300",
        reveal === "pending" ? "opacity-0" : "opacity-100",
      )}
      // Cached case: complete at mount, reveal with no fade theatre.
      ref={revealIfComplete}
      // Network case: only fade if we had not already revealed instantly.
      onLoad={(event) => {
        setReveal((r) => (r === "pending" ? "fade" : r));
        onLoad?.(event);
      }}
    />
  );
}
