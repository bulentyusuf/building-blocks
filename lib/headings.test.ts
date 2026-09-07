import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { BLOCKS } from "@contentful/rich-text-types";
import type { Document } from "@contentful/rich-text-types";
import { extractHeadings, hasTableOfContents, MIN_HEADINGS } from "./headings";

// Minimal rich-text node builders, matching the fixture shape in
// rich-text.test.tsx.
const text = (value: string) => ({
  nodeType: "text",
  value,
  marks: [],
  data: {},
});

const heading2 = (...children: unknown[]) => ({
  nodeType: BLOCKS.HEADING_2,
  data: {},
  content: children,
});

const link = (uri: string, value: string) => ({
  nodeType: "hyperlink",
  data: { uri },
  content: [text(value)],
});

const docOf = (...headings: unknown[]) =>
  ({
    nodeType: BLOCKS.DOCUMENT,
    data: {},
    content: headings,
  }) as unknown as Document;

const slugsOf = (...headings: unknown[]) =>
  extractHeadings(docOf(...headings)).map((h) => h.slug);

describe("extractHeadings slugging", () => {
  it("strips a leading ordinal so a listicle slug survives a renumber", () => {
    expect(
      slugsOf(
        heading2(text("1. Zak McKracken and the Alien Mindbenders (1988)")),
      ),
    ).toEqual(["zak-mckracken-and-the-alien-mindbenders-1988"]);
  });

  it("strips a leading ordinal written with a closing paren", () => {
    expect(slugsOf(heading2(text("10) Another Game")))).toEqual([
      "another-game",
    ]);
  });

  it("leaves a legitimate leading year untouched (no trailing ordinal punctuation)", () => {
    expect(slugsOf(heading2(text("2024 in review")))).toEqual([
      "2024-in-review",
    ]);
  });

  it("keeps a heading that is only a number rather than collapsing to section", () => {
    expect(slugsOf(heading2(text("1988")))).toEqual(["1988"]);
  });

  it("collision-resolves two headings differing only by ordinal", () => {
    expect(
      slugsOf(heading2(text("1. Doom")), heading2(text("2. Doom"))),
    ).toEqual(["doom", "doom-1"]);
  });

  it("folds diacritics to ASCII", () => {
    expect(slugsOf(heading2(text("Café Culture")))).toEqual(["cafe-culture"]);
  });

  it("skips an empty heading node rather than emitting a section slug", () => {
    expect(slugsOf(heading2(text("")), heading2(text("Real heading")))).toEqual(
      ["real-heading"],
    );
  });

  it("flattens a heading with a nested inline hyperlink into its full text", () => {
    const headings = extractHeadings(
      docOf(heading2(text("See the "), link("https://example.com", "docs"))),
    );
    expect(headings).toEqual([{ text: "See the docs", slug: "see-the-docs" }]);
  });
});

// MIN_HEADINGS used to live in app/table-of-contents.tsx, a "use client"
// module. app/posts/[slug]/page.tsx (a server component) imported it from
// there for its own sidebar-margin decision, and a server component
// importing a plain value across a "use client" boundary gets a client
// reference rather than the value — headings.length >= MIN_HEADINGS compared
// a real number against undefined, silently false, so the margin never
// applied. Nothing failed loudly: no thrown error, no type error, just a
// missing CSS class in the rendered HTML.
//
// Comparing MIN_HEADINGS to itself would pass whether it holds 3 or
// undefined, so it proves nothing. This compares against the literal 3, and
// guards the file it lives in has no "use client" directive — the actual
// mechanism that turned a real number into a client reference — so either
// half of the regression fails the suite.
describe("MIN_HEADINGS", () => {
  it("is the real number 3, not a client reference resolved as undefined", () => {
    expect(MIN_HEADINGS).toBe(3);
  });

  it('lives in a module with no "use client" directive', () => {
    const source = readFileSync(join(process.cwd(), "lib/headings.ts"), {
      encoding: "utf-8",
    });
    expect(source).not.toMatch(/^\s*["']use client["']/m);
  });
});

const dummyHeadings = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    text: `Heading ${i}`,
    slug: `heading-${i}`,
  }));

// Literal 2 and 3 here, not MIN_HEADINGS - 1 and MIN_HEADINGS — comparing the
// predicate against a copy of its own threshold would pass whether that
// threshold is 3 or something else entirely. This pins the comparison itself.
describe("hasTableOfContents", () => {
  it("is false just below the threshold", () => {
    expect(hasTableOfContents(dummyHeadings(2))).toBe(false);
  });

  it("is true at the threshold", () => {
    expect(hasTableOfContents(dummyHeadings(3))).toBe(true);
  });
});
