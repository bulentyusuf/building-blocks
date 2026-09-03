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

// Served at /sitemap.xml via a rewrite in next.config.js. This handler lives on
// an ordinary path (/sitemap-xml) on purpose. Next treats the reserved
// /sitemap.xml route as a special metadata route handler whose cache entry does
// not carry our explicit fetch tags, so revalidateTag("posts") never reaches it
// there. On an ordinary path it behaves like /feed.xml, its cache entry carries
// the posts tag, and the publish webhook's revalidateTag("posts") busts it on
// demand. revalidate is the daily self-heal fallback.
export const revalidate = 86400;

type SitemapEntry = {
  url: string;
  lastModified: Date;
  changeFrequency: string;
  priority: number;
};

// toISOString throws RangeError on an invalid date, and a throw inside this
// render makes Next serve the last good copy, which silently freezes the
// sitemap. feed.xml uses toUTCString, which returns a harmless string instead,
// which is why it never hit this. Clamp an unparseable date to the epoch.
const safeIso = (d: Date): string =>
  Number.isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString();

// The only CMS `Page` slugs that have a matching route (app/about, app/privacy).
// Every other Page entry would map to a URL with no route — a 404 in the
// sitemap, which wastes crawl budget and erodes sitemap trust. Filtering here
// means a newly published Page can never inject a dead URL. Add a slug only
// when a real route ships for it.
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

  // getAllPosts orders date_DESC, so posts[0] is the freshest sitewide entry.
  const newestSitewide = posts.length ? postDate(posts[0]) : new Date();

  // Freshest post per category slug, so each category page reports a real
  // lastModified instead of the render time.
  const newestByCategory = new Map<string, Date>();
  for (const post of posts) {
    const slug = post.category?.slug;
    if (!slug) continue;
    const date = postDate(post);
    const current = newestByCategory.get(slug);
    if (!current || date > current) newestByCategory.set(slug, date);
  }

  // Same idea per tag slug, except a post carries up to three, so it can be the
  // freshest entry for several tags at once.
  const newestByTag = new Map<string, Date>();
  for (const post of posts) {
    const date = postDate(post);
    for (const tag of postTags(post)) {
      const current = newestByTag.get(tag.slug);
      if (!current || date > current) newestByTag.set(tag.slug, date);
    }
  }

  // Same idea per author slug. Posts carry author slugs via LIST_GRAPHQL_FIELDS.
  const newestByAuthor = new Map<string, Date>();
  for (const post of posts) {
    const date = postDate(post);
    for (const a of post.authorsCollection?.items ?? []) {
      const slug = a.slug;
      if (!slug) continue;
      const current = newestByAuthor.get(slug);
      if (!current || date > current) newestByAuthor.set(slug, date);
    }
  }

  const postEntries: SitemapEntry[] = posts.map((post) => ({
    url: `${SITE_URL}/posts/${post.slug}`,
    lastModified: postDate(post),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const pageEntries: SitemapEntry[] = pages
    .filter((page) => ROUTED_PAGE_SLUGS.has(page.slug))
    .map((page) => ({
      url: `${SITE_URL}/${page.slug}`,
      lastModified: new Date(
        page.sys.publishedAt ?? page.sys.firstPublishedAt ?? Date.now(),
      ),
      changeFrequency: "yearly",
      priority: 0.5,
    }));

  const categoryEntries: SitemapEntry[] = categories.map((category) => ({
    url: `${SITE_URL}/categories/${category.slug}`,
    lastModified: newestByCategory.get(category.slug) ?? newestSitewide,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  // Only tags the glossary shows. Below MIN_POSTS_PER_TAG a tag has no page —
  // the route 404s — so listing it here would advertise a dead URL.
  const tagEntries: SitemapEntry[] = [...visibleTagSlugs(posts)].map(
    (slug) => ({
      url: `${SITE_URL}/tags/${slug}`,
      lastModified: newestByTag.get(slug) ?? newestSitewide,
      changeFrequency: "weekly",
      priority: 0.6,
    }),
  );

  const authorEntries: SitemapEntry[] = authors
    .filter((author) => author.slug)
    .map((author) => ({
      url: `${SITE_URL}/authors/${author.slug}`,
      lastModified: newestByAuthor.get(author.slug as string) ?? newestSitewide,
      changeFrequency: "weekly",
      priority: 0.6,
    }));

  const entries: SitemapEntry[] = [
    {
      url: SITE_URL,
      lastModified: newestSitewide,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/categories`,
      lastModified: newestSitewide,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      // The glossary index. Per-tag pages are enumerated separately below —
      // this was one URL until tags gained their own landing pages.
      url: `${SITE_URL}/tags`,
      lastModified: newestSitewide,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/authors`,
      lastModified: newestSitewide,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      // Browse hub, indexable and internally linked from the footer. lastmod
      // tracks the freshest post since the archive lists every post.
      url: `${SITE_URL}/archive`,
      lastModified: newestSitewide,
      changeFrequency: "weekly",
      priority: 0.6,
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
    <changefreq>${entry.changeFrequency}</changefreq>
    <priority>${entry.priority}</priority>
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
      "x-content-type-options": "nosniff",
    },
  });
}
