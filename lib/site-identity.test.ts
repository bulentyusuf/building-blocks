import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// SITE_TITLE and SITE_DESCRIPTION take an environment override so demo-site can
// name itself without diverging from main; lib/constants.ts carries the full
// argument. What this guards is the resolution, which has one trap in it.
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
    const { SITE_TITLE, SITE_DESCRIPTION } = await loadConstants({
      NEXT_PUBLIC_SITE_TITLE: undefined,
      NEXT_PUBLIC_SITE_DESCRIPTION: undefined,
    });

    expect(SITE_TITLE).toBe("Be Useful.");
    expect(SITE_DESCRIPTION).toBe(
      "Content & Code, with a little help from Generative AI.",
    );
  });

  it("takes both overrides when they are set", async () => {
    const { SITE_TITLE, SITE_DESCRIPTION } = await loadConstants({
      NEXT_PUBLIC_SITE_TITLE: "Your Next Blog Template",
      NEXT_PUBLIC_SITE_DESCRIPTION: "A starter blog.",
    });

    expect(SITE_TITLE).toBe("Your Next Blog Template");
    expect(SITE_DESCRIPTION).toBe("A starter blog.");
  });

  // The known-bad control for the `??` tidy: both of these pass under `||` and
  // fail under `??`, so the guard is re-proven rather than merely present.
  it("falls back on an empty value rather than rendering nothing", async () => {
    const { SITE_TITLE } = await loadConstants({
      NEXT_PUBLIC_SITE_TITLE: "",
    });

    expect(SITE_TITLE).toBe("Be Useful.");
  });

  it("falls back on a whitespace-only value", async () => {
    const { SITE_TITLE } = await loadConstants({
      NEXT_PUBLIC_SITE_TITLE: "   ",
    });

    expect(SITE_TITLE).toBe("Be Useful.");
  });

  it("trims a configured value rather than passing padding through", async () => {
    const { SITE_TITLE } = await loadConstants({
      NEXT_PUBLIC_SITE_TITLE: "  Padded Name  ",
    });

    expect(SITE_TITLE).toBe("Padded Name");
  });
});
