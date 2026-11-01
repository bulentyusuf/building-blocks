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
// One: nothing tested the accent's contrast, and app/a11y.test.tsx disables
// axe's color-contrast rule because jsdom computes no boxes and would report a
// false pass. So the crimson token
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

// The strand pills are 12px cream text on a fill that does not invert, and the
// cards carry body ink on their own surface. [→ `strands`]
describe("strand pills and card text clear AA in both schemes", () => {
  it.each(["light", "dark"] as const)("%s", (scheme) => {
    const token = scheme === "light" ? light : dark;
    for (const strand of ["blogging", "films", "games"]) {
      expect(
        contrast(token("--color-on-strand"), token(`--color-strand-${strand}`)),
        strand,
      ).toBeGreaterThanOrEqual(4.5);
    }
    expect(
      contrast(token("--color-brand-dark"), token("--color-card")),
    ).toBeGreaterThanOrEqual(MIN_AAA_TEXT);
  });
});

describe("the post's code and prompt surfaces clear AAA", () => {
  // Ink stays ink in dark mode and the cream fill is light-only, so light
  // values cover both schemes.
  // [→ `post-page`]
  it("the prompt label on ink, and ink on the inline code fill", () => {
    expect(
      contrast(light("--color-prompt-label"), light("--color-surface-dark")),
    ).toBeGreaterThanOrEqual(MIN_AAA_TEXT);
    expect(
      contrast(light("--color-brand-dark"), light("--color-code-bg")),
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
    "app/categories/page.tsx",
    "app/tags/page.tsx",
    "app/authors/page.tsx",
    "app/archive/page.tsx",
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
    ["THEME_COLOR", "light"],
    ["THEME_COLOR_DARK", "dark"],
  ] as const)("%s equals the %s --color-brand-bg", (constant, scheme) => {
    // The viewport themeColor and the PWA manifest cannot read a custom
    // property, so the page colour exists twice outside globals.css. A drift
    // here paints the mobile address bar and the installed app's chrome in the
    // OLD colour, which no desktop review would ever surface.
    const token = scheme === "light" ? light : dark;
    expect(
      sameColour(
        named(read("lib/constants.ts"), constant),
        token("--color-brand-bg"),
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
