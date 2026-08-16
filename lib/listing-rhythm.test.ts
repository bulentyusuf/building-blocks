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
    // MoreStories renders one shape now — the grid variant it once also had
    // is gone (round 3 §5 replaced its only caller, the post page's Read
    // Next, with app/story-card.tsx's StoryCard) — so a plain count of one is
    // enough; it no longer has to distinguish this article from a second,
    // unpadded one.
    const items = [
      ...moreStories.matchAll(/<article className="([^"]*py-10[^"]*)"/g),
    ];
    expect(items).toHaveLength(1);
    expect(items[0][1]).toMatch(/py-10[^"]*md:py-12/);
  });

  it("drops only the rule when openRule is false", () => {
    const ternary = /openRule \? "border-y" : "([^"]*)"/.exec(moreStories);
    expect(ternary).not.toBeNull();
    expect(ternary![1].trim()).toBe("border-b");
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
  //
  // Two pairs now, not one: round 3 gave the bar a shorter mobile height
  // (48px) alongside the original desktop one (52px), each still derived from
  // its own py plus the wordmark's fixed 28px line box.
  const layout = read("app/layout.tsx");

  it("pins a minimum height on the bar's inner row, mobile and desktop", () => {
    expect(layout).toMatch(/px-5 py-2\.5 sm:py-3 min-h-12 sm:min-h-13\b/);
  });

  it("both minimums are their own padding plus the wordmark's line box", () => {
    // Derivation, not a magic number: every Tailwind spacing step is
    // 0.25rem (4px) per unit, fractional steps (py-2.5) included, so one
    // toPx below covers both pairs. Recompute if either pair's py, the
    // wordmark's leading-7, or the breakpoint changes.
    const WORDMARK_LINE_BOX_PX = 28;
    const toPx = (n: string) => Number(n) * 4;

    const mobilePad = /\bpy-([\d.]+) /.exec(layout);
    const mobileMin = /\bmin-h-([\d.]+)\b/.exec(layout);
    expect(mobilePad).not.toBeNull();
    expect(mobileMin).not.toBeNull();
    expect(toPx(mobileMin![1])).toBe(
      toPx(mobilePad![1]) * 2 + WORDMARK_LINE_BOX_PX,
    );

    const desktopPad = /\bsm:py-([\d.]+)\b/.exec(layout);
    const desktopMin = /\bsm:min-h-([\d.]+)\b/.exec(layout);
    expect(desktopPad).not.toBeNull();
    expect(desktopMin).not.toBeNull();
    expect(toPx(desktopMin![1])).toBe(
      toPx(desktopPad![1]) * 2 + WORDMARK_LINE_BOX_PX,
    );
  });
});

describe("the home lead plate's title keeps a size step over a grid plate's", () => {
  // Home's lead plate is built directly in app/page.tsx (LeadPlate); the two
  // grid plates beside it are app/story-card.tsx's StoryCard, the same card
  // the post page's Read Next teaser uses (round 3 §5). The underlying
  // property this guards still matters regardless of which file each side
  // lives in: the lead is the one size distinction left in the design, and a
  // future edit that quietly collapsed the two ramps to the same value would
  // be invisible to a rendering test, because jsdom applies no stylesheet and
  // both are h2.
  it("the lead and grid plate titles do not share a font-size class", () => {
    // Matched as literal text rather than parsed as JSX, same tradeoff every
    // other guard in this file makes: cheap and exact for a fixed pair of
    // values, at the cost of needing an update if either literally changes.
    const leadSize = /text-\[56px\]/.exec(read("app/page.tsx"));
    const gridSize = /text-\[30px\]/.exec(read("app/story-card.tsx"));
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
