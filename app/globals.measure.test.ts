import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The typography plugin measures the prose column in `ch`, which is keyed to
// the current font's zero glyph, so the column silently resizes whenever the
// body face changes — Inter's zero is 0.6309em against Literata's 0.5790em, an
// 8% narrowing with no width anywhere in the diff. The measure lives on the
// max-w-2xl parents instead. If this override is removed, the column starts
// drifting with the font again and nothing else will notice.
const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

describe("prose measure", () => {
  it("neutralises the plugin's ch-based max-width", () => {
    const block = css.slice(css.indexOf("@utility prose"));
    expect(block.slice(0, block.indexOf("}"))).toMatch(/max-width:\s*none/);
  });

  // Belt and braces, and the half that survives the block above being
  // restructured: no text column anywhere may be measured in ch. Comments are
  // stripped first — the note explaining the override quotes the plugin's own
  // declaration, and describing the defect is not committing it.
  it("measures no column in ch", () => {
    const declarations = css.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(declarations).not.toMatch(/max-width:\s*[\d.]+ch/);
  });
});

describe("scrollbar gutter", () => {
  it("reserves the scrollbar gutter, so short pages do not shift sideways", () => {
    // Without this, /search with an empty query has no scrollbar, a viewport
    // ~15px wider than every page that scrolls, and every mx-auto element on it
    // lands ~7.5px right of where it sits elsewhere. Nothing about the markup
    // differs between those pages, so nothing else would catch a regression.
    const html = /\bhtml\s*\{([^}]*)\}/.exec(css);
    expect(html).not.toBeNull();
    expect(html![1]).toMatch(/overflow-y:\s*scroll/);
  });
});
