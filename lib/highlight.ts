import "server-only";
// Grammars and the theme are enumerated as individual module imports rather
// than pulled from the "shiki" convenience entry. That entry's langs bundle
// holds a runtime array of `() => import("@shikijs/langs/<id>")` dynamic
// imports, one per grammar — reachable at runtime, so no bundler can eliminate
// them, and Next's file tracer follows every one. It baked 260 TextMate
// grammars (~8.7 MB) into `.next/server/app/posts/[slug]/page.js.nft.json` —
// against the eleven languages and one theme this module ever loads. Adding a
// language here means adding an `@shikijs/langs/<name>` import beside its
// `LANGS` entry; miss the import and that language degrades to the
// `escapeHtml` fallback with no error.
// See docs/decisions.md, "Shiki grammars are imported one by one, never from
// the meta-package".
import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createOnigurumaEngine } from "shiki/engine/oniguruma";
import minDark from "@shikijs/themes/min-dark";
import bash from "@shikijs/langs/bash";
import css from "@shikijs/langs/css";
import html from "@shikijs/langs/html";
import javascript from "@shikijs/langs/javascript";
import json from "@shikijs/langs/json";
import jsx from "@shikijs/langs/jsx";
import markdown from "@shikijs/langs/markdown";
import tsx from "@shikijs/langs/tsx";
import typescript from "@shikijs/langs/typescript";
import yml from "@shikijs/langs/yml";
import type { CodeBlock, Content } from "./types";

const THEME = "min-dark"; // themes

// min-dark sets comments in #6B737C, which measures 3.43:1 against the theme's
// own #1F1F1F ground where WCAG AA asks 4.5:1 for body-sized text. Nothing in
// the repo could see it: lib/palette-contrast.test.ts recomputes ratios from
// the stylesheet, and a theme colour never appears there. An audit of the
// rendered site found it.
//
// Replaced at highlight time rather than overridden in CSS, which is Shiki's
// own mechanism for this and leaves no specificity argument behind. #858F9A is
// the same hue lifted until it clears the floor, at 5.02:1. It stays the
// dimmest token in the theme, the next being #F97583 at 6.20:1, so comments
// still read as secondary.
//
// Four other theme colours also fail against that ground and are deliberately
// left alone, because no code sample on the site renders them: #800080 at
// 1.75:1 (debug-token), #CD3131 at 3.20:1 (error-token), #316BCD at 3.23:1
// (info-token) and #1976D2 at 3.58:1 (markdown inline link). A sample that
// uses one is a new finding, not a regression of this.
// [→ `shiki-comment-contrast`]
const COLOR_REPLACEMENTS = { "#6b737c": "#858f9a" } as const;
// Exported for lib/highlight.langs.test.ts, which runs a snippet through every
// entry and asserts real theme markup comes back rather than the escapeHtml
// fallback. It is otherwise the internal allowlist highlightCodeBlocks checks a
// Contentful `language` value against.
export const LANGS = [
  "typescript",
  "tsx",
  "javascript",
  "jsx",
  "json",
  "bash",
  "css",
  "html",
  "markdown",
  "yml",
  "text",
] as const;

let highlighterPromise: Promise<HighlighterCore> | null = null;

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      themes: [minDark],
      // Ten grammars for eleven `LANGS` entries: "text" resolves inside core
      // and needs no grammar import. The other ten line up with LANGS by name
      // (`bash` and `yml` are aliases re-exporting `shellscript` and `yaml`).
      langs: [
        typescript,
        tsx,
        javascript,
        jsx,
        json,
        bash,
        css,
        html,
        markdown,
        yml,
      ],
      engine: createOnigurumaEngine(import("shiki/wasm")),
    }).catch((error) => {
      // Clear the slot before rethrowing. Caching the rejected promise meant a
      // single transient failure here poisoned every later post render for the
      // life of the process — the module-scope memo would keep handing back the
      // same rejection with nothing left to retry. Dropping it costs one repeat
      // attempt and restores the next request's chance of succeeding.
      highlighterPromise = null;
      throw error;
    });
  }
  return highlighterPromise;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function highlightCodeBlocks(
  content: Content,
): Promise<Map<string, string>> {
  const blocks = (content.links.entries?.block ?? []).filter(
    (b): b is CodeBlock => b.__typename === "CodeBlock",
  );
  if (blocks.length === 0) return new Map();

  const hl = await getHighlighter();
  const map = new Map<string, string>();

  for (const b of blocks) {
    const lang = (LANGS as readonly string[]).includes(b.language ?? "")
      ? (b.language as string)
      : "text";
    try {
      map.set(
        b.sys.id,
        hl.codeToHtml(b.code, {
          lang,
          theme: THEME,
          colorReplacements: COLOR_REPLACEMENTS,
        }),
      );
    } catch {
      map.set(
        b.sys.id,
        `<pre class="shiki"><code>${escapeHtml(b.code)}</code></pre>`,
      );
    }
  }

  return map;
}
