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

  it("links both versions to each other, English as x-default", () => {
    for (const loc of [
      `${SITE_URL}/posts/translated`,
      `${SITE_URL}/de/posts/translated`,
    ]) {
      const block = urlBlock(xml, loc);
      expect(block).toContain(
        `hreflang="de-DE" href="${SITE_URL}/de/posts/translated"`,
      );
      expect(block).toContain(
        `hreflang="x-default" href="${SITE_URL}/posts/translated"`,
      );
    }
  });

  it("gives an untranslated post no German URL and no alternates", () => {
    // Non-vacuous: the block must exist before its contents mean anything.
    const block = urlBlock(xml, `${SITE_URL}/posts/english-only`);
    expect(block).not.toBe("");
    expect(block).not.toContain("xhtml:link");
    expect(xml).not.toContain("/de/posts/english-only");
  });

  it("declares the xhtml namespace", () => {
    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
  });
});
