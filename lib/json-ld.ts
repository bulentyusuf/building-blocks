import type { Author, Contributor } from "./types";
import { SITE_AUTHOR, SITE_URL } from "./constants";

// Serialise a JSON-LD object for safe injection into a <script
// type="application/ld+json"> via dangerouslySetInnerHTML. Beyond plain
// JSON.stringify, the three HTML-significant characters that could break out of
// the script element or be misread by the parser are escaped to their \uXXXX
// forms. Values come from trusted CMS data today, so this is defence-in-depth —
// but every JSON-LD block in the app must go through here so the behaviour is
// consistent rather than per-call-site.
export function jsonLdHtml(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

type PersonNode = { "@type": "Person"; name: string; url?: string };

function person(name: string, slug?: string): PersonNode {
  return {
    "@type": "Person",
    name,
    ...(slug ? { url: `${SITE_URL}/authors/${slug}` } : {}),
  };
}

/**
 * The `author` value for a post's BlogPosting node. Always a bare object.
 *
 * AMENDED 2 September. An earlier draft folded contributors into an author
 * array. Schema.org has a `contributor` property on CreativeWork and it says
 * what actually happened, where a second name in `author` claims authorship
 * this field exists to withhold. Keeping `author` a single object also means
 * no post currently on the site sees its structured data change, which is the
 * difference between a change verifiable by diffing rendered output and one
 * that has to be trusted.
 *
 * Extracted from app/posts/[slug]/page.tsx purely so it can be asserted
 * against. It was previously an object literal inside a server component,
 * which is to say untestable.
 */
export function postAuthorNode(
  author: (Pick<Author, "name"> & { slug?: string }) | undefined,
): PersonNode {
  return person(author?.name || SITE_AUTHOR, author?.slug);
}

/**
 * The `contributor` value, or undefined when there are none.
 *
 * Undefined rather than null or an empty array, because JSON.stringify drops
 * undefined keys entirely and the Rich Results tester flags nulls. A
 * contributor-free post must emit the key not at all.
 */
export function postContributorNodes(
  contributors: Contributor[],
): PersonNode[] | undefined {
  if (contributors.length === 0) return undefined;
  return contributors.map((c) => person(c.name, c.slug));
}
