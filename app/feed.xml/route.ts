import { getAllPosts } from "@/lib/api";
import { postAuthors } from "@/lib/authors";
import {
  SITE_URL,
  SITE_TITLE,
  SITE_DESCRIPTION,
  AUTHOR_EMAIL,
  DEFAULT_LOCALE,
} from "@/lib/constants";
import { escapeXml } from "@/lib/xml";

// Daily ISR fallback. The Contentful publish webhook revalidates /feed.xml on
// demand for instant freshness. This is the catch for when the webhook fails.
export const revalidate = 86400;

// Two things this file gets from constants rather than spelling out, both fixed
// in August 2026:
//
// <language> is the site locale in RSS 2.0's form, which is the BCP-47 tag
// lowercased — en-GB becomes en-gb. It was a hardcoded "en", the one piece of
// feed metadata not following DEFAULT_LOCALE, against CLAUDE.md's "the site's
// locale is en-GB, everywhere".
//
// Authors:
// <dc:creator> carries every author in credit order via the Dublin Core
// extension (xmlns:dc), which is standard for RSS 2.0 readers and requires no
// email address.
// <author> renders only when AUTHOR_EMAIL is actually set, carrying the single
// lead author for legacy RSS 2.0 clients that require an email address.
// See lib/constants.ts for why an omitted element beats a guessed mailbox.

export async function GET() {
  const posts = await getAllPosts(false);

  const items = posts
    .map((post) => {
      const url = escapeXml(`${SITE_URL}/posts/${post.slug}`);
      const pubDate = new Date(post.date).toUTCString();
      const authors = postAuthors(post);
      const dcCreators = authors
        .map((a) => `<dc:creator>${escapeXml(a.name)}</dc:creator>`)
        .join("\n      ");
      const lead = authors[0];
      return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(post.excerpt || "")}</description>
      ${dcCreators ? `${dcCreators}\n      ` : ""}${AUTHOR_EMAIL && lead?.name ? `<author>${escapeXml(AUTHOR_EMAIL)} (${escapeXml(lead.name)})</author>` : ""}
    </item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet href="/feed.xsl" type="text/xsl"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(SITE_TITLE)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>${DEFAULT_LOCALE.toLowerCase()}</language>
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
