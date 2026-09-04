import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  activationBandTop,
  pickActiveHeading,
  BAND_TOLERANCE_PX,
  FALLBACK_BAND_TOP_PX,
  type HeadingPosition,
} from "./toc-active";

// Headings arrive in document order; `top` is the live viewport offset. A
// positive top sits below the viewport top, a negative one has scrolled above
// it. bandTop is the line a heading must cross to become active, and is at
// least the page's scroll-padding-top (globals.css) plus the tolerance —
// see activationBandTop below.
const BAND_TOP = 80;

const pos = (id: string, top: number): HeadingPosition => ({ id, top });

describe("pickActiveHeading", () => {
  it("does not let a heading in the lower viewport steal the highlight", () => {
    // The exact reported bug: section 7's heading has just risen into view a
    // third of the way down the screen ("larry", top 300), while the reader is
    // still inside section 6 ("pirates", top -400, scrolled above the line).
    // Only a heading whose top has passed the line counts, so "pirates" holds.
    const positions = [pos("pirates", -400), pos("larry", 300)];
    expect(pickActiveHeading(positions, 100)).toBe("pirates");
  });

  it("counts a heading parked at exactly the scroll offset as passed (ToC click)", () => {
    // A ToC click parks the target at the page's scroll-padding-top (80px).
    // bandTop deliberately exceeds that (84 here, the tolerance) so the parked
    // heading counts as passed and highlights itself. Drop bandTop below the
    // offset and every ToC click silently regresses by one section.
    const positions = [pos("pirates", -400), pos("larry", 80)];
    expect(pickActiveHeading(positions, 84)).toBe("larry");
  });

  it("falls back to the last heading passed", () => {
    // Reader is deep inside a long section: three headings sit above the line,
    // one below. The last one passed (largest top still <= bandTop) is the
    // section they are inside.
    const positions = [
      pos("intro", -900),
      pos("setup", -500),
      pos("usage", -60),
      pos("teardown", 400),
    ];
    expect(pickActiveHeading(positions, BAND_TOP)).toBe("usage");
  });

  it("handles negative tops", () => {
    // Every passed heading has scrolled above the viewport (negative top).
    // The one nearest bandTop from below (-40) is the current section.
    const positions = [pos("intro", -300), pos("setup", -40)];
    expect(pickActiveHeading(positions, BAND_TOP)).toBe("setup");
  });

  it('returns "" when every heading is still below the line (the lede)', () => {
    const positions = [pos("intro", 200), pos("setup", 600)];
    expect(pickActiveHeading(positions, BAND_TOP)).toBe("");
  });

  it('returns "" for an empty position set', () => {
    expect(pickActiveHeading([], BAND_TOP)).toBe("");
  });

  it("breaks a tie to document order", () => {
    // Two passed headings at the same top; the later in document order (last
    // in the array) must win. p.top >= best.top adopts the later one.
    const positions = [pos("first", -20), pos("second", -20)];
    expect(pickActiveHeading(positions, BAND_TOP)).toBe("second");
  });
});

describe("activationBandTop", () => {
  // The ToC highlights from the scroll container's scroll-padding-top, which is
  // what parks a heading a fragment link or ToC click targets. Reading anything
  // else puts the activation line somewhere the heading never lands, and the
  // clicked entry lights its predecessor instead.
  it("derives the line from the computed scroll offset", () => {
    expect(activationBandTop("80px")).toBe(80 + BAND_TOLERANCE_PX);
  });

  it("tracks a changed offset rather than assuming 5rem", () => {
    // The whole point of reading it: change globals.css and this follows.
    expect(activationBandTop("120px")).toBe(120 + BAND_TOLERANCE_PX);
  });

  it("falls back when the offset is auto", () => {
    // `auto` is the initial value, so this is what a browser that never applied
    // the rule reports — and what jsdom reports in the suite.
    expect(activationBandTop("auto")).toBe(
      FALLBACK_BAND_TOP_PX + BAND_TOLERANCE_PX,
    );
  });

  it("falls back on an unparseable or zero offset", () => {
    for (const value of ["", "0px", "inherit"]) {
      expect(activationBandTop(value)).toBe(
        FALLBACK_BAND_TOP_PX + BAND_TOLERANCE_PX,
      );
    }
  });

  it("keeps the fallback in step with globals.css", () => {
    // If someone retunes scroll-padding-top and forgets this constant, the
    // fallback silently disagrees with the real landing point. 5rem = 80px.
    expect(FALLBACK_BAND_TOP_PX).toBe(80);
  });
});

