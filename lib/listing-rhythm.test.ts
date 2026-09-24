import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Source-text guards for layout details a jsdom render cannot see. The
// header-to-list spacing rhythm is no longer asserted here: it is measured in
// Chromium by lib/listing-rhythm.layout.test.tsx. [→ `guard-limits`]

const ROOT = path.join(__dirname, "..");
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

describe("a wide page sits on the same grid as a narrow one", () => {
  // A browse page and a post are one navigation apart, and that navigation is
  // a full document load with a view transition over it — so a difference here
  // is animated, not just present.
  //
  // Three assertions retired here, from before Phase 1 of the band retirement
  // (docs/decisions.md, "The masthead band was retired in favour of a 3px
  // rule"):
  //
  // "the band's top inset equals Container's default top padding" compared
  // app/page-band.tsx's own pt-8 against Container's — both gone now that
  // WidePage renders one Container carrying a single pt-8 for every wide
  // route, replaced by the assertion below that this value is the one every
  // page, banded or not, ever had.
  //
  // "the bleed variant only ever deepens the bottom" tested the arithmetic
  // behind the `bleed` prop, which pulled a cover up across the band's
  // bottom edge. Covers are contained now (see "Covers take one of two
  // frames" in docs/decisions.md) and WidePage no longer accepts the prop at
  // all.
  //
  // "both breadcrumb tones keep the same bottom margin" guarded against the
  // dark (on-band) and light (on-cream) trail treatments in app/breadcrumb.tsx
  // drifting apart. There is only one treatment now — the `tone` prop is
  // gone — so the two values this compared no longer exist to disagree.

  it("Container's top padding is the one every wide and narrow page shares", () => {
    // WidePage no longer varies its own top inset — see the retirement note
    // above — so the single pt-8 in app/container.tsx is what every route on
    // the site, banded or not, has always used to sit the same distance below
    // the sticky header.
    expect(read("app/container.tsx")).toMatch(/max-w-5xl mx-auto px-5 pt-8/);
  });

  it("the 3px rule that replaced the band's edge inherits the ink token", () => {
    // Not a literal hex — it has to invert with the scheme exactly as body
    // ink does, which a hand-picked colour would not do for free.
    expect(read("app/wide-page.tsx")).toMatch(
      /border-t-\[3px\] border-brand-dark/,
    );
  });
});

describe("the sticky bar's height does not depend on its contents", () => {
  // Same family as the band inset above, one component further out. The bar
  // sets padding and no height, and the wordmark is the tallest thing in the
  // row, so on home — where a :has() rule hides it — the bar rendered 8px
  // shorter and the chrome resized as the reader navigated. Nothing rendered
  // wrongly, which is why only a measurement finds it.
  const layout = read("app/layout.tsx");

  it("pins a minimum height on the bar's inner row", () => {
    expect(layout).toMatch(/px-5 py-3 min-h-13\b/);
  });

  it("that minimum is the padding plus the wordmark's line box", () => {
    // Derivation, not a magic number: py-3 is 24px and the text-lg wordmark
    // sets a 28px line box, so the row is 52px with or without it. Recompute
    // this if either moves.
    const pad = /py-(\d+) min-h-/.exec(layout);
    const min = /min-h-(\d+)\b/.exec(layout);
    expect(pad).not.toBeNull();
    expect(min).not.toBeNull();
    const WORDMARK_LINE_BOX_PX = 28;
    expect(Number(min![1]) * 4).toBe(
      Number(pad![1]) * 4 * 2 + WORDMARK_LINE_BOX_PX,
    );
  });
});

describe("the home hero's title keeps a size step over a grid card's", () => {
  // Same family as the rest of this file: a difference nothing else can see.
  // The hero and the first card sit one scroll apart on home, both are h2 now
  // that the listing renders no heading of its own, and from md up the headline
  // is the only thing left saying which post leads — the cover and the
  // full-measure excerpt do that job on mobile, where the two titles match on
  // purpose. So the classes are allowed to agree at the base step and must
  // diverge above it. They collapsed into a match once, and a rendering test
  // cannot catch it, because jsdom applies no stylesheet and both are h2.
  //
  // The grid card, not the list card. Home renders MoreStories with
  // variant="grid" now, so the grid heading is what actually sits under the
  // hero; the list heading belongs to /page/2 and the other listing routes,
  // which share no viewport with the hero at all. Checking the wrong branch
  // would pass by accident, since the two ramps happen to agree at the base
  // step regardless of which one is compared.
  //
  // Captures an lg: step as well as md:, because the hero carries one now and
  // the card does not. Two ramps differing only at lg would otherwise filter
  // to identical arrays and fail this test on class lists that genuinely
  // differ, which is a false alarm one edit away from being live. So the lg:
  // capture prevents a spurious red. It does not catch a missed collapse.
  //
  // Also captures an arbitrary-value size (text-[2.5rem]), because the hero's
  // 40px lg step (docs/decisions.md, "The home hero takes the split too") is
  // off Tailwind's scale and the on-scale-only pattern silently dropped it —
  // filtering both ramps down to text-2xl/md:text-3xl and reporting them
  // equal, a false PASS on the exact regression this test exists to catch.
  // Caught by running this test after that change landed, not by design; kept
  // here as the reason the bracket branch exists rather than left implicit.
  //
  // What this cannot see: the comparison below is literal equality of filtered
  // class tokens, not resolved cascade values, so two ramps whose token lists
  // differ in LENGTH pass regardless of what they paint. A hero ramp that
  // shrinks again at lg, against a card ramp one step below it, renders both
  // at 30px from lg up and this stays green, with or without the
  // lg: capture. Resolving each list to a per-breakpoint size and asserting
  // the hero is strictly larger at each is the fix, and it is not this one.
  const SIZE_STEP = /^(?:(?:md|lg):)?text-(?:sm|base|lg|\d*xl|\[[^\]]+\])$/;
  const sizeSteps = (className: string) =>
    className.split(/\s+/).filter((c) => SIZE_STEP.test(c));

  it("the hero title and the grid card title do not carry the same ramp", () => {
    // Matched on the tag and any attribute order rather than on `<h2 className=`
    // exactly, so an attribute added before the class list cannot make this
    // fail open.
    const hero = [
      ...read("app/page.tsx").matchAll(/<h2\s[^>]*className="([^"]*)"/g),
    ];
    expect(hero).toHaveLength(1);

    // Matched across the whole file rather than split on a variant string,
    // which would silently pick up whichever branch happens to come first in
    // source order. The count assertion only establishes that there are two
    // headings and no more, so a third variant added later fails loudly here
    // rather than silently shifting the index underneath this comparison.
    // Which of the two is the grid comes from source order instead: the list
    // branch returns before the grid branch in app/more-stories.tsx, and that
    // ordering is load-bearing rather than incidental. It matters more than
    // it used to, because since #394 the two class lists differ only in mb-2
    // against mb-3, so reordering the branches would swap what this test
    // compares without changing the count and without anything looking wrong.
    const headings = [
      ...read("app/more-stories.tsx").matchAll(/<Heading className="([^"]*)"/g),
    ];
    expect(headings).toHaveLength(2);
    const card = headings[1];

    const heroSteps = sizeSteps(hero[0][1]);
    const cardSteps = sizeSteps(card[1]);
    // Non-vacuous: two empty lists are equal, so an unmatched ramp would
    // otherwise fail this test rather than pass it, but a ramp that stopped
    // being spelled in classes at all would sail through the comparison below.
    expect(heroSteps.length).toBeGreaterThan(0);
    expect(cardSteps.length).toBeGreaterThan(0);
    expect(heroSteps).not.toEqual(cardSteps);
  });
});

