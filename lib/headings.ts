import type { Document, Node, Text } from "@contentful/rich-text-types";
import { BLOCKS } from "@contentful/rich-text-types";

export interface Heading {
  text: string;
  slug: string;
}

// Below three headings a ToC is as long as the article. It lives here, not in
// the "use client" ToC, because a server component importing a value across
// that boundary gets a client reference, and compared against undefined.
export const MIN_HEADINGS = 3;

// The one answer to "does this post get a ToC?", shared by the page's margin
// and the ToC's render guard so they cannot disagree.
export function hasTableOfContents(headings: Heading[]): boolean {
  return headings.length >= MIN_HEADINGS;
}

// Strip a listicle ordinal ("1. Title") so a renumber keeps the fragment.
// Trailing punctuation is required, so "2024 in review" is left alone.
function stripLeadingOrdinal(text: string): string {
  const stripped = text.replace(/^\d+[.)]\s+/, "");
  return stripped.trim() ? stripped : text;
}

// Punctuation is stripped: an apostrophe in an id makes a fragile fragment.
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

function nodeText(node: Node): string {
  const anyNode = node as unknown as { content?: Array<Text | Node> };
  if (!anyNode.content) return "";
  return anyNode.content
    .map((child) => {
      if ((child as Text).nodeType === "text") return (child as Text).value;
      return nodeText(child as Node);
    })
    .join("");
}

// Appends -1, -2 on repeats. The ToC and the renderer each drive their own
// instance in the same document order, so the Nth heading matches.
function createSlugger() {
  const seen = new Map<string, number>();
  return function nextSlug(text: string): string {
    const base = slugify(text) || "section";
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count}`;
  };
}

// H2 only: the content contract is "H2 is a section heading".
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
