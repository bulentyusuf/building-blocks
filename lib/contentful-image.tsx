// This directive is load-bearing, despite the component holding no state and
// no hooks. `contentfulLoader` below is handed to next/image as the `loader`
// prop, and a prop that takes a function has to be serialised across the
// server/client boundary, which only a Client Component can do. Next's own
// `loader` example carries the directive for that reason. Removing it does
// not push consumers onto the client or pull them off the server either,
// because a Server Component may import a Client Component and stay on the
// server.
// See docs/decisions.md, "Every image is opaque in the server HTML".
"use client";
import Image, { type ImageProps } from "next/image";
import { CONTENTFUL_IMAGE_HOST } from "./contentful-host";

type ContentfulImageProps = Omit<ImageProps, "loader" | "src"> & {
  src: string;
};

// The transform query params below are only meaningful for assets served from
// Contentful's Images API, so we host-check before appending them rather than
// trusting whatever URL the CMS hands us. Anything else is returned untouched
// (CSP img-src is the hard backstop on what can load).

// Exported only so lib/contentful-image.test.tsx can assert its query-string
// behaviour directly, with fixed inputs, rather than through next/image's own
// width-candidate selection. Not a general-purpose utility — nothing outside
// this file and its test should import it.
export const contentfulLoader = ({
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

export default function ContentfulImage(props: ContentfulImageProps) {
  // No reveal state. next/image's own placeholder handling paints the
  // blurDataURL on the image and clears it on decode, which is what the
  // three-state machine here was reimplementing. It does it without ever
  // setting opacity to 0, which is why the old version needed a priority
  // escape hatch (Chromium's LCP algorithm skips fully transparent elements,
  // so the LCP candidate was the hydration tick rather than the moment the
  // preloaded bitmap arrived) and a `@media (scripting: none)` override for
  // no-JS readers. Neither is needed now.
  return <Image loader={contentfulLoader} {...props} />;
}
