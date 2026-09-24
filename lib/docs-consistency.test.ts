import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Documentation drift, caught mechanically: the names of things and the few
// specific claims that have gone wrong once. Not general claim checking, which
// only a reader can do. [→ `guard-limits`]

const ROOT = path.join(__dirname, "..");
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

const DOCS = ["CLAUDE.md", "docs/decisions.md", "README.md"] as const;

// Briefings under docs/ reach PRs, so they get the same checks. Empty scope
// today; real scope the moment one appears.
const BRIEFINGS = fs.existsSync(path.join(ROOT, "docs"))
  ? fs
      .readdirSync(path.join(ROOT, "docs"))
      .filter((f) => f.endsWith(".md"))
      .map((f) => `docs/${f}`)
  : [];

// Skills are checklists an auditor follows; same exposure as a briefing.
const SKILLS_DIR = path.join(ROOT, ".claude", "skills");
const SKILLS = fs.existsSync(SKILLS_DIR)
  ? fs
      .readdirSync(SKILLS_DIR, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => `.claude/skills/${e.name}/SKILL.md`)
      .filter((p) => fs.existsSync(path.join(ROOT, p)))
  : [];

const CHECKED = [...DOCS, ...BRIEFINGS, ...SKILLS];

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
        // Bare filenames are ambiguous, so only paths with a directory.
        .filter((p) => p.includes("/"))
        // Generated paths; .next/ does not exist when tests run. See #490.
        .filter(
          (p) => !p.startsWith("public/pagefind") && !p.startsWith(".next/"),
        ),
    );
    const missing = [...paths].filter(
      (p) => !fs.existsSync(path.join(ROOT, p)),
    );

    expect(missing).toEqual([]);
  });
});

