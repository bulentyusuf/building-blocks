import { describe, it, expect, vi } from "vitest";

// Each paginated route redirects any other spelling of its page number to the
// canonical URL before fetching. [→ `listing-shell`]

class Redirect extends Error {
  constructor(readonly url: string) {
    super(`redirect ${url}`);
  }
}

// The routes pull in server modules that import it, and it throws under Vitest.
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Redirect(url);
  },
  notFound: () => {
    throw new Error("notFound");
  },
}));
vi.mock("next/headers", () => ({
  draftMode: async () => ({ isEnabled: false }),
}));
// Any fetch means the route got past its redirects.
vi.mock("@/lib/api", () => {
  const fetched = async () => {
    throw new Error("fetched");
  };
  return {
    getAllPosts: fetched,
    getBrowseIntro: fetched,
    getTagBySlug: fetched,
    getCategoryBySlug: fetched,
    getPostsByCategory: fetched,
    getVisibleTagSlugs: fetched,
    getAuthorBySlug: fetched,
  };
});

type Route = (props: {
  params: Promise<{ page: string; slug: string }>;
}) => Promise<unknown>;

const routes: [string, () => Promise<{ default: Route }>, string][] = [
  [
    "/categories/x/page",
    () => import("@/app/categories/[slug]/page/[page]/page"),
    "/categories/x/page/2",
  ],
  [
    "/authors/x/page",
    () => import("@/app/authors/[slug]/page/[page]/page"),
    "/authors/x/page/2",
  ],
  [
    "/tags/x/page",
    () => import("@/app/tags/[slug]/page/[page]/page"),
    "/tags/x/page/2",
  ],
];

const outcome = async (route: Route, page: string) => {
  try {
    await route({ params: Promise.resolve({ page, slug: "x" }) });
    return "rendered";
  } catch (error) {
    return error instanceof Redirect ? error.url : (error as Error).message;
  }
};

describe.each(routes)("%s/[page]", (_, load, canonical) => {
  it("redirects a loose spelling to the canonical number", async () => {
    const { default: route } = await load();
    for (const page of ["2.0", "02", "+2", "0x2"]) {
      expect(await outcome(route, page)).toBe(canonical);
    }
  });

  it("does not redirect the canonical spelling", async () => {
    // Known-bad control: a redirect that fired on "2" too would loop.
    const { default: route } = await load();
    expect(await outcome(route, "2")).toBe("fetched");
  });
});
