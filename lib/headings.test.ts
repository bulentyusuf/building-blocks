import { describe, it, expect } from "vitest";
import { BLOCKS } from "@contentful/rich-text-types";
import type { Document } from "@contentful/rich-text-types";
import { extractHeadings, hasTableOfContents, MIN_HEADINGS } from "./headings";
import type { Heading } from "./headings";

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

// app/posts/[slug]/page.tsx asks this the same question
// table-of-contents.tsx asks itself in its render guard, rather than
// restating the length check inverted. If the two ever drift, the sidebar's
// margin and the TOC's own render decision disagree — this is what would
// catch that.
describe("hasTableOfContents", () => {
  const heading = (n: number): Heading => ({
    text: `Heading ${n}`,
    slug: `heading-${n}`,
  });

  // The two tests below derive their fixtures from MIN_HEADINGS itself, so
  // they'd stay green even if the constant changed value entirely. This
  // pins the value the rest of this file, and the brief, assume.
  it("is 3", () => {
    expect(MIN_HEADINGS).toBe(3);
  });

  it("is false just below MIN_HEADINGS", () => {
    const headings = Array.from({ length: MIN_HEADINGS - 1 }, (_, i) =>
      heading(i),
    );
    expect(hasTableOfContents(headings)).toBe(false);
  });

  it("is true at and above MIN_HEADINGS", () => {
    const headings = Array.from({ length: MIN_HEADINGS }, (_, i) => heading(i));
    expect(hasTableOfContents(headings)).toBe(true);
    expect(hasTableOfContents([...headings, heading(MIN_HEADINGS)])).toBe(true);
  });
});
