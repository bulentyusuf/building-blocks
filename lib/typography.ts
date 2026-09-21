// U+00A0 non-breaking space, built by code point so no invisible character
// lives in the source and there is no escaping ambiguity.
const NBSP = String.fromCharCode(0x00a0);

/**
 * widont — glue the final two words of a string with a non-breaking space so a
 * wrapped title never ends on a lone last word (the "2-word overhang").
 *
 * Unlike `text-wrap: pretty` — which only Chromium and recent Safari honour, so
 * Firefox and older Safari still orphan the last word — this is deterministic
 * and works in every browser. A no-op below three words.
 *
 * Use on short display strings (titles and headings), not on body prose: it
 * only protects the very last line, and gluing two long words can force a wide
 * last line in a narrow column.
 *
 * And not on the post h1, which is the largest type on the site in the
 * narrowest column it ever occupies. The token-count guard below cannot help
 * there: the glued pair is two ordinary words and the failure is that they are
 * too wide at that size, not that there are too few of them.
 * [→ `heading-widont`]
 */
export function widont(text: string): string {
  // Below three tokens there is nothing to cure. With two words the "final
  // two" ARE the whole string, so gluing them turns the entire heading into a
  // single unbreakable token, and a heading that cannot wrap overflows its
  // column rather than wrapping badly. At the wide h1 ramp two long words run
  // to roughly 690px, which fits at 100% zoom and overflows at 120% on a
  // narrow viewport. "Information Architecture" is the tag page that reported
  // it, and every other two-word tag, category and author name was one
  // character away from the same thing.
  //
  // A count rather than a measurement, because the failure is structural. The
  // string has no line for a lone word to fall onto, so the guard does not
  // need to know how wide anything renders. The cost is that a two-token title
  // ending in a parenthesised year, "Mindbenders (1988)", no longer binds it.
  // A widow is cosmetic and an overflow is not, so that trade is deliberate.
  if (text.trim().split(/\s+/u).length < 3) return text;
  // Glue the final two tokens with a non-breaking space. A trailing
  // parenthesised year is just the last token, so this binds it to the word
  // before it (e.g. "Mindbenders (1988)") and the year never wraps alone.
  // We deliberately do NOT glue a third token: binding three words forces a
  // long, unbalanced last line in a narrow column, which looks worse than the
  // single widow it was meant to cure.
  return text.replace(/\s+(\S+)\s*$/u, `${NBSP}$1`);
}
