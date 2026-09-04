import { describe, it, expect, vi } from "vitest";

const mockPosts = [
  {
    title: "Co-authored post",
    slug: "co-authored-post",
    date: "2026-09-04T19:00:00.000Z",
    excerpt: "Two authors working together.",
    authorsCollection: {
      items: [
        { name: "Bulent Yusuf", slug: "bulent-yusuf" },
        { name: "Genial Yeti", slug: "genial-yeti" },
      ],
    },
  },
  {
    title: "Solo post",
    slug: "solo-post",
    date: "2026-09-01T12:00:00.000Z",
    excerpt: "One author.",
    authorsCollection: {
      items: [{ name: "Bulent Yusuf", slug: "bulent-yusuf" }],
    },
  },
  {
    title: "Archived post with no author",
    slug: "no-author-post",
    date: "2026-08-15T12:00:00.000Z",
    excerpt: "No author.",
    authorsCollection: undefined,
  },
];

vi.mock("@/lib/api", () => ({
  getAllPosts: vi.fn(async () => mockPosts),
}));

const { GET } = await import("./route");

describe("GET /feed.xml", () => {
  it("declares standard namespaces including atom and dc (Dublin Core)", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe(
      "application/xml; charset=utf-8",
    );

    const xml = await res.text();
    expect(xml).toContain('xmlns:atom="http://www.w3.org/2005/Atom"');
    expect(xml).toContain('xmlns:dc="http://purl.org/dc/elements/1.1/"');
  });

  it("emits dc:creator elements for each co-author in credit order", async () => {
    const res = await GET();
    const xml = await res.text();

    // Co-authored item has both authors
    expect(xml).toContain("<dc:creator>Bulent Yusuf</dc:creator>");
    expect(xml).toContain("<dc:creator>Genial Yeti</dc:creator>");

    // Check item order for co-authored post
    const coauthoredBlock = xml.slice(
      xml.indexOf("<title>Co-authored post</title>"),
      xml.indexOf("</item>"),
    );
    expect(coauthoredBlock).toContain(
      "<dc:creator>Bulent Yusuf</dc:creator>\n      <dc:creator>Genial Yeti</dc:creator>",
    );
  });

  it("emits single dc:creator for solo author and none for authorless post", async () => {
    const res = await GET();
    const xml = await res.text();

    const soloBlock = xml.slice(
      xml.indexOf("<title>Solo post</title>"),
      xml.indexOf("<title>Archived post with no author</title>"),
    );
    expect(soloBlock).toContain("<dc:creator>Bulent Yusuf</dc:creator>");
    expect(soloBlock).not.toContain("<dc:creator>Genial Yeti</dc:creator>");

    const noAuthorBlock = xml.slice(
      xml.indexOf("<title>Archived post with no author</title>"),
    );
    expect(noAuthorBlock).not.toContain("<dc:creator>");
  });
});
