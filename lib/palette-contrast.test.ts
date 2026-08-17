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

describe("the browse band carries solid white text", () => {
  // Read through schemeTokens rather than hardcoded, so a retune of the band
  // is caught here rather than shipping a band nobody rechecked. 16.60:1 light
  // and 12.61:1 dark today, which is the whole reason the band's text is
  // solid: white/85 on the old header navy was 7.93 light and 6.38 dark, and
  // the second of those missed this floor.
  it.each(["light", "dark"] as const)("%s", (scheme) => {
    const token = scheme === "light" ? light : dark;
    expect(
      contrast({ r: 255, g: 255, b: 255, a: 1 }, token("--color-brand-band")),
    ).toBeGreaterThanOrEqual(MIN_AAA_TEXT);
  });
});

describe("the browse band stays a visible block in both schemes", () => {
  // Not a text pairing, so the bar is deliberately far below any WCAG
  // threshold: this asserts only that the masthead is still a block rather
  // than bare page. It is the assertion the first cut of this feature would
  // have failed — the band shipped with no dark override, which left the
  // light #0F1C42 sitting at 1.13:1 on the #17110F dark page, invisible, with
  // a large h1 apparently floating on nothing. Every text-contrast assertion
  // above stayed green throughout, because white on the band was never the
  // problem.
  //
  // 15.33:1 light and 1.48:1 dark today. The band is darker than the page in
  // light and lighter than it in dark; only the separation is asserted,
  // because which side it sits on is the page's doing, not the band's.
  const MIN_BLOCK_SEPARATION = 1.4;

  it.each(["light", "dark"] as const)("%s", (scheme) => {
    const token = scheme === "light" ? light : dark;
    expect(
      contrast(token("--color-brand-band"), token("--color-brand-bg")),
    ).toBeGreaterThanOrEqual(MIN_BLOCK_SEPARATION);
  });
});

describe("the cover keyline stays visible on the band in both schemes", () => {
  // The post cover crosses the band's bottom edge, so one image has navy
  // behind its top and cream behind the rest. shadow-lg separates it on cream
  // and vanishes on navy, at 1.52:1 and 1.06:1, so the keyline is the half
  // that covers navy and this is the pairing that has to hold.
  //
  // Deliberately sub-WCAG, the same 1.4:1 the band's own separation check uses
  // and for the same reason. This is block visibility, not text.
  //
  // Nothing that existed before this could catch it. Every other edge
  // assertion here asks what an edge does against the PAGE, and the page is
  // not the ground that fails. The dark value this replaced sat at 1.38:1 on
  // the band with every check green.
  const MIN_BLOCK_SEPARATION = 1.4;

  it.each(["light", "dark"] as const)("%s", (scheme) => {
    const token = scheme === "light" ? light : dark;
    // Read as tokens and composited by contrast(), not pinned to a literal, so
    // retuning either the keyline's alpha or the band underneath it fails here
    // rather than shipping an edge nobody rechecked.
    expect(
      contrast(token("--color-cover-keyline"), token("--color-brand-band")),
    ).toBeGreaterThanOrEqual(MIN_BLOCK_SEPARATION);
  });
});

describe("the browse band's markup", () => {
  const band = read("app/page-band.tsx");

  it("sets a text colour on its root, so children inherit it", () => {
    // The gap every other guard here missed. <body> carries text-brand-dark,
    // so an element placed in the band without a colour class of its own
    // inherits BODY INK, not white — which is how the h1 shipped at 1.01:1 on
    // the light band. Nothing above caught it: the contrast assertions all ask
    // what white does on the band, and white was never what the h1 rendered in.
    //
    // It is invisible in dark mode, too, because there brand-dark IS the warm
    // off-white ink and lands at 10.61:1. A reviewer on a dark-themed machine
    // sees a perfectly good masthead.
    //
    // Asserted on the ROOT specifically: inheritance is what makes this hold
    // for markup that does not exist yet, which per-element classes cannot.
    const root = /<div className="bg-brand-band([^"]*)"/.exec(band);
    expect(root).not.toBeNull();
    expect(root![1]).toContain("text-white");
  });

  it("uses no translucent white anywhere inside", () => {
    // Same regex the footer block above scrapes out of layout.tsx, pointed at
    // the band. Without this, a `text-white/70` added to the dek later passes
    // every check — the footer block only ever reads layout.tsx — and the AAA
    // floor quietly breaks across ten routes.
    expect([...band.matchAll(/text-white\/(\d+)/g)]).toEqual([]);
  });
});

