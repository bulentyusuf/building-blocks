import type { Document, Node, Text } from "@contentful/rich-text-types";

const WORDS_PER_MINUTE = 230;

// Walks the whole tree, so lists and quotes count too.
function collectText(node: Node): string {
  const anyNode = node as unknown as { content?: Array<Text | Node> };
  if (!anyNode.content) return "";
  return anyNode.content
    .map((child) => {
      if ((child as Text).nodeType === "text") return (child as Text).value;
      return collectText(child as Node);
    })
    .join(" ");
}

// Whole minutes, at least 1.
export function readingTimeMinutes(json: Document): number {
  const text = collectText(json);
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
