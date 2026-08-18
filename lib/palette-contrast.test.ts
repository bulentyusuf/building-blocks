import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  contrast,
  parseColour,
  sameColour,
  schemeTokens,
  type Rgba,
} from "./contrast";

// Two gaps this closes.
//
// One: nothing tested the accent's contrast. tag-pill.test.ts covers the control
// edge only, and app/a11y.test.tsx disables axe's color-contrast rule because
// jsdom computes no boxes and would report a false pass. So the crimson token
// could drift back below AAA with every check green.
//
// Two: three literal hexes exist because they CANNOT read the tokens — Satori has
// no custom properties, and the search emblem's ground stays cream in both
// schemes. Those are deliberate, and nothing held them to the values they
// duplicate. The OG card is the one that would go unnoticed longest: it renders
// in its own request, into a PNG, that nobody looks at day to day.
//
// The bar is WCAG AAA 1.4.6, not AA. These pairings are all normal-size text and
// they clear 7:1 today, so the guard records that rather than the lower floor
// they already passed.

const MIN_AAA_TEXT = 7;

const ROOT = path.join(__dirname, "..");
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

const { light, dark } = schemeTokens(read("app/globals.css"));

describe("brand accent clears AAA in both schemes", () => {
  it("light", () => {
    expect(
      contrast(light("--color-brand-crimson"), light("--color-brand-bg")),
    ).toBeGreaterThanOrEqual(MIN_AAA_TEXT);
  });

  it("dark", () => {
    // The dark value is a hand-carried lift, not derived from the light one, so
    // this is the assertion that catches a retune of one that forgets the other.
    expect(
      contrast(dark("--color-brand-crimson"), dark("--color-brand-bg")),
    ).toBeGreaterThanOrEqual(MIN_AAA_TEXT);
  });
});

describe("muted small-caps labels clear AA in both schemes", () => {
  // Every uppercase micro-label site-wide (tag pills, archive counts and
  // categories, the TOC eyebrow, "read more" links, error eyebrows) renders in
  // --color-brand-muted rather than the retired #8a7a70 (3.80:1, below AA).
  // brand-muted is 6.04:1 today, comfortably past the 4.5:1 floor normal-size
  // text needs, but nothing pinned that pairing to a threshold before this, so
  // a retune could drift it back under AA with every other check green.
  const MIN_AA_TEXT = 4.5;

  it.each(["light", "dark"] as const)("%s", (scheme) => {
    const token = scheme === "light" ? light : dark;
    expect(
      contrast(token("--color-brand-muted"), token("--color-brand-bg")),
    ).toBeGreaterThanOrEqual(MIN_AA_TEXT);
  });
});

describe("footer small print clears AAA in both schemes", () => {
  // Derived from the source rather than hardcoded, so this covers any footer
  // text added later without being edited. Scoped to `text-white/` on purpose:
  // the bottom bar's border-white/10 is a divider, decorative and exempt.
  const layout = read("app/layout.tsx");
  const alphas = [...layout.matchAll(/text-white\/(\d+)/g)].map((m) =>
    Number(m[1]),
  );

  it("finds the utilities it is asserting against", () => {
    // A rename or a refactor that drops the class would otherwise make the two
    // tests below pass vacuously over an empty list.
    expect(alphas.length).toBeGreaterThan(0);
  });

  const faintest = (): Rgba => ({
    r: 255,
    g: 255,
    b: 255,
    a: Math.min(...alphas) / 100,
  });

  it("light", () => {
    expect(
      contrast(faintest(), light("--color-footer-bg")),
    ).toBeGreaterThanOrEqual(MIN_AAA_TEXT);
  });

  it("dark", () => {
    expect(
      contrast(faintest(), dark("--color-footer-bg")),
    ).toBeGreaterThanOrEqual(MIN_AAA_TEXT);
  });
});

// Five describe blocks retired here, by Phase 1 of the band retirement
// (CLAUDE.md, "The masthead band was retired in favour of a 3px rule"):
//
//   - "the browse band carries solid white text" and "the browse band stays a
//     visible block in both schemes" checked --color-brand-band against white
//     text and against the page. The token stays in app/globals.css,
//     unreferenced, until Phase 2 removes it — see the retirement note in
//     CLAUDE.md — but nothing renders bg-brand-band any more, so a passing or
//     failing contrast pairing for it would say nothing about the shipped
//     site either way.
//   - "the cover keyline stays visible on the band in both schemes" checked
//     --color-cover-keyline against --color-brand-band specifically, because
//     the post cover used to cross the band's bottom edge. Every cover is
//     contained now (see "Covers take one of two frames" in CLAUDE.md), so
//     there is no seam left for the keyline to cross — the token stays,
//     serving the shadow's other half against the page as it always did, but
//     the band-specific pairing this asserted no longer describes anything
//     that renders.
//   - "the browse band's markup" read app/page-band.tsx directly for its root
//     text colour and its absence of translucent white. The file is deleted;
//     the white-text-on-root mechanism it guarded went with it, because
//     ordinary body ink reads fine on the cream WidePage now renders on.
//   - "no route paints body ink inside the band" was the same guard from the
//     per-route end: an explicit text-brand-muted on a standfirst used to
//     beat white inheritance and land dark ink on navy. With no white
//     inheritance to beat, a standfirst naming brand-muted is just an
//     ordinary meta-text treatment, the same as a byline or a breadcrumb —
//     not a defect to guard against.

describe("literal hexes track the tokens they duplicate", () => {
  // Channel comparison, not string: globals.css writes tokens lowercase and the
  // TSX literals are uppercase, so === on the text fails for the wrong reason.
  const named = (source: string, constant: string): Rgba => {
    const m = new RegExp(`${constant}\\s*=\\s*"(#[0-9a-f]{6})"`, "i").exec(
      source,
    );
    if (!m) throw new Error(`literal not found: ${constant}`);
    return parseColour(m[1]);
  };

  const og = read("app/posts/[slug]/opengraph-image.tsx");

  it.each([
    ["BRAND_BG", "--color-brand-bg"],
    ["BRAND_INK", "--color-brand-dark"],
    ["BRAND_CRIMSON", "--color-brand-crimson"],
  ])("OG card's %s equals %s", (constant, token) => {
    expect(sameColour(named(og, constant), light(token))).toBe(true);
  });

  it("the search emblem's dark-mode figure equals the LIGHT crimson", () => {
    // Deliberately the light value. The emblem's ground is a fixed cream island
    // in both schemes, so the lifted dark-mode crimson washes out on it. If this
    // ever matches the dark token instead, the fix went in backwards.
    const page = read("app/search/page.tsx");
    const m = /dark:text-\[(#[0-9a-f]{6})\]/i.exec(page);
    expect(m).not.toBeNull();
    expect(sameColour(parseColour(m![1]), light("--color-brand-crimson"))).toBe(
      true,
    );
  });
});