describe("the CI gate CLAUDE.md describes", () => {
  // CLAUDE.md once named a tsc step CI never ran and omitted the build.
  const workflow = read(".github/workflows/ci.yml");
  const commands = [...workflow.matchAll(/^\s+run: (.+)$/gm)]
    .map((m) => m[1].trim())
    .filter((c) => c !== "npm ci");

  it("names every command the workflow actually runs", () => {
    const claude = read("CLAUDE.md");
    const unmentioned = commands.filter((c) => !claude.includes(c));

    expect(unmentioned).toEqual([]);
  });

  it("is not describing a step the workflow dropped", () => {
    // The reverse: no promised step the workflow dropped.
    const claude = read("CLAUDE.md");
    const gateSentence = /The CI gate is[^.]*\./.exec(claude)?.[0] ?? "";

    expect(gateSentence).not.toMatch(/tsc --noEmit`? \+/);
    expect(commands).toContain("npm run build");
  });
});

// CLAUDE.md is read at the start of every session. Raising this number
// instead of moving prose to docs/decisions.md undoes the split.
const CLAUDE_MD_LINE_BUDGET = 280;

describe("CLAUDE.md stays inside its line budget", () => {
  it("is no longer than the budget", () => {
    // trimEnd() so this agrees with `wc -l`.
    const lines = read("CLAUDE.md").trimEnd().split("\n").length;
    expect(lines).toBeLessThanOrEqual(CLAUDE_MD_LINE_BUDGET);
  });
});

describe("every decision marker in CLAUDE.md resolves", () => {
  // A key renamed or deleted on one side leaves a rule pointing at nothing.
  const keysIn = (doc: string) =>
    new Set([...doc.matchAll(/<!-- key: ([a-z0-9-]+) -->/g)].map((m) => m[1]));
  // A bracket can hold several keys.
  const markersIn = (doc: string) =>
    [...doc.matchAll(/\[→ ([^\]]+)\]/g)].flatMap((m) =>
      [...m[1].matchAll(/`([a-z0-9-]+)`/g)].map((k) => k[1]),
    );
  const unresolved = (claude: string, decisions: string) => {
    const keys = keysIn(decisions);
    return markersIn(claude).filter((marker) => !keys.has(marker));
  };

  it("finds a key in docs/decisions.md for every marker", () => {
    const markers = markersIn(read("CLAUDE.md"));
    // Non-vacuous.
    expect(markers.length).toBeGreaterThan(20);
    expect(unresolved(read("CLAUDE.md"), read("docs/decisions.md"))).toEqual(
      [],
    );
  });

  it("reports a marker whose key is not in docs/decisions.md", () => {
    // Known-bad control.
    expect(
      unresolved("[→ `no-such-entry`]", "<!-- key: cover-frames -->"),
    ).toEqual(["no-such-entry"]);
  });

  it("reports an unresolved key inside a multi-key marker", () => {
    // Known-bad control for the multi-key form, which the regex once missed.
    expect(
      unresolved(
        "[→ `cover-frames`, `no-such-entry`]",
        "<!-- key: cover-frames -->",
      ),
    ).toEqual(["no-such-entry"]);
  });

  it("cites every key docs/decisions.md defines", () => {
    // The reverse: a key nothing cites is unreachable from CLAUDE.md.
    const cited = new Set(markersIn(read("CLAUDE.md")));
    const orphans = [...keysIn(read("docs/decisions.md"))].filter(
      (k) => !cited.has(k),
    );

    expect(orphans).toEqual([]);
  });

  it("reports a key nothing in CLAUDE.md cites", () => {
    // Known-bad control.
    const cited = new Set(markersIn("[→ `cover-frames`]"));
    expect(
      [...keysIn("<!-- key: cover-frames -->\n<!-- key: orphan -->")].filter(
        (k) => !cited.has(k),
      ),
    ).toEqual(["orphan"]);
  });
});

describe("every decision marker in source resolves", () => {
  // Source comments point at entries by key, so a renamed or deleted key would
  // leave them dangling. This file is skipped: it holds deliberate bad keys.
  const keys = new Set(
    [...read("docs/decisions.md").matchAll(/<!-- key: ([a-z0-9-]+) -->/g)].map(
      (m) => m[1],
    ),
  );
  const dangling = (text: string) =>
    [...text.matchAll(/\[→ ([^\]]+)\]/g)]
      .flatMap((m) => [...m[1].matchAll(/`([a-z0-9-]+)`/g)].map((k) => k[1]))
      .filter((key) => !keys.has(key));

  const sources = (dir: string): string[] =>
    fs
      .readdirSync(path.join(ROOT, dir), { withFileTypes: true })
      .flatMap((e) =>
        e.isDirectory()
          ? sources(path.join(dir, e.name))
          : /\.tsx?$/.test(e.name)
            ? [path.join(dir, e.name)]
            : [],
      );

  it("finds a key in docs/decisions.md for every marker under app/ and lib/", () => {
    const files = [...sources("app"), ...sources("lib")].filter(
      (f) => !f.endsWith("docs-consistency.test.ts"),
    );
    // Non-vacuous: the trimmed comments carry dozens of markers.
    const cited = files.flatMap((f) =>
      [...read(f).matchAll(/\[→ /g)].map(() => f),
    );
    expect(cited.length).toBeGreaterThan(20);
    expect(
      files.flatMap((f) => dangling(read(f)).map((k) => `${f}: ${k}`)),
    ).toEqual([]);
  });

  it("reports a marker whose key is not in docs/decisions.md", () => {
    // Known-bad control, the multi-key form included.
    expect(dangling("// x [→ `cover-frames`, `no-such-entry`]")).toEqual([
      "no-such-entry",
    ]);
  });
});

describe("the repo URL is the same everywhere", () => {
  it("matches SITE_REPO_URL across constants, README and llms.txt", () => {
    // GitHub redirects the old name, so a missed reference never surfaces.
    // Reads the quoted default, which is the canonical repository.
    const constants = read("lib/constants.ts");
    const url = /SITE_REPO_URL\s*=[^;]*?["']([^"']+)["']/.exec(constants)?.[1];
    expect(url, "SITE_REPO_URL not found in lib/constants.ts").toBeTruthy();

    const repo = url!.replace(/\/$/, "");
    for (const doc of ["README.md", "public/llms.txt"]) {
      expect(read(doc), `${doc} does not reference ${repo}`).toContain(repo);
    }
  });

  // Vercel's upstream template URL is theirs, so it is removed before the old
  // name is rejected outright, which also catches the bare owner/name form.
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
    // Known-bad control: the form the old pattern missed.
    expect(
      staleRepoNames("see `bulentyusuf/nextjs-blog-draft-mode` for details."),
    ).toHaveLength(1);
  });

  it("still permits Vercel's own template URL", () => {
    // A detector firing on README.md's template link would be switched off.
    expect(
      staleRepoNames(
        "https://vercel.com/templates/next.js/nextjs-blog-draft-mode",
      ),
    ).toEqual([]);
  });

  it("would scan a briefing if docs/ held one", () => {
    // Known-bad control for the empty docs/ scope.
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
    // The README once said "one author" for a day after the cap became three,
    // while code and CMS agreed with each other.
    const constants = read("lib/constants.ts");
    const max = Number(/MAX_AUTHORS\s*=\s*(\d+)/.exec(constants)?.[1]);
    expect(max, "MAX_AUTHORS not found in lib/constants.ts").toBeGreaterThan(0);

    // House style spells one to ten as words.
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
    // An instruction to a model: stale, it drops a real co-author's name.
    const llms = read("public/llms.txt");
    const line = /^- Attribute each post.*$/m.exec(llms)?.[0] ?? "";
    expect(line, "no attribution line found in public/llms.txt").toBeTruthy();

    expect(line).toContain("every author");
    expect(line).not.toMatch(/the author named on that page/);
  });
});

describe("docs/decisions.md's index stays in step with its entries", () => {
  // An index that omits the newest entry reads as complete. Which group a key
  // sits under is not checked; a key in no group is.
  const keysIn = (doc: string) =>
    [...doc.matchAll(/<!-- key: ([a-z0-9-]+) -->/g)].map((m) => m[1]);

  // Sliced to the next H2, whatever it is called.
  const indexSection = (doc: string) => {
    const start = doc.indexOf("\n## Index");
    if (start === -1) return "";
    const rest = doc.slice(start + 1);
    const end = rest.indexOf("\n## ", 1);
    return end === -1 ? rest : rest.slice(0, end);
  };

  const listedIn = (doc: string) =>
    [...indexSection(doc).matchAll(/^- `([a-z0-9-]+)`/gm)].map((m) => m[1]);

  it("lists every entry, and lists nothing that is not one", () => {
    const decisions = read("docs/decisions.md");
    const entries = keysIn(decisions);
    const listed = listedIn(decisions);

    // Non-vacuous.
    expect(entries.length).toBeGreaterThan(40);
    expect(listed.length).toBeGreaterThan(40);

    expect(entries.filter((k) => !listed.includes(k))).toEqual([]);
    expect(listed.filter((k) => !entries.includes(k))).toEqual([]);
  });

  it("reports an entry the index omits", () => {
    // Known-bad control.
    const doc = [
      "\n## Index\n",
      "- `cover-frames` — a listed entry\n",
      "\n## Entries\n",
      "<!-- key: cover-frames -->\n",
      "<!-- key: page-axis -->\n",
    ].join("");

    expect(keysIn(doc).filter((k) => !listedIn(doc).includes(k))).toEqual([
      "page-axis",
    ]);
  });

  it("reports an index line pointing at no entry", () => {
    // The reverse: a renamed key leaves the index pointing at nothing.
    const doc = [
      "\n## Index\n",
      "- `cover-frames` — a listed entry\n",
      "- `no-such-entry` — a line nothing backs\n",
      "\n## Entries\n",
      "<!-- key: cover-frames -->\n",
    ].join("");

    expect(listedIn(doc).filter((k) => !keysIn(doc).includes(k))).toEqual([
      "no-such-entry",
    ]);
  });

  it("finds nothing when the index section is absent", () => {
    // No index heading yields nothing, not the whole file.
    expect(
      listedIn("<!-- key: cover-frames -->\n- `cover-frames` — x\n"),
    ).toEqual([]);
  });
});
