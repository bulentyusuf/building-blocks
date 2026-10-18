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
    constructor() {
      super("card");
    }
  },
}));

const { default: OpengraphImage } = await import("./opengraph-image");

const status = async () =>
  (
    (await OpengraphImage({
      params: Promise.resolve({ slug: "x" }),
    })) as Response
  ).status;

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
