import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawnSync, execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Runs scripts/vercel-ignore-build.sh against a throwaway repository, the way
// Vercel runs it. Exit 0 means skip and exit 1 means build, so every case here
// asserts one of those two codes. [→ `preview-on-request`]

const SCRIPT = path.join(__dirname, "..", "scripts", "vercel-ignore-build.sh");

// Isolated from the machine's own git config, so a global signing or hook
// setting cannot change what these commits do.
const GIT_ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_AUTHOR_NAME: "Test",
  GIT_AUTHOR_EMAIL: "test@example.com",
  GIT_COMMITTER_NAME: "Test",
  GIT_COMMITTER_EMAIL: "test@example.com",
};

let repo: string;

const git = (...args: string[]) =>
  execFileSync("git", args, {
    cwd: repo,
    env: GIT_ENV,
    encoding: "utf8",
  }).trim();

const commitFiles = (files: Record<string, string>) => {
  for (const [name, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(repo, name)), { recursive: true });
    fs.writeFileSync(path.join(repo, name), body);
  }
  git("add", "-A");
  git("commit", "-q", "-m", "change");
  return git("rev-parse", "HEAD");
};

const run = (env: Record<string, string>) =>
  spawnSync("bash", [SCRIPT], {
    cwd: repo,
    env: { ...GIT_ENV, ...env },
    encoding: "utf8",
  }).status;

const production = (previous: string) => ({
  VERCEL_ENV: "production",
  VERCEL_GIT_COMMIT_SHA: git("rev-parse", "HEAD"),
  VERCEL_GIT_PREVIOUS_SHA: previous,
});

beforeEach(() => {
  repo = fs.mkdtempSync(path.join(os.tmpdir(), "ignore-build-"));
  git("init", "-q");
  commitFiles({
    "app/page.tsx": "export default 1;\n",
    "CLAUDE.md": "rules\n",
    "README.md": "readme\n",
    "docs/decisions.md": "decisions\n",
    ".claude/skills/x/SKILL.md": "skill\n",
  });
});

afterEach(() => {
  fs.rmSync(repo, { recursive: true, force: true });
});

describe("previews", () => {
  it("skips a preview by default", () => {
    expect(
      run({ VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_MESSAGE: "fix: x" }),
    ).toBe(0);
  });

  it("builds a preview the commit message asks for", () => {
    expect(
      run({
        VERCEL_ENV: "preview",
        VERCEL_GIT_COMMIT_MESSAGE: "fix: x [preview]",
      }),
    ).toBe(1);
  });

  it("builds when VERCEL_ENV is missing, rather than guessing it is a preview", () => {
    expect(run({})).toBe(1);
  });
});

describe("production", () => {
  it("skips when only the four documentation paths changed", () => {
    const base = git("rev-parse", "HEAD");
    commitFiles({
      "CLAUDE.md": "rules, edited\n",
      "README.md": "readme, edited\n",
      "docs/decisions.md": "decisions, edited\n",
      ".claude/skills/x/SKILL.md": "skill, edited\n",
    });
    expect(run(production(base))).toBe(0);
  });

  it("builds when code changed", () => {
    const base = git("rev-parse", "HEAD");
    commitFiles({ "app/page.tsx": "export default 2;\n" });
    expect(run(production(base))).toBe(1);
  });

  it("builds when documentation and code changed together", () => {
    const base = git("rev-parse", "HEAD");
    commitFiles({
      "CLAUDE.md": "rules, edited\n",
      "app/page.tsx": "export default 2;\n",
    });
    expect(run(production(base))).toBe(1);
  });

  it.each(["docs.ts", "README.md.bak", ".claude-notes", "CLAUDE.md.orig"])(
    "builds for %s, which only shares a prefix with an excluded path",
    (name) => {
      // Known-bad control for the exclusion list, one file per case so each
      // stands alone. A looser match that swallowed any of these would skip a
      // real change.
      const base = git("rev-parse", "HEAD");
      commitFiles({ [name]: "changed\n" });
      expect(run(production(base))).toBe(1);
    },
  );

  it("builds a redeploy of the live commit", () => {
    expect(run(production(git("rev-parse", "HEAD")))).toBe(1);
  });

  it("builds when there is no earlier deployment to compare with", () => {
    expect(run(production(""))).toBe(1);
  });

  it("builds when the earlier deployment is not in the checkout", () => {
    commitFiles({ "CLAUDE.md": "rules, edited\n" });
    expect(run(production("0123456789abcdef0123456789abcdef01234567"))).toBe(1);
  });
});
