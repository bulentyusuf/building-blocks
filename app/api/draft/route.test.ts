import { describe, it, expect, vi, beforeEach } from "vitest";

// Where a Contentful preview link lands. redirect() and draftMode() are Next
// runtime calls, so both are recorded through mocks and asserted directly.

vi.mock("server-only", () => ({}));

const redirect = vi.fn();
const enable = vi.fn();
const getPost = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => redirect(...args),
}));
vi.mock("next/headers", () => ({
  draftMode: async () => ({ enable }),
}));
vi.mock("@/lib/api", () => ({
  getPost: (...args: unknown[]) => getPost(...args),
}));

const { GET } = await import("./route");

const SECRET = "a-long-random-preview-secret";

function open(query: string) {
  return GET(new Request(`https://example.com/api/draft?${query}`));
}

beforeEach(() => {
  vi.stubEnv("CONTENTFUL_PREVIEW_SECRET", SECRET);
  redirect.mockClear();
  enable.mockClear();
  getPost.mockReset();
  getPost.mockResolvedValue({ slug: "some-post" });
});

describe("the draft preview route", () => {
  it("opens the English post when no locale is given", async () => {
    await open(`secret=${SECRET}&slug=some-post`);
    expect(enable).toHaveBeenCalledOnce();
    expect(redirect).toHaveBeenCalledWith("/posts/some-post");
  });

  it("opens the English post for en-GB", async () => {
    await open(`secret=${SECRET}&slug=some-post&locale=en-GB`);
    expect(redirect).toHaveBeenCalledWith("/posts/some-post");
  });

  it("opens the German post for de-DE", async () => {
    await open(`secret=${SECRET}&slug=some-post&locale=de-DE`);
    expect(enable).toHaveBeenCalledOnce();
    expect(redirect).toHaveBeenCalledWith("/de/posts/some-post");
  });

  it("treats a near miss as English, not German", async () => {
    // Known-bad control: only the exact code switches route.
    for (const locale of ["de", "DE-de", "de-DE-x"]) {
      redirect.mockClear();
      await open(`secret=${SECRET}&slug=some-post&locale=${locale}`);
      expect(redirect, locale).toHaveBeenCalledWith("/posts/some-post");
    }
  });

  it("refuses a wrong secret before touching draft mode", async () => {
    const response = await open("secret=nope&slug=some-post&locale=de-DE");
    expect(response?.status).toBe(401);
    expect(enable).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});
