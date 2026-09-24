import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";
import { getPost } from "@/lib/api";
import { formatAuthorsByline, postAuthors } from "@/lib/authors";
import { SITE_TITLE, SITE_AUTHOR } from "@/lib/constants";
import { CONTENTFUL_IMAGE_HOST } from "@/lib/contentful-host";
import { widont } from "@/lib/typography";

// Takes precedence over openGraph.images in generateMetadata. Node runtime,
// because the font is read from disk.
export const runtime = "nodejs";

// Deliberately no generateStaticParams. [→ `og-card-on-demand`]

export const alt = `${SITE_TITLE} — post`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Bricolage Bold as a static WOFF beside the route, never served publicly;
// Satori takes WOFF but not WOFF2. OFL 1.1. [→ `og-font-guard`] Latin only, so
// a capital eszett falls back; that belongs to the de-DE work.
const bricolage = fs.readFileSync(
  path.join(process.cwd(), "app/posts/[slug]/Bricolage-Bold.woff"),
);

// Literal hex: Satori cannot read custom properties.
const BRAND_BG = "#FAF5F1";
const BRAND_INK = "#241B1D";
const BRAND_CRIMSON = "#9E2238";

// Satori has no ellipsis, so clamp in JS, then widont on what renders.
function cardTitle(title: string): string {
  const clamped =
    title.length > 90 ? `${title.slice(0, 90).trimEnd()}…` : title;
  return widont(clamped);
}

// Host-checked: Satori fetches the URL and bakes it into a published PNG. An
// unusable URL degrades to the solid panel.
function coverPanelUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    // Protocol-relative URLs are normalised, as in lib/blur.ts.
    const parsed = new URL(url.startsWith("//") ? `https:${url}` : url);
    if (parsed.hostname !== CONTENTFUL_IMAGE_HOST) return null;
    // The panel's exact size; the card is a fixed 1200x630.
    parsed.searchParams.set("w", "480");
    parsed.searchParams.set("h", "630");
    parsed.searchParams.set("fit", "fill");
    parsed.searchParams.set("fm", "jpg");
    parsed.searchParams.set("q", "80");
    return parsed.toString();
  } catch {
    return null;
  }
}

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug, false).catch(() => undefined);

  const title = post ? cardTitle(post.title) : SITE_TITLE;
  // [→ `authors-array`]
  const author = post ? formatAuthorsByline(postAuthors(post)) : SITE_AUTHOR;
  const coverUrl = coverPanelUrl(post?.coverImage?.url);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: BRAND_BG,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "60%",
          height: "100%",
          padding: 64,
        }}
      >
        <div
          style={{
            width: 96,
            height: 8,
            background: BRAND_CRIMSON,
            marginBottom: 40,
          }}
        />
        <div
          style={{
            display: "flex",
            fontFamily: "Bricolage Grotesque",
            fontSize: 60,
            lineHeight: 1.1,
            color: BRAND_INK,
          }}
        >
          {title}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: "auto",
            fontFamily: "Bricolage Grotesque",
            color: BRAND_INK,
            opacity: 0.7,
            fontSize: 28,
          }}
        >
          <div style={{ display: "flex" }}>{SITE_TITLE}</div>
          <div style={{ display: "flex", marginTop: 4 }}>{author}</div>
        </div>
      </div>

      {/* Solid ink when there is no cover, so the layout holds. */}
      <div
        style={{
          display: "flex",
          width: "40%",
          height: "100%",
          background: BRAND_INK,
        }}
      >
        {coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt=""
            width={480}
            height={630}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}
      </div>
    </div>,
    {
      ...size,
      headers: {
        // The CDN holds the rendered card; the browser revalidates.
        // [→ `og-card-on-demand`]
        "Cache-Control":
          "public, max-age=0, s-maxage=31536000, must-revalidate",
      },
      fonts: [
        {
          name: "Bricolage Grotesque",
          data: bricolage,
          weight: 700,
          style: "normal",
        },
      ],
    },
  );
}
