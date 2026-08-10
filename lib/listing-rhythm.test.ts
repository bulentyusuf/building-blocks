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
    expect(moreStories).toMatch(/py-10[^"]*md:py-12/);
  });

  it("drops only the rule when openRule is false", () => {
    const ternary = /openRule \? "border-y" : "([^"]*)"/.exec(moreStories);
    expect(ternary).not.toBeNull();
    expect(ternary![1].trim()).toBe("border-b");
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

describe("the home hero's title keeps a size step over a list card's", () => {
  // Same family as the rest of this file: a difference nothing else can see.
  // The hero and the first card sit one scroll apart on home, both are h2 now
  // that the listing renders no heading of its own, and from md up the headline
  // is the only thing left saying which post leads — the cover and the
  // full-measure excerpt do that job on mobile, where the two titles match on
  // purpose. So the classes are allowed to agree at the base step and must
  // diverge above it. They collapsed into a match once, and a rendering test
  // cannot catch it, because jsdom applies no stylesheet and both are h2.
  const SIZE_STEP = /^(?:md:)?text-(?:sm|base|lg|\d*xl)$/;
  const sizeSteps = (className: string) =>
    className.split(/\s+/).filter((c) => SIZE_STEP.test(c));

  it("the hero title and the list card title do not carry the same ramp", () => {
    // Matched on the tag and any attribute order rather than on `<h2 className=`
    // exactly, so an attribute added before the class list cannot make this
    // fail open.
    const hero = [
      ...read("app/page.tsx").matchAll(/<h2\s[^>]*className="([^"]*)"/g),
    ];
    expect(hero).toHaveLength(1);

    // The list variant's heading, not the grid variant's. The grid is the post
    // page's Read Next teaser and shares no viewport with the hero.
    const listVariant = read("app/more-stories.tsx").split(
      'variant === "list"',
    )[1];
    expect(listVariant).toBeDefined();
    const card = /<Heading className="([^"]*)"/.exec(listVariant);
    expect(card).not.toBeNull();

    const heroSteps = sizeSteps(hero[0][1]);
    const cardSteps = sizeSteps(card![1]);
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
