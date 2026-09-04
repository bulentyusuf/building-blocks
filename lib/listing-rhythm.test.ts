import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// The header-to-list rhythm, which has broken twice and is invisible to every
// other suite: jsdom applies no stylesheet, so nothing here can be caught by
// rendering. Both halves are asserted as source text instead.
//
// The rule: whatever sits above a list item — a hairline between items, or
// WidePage's own 3px rule (formerly the masthead band's bottom edge; see
// CLAUDE.md, "The masthead band was retired in favour of a 3px rule") —
// belongs the same distance from the cover below it. That distance is the
// item's own top padding. So exactly one of the two may contribute space,
// never both and never neither.

const ROOT = path.join(__dirname, "..");
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

describe("a listing under WidePage's header keeps its item padding", () => {
  const moreStories = read("app/more-stories.tsx");

  it("never zeroes the first item's top padding", () => {
    // The regression: dropping this made the first post hug the band while
    // every post after it kept a full item's padding under its hairline.
    expect(moreStories).not.toMatch(/first-child\]:pt-0/);
  });

  it("still sets a symmetric item padding to be the rhythm", () => {
    // Non-vacuous: the check above passes trivially if the padding is gone.
    //
    // Matched on an article carrying py-10 specifically, not on every classed
    // article. The grid variant's article carries a class list of its own now
    // too (flex h-full flex-col, so its tag row can sit on mt-auto), but no
    // padding, so a bare className match would count two and the assertion
    // below would need loosening to fit — which is exactly the kind of guard
    // that stops guarding. The list item is still the only article whose
    // padding IS the rhythm, and the count assertion keeps that true rather
    // than assumed.
    const items = [
      ...moreStories.matchAll(/<article className="([^"]*py-10[^"]*)"/g),
    ];
    expect(items).toHaveLength(1);
    expect(items[0][1]).toMatch(/py-10[^"]*md:py-12/);
  });

  it("gives a ruled grid that same inset in place of item padding", () => {
    // The other half of the rhythm, and nothing else asserts it. A grid cell
    // has no padding of its own, so the container supplies it, and only when
    // the run is ruled. Without it the opening rule on home sits flush against
    // the first row of covers while every list on the site keeps a full item's
    // padding under its own hairline.
    const grid = /`grid grid-cols-1[\s\S]*?`;/.exec(moreStories);
    expect(grid).not.toBeNull();
    expect(grid![0]).toMatch(/py-10 md:py-12/);
  });

  it("drops only the rule when openRule is false", () => {
    // Both branches, not whichever exec happened to find first. The list and
    // the grid each build this ternary now, so a single exec checked one and
    // left the other free to drift to border-t with nothing noticing.
    const ternaries = [
      ...moreStories.matchAll(/openRule \? "border-y" : "([^"]*)"/g),
    ];
    expect(ternaries).toHaveLength(2);
    for (const ternary of ternaries) {
      expect(ternary[1].trim()).toBe("border-b");
    }
  });
});

describe("a wide page sits on the same grid as a narrow one", () => {
  // A browse page and a post are one navigation apart, and that navigation is
  // a full document load with a view transition over it — so a difference here
  // is animated, not just present.
  //
  // Three assertions retired here, from before Phase 1 of the band retirement
  // (CLAUDE.md, "The masthead band was retired in favour of a 3px rule"):
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
  // frames" in CLAUDE.md) and WidePage no longer accepts the prop at all.
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

  it("WidePage keeps the band's two insets on their own sides of the rule", () => {
    // The band's inset was two numbers because it was two colours: pb-8 of
    // navy below the header, then Container's pt-6 of cream below the band's
    // edge. One surface does not merge them, because the rule now sits where
    // the colour step used to, and which side each number falls on is the
    // whole point.
    //
    // Folding both into the header's bottom margin preserves the TOTAL and
    // moves all of it above the boundary, which leaves the first content
    // element flush against a 3px line on home, the post page and the four
    // section fronts. The ruled listings hide it, because their items carry
    // py-10 md:py-12 of their own — which is why a green suite is not evidence
    // here and why this asserts both halves separately.
    const wide = read("app/wide-page.tsx");
    expect(wide).toMatch(/<header className="mb-8">/);
    expect(wide).toMatch(/contentOwnsLeading \? undefined : "pt-6"/);
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
  // 40px lg step (CLAUDE.md, "The home hero takes the split too") is off
  // Tailwind's scale and the on-scale-only pattern silently dropped it —
  // filtering both ramps down to text-2xl/md:text-3xl and reporting them
  // equal, a false PASS on the exact regression this test exists to catch.
  // Caught by running this test after that change landed, not by design; kept
  // here as the reason the bracket branch exists rather than left implicit.
  //
  // What this cannot see: the comparison below is literal equality of filtered
  // class tokens, not resolved cascade values, so two ramps whose token lists
  // differ in LENGTH pass regardless of what they paint. A hero of
  // text-3xl md:text-4xl lg:text-3xl against a card of text-2xl md:text-3xl
  // renders both at 30px from lg up and this stays green, with or without the
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
  // and was reverted (CLAUDE.md, "The home hero takes the split too"): Avatar
  // already took name, picture and meta, and the date was already doing the
  // right job inside it, so pulling it out cost a working component to chase
  // a sequence no card actually needs matched field-by-field. Nothing else
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

describe("a listing under the header contributes no leading of its own", () => {
  it("ListingPage declares contentOwnsLeading", () => {
    // The other half. With both a page-level gap and the item's own padding,
    // rule-to-post would disagree with post-to-post in the other direction.
    expect(read("app/listing-page.tsx")).toMatch(/contentOwnsLeading/);
  });

  it("WidePage maps that to no gap below the rule", () => {
    // Below, not above. A prop meaning "the content below supplies its own
    // space" cannot be spent on the space above the boundary — doing that
    // makes the header-to-rule distance depend on what the content does,
    // which is backwards, and leaves the gap it was meant to suppress at zero
    // for every route that never set the flag.
    expect(read("app/wide-page.tsx")).toMatch(
      /contentOwnsLeading \? undefined : "pt-6"/,
    );
  });

  it("only the ruled listing claims it", () => {
    // Home and the post page set it before the retirement, because their
    // covers pulled up across the band's edge and supplied their own leading
    // that way. The pull-ups went with the band and the flag had to follow,
    // or both open flush against the rule.
    //
    // Anchored on the JSX prop form — start of line, then the name, then `=`
    // or end of line — rather than on the bare word. Both files explain in a
    // comment why they no longer pass it, and a guard that fails on its own
    // rationale is a guard nobody keeps. A `//` comment cannot match this.
    const PASSED = /^\s*contentOwnsLeading(=|\s*$)/m;
    expect(read("app/page.tsx")).not.toMatch(PASSED);
    expect(read("app/posts/[slug]/page.tsx")).not.toMatch(PASSED);
    // Non-vacuous: the one route that DOES claim it still does.
    expect(read("app/listing-page.tsx")).toMatch(PASSED);
  });
});

describe("the hero's two-column split carries a gap at every width", () => {
  // The regression: md:grid md:grid-cols-[3fr_2fr] md:gap-x-16 declares no
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
  // cannot make this pass by accident. Anchored further on grid-cols-[3fr_2fr]
  // specifically — the file has two other bare `<div className="...">` lines
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
    // `md:grid` and `md:grid-cols-2` are different tokens, so the
    // not.toContain above passes either way, and the regex anchoring this
    // block matches a bare `grid-cols-2` as happily as the prefixed
    // one.
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