describe("no route paints body ink inside the band", () => {
  // The companion to the root-inherits-white check above, from the other end.
  // Inheritance only holds while nothing overrides it, and an explicit
  // text-brand-muted beats it — which is what left the category and tag
  // standfirsts dark on navy after the h1 was fixed. Same failure, same
  // invisibility in dark mode, one component further out.
  //
  // brand-muted and brand-dark are body ink; brand-crimson is 1.35:1 on this
  // navy. None of the three has an on-band treatment, so the band's contents
  // name no colour at all and take white from the root.
  const INK = /text-brand-(muted|dark|crimson)/;

  // Targeted at the two elements that go in the band rather than at the
  // wrapper around them. Slicing on `<PageBand>` was the obvious approach and
  // it broke the moment the routes started passing their header through
  // WidePage instead — a guard that silently stops covering anything when
  // markup is recomposed is worse than none. An h1 and the standfirst
  // signature survive that; they are what the band actually renders.
  const STANDFIRST = /className="[^"]*max-w-3xl text-lg leading-relaxed[^"]*"/g;
  // Attributes may precede className, and on the post page one does. Anchored
  // on `<h1 ` alone this failed OPEN, matching nothing and reporting a clean
  // page, which the non-vacuous assertion below is what caught.
  const HEADING = /<h1[^>]*className="([^"]*)"/g;

  it.each([
    "app/categories/page.tsx",
    "app/tags/page.tsx",
    "app/authors/page.tsx",
    "app/archive/page.tsx",
    "app/categories/[slug]/page.tsx",
    "app/categories/[slug]/page/[page]/page.tsx",
    "app/tags/[slug]/page.tsx",
    "app/tags/[slug]/page/[page]/page.tsx",
    // The author routes used to be exempt: their bio rendered on cream through
    // an `intro` slot and was legitimately muted. It is in the band now, so
    // they are held to the same rule as the other eight.
    "app/authors/[slug]/page.tsx",
    "app/authors/[slug]/page/[page]/page.tsx",
    // The index listing has an h1 in the band and no standfirst. The check
    // wants at least one match rather than both, so it holds here too.
    "app/page/[page]/page.tsx",
    // Same shape. The post's excerpt stays in the body column, so the h1 is
    // the only signature here.
    "app/posts/[slug]/page.tsx",
    // Home's masthead is its h1 now that the hero below is an h2, so it
    // matches on the ordinary signatures like every other route. It needed a
    // bespoke MASTHEAD pattern while it was a <p>, and that pattern is gone
    // rather than left matching nothing.
    "app/page.tsx",
  ])("%s", (file) => {
    const source = read(file);
    const inBand = [
      ...(source.match(STANDFIRST) ?? []),
      ...(source.match(HEADING) ?? []),
    ];
    // Non-vacuous: every one of these routes renders something in the band, so
    // an empty list means the signatures stopped matching, not that the page is
    // clean.
    expect(inBand.length).toBeGreaterThan(0);
    for (const className of inBand) expect(className).not.toMatch(INK);
  });

  it("home's only h1 is the one in its band", () => {
    // This used to need a bespoke signature, because home's h1 was the HERO
    // post title on cream and it satisfied the non-vacuous check from outside
    // the band. The hero is an h2 now, so the file's only h1 is the masthead
    // and the general check covers home the way it covers everything else.
    // Asserted rather than assumed, because a second h1 anywhere in this file
    // would quietly reopen that hole.
    expect(read("app/page.tsx").match(/<h1[^>]*className="/g)).toHaveLength(1);
  });

  it("the position caption names no colour either", () => {
    // It moved into the band and lost its text-brand-muted. Same failure as the
    // standfirsts if it comes back — body ink on navy, invisible in light mode
    // and fine in dark.
    expect(read("app/page-context.tsx")).not.toMatch(INK);
  });
});

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
