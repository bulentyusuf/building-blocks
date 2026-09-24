import {
  getAllPosts,
  getAllPages,
  getAllCategories,
  getAllAuthors,
} from "@/lib/api";
import { SITE_URL } from "@/lib/constants";
import { escapeXml } from "@/lib/xml";
import type { ListPost } from "@/lib/types";
import { postTags, visibleTagSlugs } from "@/lib/tags";
import { postAuthors } from "@/lib/authors";

// Served at /sitemap.xml through a rewrite: Next's reserved sitemap route does
// not carry fetch tags, so revalidateTag would never reach it. The daily
// revalidate is a fallback.
export const revalidate = 86400;

type SitemapEntry = {
  url: string;
  lastModified: Date;
};

// An invalid date would throw and freeze the sitemap on its last good copy.
const safeIso = (d: Date): string =>
  Number.isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString();

// Only Page slugs with a real route, so a new Page cannot add a dead URL.
const ROUTED_PAGE_SLUGS = new Set(["about", "privacy"]);

export async function GET() {
  const [posts, pages, categories, authors] = await Promise.all([
    getAllPosts(false),
    getAllPages(false),
    getAllCategories(false),
    getAllAuthors(false),
  ]);

  const postDate = (post: ListPost): Date =>
    new Date(post.updatedDate ?? post.date);

  const newestSitewide = posts.length ? postDate(posts[0]) : new Date();

  // Freshest post per category, tag and author, for real lastmod values.
  const newestByCategory = new Map<string, Date>();
  for (const post of posts) {
    const slug = post.category?.slug;
    if (!slug) continue;
    const date = postDate(post);
    const current = newestByCategory.get(slug);
    if (!current || date > current) newestByCategory.set(slug, date);
  }

  const newestByTag = new Map<string, Date>();
  for (const post of posts) {
    const date = postDate(post);
    for (const tag of postTags(post)) {
      const current = newestByTag.get(tag.slug);
      if (!current || date > current) newestByTag.set(tag.slug, date);
    }
  }

  const newestByAuthor = new Map<string, Date>();
  for (const post of posts) {
    const date = postDate(post);
    for (const author of postAuthors(post)) {
      if (!author.slug) continue;
      const current = newestByAuthor.get(author.slug);
      if (!current || date > current) newestByAuthor.set(author.slug, date);
    }
  }

  const postEntries: SitemapEntry[] = posts.map((post) => ({
    url: `${SITE_URL}/posts/${post.slug}`,
    lastModified: postDate(post),
  }));

  const pageEntries: SitemapEntry[] = pages
    .filter((page) => ROUTED_PAGE_SLUGS.has(page.slug))
    .map((page) => ({
      url: `${SITE_URL}/${page.slug}`,
      lastModified: new Date(
        page.sys.publishedAt ?? page.sys.firstPublishedAt ?? Date.now(),
      ),
    }));

  const categoryEntries: SitemapEntry[] = categories.map((category) => ({
    url: `${SITE_URL}/categories/${category.slug}`,
    lastModified: newestByCategory.get(category.slug) ?? newestSitewide,
  }));

  // Only tags with a page. [→ `tag-pages`]
  const tagEntries: SitemapEntry[] = [...visibleTagSlugs(posts)].map(
    (slug) => ({
      url: `${SITE_URL}/tags/${slug}`,
      lastModified: newestByTag.get(slug) ?? newestSitewide,
    }),
  );

  const authorEntries: SitemapEntry[] = authors
    .filter((author) => author.slug)
    .map((author) => ({
      url: `${SITE_URL}/authors/${author.slug}`,
      lastModified: newestByAuthor.get(author.slug as string) ?? newestSitewide,
    }));

  const entries: SitemapEntry[] = [
    {
      url: SITE_URL,
      lastModified: newestSitewide,
    },
    {
      url: `${SITE_URL}/categories`,
      lastModified: newestSitewide,
    },
    {
      url: `${SITE_URL}/tags`,
      lastModified: newestSitewide,
    },
    {
      url: `${SITE_URL}/authors`,
      lastModified: newestSitewide,
    },
    {
      url: `${SITE_URL}/archive`,
      lastModified: newestSitewide,
    },
    ...pageEntries,
    ...categoryEntries,
    ...tagEntries,
    ...authorEntries,
    ...postEntries,
  ];

  const urls = entries
    .map(
      (entry) => `  <url>
    <loc>${escapeXml(entry.url)}</loc>
    <lastmod>${safeIso(entry.lastModified)}</lastmod>
  </url>`,
    )
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
