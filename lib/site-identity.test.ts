import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Four constants take an environment override so demo-site can name and place
// itself without diverging from main — title, description, footer blurb and
// repo URL; lib/constants.ts carries the full argument. What this guards is the
// resolution, which has one trap in it, plus SITE_AUTHOR staying outside the
// group.
//
// The override is `process.env.X?.trim() || fallback`, and the obvious tidy is
// `process.env.X ?? fallback`. That reads as equivalent and is not: an unset
// variable on Vercel is frequently an empty string rather than undefined, and
// `??` only catches nullish, so the site would render an empty masthead instead
// of falling back. The whitespace case is the same defect one space along.
//
// Constants resolve once at module scope, so each case needs the environment
// set before the import and the module registry cleared between them.

async function loadConstants(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) vi.stubEnv(key, "");
    else vi.stubEnv(key, value);
  }
  return import("./constants");
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("site identity overrides", () => {
  it("falls back to the names in code when nothing is configured", async () => {
    const { SITE_TITLE, SITE_DESCRIPTION, SITE_FOOTER_BLURB, SITE_REPO_URL } =
      await loadConstants({
        NEXT_PUBLIC_SITE_TITLE: undefined,
        NEXT_PUBLIC_SITE_DESCRIPTION: undefined,
        NEXT_PUBLIC_SITE_FOOTER_BLURB: undefined,
        NEXT_PUBLIC_SITE_REPO_URL: undefined,
      });

    expect(SITE_TITLE).toBe("Be Useful.");
    expect(SITE_DESCRIPTION).toBe(
      "Content & Code, with a little help from Generative AI.",
    );
    expect(SITE_FOOTER_BLURB).toContain("Munich");
    expect(SITE_REPO_URL).toBe(
      "https://github.com/bulentyusuf/building-blocks",
    );
  });

  it("takes every override when they are set", async () => {
    const { SITE_TITLE, SITE_DESCRIPTION, SITE_FOOTER_BLURB, SITE_REPO_URL } =
      await loadConstants({
        NEXT_PUBLIC_SITE_TITLE: "Your Next Blog Template",
        NEXT_PUBLIC_SITE_DESCRIPTION: "A starter blog.",
        NEXT_PUBLIC_SITE_FOOTER_BLURB: "A template you can fork.",
        NEXT_PUBLIC_SITE_REPO_URL: "https://github.com/example/fork",
      });

    expect(SITE_TITLE).toBe("Your Next Blog Template");
    expect(SITE_DESCRIPTION).toBe("A starter blog.");
    expect(SITE_FOOTER_BLURB).toBe("A template you can fork.");
    expect(SITE_REPO_URL).toBe("https://github.com/example/fork");
  });

  // SITE_AUTHOR is not overridable by design; this fails if it ever quietly
  // joins the group without that decision being revisited.
  it("leaves SITE_AUTHOR fixed in code", async () => {
    const { SITE_AUTHOR } = await loadConstants({
      NEXT_PUBLIC_SITE_AUTHOR: "Someone Else",
    });

    expect(SITE_AUTHOR).toBe("Bulent Yusuf");
  });

  // The known-bad control for the `??` tidy: these pass under `||` and fail
  // under `??`, so the guard is re-proven rather than merely present. All four
  // constants are asserted rather than a representative one, because the tidy
  // is applied per declaration and would otherwise go uncaught on three of them.
  it("falls back on an empty value rather than rendering nothing", async () => {
    const { SITE_TITLE, SITE_DESCRIPTION, SITE_FOOTER_BLURB, SITE_REPO_URL } =
      await loadConstants({
        NEXT_PUBLIC_SITE_TITLE: "",
        NEXT_PUBLIC_SITE_DESCRIPTION: "",
        NEXT_PUBLIC_SITE_FOOTER_BLURB: "",
        NEXT_PUBLIC_SITE_REPO_URL: "",
      });

    expect(SITE_TITLE).toBe("Be Useful.");
    expect(SITE_DESCRIPTION).toContain("Generative AI");
    expect(SITE_FOOTER_BLURB).toContain("Munich");
    expect(SITE_REPO_URL).toBe(
      "https://github.com/bulentyusuf/building-blocks",
    );
  });

  it("falls back on a whitespace-only value", async () => {
    const { SITE_TITLE, SITE_DESCRIPTION, SITE_FOOTER_BLURB, SITE_REPO_URL } =
      await loadConstants({
        NEXT_PUBLIC_SITE_TITLE: "   ",
        NEXT_PUBLIC_SITE_DESCRIPTION: "   ",
        NEXT_PUBLIC_SITE_FOOTER_BLURB: "   ",
        NEXT_PUBLIC_SITE_REPO_URL: "   ",
      });

    expect(SITE_TITLE).toBe("Be Useful.");
    expect(SITE_DESCRIPTION).toContain("Generative AI");
    expect(SITE_FOOTER_BLURB).toContain("Munich");
    expect(SITE_REPO_URL).toBe(
      "https://github.com/bulentyusuf/building-blocks",
    );
  });

  it("trims a configured value rather than passing padding through", async () => {
    const { SITE_TITLE } = await loadConstants({
      NEXT_PUBLIC_SITE_TITLE: "  Padded Name  ",
    });

    expect(SITE_TITLE).toBe("Padded Name");
  });
});
