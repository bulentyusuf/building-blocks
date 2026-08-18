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

  it("WidePage's header carries exactly one spacing value, not two", () => {
    // The replacement for the band's own two-part inset: contentOwnsLeading
    // still selects between a smaller and a larger gap, but each is now a
    // single margin on the header rather than a band inset plus a separate
    // Container top padding.
    expect(read("app/wide-page.tsx")).toMatch(
      /contentOwnsLeading \? "mb-8" : "mb-14"/,
    );
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
  // What this cannot see: the comparison below is literal equality of filtered
  // class tokens, not resolved cascade values, so two ramps whose token lists
  // differ in LENGTH pass regardless of what they paint. A hero of
  // text-3xl md:text-4xl lg:text-3xl against a card of text-2xl md:text-3xl
  // renders both at 30px from lg up and this stays green, with or without the
  // lg: capture. Resolving each list to a per-breakpoint size and asserting
  // the hero is strictly larger at each is the fix, and it is not this one.
  const SIZE_STEP = /^(?:(?:md|lg):)?text-(?:sm|base|lg|\d*xl)$/;
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

describe("a listing under the header contributes no leading of its own", () => {
  it("ListingPage declares contentOwnsLeading", () => {
    // The other half. With both a page-level gap and the item's own padding,
    // rule-to-post would disagree with post-to-post in the other direction.
    expect(read("app/listing-page.tsx")).toMatch(/contentOwnsLeading/);
  });

  it("WidePage maps that to the smaller header margin", () => {
    expect(read("app/wide-page.tsx")).toMatch(
      /contentOwnsLeading \? "mb-8" : "mb-14"/,
    );
  });
});
