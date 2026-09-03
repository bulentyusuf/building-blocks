import type { Author } from "./types";
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
 * The `author` value for a post's BlogPosting node.
 *
 * A bare object for zero or one authors, an array for two or three. Zero and
 * one are kept as a bare object deliberately: every post on the site today has
 * exactly one author, so this is the shape that must stay byte-identical to
 * what shipped before `authors` existed. A one-element array deep-equals
 * nothing useful and would slip a real regression past a loose test, which is
 * why lib/json-ld.test.ts asserts `Array.isArray(...) === false` on that case
 * explicitly rather than trusting a snapshot.
 *
 * Zero authors falls back to SITE_AUTHOR with no url, matching the site's
 * pre-`authors` behaviour for a post whose `author` link was ever absent.
 *
 * Extracted so this is testable at all — it was previously an object literal
 * inside a 300-line server component.
 */
export function postAuthorsNode(
  authors: Pick<Author, "name" | "slug">[],
): PersonNode | PersonNode[] {
  if (authors.length === 0) return person(SITE_AUTHOR);
  if (authors.length === 1) return person(authors[0].name, authors[0].slug);
  return authors.map((a) => person(a.name, a.slug));
}
