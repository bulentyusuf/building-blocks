import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";

// Tailwind scans source files for class-name candidates and cannot tell a
// comment from markup, so a utility named in prose under `app/` or `lib/`
// compiles into the bundle whether or not an element uses it. Survivable while
// the markup still uses it, dead CSS the day the markup changes and the
// sentence does not. [→ `tailwind-scanning`]
//
// lib/toc-active.test.ts guards one utility by name. This guards the rule for
// every utility, by compiling the stylesheet twice — once against the scanned
// tree, once against a comment-stripped mirror of it — and asserting the two
// produce the same rules. Anything surviving only the first pass is a rule the
// bundle carries because a sentence mentions it.
//
// Only `.ts` and `.tsx` are mirrored. `app/globals.css` is not scanned: Tailwind
// excludes the stylesheet hosting its own `@import`, so the utility name in its
// scroll-offset note is inert. [→ `tailwind-scanning`]

const ROOT = path.join(__dirname, "..");
const SCANNED_DIRS = ["app", "lib"];

function stripComments(source: string): string {
  let out = "";
  let i = 0;
  let state: "code" | "string" | "block" | "line" = "code";
  let quote = "";
  while (i < source.length) {
    const a = source[i];
    const b = source[i + 1] ?? "";
    if (state === "code") {
      if (a === '"' || a === "'" || a === "`") {
        state = "string";
        quote = a;
        out += a;
        i += 1;
        continue;
      }
      if (a === "/" && b === "*") {
        state = "block";
        i += 2;
        continue;
      }
      if (a === "/" && b === "/") {
        state = "line";
        i += 2;
        continue;
      }
      out += a;
      i += 1;
      continue;
    }
    if (state === "string") {
      if (a === "\\") {
        out += source.slice(i, i + 2);
        i += 2;
        continue;
      }
      if (a === quote) state = "code";
      out += a;
      i += 1;
      continue;
    }
    if (state === "block") {
      // Both characters of the closing delimiter. Advancing one re-reads the
      // slash in code state and injects a stray character per block comment.
      if (a === "*" && b === "/") {
        state = "code";
        i += 2;
        continue;
      }
      // Newlines survive so a failure's line numbers still mean something.
      if (a === "\n") out += "\n";
      i += 1;
      continue;
    }
    if (a === "\n") {
      state = "code";
      out += "\n";
      i += 1;
      continue;
    }
    i += 1;
  }
  return out;
}

function sourceFiles(): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry.name)) found.push(full);
    }
  };
  for (const dir of SCANNED_DIRS) walk(path.join(ROOT, dir));
  return found;
}

function mirrorTree(transform: (source: string) => string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tw-scan-"));
  for (const file of sourceFiles()) {
    const target = path.join(dir, path.relative(ROOT, file));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, transform(fs.readFileSync(file, "utf8")));
  }
  return dir;
}

// The real stylesheet, rewired to scan exactly one directory. `source(none)`
// turns off automatic detection so the only candidates are the ones in `dir`,
// which is what makes the two passes comparable: theme, plugins and base layers
// stay identical because the rest of the file is untouched.
async function compileScanning(dir: string): Promise<string> {
  const stylesheet = fs
    .readFileSync(path.join(ROOT, "app/globals.css"), "utf8")
    .replace(
      /@import\s+["']tailwindcss["'];/,
      `@import "tailwindcss" source(none);\n@source "${dir}";`,
    );
  const result = await postcss([tailwind({ optimize: false })]).process(
    stylesheet,
    { from: path.join(ROOT, "app/globals.css") },
  );
  return result.css;
}

// Ordinary English is out of scope, because contorting prose to avoid a word
// costs more than the few dozen bytes it saves. [→ `tailwind-scanning`]
//
// Two shapes qualify. Bare one-word utilities are words before they are classes,
// so comparing them reports a finding on every paragraph that says "shadow".
// And a few hyphenated ones are CSS property names a comment has every reason to
// spell, which the decision names outright.
//
// Widening this set is reopening that decision, so it happens in
// docs/decisions.md first.
const SPELLED_AS_ENGLISH = new Set(["text-wrap", "resize"]);
const CARRIES_A_VALUE = /[-:/[.]/;

function ruleSelectors(css: string): Set<string> {
  const matches = css.match(/(?:^|\n)\s*(\.[^{@\n]*?)\{/g) ?? [];
  return new Set(
    matches
      .map((match) => match.replace(/[\s{]+$/, "").trim())
      .filter((selector) => {
        const name = selector.slice(1);
        return CARRIES_A_VALUE.test(name) && !SPELLED_AS_ENGLISH.has(name);
      }),
  );
}

async function rulesOnlyCommentsProduce(
  seed: (source: string) => string = (source) => source,
): Promise<string[]> {
  const withComments = mirrorTree(seed);
  const withoutComments = mirrorTree(stripComments);
  try {
    const before = ruleSelectors(await compileScanning(withComments));
    const after = ruleSelectors(await compileScanning(withoutComments));
    return [...before].filter((rule) => !after.has(rule)).sort();
  } finally {
    fs.rmSync(withComments, { recursive: true, force: true });
    fs.rmSync(withoutComments, { recursive: true, force: true });
  }
}

describe("no Tailwind utility ships because a comment names it", () => {
  it("compiles the same rules with and without source comments", async () => {
    // Every entry here is a rule in the bundle that no element uses. Delete the
    // utility name from the comment naming it. A variant prefix is not a fix:
    // prose reading `md:grid-cols-2` still leaked a bare `grid-cols-2` rule.
    //
    // A clean run is necessary, not sufficient. Both passes share a scan root
    // narrower than `next build`'s, so this can under-report; the deployed
    // bundle settles it. [→ `tailwind-scanning`]
    expect(await rulesOnlyCommentsProduce()).toEqual([]);
  }, 30_000);

  it("detects a utility a comment is the only source of", async () => {
    // Known-bad control. The check above also passes on a broken stripper, a
    // mis-parsed stylesheet or a selector regex that has stopped matching, all
    // of which produce an empty diff. This proves the machinery still sees a
    // planted candidate.
    //
    // Assembled at runtime for the same reason toc-active's needle is: this
    // file sits under lib/, so a literal here would itself be scanned.
    const planted = "scroll-mt" + "-97";
    const found = await rulesOnlyCommentsProduce(
      (source) => `// ${planted}\n${source}`,
    );
    expect(found).toContain(`.${planted}`);
  }, 30_000);
});
