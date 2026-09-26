import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { widont } from "./typography";

// widont's job is to stop a heading ending on a lone word. Its failure mode is
// the opposite one and it is worse: glue too much and the string cannot wrap at
// all, so it overflows its column instead of merely wrapping badly.
//
// rich-text.test.tsx covers the rendered path, a heading with a trailing
// parenthesised year, through documentToReactComponents. This covers the
// function itself, where the token-count boundary lives.

const NBSP = String.fromCharCode(0x00a0);

describe("widont leaves anything below three words alone", () => {
  it("returns a two-word string byte-identical", () => {
    // The whole bug. With two tokens the final two are the entire string, so
    // the old behaviour returned one unbreakable run.
    expect(widont("Retro Gaming")).toBe("Retro Gaming");
  });

  it("puts no non-breaking space in a two-word string", () => {
    // Stated separately from the equality above, because a byte comparison
    // reads as a formatting detail and this is the property that matters: the
    // string keeps a breakable space.
    expect(widont("Retro Gaming")).not.toContain(NBSP);
  });

  it("leaves Information Architecture breakable", () => {
    // The reported regression, kept by name. It overflowed a lg:text-6xl
    // heading at 120% zoom on a narrow viewport, where the glued run was about
    // 690px against a column that could not hold it.
    const glued = widont("Information Architecture");
    expect(glued).toBe("Information Architecture");
    expect(glued).not.toContain(NBSP);
  });

  it("leaves a single word alone, which was always documented", () => {
    expect(widont("Retro")).toBe("Retro");
    expect(widont("Retro")).not.toContain(NBSP);
  });

  it("leaves an empty string alone", () => {
    expect(widont("")).toBe("");
  });

  it("counts tokens on the trimmed string", () => {
    // Surrounding whitespace must not make a two-word string look like three
    // and reintroduce the glue.
    expect(widont("  Retro Gaming  ")).not.toContain(NBSP);
  });
});

describe("widont still glues from three words up", () => {
  it("binds the last two words of a three-word string", () => {
    // Non-vacuous in the other direction: the guard above is only correct if
    // it did not switch the feature off.
    expect(widont("A Very Long")).toBe(`A Very${NBSP}Long`);
  });

  it("binds a trailing parenthesised year when there is a line to widow onto", () => {
    expect(widont("Zak McKracken and the Alien Mindbenders (1988)")).toBe(
      `Zak McKracken and the Alien Mindbenders${NBSP}(1988)`,
    );
  });
});

describe("the post h1 does not glue", () => {
  // The constraint lives with the function rather than with the page, because
  // it is a fact about widont: its output is unbreakable, and the post h1 is
  // the one place on the site where an unbreakable pair of ordinary words is
  // wider than the column it sits in. An audit of the deployed site found four
  // posts scrolling sideways at a 20px root, up to 45px, and swapping the glued
  // space back to an ordinary one took every one of them to zero.
  const page = readFileSync(
    join(__dirname, "..", "app", "posts", "[slug]", "page.tsx"),
    "utf8",
  );

  const h1Block = (source: string) => {
    const start = source.indexOf("<h1");
    return source.slice(start, source.indexOf("</h1>", start));
  };

  it("renders the title unglued", () => {
    const block = h1Block(page);

    // Non-vacuous: the block has to be the real one before its contents mean
    // anything.
    expect(block).toContain("data-pagefind-body");
    expect(block).toContain("{post.title}");

    // Comments are stripped because the note above the title explains why
    // widont is absent, and naming it there is not calling it.
    expect(block.replace(/\{\/\*[\s\S]*?\*\/\}/g, "")).not.toContain("widont(");
  });

  it("would catch the call coming back", () => {
    // Known-bad control. The check above strips comments, and that only proves
    // anything if a real call still registers.
    const bad = `<h1 data-pagefind-body>{widont(post.title)}</h1>`;

    expect(h1Block(bad).replace(/\{\/\*[\s\S]*?\*\/\}/g, "")).toContain(
      "widont(",
    );
  });
});
