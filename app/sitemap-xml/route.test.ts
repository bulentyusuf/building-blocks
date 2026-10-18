import { describe, it, expect, vi } from "vitest";

const post = (slug: string, updatedDate?: string) => ({
  slug,
  title: slug,
  date: "2026-09-01T12:00:00.000Z",
  updatedDate,
  excerpt: "An excerpt.",
});

// Second in date order but edited last, so it is the freshest content.
const EDITED = "2026-10-01T12:00:00.000Z";

vi.mock("@/lib/api", () => ({
  getAllPosts: vi.fn(async () => [
    post("translated"),
    post("english-only", EDITED),
  ]),
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

describe("GET /sitemap.xml index lastmod", async () => {
  const xml = await (await GET()).text();

  it("takes the freshest edit anywhere, not the first post's date", () => {
    // The first post's date is the known-bad answer this used to give.
    for (const path of ["", "/tags", "/archive"]) {
      expect(urlBlock(xml, `${SITE_URL}${path}`)).toContain(
        `<lastmod>${EDITED}</lastmod>`,
      );
    }
  });
});
