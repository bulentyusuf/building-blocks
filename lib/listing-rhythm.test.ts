import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// The band-to-list rhythm, which has broken twice and is invisible to every
// other suite: jsdom applies no stylesheet, so nothing here can be caught by
// rendering. Both halves are asserted as source text instead.
//
// The rule: whatever sits above a list item — a hairline between items, or the
// bottom edge of the masthead band — belongs the same distance from the cover
// below it. That distance is the item's own top padding. So exactly one of the
// two may contribute space, never both and never neither.

const ROOT = path.join(__dirname, "..");
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

describe("a banded listing keeps its item padding", () => {
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

describe("a banded page sits on the same grid as an unbanded one", () => {
  // A browse page and a post are one navigation apart, and that navigation is
  // a full document load with a view transition over it — so a difference here
  // is animated, not just present. Both values below were tightened on the
  // band alone at one point, which moved the heading 16px on desktop and 20px
  // on mobile every time the reader crossed between the two.

  it("the band's top inset equals Container's default top padding", () => {
    // Targeted at pt- specifically, which is the value this was always about.
    // It read `py-` until the bottom became variable, and a py-only pattern
    // fails open against a split inset: it matches nothing and passes, or it
    // matches a py- that no longer describes the bottom at all.
    const band = /px-5 pt-(\d+)/.exec(read("app/page-band.tsx"));
    expect(band).not.toBeNull();
    const container = /default: "pt-(\d+)"/.exec(read("app/container.tsx"));
    expect(container).not.toBeNull();
    // The same number, so the breadcrumb starts at the same distance below the
    // sticky header on every page.
    expect(band![1]).toBe(container![1]);
  });

  it("the bleed variant only ever deepens the bottom", () => {
    // The overlap is the whole point of the variant, and it exists only while
    // the bottom is bigger than the top. Equal values would still render, look
    // almost right, and silently leave the cover with no navy to sit on.
    const source = read("app/page-band.tsx");
    const top = /px-5 pt-(\d+)/.exec(source);
    const bleed = /bleed \? "pb-(\d+)" : "pb-(\d+)"/.exec(source);
    expect(bleed).not.toBeNull();
    // The unbled bottom stays equal to the top, which is what keeps every
    // other banded route rendering the inset it always had.
    expect(bleed![2]).toBe(top![1]);
    expect(Number(bleed![1])).toBeGreaterThan(Number(top![1]));
  });

  it("both breadcrumb tones keep the same bottom margin", () => {
    const navs = [
      ...read("app/breadcrumb.tsx").matchAll(/nav: "([^"]*)"/g),
    ].map((m) => m[1]);
    expect(navs).toHaveLength(2);
    expect(navs[0]).toBe(navs[1]);
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
  const SIZE_STEP = /^(?:md:)?text-(?:sm|base|lg|\d*xl)$/;
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
    // source order. The count assertion is the guard: exactly one Heading per
    // variant, list then grid, so the second match is always the grid's.
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

describe("the page under a band contributes no leading of its own", () => {
  it("ListingPage declares contentOwnsLeading", () => {
    // The other half. With both the gap and the item padding, band-to-post
    // disagreed with post-to-post in the other direction.
    expect(read("app/listing-page.tsx")).toMatch(/contentOwnsLeading/);
  });

  it("WidePage maps that to no top padding", () => {
    expect(read("app/wide-page.tsx")).toMatch(
      /contentOwnsLeading \? "none" : "tight"/,
    );
  });
});
