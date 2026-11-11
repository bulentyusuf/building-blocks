import { describe, it, expect, vi } from "vitest";

// A slug with no post 404s. A failed fetch still renders the site card.

const getPost = vi.fn();
vi.mock("@/lib/api", () => ({
  getPost: (...args: unknown[]) => getPost(...args),
}));
// The status is the subject, not the PNG; opengraph-image.font.test.tsx owns
// the real render.
vi.mock("next/og", () => ({
  ImageResponse: class extends Response {
    constructor(_element: unknown, init: ResponseInit) {
      super("card", { headers: init.headers });
    }
  },
}));

const { default: OpengraphImage } = await import("./opengraph-image");

const card = async () =>
  (await OpengraphImage({
    params: Promise.resolve({ slug: "x" }),
  })) as Response;

const status = async () => (await card()).status;

describe("the post OG card's status", () => {
  it("is 404 for a slug with no post", async () => {
    getPost.mockResolvedValueOnce(undefined);
    expect(await status()).toBe(404);
  });

  it("is 200 when the fetch fails, which falls back to the site card", async () => {
    getPost.mockRejectedValueOnce(new Error("Contentful down"));
    expect(await status()).toBe(200);
  });

  it("is 200 for a real post", async () => {
    // Known-bad control: a check that 404'd everything would fail here.
    getPost.mockResolvedValueOnce({
      title: "A post",
      authorsCollection: { items: [] },
    });
    expect(await status()).toBe(200);
  });
});

describe("the post OG card's caching", () => {
  it("never lets the CDN store the fallback card from a failed fetch", async () => {
    getPost.mockRejectedValueOnce(new Error("Contentful down"));
    expect((await card()).headers.get("cache-control")).toBe("no-store");
  });

  it("holds a real post's card on the CDN", async () => {
    // Known-bad control: a check that set no-store on everything would fail here.
    getPost.mockResolvedValueOnce({
      title: "A post",
      authorsCollection: { items: [] },
    });
    expect((await card()).headers.get("cache-control")).toContain(
      "s-maxage=31536000",
    );
  });
});
