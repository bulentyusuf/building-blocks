import { getAllPosts } from "@/lib/api";
import {
  SITE_URL,
  SITE_TITLE,
  SITE_DESCRIPTION,
  AUTHOR_EMAIL,
} from "@/lib/constants";
import { escapeXml } from "@/lib/xml";

// Daily ISR fallback. The Contentful publish webhook revalidates /feed.xml on
// demand for instant freshness. This is the catch for when the webhook fails.
export const revalidate = 86400;

export async function GET() {
  const posts = await getAllPosts(false);

  const items = posts
    .map((post) => {
      const url = escapeXml(`${SITE_URL}/posts/${post.slug}`);
      const pubDate = new Date(post.date).toUTCString();
      return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(post.excerpt || "")}</description>
      ${post.authorsCollection?.items?.[0]?.name ? `<author>${AUTHOR_EMAIL} (${escapeXml(post.authorsCollection.items[0].name)})</author>` : ""}
    </item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet href="/feed.xsl" type="text/xsl"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_TITLE)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>en</language>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "x-content-type-options": "nosniff",
    },
  });
}
