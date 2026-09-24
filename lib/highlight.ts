import "server-only";
// Grammars and the theme are imported one by one: the "shiki" entry made the
// tracer bundle 260 grammars. A new language needs its import beside its
// `LANGS` entry, or it silently renders unhighlighted. [→ `shiki-fine-grained`]
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

// min-dark's comment colour is 3.43:1 on its ground; this lifts it to 5.02:1.
// [→ `shiki-comment-contrast`]
const COLOR_REPLACEMENTS = { "#6b737c": "#858f9a" } as const;
// The allowlist a Contentful `language` is checked against.
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
      // "text" needs no grammar; bash and yml are alias modules.
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
      // Clear the memo, or one transient failure poisons every later render.
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
