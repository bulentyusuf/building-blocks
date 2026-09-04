import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Documentation drift, caught mechanically.
//
// CLAUDE.md, README.md and public/llms.txt carry a lot of prose about how the
// repo works, and prose is the only artefact here with no verification path:
// code has tsc, formatting has Prettier, behaviour has vitest, the two
// Contentful spaces have contentful-fixtures.test.ts. These checks cover the
// part of the prose that is mechanically checkable — the names of things, and
// the handful of specific claims that have already gone wrong once.
//
// They do NOT attempt general claim verification, which only a reader catches:
// a sentence can name a real file or state a plausible number and still describe
// it wrongly. What they stop is the cheaper failure: a rename, a removal, or a
// schema flip quietly turning an instruction into a dead end.

const ROOT = path.join(__dirname, "..");
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

const DOCS = ["CLAUDE.md", "docs/decisions.md", "README.md"] as const;

// Anything under docs/ is a briefing an implementer reads before writing code,
// so a dead path or a stale repo name there does not merely mislead a reader,
// it reaches a PR. That happened once: de-localisation-briefing.md landed on
// main naming the pre-rename repo, and none of these checks looked at the
// directory. The directory was later removed, which is why this is guarded
// rather than unconditional. It is empty scope today and real scope the moment
// a doc reappears, which is the point.
const BRIEFINGS = fs.existsSync(path.join(ROOT, "docs"))
  ? fs
      .readdirSync(path.join(ROOT, "docs"))
      .filter((f) => f.endsWith(".md"))
      .map((f) => `docs/${f}`)
  : [];

const CHECKED = [...DOCS, ...BRIEFINGS];

const pkg = JSON.parse(read("package.json")) as {
  scripts: Record<string, string>;
};

