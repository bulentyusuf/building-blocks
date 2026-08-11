import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Documentation drift, caught mechanically.
//
// CLAUDE.md, README.md and public/llms.txt carry a lot of prose about how the
// repo works, and prose is the only artefact here with no verification path:
// code has tsc, formatting has Prettier, behaviour has vitest, the two
// Contentful spaces have contentful-fixtures.test.ts. These checks cover the
// part of the prose that is mechanically checkable — the names of things.
//
// They deliberately do NOT try to verify claims. A sentence can name a real
// file and still describe it wrongly; only a reader catches that. What they
// stop is the cheaper failure: a rename or a removal quietly turning an
// instruction into a dead end.

const ROOT = path.join(__dirname, "..");
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

const DOCS = ["CLAUDE.md", "README.md"] as const;
const pkg = JSON.parse(read("package.json")) as {
  scripts: Record<string, string>;
};

describe("npm scripts named in the docs", () => {
  it.each(DOCS)("all exist in package.json (%s)", (doc) => {
    const text = read(doc);
    const named = new Set(
      [...text.matchAll(/npm run ([a-z][a-z0-9:-]*)/g)].map((m) => m[1]),
    );
    const missing = [...named].filter((s) => !pkg.scripts[s]);

    // A doc telling a forker to run a script that was renamed sends them
    // straight into an npm error on their first five minutes with the repo.
    expect(missing).toEqual([]);
  });
});

describe("file paths named in the docs", () => {
  it.each(DOCS)("all exist on disk (%s)", (doc) => {
    const text = read(doc);
    const paths = new Set(
      [
        ...text.matchAll(
          /`([a-zA-Z0-9_.\/\[\]-]+\.(?:tsx?|css|json|mjs|md|yml|txt))`/g,
        ),
      ]
        .map((m) => m[1])
        // Bare filenames are ambiguous (seed.json, package.json appear in prose
        // without a directory), and a path is only checkable if it says where.
        .filter((p) => p.includes("/"))
        // Route-ish and generated paths that are not committed files.
        .filter((p) => !p.startsWith("public/pagefind")),
    );
    const missing = [...paths].filter(
      (p) => !fs.existsSync(path.join(ROOT, p)),
    );

    expect(missing).toEqual([]);
  });
});

describe("the CI gate CLAUDE.md describes", () => {
  // CLAUDE.md said the gate was "`tsc --noEmit` + the vitest suite +
  // `npm run format:check`" while the workflow ran format:check, npm test and
  // npm run build, with no tsc step at all. Believing it means running a local
  // check that is not the gate and skipping the build that is.
  const workflow = read(".github/workflows/ci.yml");
  const commands = [...workflow.matchAll(/^\s+run: (.+)$/gm)]
    .map((m) => m[1].trim())
    // `npm ci` installs; it is setup, not a gate.
    .filter((c) => c !== "npm ci");

  it("names every command the workflow actually runs", () => {
    const claude = read("CLAUDE.md");
    const unmentioned = commands.filter((c) => !claude.includes(c));

    expect(unmentioned).toEqual([]);
  });

  it("is not describing a step the workflow dropped", () => {
    // The other direction: CLAUDE.md must not promise a gate that no longer
    // exists. tsc is the specific one that was wrong, and the sentence now
    // says explicitly that CI does not run it.
    const claude = read("CLAUDE.md");
    const gateSentence = /The CI gate is[^.]*\./.exec(claude)?.[0] ?? "";

    expect(gateSentence).not.toMatch(/tsc --noEmit`? \+/);
    expect(commands).toContain("npm run build");
  });
});

describe("the repo URL is the same everywhere", () => {
  it("matches SITE_REPO_URL across constants, README and llms.txt", () => {
    // The rename from nextjs-blog-draft-mode to building-blocks had to touch
    // four files. GitHub redirects the old URL, so a missed one keeps working
    // and stays wrong indefinitely — nothing would ever surface it.
    //
    // The pattern reaches past an environment override to the quoted default,
    // because that default is the canonical repository and is what these
    // documents describe; a deployment pointing its footer somewhere else says
    // nothing about them. It stops at the statement's semicolon so it cannot
    // wander into the next declaration if the override is ever removed.
    const constants = read("lib/constants.ts");
    const url = /SITE_REPO_URL\s*=[^;]*?["']([^"']+)["']/.exec(constants)?.[1];
    expect(url, "SITE_REPO_URL not found in lib/constants.ts").toBeTruthy();

    const repo = url!.replace(/\/$/, "");
    for (const doc of ["README.md", "public/llms.txt"]) {
      expect(read(doc), `${doc} does not reference ${repo}`).toContain(repo);
    }
  });

  it("leaves no reference to the pre-rename repo name", () => {
    // README.md line 5 is the deliberate exception: it links Vercel's upstream
    // TEMPLATE, vercel.com/templates/next.js/nextjs-blog-draft-mode, which is
    // their URL and not ours. Anything on github.com must be the new name.
    for (const doc of [...DOCS, "public/llms.txt"]) {
      const stale = [
        ...read(doc).matchAll(
          /github\.com\/[a-zA-Z0-9-]+\/nextjs-blog-draft-mode/g,
        ),
      ];
      expect(stale.map((m) => m[0])).toEqual([]);
    }
  });
});
