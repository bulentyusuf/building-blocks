import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

import { getGermanPostAndMorePosts, getGermanPostSlugs } from "@/lib/api";

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

describe("getGermanPostAndMorePosts", () => {
  // Answers each query by name, so the two requests can differ.
  const respond = (german: unknown) =>
    vi.fn(async (_url: string, init: { body: string }) => {
      const { query } = JSON.parse(init.body) as { query: string };
      if (query.includes("GetGermanPost")) {
        return page(german ? [german] : []);
      }
      if (query.includes("GetPost(")) {
        return page([
          {
            slug: "a-post",
            title: "English title",
            excerpt: "English excerpt",
            coverImage: { url: "https://images.ctfassets.net/cover.jpg" },
            content: {
              json: { nodeType: "document", content: [] },
              links: {
                assets: { block: [{ sys: { id: "img" } }] },
                entries: {
                  block: [],
                  inline: [
                    {
                      __typename: "Sidenote",
                      sys: { id: "n1" },
                      note: { json: "en-1", links: {} },
                    },
                    {
                      __typename: "Sidenote",
                      sys: { id: "n2" },
                      note: { json: "en-2", links: {} },
                    },
                  ],
                },
              },
            },
          },
        ]);
      }
      return page([]);
    });

  it("takes the text from German and the cover and links from English", async () => {
    vi.stubGlobal(
      "fetch",
      respond({
        title: "Deutscher Titel",
        excerpt: "Deutscher Auszug",
        content: { json: { nodeType: "document", content: ["de"] } },
      }),
    );

    const { post } = await getGermanPostAndMorePosts("a-post", false);
    expect(post?.title).toBe("Deutscher Titel");
    expect(post?.excerpt).toBe("Deutscher Auszug");
    expect(post?.content.json).toEqual({
      nodeType: "document",
      content: ["de"],
    });
    expect(post?.coverImage?.url).toBe(
      "https://images.ctfassets.net/cover.jpg",
    );
    expect(post?.content.links.assets.block).toEqual([{ sys: { id: "img" } }]);
  });

  it("asks de-DE for text only, so no asset resolves in German", async () => {
    // Non-vacuous: an asset field in this query would come back null.
    const fetchMock = respond(null);
    vi.stubGlobal("fetch", fetchMock);

    await getGermanPostAndMorePosts("b-post", false);
    const germanQuery = fetchMock.mock.calls
      .map((c) => (JSON.parse(c[1].body) as { query: string }).query)
      .find((q) => q.includes("GetGermanPost"));
    expect(germanQuery).toContain('locale: "de-DE"');
    // Sidenote text may come through links; an asset never may.
    expect(germanQuery).not.toMatch(/coverImage|picture|url|assets/);
  });

  it("returns no post when the German body is missing", async () => {
    vi.stubGlobal(
      "fetch",
      respond({ title: "Titel", excerpt: "Auszug", content: null }),
    );

    const { post } = await getGermanPostAndMorePosts("c-post", false);
    expect(post).toBeUndefined();
  });

  it("uses a German sidenote where one exists and tags the rest English", async () => {
    vi.stubGlobal(
      "fetch",
      respond({
        title: "Titel",
        excerpt: "Auszug",
        content: {
          json: { nodeType: "document", content: [] },
          links: {
            entries: {
              inline: [
                {
                  __typename: "Sidenote",
                  sys: { id: "n1" },
                  note: { json: "de-1" },
                },
                { __typename: "Sidenote", sys: { id: "n2" }, note: null },
              ],
            },
          },
        },
      }),
    );

    const { post } = await getGermanPostAndMorePosts("d-post", false);
    const [n1, n2] = post!.content.links.entries!.inline!;
    expect(n1.note.json).toBe("de-1");
    expect(n1.lang).toBeUndefined();
    // Known-bad control: the untranslated note keeps its English text.
    expect(n2.note.json).toBe("en-2");
    expect(n2.lang).toBe("en-GB");
  });
});