describe("npm scripts named in the docs", () => {
  it.each(CHECKED)("all exist in package.json (%s)", (doc) => {
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
  it.each(CHECKED)("all exist on disk (%s)", (doc) => {
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

// CLAUDE.md is read in full at the start of every Claude Code session, so its
// length is a running cost rather than a style preference. It reached 1,734
// lines before the split that produced docs/decisions.md, at which point the
// reasoning moved out and this budget went in to keep it out. An entry that
// cannot be stated in a few lines belongs in docs/decisions.md with a marker
// pointing at it; raising this number instead is how the split gets undone.
const CLAUDE_MD_LINE_BUDGET = 320;

describe("CLAUDE.md stays inside its line budget", () => {
  it("is no longer than the budget", () => {
    const lines = read("CLAUDE.md").split("\n").length;
    expect(lines).toBeLessThanOrEqual(CLAUDE_MD_LINE_BUDGET);
  });
});

describe("every decision marker in CLAUDE.md resolves", () => {
  // CLAUDE.md cites docs/decisions.md by key rather than by heading text, so a
  // heading can be reworded without breaking the link. What it cannot survive
  // is the entry being deleted or the key being renamed on one side only —
  // which leaves a short rule pointing at nothing, and no reader any way to
  // find the argument. This is the check that the split does not rot.
  const keysIn = (doc: string) =>
    new Set([...doc.matchAll(/<!-- key: ([a-z0-9-]+) -->/g)].map((m) => m[1]));
  const markersIn = (doc: string) =>
    [...doc.matchAll(/\[→ `([a-z0-9-]+)`\]/g)].map((m) => m[1]);
  const unresolved = (claude: string, decisions: string) => {
    const keys = keysIn(decisions);
    return markersIn(claude).filter((marker) => !keys.has(marker));
  };

  it("finds a key in docs/decisions.md for every marker", () => {
    const markers = markersIn(read("CLAUDE.md"));
    // Non-vacuous: an empty marker list would pass the filter below trivially.
    expect(markers.length).toBeGreaterThan(20);
    expect(unresolved(read("CLAUDE.md"), read("docs/decisions.md"))).toEqual(
      [],
    );
  });

  it("reports a marker whose key is not in docs/decisions.md", () => {
    // Known-bad control. A key removed from docs/decisions.md must surface as
    // an unresolved marker rather than passing quietly.
    expect(
      unresolved("[→ `no-such-entry`]", "<!-- key: cover-frames -->"),
    ).toEqual(["no-such-entry"]);
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

  // README.md line 5 is the deliberate exception: it links Vercel's upstream
  // TEMPLATE, vercel.com/templates/next.js/nextjs-blog-draft-mode, which is
  // their URL and not ours. The old check carved that out by requiring a
  // github.com prefix, which made it blind to the bare `owner/name` form —
  // exactly the form that once shipped undetected in a since-removed planning
  // doc under docs/. Removing Vercel's URL first and then rejecting the name
  // outright is both stricter and narrower.
  const VERCEL_TEMPLATE_URL =
    "vercel.com/templates/next.js/nextjs-blog-draft-mode";
  const staleRepoNames = (text: string) =>
    [
      ...text
        .split(VERCEL_TEMPLATE_URL)
        .join("")
        .matchAll(/nextjs-blog-draft-mode/g),
    ].map((m) => m[0]);

  it("leaves no reference to the pre-rename repo name", () => {
    for (const doc of [...CHECKED, "public/llms.txt"]) {
      expect(staleRepoNames(read(doc)), `${doc} names the old repo`).toEqual(
        [],
      );
    }
  });

  it("catches the bare owner/name form", () => {
    // Known-bad control. This is the shape of reference the github.com-prefixed
    // pattern used to miss.
    expect(
      staleRepoNames("see `bulentyusuf/nextjs-blog-draft-mode` for details."),
    ).toHaveLength(1);
  });

  it("still permits Vercel's own template URL", () => {
    // The other direction. A detector that fires on README.md line 5 would be
    // turned off within a week.
    expect(
      staleRepoNames(
        "https://vercel.com/templates/next.js/nextjs-blog-draft-mode",
      ),
    ).toEqual([]);
  });

  it("would scan a briefing if docs/ held one", () => {
    // The scan is empty scope right now, so nothing above proves it works.
    // This drives the same filter over a fixture listing rather than the real
    // directory, which is the only way to tell "docs/ is clean" apart from
    // "docs/ is not being read".
    const listing = ["de-localisation-briefing.md", "notes.txt", "README.md"];
    const scanned = listing
      .filter((f) => f.endsWith(".md"))
      .map((f) => `docs/${f}`);

    expect(scanned).toEqual([
      "docs/de-localisation-briefing.md",
      "docs/README.md",
    ]);
  });
});

describe("the author cap is the same everywhere", () => {
  it("matches MAX_AUTHORS across constants and README", () => {
    // The README told forkers a post links to "one author and one category"
    // for the whole of the day the field became an array of three. Nothing
    // surfaced it: the schema check in contentful-fixtures.test.ts pins
    // MAX_AUTHORS to the Contentful validation, and the GraphQL limit reads
    // the same constant, so code and CMS agreed with each other while the
    // document describing them to a forker was wrong.
    const constants = read("lib/constants.ts");
    const max = Number(/MAX_AUTHORS\s*=\s*(\d+)/.exec(constants)?.[1]);
    expect(max, "MAX_AUTHORS not found in lib/constants.ts").toBeGreaterThan(0);

    // House style spells out one to ten, so the prose carries the word and
    // not the numeral. Falling back to the digit keeps the check working if
    // the cap ever goes past ten, where the style rule flips anyway.
    const words = [
      "zero",
      "one",
      "two",
      "three",
      "four",
      "five",
      "six",
      "seven",
      "eight",
      "nine",
      "ten",
    ];
    const word = words[max] ?? String(max);

    expect(
      read("README.md"),
      `README.md does not state the cap as "up to ${word} authors"`,
    ).toContain(`up to ${word} authors`);
  });
});

describe("llms.txt attribution guidance", () => {
  it("does not send a model looking for a single author", () => {
    // This is an instruction, not a description, so a stale version does not
    // merely misinform, it makes a model drop a real co-author's name. The
    // link checker in llms-link-check.yml verifies the URLs in this file and
    // nothing verifies the sentences.
    const llms = read("public/llms.txt");
    const line = /^- Attribute each post.*$/m.exec(llms)?.[0] ?? "";
    expect(line, "no attribution line found in public/llms.txt").toBeTruthy();

    expect(line).toContain("every author");
    expect(line).not.toMatch(/the author named on that page/);
  });
});
