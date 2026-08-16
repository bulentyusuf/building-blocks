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

describe("a wide page sits on the same top inset as a narrow one", () => {
  // A browse page and a post are one navigation apart, and that navigation is
  // a full document load with a view transition over it — so a difference here
  // is animated, not just present. Now that the masthead band is retired,
  // every wide route renders through Container's own top inset directly, same
  // as a narrow page — one value, not two that have to be kept in step.
  it("WidePage renders through Container's default top padding", () => {
    const widePage = read("app/wide-page.tsx");
    // No topPad override — the default ("pt-8") is what a narrow page also
    // gets, so the breadcrumb starts at the same distance below the sticky
    // header everywhere.
    expect(widePage).toMatch(/<Container>/);
    expect(widePage).not.toMatch(/topPad=/);
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

describe("the home lead plate's title keeps a size step over a grid plate's", () => {
  // Home no longer has a single hero compared against a shared MoreStories
  // card — both the lead and the two grid plates are built directly in
  // app/page.tsx (see Plate there) — but the underlying property this guarded
  // still matters: the lead is the one size distinction left in the design,
  // and a future edit that quietly collapsed the two ramps to the same value
  // would be invisible to a rendering test, because jsdom applies no
  // stylesheet and both are h2.
  it("the lead and grid plate titles do not share a font-size class", () => {
    const page = read("app/page.tsx");
    // Matched as literal text rather than parsed as JSX, same tradeoff every
    // other guard in this file makes: cheap and exact for a fixed pair of
    // values, at the cost of needing an update if either literally changes.
    const leadSize = /text-\[56px\]/.exec(page);
    const gridSize = /text-\[32px\]/.exec(page);
    expect(leadSize).not.toBeNull();
    expect(gridSize).not.toBeNull();
    expect(leadSize![0]).not.toBe(gridSize![0]);
  });
});

describe("a ruled listing takes a smaller gap under its header than a section front does", () => {
  it("ListingPage declares contentOwnsLeading", () => {
    // The other half. With both the gap and the item padding both full size,
    // header-to-post would disagree with post-to-post in the other direction.
    expect(read("app/listing-page.tsx")).toMatch(/contentOwnsLeading/);
  });

  it("WidePage maps that to the smaller of its two header gaps", () => {
    expect(read("app/wide-page.tsx")).toMatch(
      /contentOwnsLeading \? "mb-8" : "mb-14"/,
    );
  });
});
