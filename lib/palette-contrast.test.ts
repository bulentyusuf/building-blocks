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
  // Reads --color-brand-header, not the retired --color-footer-bg. The footer
  // shared surface-dark's value in light and lifted away from it in dark, which
  // is why it had a token of its own; it now shares the bar's aubergine in both
  // schemes and the separate token is gone.
  //
  // white/65 on #2B1C3F is 7.35, so the existing tint ladder clears AAA
  // unchanged. #398 raised these to white/72 and that was never required.
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
      contrast(faintest(), light("--color-brand-header")),
    ).toBeGreaterThanOrEqual(MIN_AAA_TEXT);
  });

  it("dark", () => {
    expect(
      contrast(faintest(), dark("--color-brand-header")),
    ).toBeGreaterThanOrEqual(MIN_AAA_TEXT);
  });
});

// Five describe blocks retired here, by Phase 1 of the band retirement
// (CLAUDE.md, "The masthead band was retired in favour of a 3px rule"):
//
//   - "the browse band carries solid white text" and "the browse band stays a
//     visible block in both schemes" checked --color-brand-band against white
//     text and against the page. Nothing rendered bg-brand-band any more, so a
//     passing or failing pairing for it said nothing about the shipped site.
//     Phase 2 deleted the token itself. The block-visibility check did NOT
//     lapse with it — it moved to --color-brand-header, which inherited the
//     job and had no guard of its own. See "the chrome stays a visible block
//     in both schemes" below.
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
//     beat white inheritance and land dark ink on navy.
//
// Four of those five lapse. The fifth INVERTS, and it is the one that matters,
// because the rule it encoded did not go away — it reversed. Under the band a
// standfirst naming NO colour was correct, because it took solid white from
// the band's root. On cream, naming no colour means body ink, which is not the
// Standfirst role (audit role 4: text-lg, muted, roman) and leaves the
// standfirst competing with the h1 above it instead of sitting under it. That
// is a thirteen-route defect that looks merely slightly heavy rather than
// broken, which is exactly the class of thing a guard is for. Retiring this
// one without reversing it is how it shipped.