describe("the hero's byline keeps Avatar whole", () => {
  // A first version of the split hero pulled the date out of Avatar's `meta`
  // prop and rendered it as a standalone line, to mirror the index card's
  // element order (headline, date, standfirst, tags) exactly. That shipped
  // and was reverted (docs/decisions.md, "The home hero takes the split
  // too"): Avatar already took name, picture and meta, and the date was
  // already doing the right job inside it, so pulling it out cost a working
  // component to chase a sequence no card actually needs matched field-by-field. Nothing else
  // catches a regression back to the pulled-apart version — jsdom renders
  // either shape without complaint — so this reads the source instead.
  const hero = read("app/page.tsx");

  it("renders the byline through Avatar with a meta prop", () => {
    expect(hero).toMatch(/<Avatar[\s\S]{0,200}?meta=\{dateline\}/);
  });

  it("does not also render the date as a standalone line", () => {
    // The pulled-apart version's own tell: a block-level element carrying
    // tabular-nums directly under the headline, outside of Avatar entirely.
    // Matched loosely on purpose — this is meant to catch the shape coming
    // back under a different className, not just the exact one it shipped
    // with once.
    expect(hero).not.toMatch(/text-brand-muted mb-3 tabular-nums/);
  });
});

describe("the hero's two-column split carries a gap at every width", () => {
  // The regression: a two-column md grid with a horizontal gap declares no
  // grid at all below md, so the two children rendered as plain stacked block
  // divs with nothing between them — the byline block and the excerpt sat
  // 0px apart on a phone, the largest join on the page carrying the smallest
  // gap of any listing on the site. Every other two-column grid on the site
  // (categories, authors, more-stories' two variants, the footer) declares a
  // single-column grid with a base gap and widens at md; this is the hero
  // rejoining that pattern rather than a new one.
  //
  // Anchored on the JSX className at line start, the same reason the leading
  // guard above anchors on the prop form: a comment mentioning these classes
  // cannot make this pass by accident. Anchored further on the two-column
  // template specifically — the file has two other bare `<div className="...">`
  // lines
  // (the cover wrapper, the byline row) that a looser pattern would match
  // first, since .exec() returns whichever occurs earliest in source order.
  const HERO_GRID = /^\s*<div className="([^"]*md:grid-cols-2[^"]*)">\s*$/m;

  it("declares a base-level grid, not a base stack that only grids at md", () => {
    const match = HERO_GRID.exec(read("app/page.tsx"));
    expect(match).not.toBeNull();
    const classes = match![1].split(/\s+/);
    // Non-vacuous: the pre-fix class list also contains "grid" as a substring
    // of "md:grid", so a bare .includes/.toMatch on the string would pass on
    // the regression this guards against. Split into tokens and check for the
    // exact, unprefixed utility instead.
    expect(classes).toContain("grid");
    expect(classes).not.toContain("md:grid");
    // The second column has to stay behind md, and nothing above catches it.
    // The prefixed grid and the prefixed column count are different tokens,
    // so the not.toContain above passes either way, and the regex anchoring
    // this block matches the unprefixed form as happily as the prefixed one.
    expect(classes).toContain("md:grid-cols-2");
  });

  it("carries a base gap that the two-column step zeroes out", () => {
    const match = HERO_GRID.exec(read("app/page.tsx"));
    expect(match).not.toBeNull();
    const classes = match![1].split(/\s+/);
    expect(classes).toContain("gap-y-6");
    expect(classes).toContain("md:gap-y-0");
    expect(classes).toContain("md:gap-x-16");
    expect(classes).toContain("lg:gap-x-32");
  });
});
