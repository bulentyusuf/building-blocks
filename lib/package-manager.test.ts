import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Corepack writes a `packageManager` field into package.json the moment any
// yarn or pnpm command runs in this directory, and a stray agent run did
// exactly that on 5 September 2026. This is an npm repo: package-lock.json,
// no yarn.lock, `npm ci` in CI. Vercel honours `packageManager` and would
// switch installer on the strength of that line, resolving from a lockfile
// that does not exist. The field must never be committed.
const pkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"),
) as Record<string, unknown>;

describe("package.json declares no packageManager", () => {
  it("has no packageManager field", () => {
    expect(pkg.packageManager).toBeUndefined();
  });

  // Known-bad control: the check must actually detect the field it looks for.
  it("would catch the field if it were there", () => {
    expect(
      { ...pkg, packageManager: "yarn@1.22.22" }.packageManager,
    ).toBeDefined();
  });
});
