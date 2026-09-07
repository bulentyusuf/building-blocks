import type { Document, Node, Text } from "@contentful/rich-text-types";
import { BLOCKS } from "@contentful/rich-text-types";

export interface Heading {
  text: string;
  slug: string;
}

// Below this a table of contents is a list as long as the article, so there is
// nothing to navigate. table-of-contents.tsx's effect and render read the same
// constant on purpose: they were two different numbers once, and the effect
// did all its work for a component that rendered nothing.
export const MIN_HEADINGS = 3;

// Lives here, not in table-of-contents.tsx, because that module is "use
// client" and a server component (app/posts/[slug]/page.tsx) cannot call a
// function exported from a client module, even a pure one — Next.js treats
// every export of a "use client" file as a reference to the client boundary.
// This lets page.tsx ask the same question the TOC component asks itself in
// its render guard, rather than restating the length check inverted and
// trusting a comment to keep the two aligned. The margin on the sidebar
// aside only makes sense when something renders inside it.
export function hasTableOfContents(headings: Heading[]): boolean {
  return headings.length >= MIN_HEADINGS;
}

// Listicle H2s carry a leading ordinal ("1. Zak McKracken..."). Strip it before
// slugifying so the fragment survives a reorder or a renumber, which is the most
// likely future edit to a Top-N post. Trailing punctuation is REQUIRED by the
// pattern so a heading that legitimately opens with a number, e.g. "2024 in
// review" or "1984 and the sequel problem", is left untouched. If nothing
// survives the strip (a heading that is only an ordinal), keep the original.
function stripLeadingOrdinal(text: string): string {
  const stripped = text.replace(/^\d+[.)]\s+/, "");
  return stripped.trim() ? stripped : text;
}

// Pure, deterministic slug from heading text.
// Lowercase, strip anything that isn't a word char or space, collapse
// whitespace to single hyphens, trim stray hyphens. Stripping punctuation
// is deliberate — an apostrophe left in an id (e.g. "what's-inside") makes
// a fragile fragment identifier.
function slugify(text: string): string {
  return stripLeadingOrdinal(text)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Pull the plain text out of a heading node's inline children.
function nodeText(node: Node): string {
  const anyNode = node as unknown as { content?: Array<Text | Node> };
  if (!anyNode.content) return "";
  return anyNode.content
    .map((child) => {
      if ((child as Text).nodeType === "text") return (child as Text).value;
      // nested inline (e.g. a hyperlink inside a heading) — recurse
      return nodeText(child as Node);
    })
    .join("");
}

// A collision-aware slug factory. Returns a function that, called once per
// heading in document order, yields a unique slug — appending -1, -2, ... on
// repeats. Both the TOC extraction and the renderer's id emission must drive
// their own instance of this in the SAME document order, so the Nth heading
// gets the same slug on both sides.
function createSlugger() {
  const seen = new Map<string, number>();
  return function nextSlug(text: string): string {
    const base = slugify(text) || "section";
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count}`;
  };
}

// Walk a rich-text document and return its H2 headings in order, with
// collision-resolved slugs. H2-only by design — the agreed content contract
// is "H2 = section heading, always".
export function extractHeadings(document: Document): Heading[] {
  const slugger = createSlugger();
  const headings: Heading[] = [];
  for (const node of document.content) {
    if (node.nodeType === BLOCKS.HEADING_2) {
      const text = nodeText(node).trim();
      if (!text) continue;
      headings.push({ text, slug: slugger(text) });
    }
  }
  return headings;
}
