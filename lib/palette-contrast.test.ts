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

describe("nav text on chrome clears AAA in both schemes", () => {
  // The nav links render at text-white/80 on the aubergine bar. text-white/80
  // on #2B1C3F is 10.44 light and on #3B2A52 is 8.79 dark, both well above
  // the 7:1 floor. Asserted so the nav tint cannot drift below AAA if the
  // chrome is ever lightened — at which point the existing footer guard would
  // also catch it, but this records the nav's own intent separately.
  const navAlpha = 0.8;

  it("light", () => {
    expect(
      contrast(
        { r: 255, g: 255, b: 255, a: navAlpha },
        light("--color-brand-header"),
      ),
    ).toBeGreaterThanOrEqual(MIN_AAA_TEXT);
  });

  it("dark", () => {
    expect(
      contrast(
        { r: 255, g: 255, b: 255, a: navAlpha },
        dark("--color-brand-header"),
      ),
    ).toBeGreaterThanOrEqual(MIN_AAA_TEXT);
  });
});

// On cream, a standfirst that names no colour renders as body ink and competes
// with the h1, so the role is asserted, not assumed. [→ `band-retirement`]

describe("every wide route's standfirst takes the Standfirst role", () => {
  // Anchored on the standfirst's classes, not the route's markup, so recomposed
  // markup cannot quietly drop coverage. The width cap, right alignment and
  // their md: prefixes are inside the pattern on purpose: a standfirst that
  // loses one stops matching instead of passing. [→ `split-masthead`]
  // Author routes keep the old signature and are checked separately below.
  const STANDFIRST_M5 =
    /className="[^"]*md:max-w-\[20rem\] text-lg leading-relaxed md:text-right text-brand-muted[^"]*"/g;

  // Counted exactly, not as non-zero: where a file has two standfirsts, one
  // regressing leaves the other to keep a non-zero count green. Archive has two,
  // the CMS entry and the generated oldest-post fallback.
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

  // The old, pre-M5 signature — no right alignment, and max-w-3xl rather than
  // the 20rem cap — because these two routes render through splitHeader={false}
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
    // band forbade tinted text. Inline in the heading now (docs/decisions.md,
    // "The page counter moves inline, into the heading"), it is still a meta
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

  // The emblem moved from an inline SVG (ink via currentColor, guarded through
  // page.tsx's dark: class) to a static asset with no currentColor to pick up,
  // so the ink is a literal hex baked into the file and the guard reads it
  // there instead. See the emblem note in docs/decisions.md.
  const emblemSvg = read("public/search-emblem.svg");
  const inkFill = (svg: string) =>
    /id="search-emblem-ink"[^>]*fill="(#[0-9a-fA-F]{6})"/.exec(svg)?.[1];

  it("the search emblem's ink equals the LIGHT crimson", () => {
    // Deliberately the light value. The emblem's ground is a fixed cream island
    // in both schemes, so the lifted dark-mode crimson washes out on it. If this
    // ever matches the dark token instead, the fix went in backwards.
    const fill = inkFill(emblemSvg);
    expect(fill, "ink fill not found in public/search-emblem.svg").toBeTruthy();
    expect(sameColour(parseColour(fill!), light("--color-brand-crimson"))).toBe(
      true,
    );
  });

  it("would catch the lifted dark crimson wired in by mistake", () => {
    // Known-bad control: same extraction and comparison, fed a fixture using
    // the lifted dark-mode value instead of the light one. Proves the check
    // above can actually fail rather than passing on whatever hex it finds.
    const bad = emblemSvg.replace(
      /(id="search-emblem-ink"[^>]*fill=")#[0-9a-fA-F]{6}/,
      "$1#EC8494",
    );
    expect(
      sameColour(parseColour(inkFill(bad)!), light("--color-brand-crimson")),
    ).toBe(false);
  });

  it("keeps the lens ground's dark-mode fill the fixed cream, not a token", () => {
    // --color-brand-bg flips to near-black in dark mode and would paint a
    // black glass, so the ground the knockouts read against stays a literal
    // hex in both schemes rather than the token.
    const m =
      /prefers-color-scheme:dark\)\{\.search-lens-ground\{fill:(#[0-9a-fA-F]{6})\}/i.exec(
        emblemSvg,
      );
    expect(
      m,
      "dark-mode ground fill not found in public/search-emblem.svg",
    ).not.toBeNull();
    expect(sameColour(parseColour(m![1]), light("--color-brand-bg"))).toBe(
      true,
    );
  });
});
