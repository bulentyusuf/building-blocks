import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const css = fs.readFileSync(
  path.join(__dirname, "..", "app/globals.css"),
  "utf8",
);

const keyframes = (name: string) =>
  new RegExp(`@keyframes ${name} \\{([\\s\\S]*?)\\n\\}`).exec(css)?.[1] ?? "";

// Arriving from the cover's prompt pill must never repaint the ink block's
// ground: a background keyframe replaces the fill with a pale wash under the
// white prompt, then snaps back when it ends. [→ `post-page`]
describe("the cover prompt's arrival cue", () => {
  const used = /#cover-prompt:target \{\s*animation: ([\w-]+)/.exec(css)?.[1];

  it("animates no background", () => {
    expect(used).toBeTruthy();
    const frames = keyframes(used!);
    expect(frames).toContain("box-shadow");
    expect(frames).not.toMatch(/background/);
  });

  it("would catch the heading flash, which does", () => {
    // Known-bad control. [→ `known-bad-controls`]
    expect(keyframes("target-flash")).toMatch(/background/);
  });
});
