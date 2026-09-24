import type { Author } from "./types";
import { SITE_AUTHOR, SITE_URL } from "./constants";

// Escapes the three HTML-significant characters so a value cannot close the
// script. Every JSON-LD block goes through here. [→ `json-ld`]
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
 * A bare object for zero or one authors, an array for more, so the single-author
 * shape stays what shipped before `authors`. Zero falls back to SITE_AUTHOR.
 */
export function postAuthorsNode(
  authors: Pick<Author, "name" | "slug">[],
): PersonNode | PersonNode[] {
  if (authors.length === 0) return person(SITE_AUTHOR);
  if (authors.length === 1) return person(authors[0].name, authors[0].slug);
  return authors.map((a) => person(a.name, a.slug));
}
