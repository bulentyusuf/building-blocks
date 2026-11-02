import type { Metadata } from "next";
import {
  SITE_TITLE,
  SITE_URL,
  SITE_DESCRIPTION,
  DEFAULT_OG_LOCALE,
} from "./constants";

const SITE_CARD_URL = "/be_useful.jpg";
const SITE_CARD = [
  { url: SITE_CARD_URL, width: 1200, height: 630, alt: SITE_TITLE },
];

/**
 * Open Graph and Twitter blocks for every non-post page, so og and twitter
 * images fall back to the site card together. `title` is optional because the
 * browse indexes inherit the document title. [→ `listing-shell`]
 */
function socialCard({
  title,
  description,
  url,
  images,
}: {
  title?: string;
  description: string;
  url: string;
  /** Absent means the site card. */
  images?: string[];
}): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: {
      description,
      url,
      siteName: SITE_TITLE,
      images: images ?? SITE_CARD,
      type: "website",
      locale: DEFAULT_OG_LOCALE,
    },
    twitter: {
      card: "summary_large_image",
      ...(title === undefined ? {} : { title }),
      description,
      images: images ?? [SITE_CARD_URL],
    },
  };
}

/** `/archive` and `/tags`, which carry the site description. [→ `browse-copy`] */
export function browsePageMetadata({
  slug,
  title,
}: {
  slug: string;
  title: string;
}): Metadata {
  const description = SITE_DESCRIPTION;
  const url = `${SITE_URL}/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    ...socialCard({ description, url }),
  };
}

/** A category, tag or author page. */
export function listingMetadata({
  title,
  description,
  canonical,
  images,
}: {
  title: string;
  description: string;
  canonical: string;
  images?: string[];
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical },
    ...socialCard({ title, description, url: canonical, images }),
  };
}
