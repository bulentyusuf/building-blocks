import { describe, it, expect, vi } from "vitest";

const post = (slug: string) => ({
  slug,
  title: slug,
  date: "2026-09-01T12:00:00.000Z",
  excerpt: "An excerpt.",
});

vi.mock("@/lib/api", () => ({
  getAllPosts: vi.fn(async () => [post("translated"), post("english-only")]),
  getAllPages: vi.fn(async () => []),
  getAllCategories: vi.fn(async () => []),
  getAllAuthors: vi.fn(async () => []),
  getGermanPostSlugs: vi.fn(async () => ["translated"]),
}));

const { GET } = await import("./route");
const { SITE_URL } = await import("@/lib/constants");

const urlBlock = (xml: string, loc: string) => {
  const start = xml.indexOf(`<loc>${loc}</loc>`);
  return start === -1 ? "" : xml.slice(start, xml.indexOf("</url>", start));
};

describe("GET /sitemap.xml translations", async () => {
  const xml = await (await GET()).text();

  it("lists the German version of a translated post", () => {
    expect(xml).toContain(`<loc>${SITE_URL}/de/posts/translated</loc>`);
  });

  it("gives an untranslated post no German URL", () => {
    // Non-vacuous: the block must exist before its absence means anything.
    expect(urlBlock(xml, `${SITE_URL}/posts/english-only`)).not.toBe("");
    expect(xml).not.toContain("/de/posts/english-only");
  });

  it("carries no XHTML element, so Firefox still pretty-prints it", () => {
    // hreflang pairs are in each page's head instead. [→ `locale`]
    expect(xml).not.toMatch(/xhtml/i);
  });
});
