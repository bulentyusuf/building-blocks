import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// `subsets` in next/font/google is a preload selector, not a coverage selector.
// Next emits an @font-face carrying a unicode-range for every subset a family
// offers and only injects a preload link for the ones named here, so latin-ext
// characters still render, they are just fetched when a page needs one. Adding
// latin-ext back therefore buys no glyphs at all and costs 211,968 B of
// high-priority bandwidth in <head> competing with the LCP hero image on
// mobile. CLAUDE.md carries the full argument.
//
// The obvious reversal is a de-DE ticket re-adding latin-ext "for the capital
// eszett", which is the assumption the original configuration was built on.
//
// This is a pattern match on source, which is the guard shape that has passed
// here four times while the thing it guarded was broken, so it carries a
// known-bad control and an explicit count assertion. A regex that stops
// matching satisfies every equality check in the loop below without failing.

const LAYOUT = join(process.cwd(), "app/layout.tsx");

function declaredSubsets(source: string): string[][] {
  return [...source.matchAll(/subsets:\s*\[([^\]]*)\]/g)].map((match) =>
    match[1]
      .split(",")
      .map((item) => item.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean),
  );
}

describe("preloaded font subsets", () => {
  const found = declaredSubsets(readFileSync(LAYOUT, "utf8"));

  it("finds both font declarations in app/layout.tsx", () => {
    // Bricolage and Literata. Adding a third face moves this number and fails,
    // which is intended: a new family has to make the same decision rather
    // than inherit whatever was pasted alongside it.
    expect(found).toHaveLength(2);
  });

  it("preloads latin only", () => {
    for (const subsets of found) {
      expect(subsets).toEqual(["latin"]);
    }
  });
});

describe("the subset extractor itself", () => {
  it("reads back the configuration this replaced", () => {
    // Known-bad control. Both faces carried latin and latin-ext until
    // September 2026, and a guard that cannot see that string is not a guard.
    const bad = declaredSubsets('subsets: ["latin", "latin-ext"],');
    expect(bad).toEqual([["latin", "latin-ext"]]);
  });

  it("returns nothing rather than passing when it matches nothing", () => {
    // Separates "every declaration is correct" from "the regex went stale",
    // which the loop above cannot tell apart on its own.
    expect(declaredSubsets("const x = 1;")).toEqual([]);
  });
});
