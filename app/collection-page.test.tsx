import { describe, it, expect, vi } from "vitest";
import { renderToReadableStream } from "react-dom/server";
import type { ReactElement } from "react";
import type { ListPost } from "@/lib/types";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  draftMode: async () => ({ isEnabled: false }),
}));
vi.mock("@/lib/blur", () => ({ getBlurDataURL: async () => undefined }));

// Twelve posts, newest first: more than home shows and more than a
// collection page shows as cards.
const posts = Array.from({ length: 12 }, (_, i) => ({
  slug: `post-${i + 1}`,
  title: `Post number ${i + 1}`,
  date: `2026-${String(12 - i).padStart(2, "0")}-01T00:00:00Z`,
  excerpt: `About post ${i + 1}.`,
  coverImage: null,
  authorsCollection: { items: [{ name: "Bulent Yusuf", slug: "bulent" }] },
  category: { name: "Blogging", slug: "blogging" },
  tagsCollection: { items: [] },
})) as unknown as ListPost[];

vi.mock("@/lib/api", () => ({
  getAllPosts: async () => posts,
  getCategoryBySlug: async () => ({ name: "Blogging", slug: "blogging" }),
  // Post 10 is old enough to be a row; post 2, a card, is never marked.
  getGermanPostSlugs: async () => ["post-2", "post-10"],
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("notFound() called");
  },
}));

const { default: Home } = await import("./page");
const { default: CollectionPage } = await import("./collection-page");
const { default: StrandPage } = await import("./categories/[slug]/page");
const { STREAM_POSTS } = await import("./post-stream");

// A stream, because the cards' covers are async components.
async function toHtml(element: ReactElement): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return new Response(stream).text();
}

const count = (html: string, pattern: RegExp) =>
  (html.match(pattern) ?? []).length;
const cards = (html: string) => count(html, /<article/g);
const rows = (html: string) =>
  count(html, /<li class="grid grid-cols-\[auto_1fr\]/g);
const linksTo = (html: string, slug: string) =>
  count(html, new RegExp(`href="/posts/${slug}"`, "g"));

describe("home", () => {
  it("shows the feature card and six cards, then stops", async () => {
    const html = await toHtml(await Home());
    expect(STREAM_POSTS).toBe(7);
    expect(cards(html)).toBe(7);
    expect(linksTo(html, "post-7")).toBe(1);
    expect(linksTo(html, "post-8")).toBe(0);
  });
});

describe("a collection page", () => {
  const render = (n: number) =>
    toHtml(
      <CollectionPage
        crumbs={[{ label: "Home", href: "/" }, { label: "Design" }]}
        heading={<h1>Design</h1>}
        posts={posts.slice(0, n)}
        visibleTags={new Set()}
        germanSlugs={new Set(["post-2", "post-10"])}
        closing="That’s all."
      />,
    );

  it("shows the latest seven as cards and every older post as a row", async () => {
    const html = await render(12);
    expect(cards(html)).toBe(7);
    expect(rows(html)).toBe(5);
    // Nothing hidden, nothing twice. [→ `listing-shell`]
    for (let i = 1; i <= 12; i++) expect(linksTo(html, `post-${i}`)).toBe(1);
    // Elsewhere every card and row keeps its strand pill, the control for the
    // strand page below.
    expect(count(html, /href="\/categories\/blogging"/g)).toBe(5);
    expect(count(html, /text-on-strand/g)).toBe(12);
    // On phones each row's strand is a dot instead, the control for below.
    expect(count(html, /border-brand-dark sm:hidden/g)).toBe(5);
    // A row says when a German version exists, as the archive does; cards do
    // not. [→ `locale`]
    expect(count(html, /href="\/de\/posts\/post-10"/g)).toBe(1);
    expect(count(html, /href="\/de\/posts\/post-2"/g)).toBe(0);
  });

  it("shows no rows, and no older posts label, at seven or fewer", async () => {
    const html = await render(7);
    expect(cards(html)).toBe(7);
    expect(rows(html)).toBe(0);
    expect(html).not.toContain("older posts");
  });
});

describe("a strand page", () => {
  it("shows seven cards, then every older post as a row", async () => {
    const html = await toHtml(
      await StrandPage({ params: Promise.resolve({ slug: "blogging" }) }),
    );
    expect(cards(html)).toBe(7);
    expect(rows(html)).toBe(5);
    for (let i = 1; i <= 12; i++) expect(linksTo(html, `post-${i}`)).toBe(1);
    // The page is the strand, so neither its cards nor its rows repeat it.
    expect(count(html, /href="\/categories\/blogging"/g)).toBe(0);
    expect(count(html, /text-on-strand/g)).toBe(0);
    expect(count(html, /border-brand-dark sm:hidden/g)).toBe(0);
    expect(count(html, /href="\/de\/posts\/post-10"/g)).toBe(1);
  });
});