describe("scroll offset lives in exactly one place", () => {
  const root = path.join(__dirname, "..");
  const css = fs.readFileSync(path.join(root, "app/globals.css"), "utf8");

  it("globals.css sets scroll-padding-top on the scroll container", () => {
    // The container, not the target: scroll-padding is what covers keyboard
    // focus as well as fragment links, which is the whole reason it replaced
    // the per-heading scroll-mt-* utilities.
    expect(css).toMatch(/html\s*\{[^}]*scroll-padding-top:\s*5rem/);
  });

  it("the fallback constant agrees with the stylesheet", () => {
    const rem = Number(
      /scroll-padding-top:\s*([\d.]+)rem/.exec(css)?.[1] ?? NaN,
    );
    expect(rem * 16).toBe(FALLBACK_BAND_TOP_PX);
  });

  it("excludes prose files from Tailwind's source scanning", () => {
    // The blind spot that let the check below pass while the utility was
    // still shipping. Tailwind v4 scans every file .gitignore does not
    // exclude, markdown included, so CLAUDE.md's (now docs/decisions.md's)
    // sentence explaining why that utility must not exist was generating it.
    // The walk below only covers app/ and lib/, and always will — the fix
    // belongs in the stylesheet.
    //
    // This comment says "the utility" rather than naming it for the same
    // reason: app/ and lib/ ARE scanned, so a literal class name here would
    // regenerate the rule. The test below enforces that.
    expect(css).toContain('@source not "../CLAUDE.md"');
    expect(css).toContain('@source not "../docs/decisions.md"');
    expect(css).toContain('@source not "../README.md"');
  });

  it("does not name the removed utility anywhere app/ or lib/ is scanned", () => {
    // Tailwind scans app/ and lib/ for class-name candidates and cannot tell a
    // comment from markup, so writing the literal class here regenerates the
    // rule in production — which is exactly what happened after the prose
    // files were excluded: CLAUDE.md stopped emitting it and this file and
    // globals.css carried on. The needle is assembled at runtime so that this
    // assertion is not itself the thing it forbids.
    const needle = "scroll-mt" + "-24";
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === "node_modules" || entry.name.startsWith("."))
          continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(tsx?|css)$/.test(entry.name)) {
          if (fs.readFileSync(full, "utf8").includes(needle))
            offenders.push(path.relative(root, full));
        }
      }
    };
    for (const dir of ["app", "lib"]) walk(path.join(root, dir));

    expect(offenders).toEqual([]);
  });

  it("no scroll-mt-* utility survives to stack on top of it", () => {
    // scroll-padding on the container and scroll-margin on the target ADD, so
    // one of these reintroduced would push the landing point past the line the
    // ToC activates on — a clicked entry highlighting the section above it.
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === "node_modules" || entry.name.startsWith("."))
          continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (
          /\.(tsx?|css)$/.test(entry.name) &&
          !entry.name.includes(".test.")
        ) {
          const text = fs.readFileSync(full, "utf8");
          // Match the utility, not the words in the comments explaining it.
          if (/className=[^>]*\bscroll-mt-\d/.test(text)) {
            offenders.push(path.relative(root, full));
          }
        }
      }
    };
    for (const dir of ["app", "lib"]) walk(path.join(root, dir));
    expect(offenders).toEqual([]);
  });
});
