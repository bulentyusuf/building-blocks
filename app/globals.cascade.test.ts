import { readFileSync } from "node:fs";
import { join } from "node:path";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { describe, expect, it } from "vitest";

// The brand mapping in `@utility prose` wins only because Tailwind emits it
// after the typography plugin's own `.prose` defaults. That order is Tailwind's
// sort, not source order: adding `margin-inline` to the inline code rule once
// flipped it, and every post fell back to the plugin's slate. Only the
// compiled output shows this.
describe("prose colour cascade", () => {
  it("emits the brand mapping after the plugin's defaults", async () => {
    const root = process.cwd();
    const from = join(root, "app/globals.css");
    const { css } = await postcss([tailwind({ base: root })]).process(
      readFileSync(from, "utf8"),
      { from },
    );
    const values = [...css.matchAll(/--tw-prose-body:\s*([^;]+);/g)].map((m) =>
      m[1].trim(),
    );
    // Both the plugin's default and the brand value must be present, or the
    // order check below proves nothing.
    expect(values.length).toBeGreaterThanOrEqual(2);
    expect(values.at(-1)).toBe("var(--color-brand-dark)");
  }, 60_000);
});