describe("every wide route's standfirst takes the Standfirst role", () => {
  // Anchored on the standfirst signature rather than on a route's structure.
  // The retired guard recorded why: slicing on <PageBand> broke the moment
  // routes started passing their header through WidePage, and a guard that
  // silently stops covering anything when markup is recomposed is worse than
  // none.
  //
  // Re-anchored twice since. First for the split masthead's left-flowing
  // version, which dropped max-w-3xl because a standfirst filling the
  // remaining width needed no max-width of its own. That version shipped and
  // was rejected on sight for a different reason (CLAUDE.md, "The masthead
  // splits into heading and standfirst") — the row is right-anchored now, via
  // M5 — and M5 brought a max-width BACK, `max-w-[20rem]`, this time to force
  // a two-line wrap rather than to cap a stray one. It also added
  // `text-right`. Both are required in the pattern below, not just checked
  // afterwards, for the same reason text-brand-muted already was: a
  // standfirst that loses either one stops MATCHING rather than failing a
  // later assertion, and the guard exists to catch exactly that regression.
  //
  // The author routes are the one exception and are checked separately below,
  // against the OLD signature — max-w-3xl, no text-right — because they render
  // through splitHeader={false} and were never touched by M5. A single
  // pattern loose enough to match both signatures would not distinguish a
  // route that correctly kept the old style from one that regressed out of
  // the new one.
  const STANDFIRST_M5 =
    /className="[^"]*max-w-\[20rem\] text-lg leading-relaxed text-right text-brand-muted[^"]*"/g;

  // Because text-brand-muted is inside the pattern, a standfirst that loses it
  // stops MATCHING rather than failing the per-match check. That is fine while a
  // file has one standfirst — the count drops to zero and the assertion below
  // fails. It is not fine where a file has two, because the surviving sibling
  // keeps the count above zero and the regression ships green. Demonstrated by
  // removing text-brand-muted from one of Archive's two standfirsts: the whole
  // file stayed green.
  //
  // So the count is asserted exactly, not just as non-zero. Requiring
  // max-w-[20rem] and text-right in the pattern itself, rather than checking
  // them per match the way text-brand-muted is, is what keeps this map short:
  // Categories' and Authors' per-item card blurbs (a category description, an
  // author bio, both ordinary left-aligned body prose) share the OLD
  // `text-lg leading-relaxed text-brand-muted` prefix with their page's real
  // standfirst, which is why those two files carried a count of 2 under the
  // left-flowing pattern. Neither blurb is part of the masthead and neither
  // takes M5's own classes, so the tighter pattern stops matching them and
  // both files are back to a plain, un-mapped 1. Archive is the one file
  // still mapped, because both its standfirsts — the CMS entry and the
  // generated oldest-post fallback — are real header content and both do
  // carry the M5 classes.
  const EXPECTED_STANDFIRSTS: Record<string, number> = {
    "app/archive/page.tsx": 2,
  };

  it.each([
    "app/page.tsx",
    "app/page/[page]/page.tsx",
    "app/categories/page.tsx",
    "app/tags/page.tsx",
    "app/authors/page.tsx",
    "app/archive/page.tsx",
    "app/categories/[slug]/page.tsx",
    "app/categories/[slug]/page/[page]/page.tsx",
    "app/tags/[slug]/page.tsx",
    "app/tags/[slug]/page/[page]/page.tsx",
  ])("%s", (file) => {
    const found = [...(read(file).match(STANDFIRST_M5) ?? [])];
    // Exact, not non-zero. See the note on EXPECTED_STANDFIRSTS: a zero-floor
    // check cannot see one of two standfirsts regressing.
    expect(found.length).toBe(EXPECTED_STANDFIRSTS[file] ?? 1);
    for (const className of found)
      expect(className).toMatch(/text-brand-muted/);
  });

  // The old, pre-M5 signature — no text-right, and max-w-3xl rather than
  // max-w-[20rem] — because these two routes render through splitHeader={false}
  // and were never brought into the row. "Render as they do today" is the
  // acceptance criterion for these two files specifically.
  const STANDFIRST_AUTHOR =
    /className="[^"]*max-w-3xl text-lg leading-relaxed text-brand-muted[^"]*"/g;

  it.each([
    // The author routes carry theirs as a RichText wrapper rather than a <p>,
    // and it matches the same signature.
    "app/authors/[slug]/page.tsx",
    "app/authors/[slug]/page/[page]/page.tsx",
  ])("%s (pre-M5 signature)", (file) => {
    const found = [...(read(file).match(STANDFIRST_AUTHOR) ?? [])];
    expect(found.length).toBe(1);
    for (const className of found) {
      expect(className).toMatch(/text-brand-muted/);
      expect(className).not.toMatch(/text-right/);
    }
  });

  it("the position counter takes it too", () => {
    // It named no colour in the band, separating by size alone because the
    // band forbade tinted text. Inline in the heading now (CLAUDE.md, "The
    // page counter moves inline, into the heading"), it is still a meta
    // string rather than heading text, and text-brand-muted is what says so.
    expect(read("app/page-counter.tsx")).toMatch(/text-brand-muted/);
  });

  it("home's masthead accents the stop with the TOKEN, never a literal", () => {
    // The light crimson on the dark page is 2.44:1. brand-crimson lifts to the
    // dark scheme's own value on its own, so the class is the only safe way to
    // write this.
    //
    // The negative half looks for an arbitrary-value colour utility rather
    // than for a hex anywhere in the file, because hexes appear in comments
    // explaining exactly this, and a guard that fails on its own rationale is
    // a guard nobody keeps.
    const home = read("app/page.tsx");
    expect(home).toMatch(/<span className="text-brand-crimson">/);
    expect(home).not.toMatch(/text-\[#[0-9a-fA-F]{3,8}\]/);
  });
});

describe("the chrome stays a visible block in both schemes", () => {
  // The guard the masthead band used to carry, moved to the surface that
  // inherited its job. --color-brand-header has never had one of its own: the
  // band's version was retired with the band in Phase 1, and grepping this file
  // before Phase 2 found no assertion on the bar token at all.
  //
  // Not a text pairing, so this sits far below any WCAG threshold. It asserts
  // only that the chrome is still a block rather than bare page. It is the
  // check the band's first cut would have failed — it shipped with no dark
  // override, leaving the light value at 1.13:1 on the dark page, invisible,
  // while every text-contrast assertion here stayed green because white on it
  // was never the problem.
  //
  // 14.47:1 light and 1.46:1 dark today. The chrome is darker than the page in
  // light and lighter than it in dark; only the separation is asserted, because
  // which side it sits on is the page's doing. The dark margin is 0.06 over the
  // floor, the narrowest anywhere in this palette, which is what makes this the
  // assertion most worth having and the one a retune is most likely to break.
  const MIN_BLOCK_SEPARATION = 1.4;

  it.each(["light", "dark"] as const)("%s", (scheme) => {
    const token = scheme === "light" ? light : dark;
    expect(
      contrast(token("--color-brand-header"), token("--color-brand-bg")),
    ).toBeGreaterThanOrEqual(MIN_BLOCK_SEPARATION);
  });

  it("white on the chrome clears AAA in both schemes", () => {
    // One surface for the bar and the footer now, so this covers both. 15.66:1
    // light and 12.81:1 dark.
    for (const token of [light, dark])
      expect(
        contrast(
          { r: 255, g: 255, b: 255, a: 1 },
          token("--color-brand-header"),
        ),
      ).toBeGreaterThanOrEqual(MIN_AAA_TEXT);
  });

  it("the accent still cannot be used on the chrome", () => {
    // 2.04:1 light. The reason the trail, the nav and the footer identify
    // links by weight and underline rather than colour, and the reason
    // elements on chrome override the sitewide crimson focus ring with a white
    // one. Asserted so the exception is not quietly dropped if the chrome is
    // ever lightened — at which point the override becomes the bug.
    expect(
      contrast(light("--color-brand-crimson"), light("--color-brand-header")),
    ).toBeLessThan(3);
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

  it.each([
    ["BRAND_HEADER_COLOR", "light"],
    ["BRAND_HEADER_COLOR_DARK", "dark"],
  ] as const)("%s equals the %s --color-brand-header", (constant, scheme) => {
    // The viewport themeColor and the PWA manifest cannot read a custom
    // property, so the chrome colour exists twice outside globals.css. A drift
    // here paints the mobile address bar and the installed app's chrome in the
    // OLD colour, which no desktop review would ever surface. Both were navy
    // until the aubergine change and neither was guarded before it.
    const token = scheme === "light" ? light : dark;
    expect(
      sameColour(
        named(read("lib/constants.ts"), constant),
        token("--color-brand-header"),
      ),
    ).toBe(true);
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
