import { describe, it, expect, vi } from "vitest";

// highlight.ts imports "server-only", which throws when evaluated outside a
// React Server Component. Stub it so the unit under test loads. (Same stub as
// lib/highlight.langs.test.ts.)
vi.mock("server-only", () => ({}));

import { highlightCodeBlocks } from "./highlight";
import type { Content } from "./types";

// Syntax highlighting arrives with colours of its own, so it is the one place
// on the site where text colour is not a palette token.
// lib/palette-contrast.test.ts recomputes ratios from the stylesheet and a
// theme colour never appears there, which is how min-dark shipped comments at
// 3.43:1 against its own ground and nothing in CI noticed.
//
// This recomputes the ratio from the markup the renderer actually emits, so it
// needs no known-bad control: a pattern that stopped matching would take the
// colours with it, and the assertion below fails on an empty set.
// [→ `shiki-comment-contrast`]

// The theme's own ground, set on the wrapper rather than per token, so it never
// appears in the token spans this reads.
const GROUND = "#1F1F1F";

// WCAG 2.1 SC 1.4.3 for text below the large-text threshold. Code is set well
// under it.
const FLOOR = 4.5;

function relativeLuminance(hex: string): number {
  const channels = [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)]
    .map((pair) => parseInt(pair, 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x,
  );
  return (hi + 0.05) / (lo + 0.05);
}

function highlightOne(language: string, code: string) {
  const content: Content = {
    json: { nodeType: "document", data: {}, content: [] } as Content["json"],
    links: {
      assets: { block: [] },
      entries: {
        block: [{ __typename: "CodeBlock", sys: { id: "b1" }, language, code }],
      },
    },
  };
  return highlightCodeBlocks(content).then((m) => m.get("b1") ?? "");
}

// One sample per grammar that renders a comment, because the comment colour is
// the dimmest the theme sets and so the first to fall below the floor.
const SAMPLES: [string, string][] = [
  ["typescript", "// a comment\nconst x: number = 1;"],
  ["tsx", "// a comment\nconst El = () => <p>hi</p>;"],
  ["javascript", "// a comment\nconst x = 1;"],
  ["jsx", "// a comment\nconst El = () => <p>hi</p>;"],
  ["css", "/* a comment */\n.a { color: red; }"],
  ["html", "<!-- a comment -->\n<p>hi</p>"],
  ["bash", "# a comment\necho hi"],
  ["yml", "# a comment\nkey: value"],
  ["json", '{ "key": "value" }'],
  ["markdown", "# Heading\n\nSome *text*."],
];

const coloursIn = (html: string) =>
  [...html.matchAll(/color:\s*(#[0-9a-fA-F]{6})/g)].map((m) =>
    m[1].toUpperCase(),
  );

describe("every colour the highlighter emits clears the contrast floor", () => {
  it.each(SAMPLES)("%s", async (language, code) => {
    const html = await highlightOne(language, code);
    const colours = [...new Set(coloursIn(html))].filter((c) => c !== GROUND);

    // Non-vacuous: an empty set would pass every assertion below it.
    expect(colours.length).toBeGreaterThan(0);

    const failing = colours
      .map((c) => [c, contrast(c, GROUND)] as const)
      .filter(([, ratio]) => ratio < FLOOR)
      .map(([c, ratio]) => `${c} at ${ratio.toFixed(2)}:1`);

    expect(failing).toEqual([]);
  });
});

describe("the comment replacement is doing the work it was added for", () => {
  it("emits the replacement rather than the theme's own comment colour", async () => {
    const html = await highlightOne("typescript", "// a comment\nconst x = 1;");
    const colours = coloursIn(html);

    // The theme's value, which fails at 3.43:1. Named here so that removing
    // the replacement is caught by the colour that comes back, not only by the
    // ratio.
    expect(colours).not.toContain("#6B737C");
    expect(colours).toContain("#858F9A");
  });

  it("keeps comments the dimmest thing in the block", async () => {
    // The replacement exists to clear the floor, not to flatten the theme. If
    // a future value overshoots, comments stop reading as secondary.
    const html = await highlightOne("typescript", "// a comment\nconst x = 1;");
    const ratios = [...new Set(coloursIn(html))]
      .filter((c) => c !== GROUND)
      .map((c) => contrast(c, GROUND));

    expect(Math.min(...ratios)).toBeCloseTo(contrast("#858F9A", GROUND), 5);
  });
});
