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

describe("prose overflow", () => {
  // An unbreakable string, a bare URL or a command in inline code, is laid out
  // at its full intrinsic width. That widens the document rather than merely
  // overhanging the column, so the whole page scrolls sideways and a phone
  // reader loses the left margin on every line. Six instances across three
  // posts were live when this rule went in. Nothing else here can catch it:
  // the axe run in app/a11y.test.tsx is under jsdom, which computes no boxes.
  const block = () => {
    const start = css.indexOf("@utility prose");
    return css.slice(start, css.indexOf("\n}", start));
  };

  it("lets prose break a word rather than widen the document", () => {
    // Comments are stripped because the note above the declaration describes
    // the property, and describing it is not declaring it.
    const declarations = block().replace(/\/\*[\s\S]*?\*\//g, "");
    expect(declarations).toMatch(/overflow-wrap:\s*break-word/);
  });

  it("would catch the declaration being commented out", () => {
    // Known-bad control. The check above strips comments precisely so that a
    // declaration moved into one stops counting, and that only holds if the
    // stripping works.
    const commented = "@utility prose {\n  /* overflow-wrap: break-word; */\n}";
    const declarations = commented.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(declarations).not.toMatch(/overflow-wrap:\s*break-word/);
  });
});

describe("lightbox scroll lock", () => {
  // showModal() makes the page inert but leaves it scrollable, so the lock is
  // this rule and nothing in script. It has to sit on html: the rule above makes
  // html the scroller, and a lock on body alone left the page scrolling behind
  // the open lightbox (#568). jsdom applies no stylesheet, so the rule is read
  // as text. [→ `lightbox-dialog`]
  const lockRule = (source: string) => {
    const declarations = source.replace(/\/\*[\s\S]*?\*\//g, "");
    return /(?:^|\n)html:has\(dialog:modal\)\s*\{([^}]*)\}/.exec(
      declarations,
    )?.[1];
  };

  it("locks html while a modal dialog is open", () => {
    expect(lockRule(css)).toMatch(/overflow:\s*hidden/);
  });

  it("would catch the lock moving back to body", () => {
    // Known-bad control: the #568 shape, which must not satisfy the check.
    expect(
      lockRule("body:has(dialog:modal) {\n  overflow: hidden;\n}"),
    ).toBeUndefined();
  });
});
