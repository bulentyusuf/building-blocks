// Built by code point, so no invisible character lives in the source.
const NBSP = String.fromCharCode(0x00a0);

/**
 * Glues the last two words with a non-breaking space so a wrapped title never
 * ends on one word, in every browser. Titles only, never body prose, and never
 * the post h1, where the glued pair can outgrow the column. [→ `heading-widont`]
 */
export function widont(text: string): string {
  // Below three words the glue makes the whole string unbreakable, and a
  // heading that cannot wrap overflows. A widow is cosmetic; overflow is not.
  if (text.trim().split(/\s+/u).length < 3) return text;
  // Two words only: gluing three forces a long, unbalanced last line.
  return text.replace(/\s+(\S+)\s*$/u, `${NBSP}$1`);
}
