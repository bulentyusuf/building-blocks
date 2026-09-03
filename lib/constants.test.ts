import { describe, it, expect, vi, afterEach } from "vitest";

// SITE_URL is resolved at module load, so each case needs a fresh module
// registry rather than a re-read of the export.
async function loadSiteUrl(
  env: Partial<Record<string, string>>,
): Promise<string> {
  vi.resetModules();
  // An empty string is how the resolver sees "unset", since it trims first.
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", env.NEXT_PUBLIC_SITE_URL ?? "");
  vi.stubEnv(
    "VERCEL_PROJECT_PRODUCTION_URL",
    env.VERCEL_PROJECT_PRODUCTION_URL ?? "",
  );
  if (env.NODE_ENV) vi.stubEnv("NODE_ENV", env.NODE_ENV);
  const mod = await import("@/lib/constants");
  return mod.SITE_URL;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("SITE_URL", () => {
  it("prefers the configured site URL", async () => {
    await expect(
      loadSiteUrl({
        NEXT_PUBLIC_SITE_URL: "https://example.com",
        VERCEL_PROJECT_PRODUCTION_URL: "ignored.vercel.app",
      }),
    ).resolves.toBe("https://example.com");
  });

  it("strips a trailing slash from the configured value", async () => {
    await expect(
      loadSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://example.com/" }),
    ).resolves.toBe("https://example.com");
  });

  it("treats a whitespace-only value as unset", async () => {
    await expect(
      loadSiteUrl({
        NEXT_PUBLIC_SITE_URL: "   ",
        VERCEL_PROJECT_PRODUCTION_URL: "demo.vercel.app",
      }),
    ).resolves.toBe("https://demo.vercel.app");
  });

  it("falls back to the Vercel production domain with a scheme added", async () => {
    await expect(
      loadSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "demo.vercel.app" }),
    ).resolves.toBe("https://demo.vercel.app");
  });

  it("does not double up the scheme if one is already present", async () => {
    await expect(
      loadSiteUrl({
        VERCEL_PROJECT_PRODUCTION_URL: "https://demo.vercel.app/",
      }),
    ).resolves.toBe("https://demo.vercel.app");
  });

  it("adds a scheme to a bare domain", async () => {
    // A bare domain reached metadataBase in app/layout.tsx as-is and threw
    // ERR_INVALID_URL at build time, naming neither the variable nor the value.
    await expect(
      loadSiteUrl({ NEXT_PUBLIC_SITE_URL: "nextblog.net" }),
    ).resolves.toBe("https://nextblog.net");
  });

  it("preserves an explicit http scheme", async () => {
    // Forcing https here would break a configured http://localhost:3000.
    await expect(
      loadSiteUrl({ NEXT_PUBLIC_SITE_URL: "http://localhost:3000" }),
    ).resolves.toBe("http://localhost:3000");
  });

  it("ignores an unparsable configured value and warns", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(
      loadSiteUrl({
        NEXT_PUBLIC_SITE_URL: "https://exa mple.com",
        VERCEL_PROJECT_PRODUCTION_URL: "demo.vercel.app",
      }),
    ).resolves.toBe("https://demo.vercel.app");
    expect(warn.mock.calls[0][0]).toMatch(/NEXT_PUBLIC_SITE_URL/);
  });

  it("warns about an unparsable configured value outside production too", async () => {
    // Unlike the localhost fallback, a bad value is never expected.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await loadSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://exa mple.com" });
    expect(warn).toHaveBeenCalled();
  });

  it("falls back to localhost when neither is set", async () => {
    await expect(loadSiteUrl({})).resolves.toBe("http://localhost:3000");
  });

  it("warns on the localhost fallback in a production build", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await loadSiteUrl({ NODE_ENV: "production" });
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toMatch(/NEXT_PUBLIC_SITE_URL/);
  });

  it("stays quiet on the localhost fallback outside production", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await loadSiteUrl({});
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("SITE_HOSTNAME", () => {
  it("tracks the resolved site URL", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com");
    const mod = await import("@/lib/constants");
    // renderHyperlink judges a rich-text link internal or external against
    // this, so a regression here silently flips every absolute link in a post
    // body to the other treatment. (AUTHOR_EMAIL was derived from it too,
    // until inferring an address was dropped — see its note in constants.ts.)
    expect(mod.SITE_HOSTNAME).toBe("example.com");
  });
});

describe("AUTHOR_EMAIL", () => {
  it("is empty unless the deployment sets one", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com");
    const mod = await import("@/lib/constants");
    // The known-bad control for the derived form this replaced: with a site
    // URL and nothing else, the old constant returned contact@example.com and
    // the feed published it in every item. Asserting on the hostname rather
    // than on "" alone is what keeps this from passing for the wrong reason.
    expect(mod.AUTHOR_EMAIL).toBe("");
    expect(mod.AUTHOR_EMAIL).not.toContain("example.com");
  });

  it("takes the address when one is configured", async () => {
    vi.resetModules();
    vi.stubEnv("AUTHOR_EMAIL", "  hello@example.com  ");
    const mod = await import("@/lib/constants");
    // Trimmed for the same reason every other constant here is: a trailing
    // newline pasted into a host's environment UI is the common failure.
    expect(mod.AUTHOR_EMAIL).toBe("hello@example.com");
  });
});
