import { describe, it, expect, vi } from "vitest";

// highlight.ts imports "server-only", which throws when evaluated outside a
// React Server Component. Stub it to an empty module so the unit under test
// loads. (Same stub as lib/blur.test.ts.)
vi.mock("server-only", () => ({}));

import { highlightCodeBlocks, LANGS } from "./highlight";
import type { Content } from "./types";

// Each grammar is a hand-wired `@shikijs/langs/<name>` import passed to
// createHighlighterCore. Drop one of those imports, or its entry in the
// constructor array, and nothing throws at build or boot: the language is still
// in LANGS, so highlightCodeBlocks calls codeToHtml with it, codeToHtml raises
// ShikiError for the unloaded grammar, the try/catch swallows it and the block
// renders through escapeHtml as an unstyled <pre class="shiki">. Nobody notices
// until a post ships with a grey code block.
//
// This guard runs a snippet through every LANGS entry and asserts the real
// min-dark markup came back. See docs/decisions.md, "Shiki grammars are
// imported one by one, never from the meta-package".

// One snippet per LANGS entry. Each of the nine real grammars must tokenise its
// snippet into at least one themed <span>; "text" has no grammar and stays
// plain (that asymmetry — nine grammars, ten LANGS — is the point of the
// separate `text` assertion below).
const SNIPPETS: Record<(typeof LANGS)[number], string> = {
  typescript: "const x: number = 1;",
  tsx: "const x = 1;",
  javascript: "const x = 1;",
  jsx: "const x = 1;",
  json: '{"a":1}',
  bash: "echo hello",
  css: "a{color:red}",
  html: "<p>hi</p>",
  markdown: "# hi",
  text: "hello",
};

// A themed token span: codeToHtml ran and the theme coloured a grammar token.
const THEMED_TOKEN = /<span style="[^"]*color:#[0-9a-fA-F]{3,8}/;
// The escapeHtml catch path in highlightCodeBlocks, verbatim shape.
const ESCAPE_FALLBACK = /^<pre class="shiki"><code>/;
// codeToHtml + theme ran at all (true for the nine grammars and for plain text).
const CORE_THEMED_PRE = /^<pre class="shiki min-dark" style="background-color:/;

function highlightOne(language: string, code: string) {
  const content: Content = {
    json: { nodeType: "document", data: {}, content: [] } as Content["json"],
    links: {
      assets: { block: [] },
      entries: {
        block: [
          {
            __typename: "CodeBlock",
            sys: { id: "b1" },
            language,
            code,
          },
        ],
      },
    },
  };
  return highlightCodeBlocks(content).then((m) => m.get("b1"));
}

const GRAMMAR_LANGS = LANGS.filter((l) => l !== "text");

describe("every LANGS grammar highlights through the hand-wired imports", () => {
  it.each(GRAMMAR_LANGS)(
    "%s emits themed markup, not the escapeHtml fallback",
    async (lang) => {
      const html = await highlightOne(lang, SNIPPETS[lang]);
      expect(html, `${lang} produced no output`).toBeTruthy();
      expect(html, `${lang} fell through to escapeHtml`).not.toMatch(
        ESCAPE_FALLBACK,
      );
      expect(html, `${lang} emitted no themed <span>`).toMatch(THEMED_TOKEN);
    },
  );

  it("text has no grammar and renders as plain text through core", async () => {
    const html = await highlightOne("text", SNIPPETS.text);
    expect(html).toMatch(CORE_THEMED_PRE);
    expect(html).not.toMatch(ESCAPE_FALLBACK);
    // No grammar, so no coloured token — this is why the constructor takes nine
    // langs for ten LANGS entries.
    expect(html).not.toMatch(THEMED_TOKEN);
  });
});

describe("known-bad control: the themed-token check is not vacuous", () => {
  it("a language absent from LANGS is downgraded to plain, not highlighted", async () => {
    // highlightCodeBlocks maps any unrecognised language to "text", so an
    // absent grammar can never masquerade as highlighted. If THEMED_TOKEN
    // started matching here, the positive assertions above would be worthless.
    expect((LANGS as readonly string[]).includes("python")).toBe(false);
    const html = await highlightOne("python", "import os");
    expect(html).not.toMatch(THEMED_TOKEN);
  });

  it("the escapeHtml fallback shape reads as unhighlighted", () => {
    const fallback = `<pre class="shiki"><code>${"x < y"}</code></pre>`;
    expect(fallback).toMatch(ESCAPE_FALLBACK);
    expect(fallback).not.toMatch(CORE_THEMED_PRE);
    expect(fallback).not.toMatch(THEMED_TOKEN);
  });
});
