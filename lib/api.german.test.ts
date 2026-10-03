import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

import { getGermanPostSlugs } from "@/lib/api";

// de-DE has no fallback, so an untranslated post arrives with null fields.
// [→ `locale`]
const page = (items: unknown[]) =>
  new Response(
    JSON.stringify({
      data: { postCollection: { total: items.length, items } },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );

beforeEach(() => {
  vi.stubEnv("CONTENTFUL_SPACE_ID", "space123");
  vi.stubEnv("CONTENTFUL_ACCESS_TOKEN", "cda-token");
  vi.stubEnv("CONTENTFUL_PREVIEW_ACCESS_TOKEN", "cpa-token");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("getGermanPostSlugs", () => {
  it("keeps only posts with a German title and excerpt", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        page([
          { slug: "full", title: "Titel", excerpt: "Auszug" },
          { slug: "title-only", title: "Titel", excerpt: null },
          { slug: "untranslated", title: null, excerpt: null },
        ]),
      ),
    );

    await expect(getGermanPostSlugs(false)).resolves.toEqual(["full"]);
  });

  it("asks Contentful for de-DE", async () => {
    // Non-vacuous: without the locale argument every post would pass the filter.
    const fetchMock = vi.fn().mockResolvedValue(page([]));
    vi.stubGlobal("fetch", fetchMock);

    await getGermanPostSlugs(true);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.query).toContain('locale: "de-DE"');
  });
});
