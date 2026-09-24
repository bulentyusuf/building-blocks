// Load-bearing despite no hooks: the loader is a function prop, which only a
// Client Component can pass to next/image. [→ `priority-opaque`]
"use client";
import type { Ref } from "react";
import Image, { type ImageProps } from "next/image";
import { CONTENTFUL_IMAGE_HOST } from "./contentful-host";

// next/image's props type omits ref; React 19 passes it through as a prop.
type ContentfulImageProps = Omit<ImageProps, "loader" | "src"> & {
  src: string;
  ref?: Ref<HTMLImageElement>;
};

// Transform params only for Contentful's host; anything else passes untouched.

// Exported for its test only.
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
  // No reveal state, and never opacity 0. [→ `priority-opaque`]
  return <Image loader={contentfulLoader} {...props} />;
}
