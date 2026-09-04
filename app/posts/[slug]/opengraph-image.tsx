import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";
import { getAllPosts, getPost } from "@/lib/api";
import { postAuthors } from "@/lib/authors";
import { SITE_TITLE, SITE_AUTHOR } from "@/lib/constants";
import { CONTENTFUL_IMAGE_HOST } from "@/lib/contentful-host";
import { widont } from "@/lib/typography";

// Branded Open Graph card generated per post at request time. This colocated
// file-based route takes precedence over any `openGraph.images` set in the
// page's generateMetadata, so the config there was removed to avoid dead code.
//
// Node runtime (not edge): the font is read from disk with fs at module scope,
// and the route fetches the post via the same Contentful GraphQL helper the
// page uses.
export const runtime = "nodejs";

// Prerender a card per post, alongside the pages themselves.
//
// Without this the route was the only dynamic non-API route on the site — the
// build printed `ƒ /posts/-/opengraph-image` while every page around it was ○
// or ●. Each scrape then paid for a Contentful query, a Satori render and a
// cover fetch, on a route whose output only changes when the post does.
//
// Colocated metadata routes do not inherit the page's generateStaticParams, so
// the slugs have to be enumerated again here. That is a second getAllPosts at
// build time — getAllPosts is cache()-wrapped now, but React's cache() dedupes
// only within a single request/render, and this route's own generateStaticParams
// runs in a separate pass from the page's, so it stays a real second query —
// one listing query per build, paid once, against 20-odd renders moved off the
// request path.
//
// dynamicParams stays at its default of true, which is what makes this safe
// for a post published through the webhook: a slug that was not in the build
// still renders on demand, exactly as the whole route did before. The card is
// then prerendered from the next deploy on.
export async function generateStaticParams() {
  return (await getAllPosts(false)).map((post) => ({ slug: post.slug }));
}

export const alt = `${SITE_TITLE} — post`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Bricolage Grotesque at weight 700, committed as a static WOFF colocated with
// the route so it is never publicly served (unlike public/). next/font gives no
// raw bytes to ImageResponse, so the file is loaded directly. Read once at
// module scope, not per request. Satori accepts TTF, OTF and WOFF but not WOFF2.
// Bricolage Grotesque is SIL Open Font License 1.1, which permits embedding; the
// static instance was extracted from the @fontsource/bricolage-grotesque package
// (github.com/ateliertriay/bricolage).
//
// It parses clean as shipped, and opengraph-image.font.test.tsx renders through
// next/og to keep it that way — a font can satisfy every manual check and still
// fail here, which is what that test exists to catch.
//
// Known gap: this registers the latin subset only, so the capital eszett ẞ
// (U+1E9E, latin-ext) in a title falls back off Bricolage. Ordinary German
// characters (ä ö ü ß) are inside latin. That belongs with the de-DE work,
// where it can be verified against a real German title.
const bricolage = fs.readFileSync(
  path.join(process.cwd(), "app/posts/[slug]/Bricolage-Bold.woff"),
);

// Brand ground and ink. Literal hex, not the CSS tokens — Satori cannot read
// custom properties, and these cards render the same in every context.
const BRAND_BG = "#FAF5F1";
const BRAND_INK = "#241B1D";
const BRAND_CRIMSON = "#9E2238";

// Satori has no text-overflow: ellipsis, so long titles are truncated in JS.
// widont then glues the final two words with a non-breaking space so the
// wrapped card title never ends on a lone last word, matching the on-page h1
// (Satori honours U+00A0 as non-breaking). Clamp first so the glue lands on the
// words that actually render.
function cardTitle(title: string): string {
  const clamped =
    title.length > 90 ? `${title.slice(0, 90).trimEnd()}…` : title;
  return widont(clamped);
}

// The cover panel's source, host-checked before it is handed to Satori.
//
// The third server-side fetch of a CMS-supplied URL on the site, and it was the
// only one not checking where the URL pointed — lib/blur.ts and
// lib/contentful-image.tsx both do. It belongs in the same set for blur.ts's
// reason rather than the loader's: Satori resolves an <img src> with a plain
// fetch() and bakes the bytes it gets back into the PNG this route publishes,
// so an off-host URL would make the build fetch an arbitrary address and serve
// what came back as this post's social card. CSP does not apply — nothing here
// is a browser.
//
// Realistically the entry would have to be a compromised CMS to hold one, which
// is outside the stated threat model. This is the guard being consistent rather
// than a live hole: two of three sites checking was drift, not a decision.
//
// An unusable URL degrades to the solid ink panel, the same branch a post with
// no cover already takes.
function coverPanelUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    // Contentful has historically returned protocol-relative asset URLs;
    // normalised here exactly as lib/blur.ts does.
    const parsed = new URL(url.startsWith("//") ? `https:${url}` : url);
    if (parsed.hostname !== CONTENTFUL_IMAGE_HOST) return null;
    // Requested at the panel's exact pixel size. The card output is a fixed
    // 1200x630 PNG, so the panel is 480x630 at 1:1 and there is no DPR to
    // serve. Asking for a wider derivative only makes Satori crop a second
    // time.
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
  // OG cards are for public URLs, so draft mode is off.
  const post = await getPost(slug, false).catch(() => undefined);

  const title = post ? cardTitle(post.title) : SITE_TITLE;
  // authors[0], the lead author — the card has a fixed-width byline slot for
  // one name, not every co-author. The array order in Contentful decides who
  // that is; reordering it changes whose name goes out on the OG card.
  const author = (post ? postAuthors(post)[0]?.name : undefined) ?? SITE_AUTHOR;
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
      {/* Left column: title and footer, roughly 60% width. */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "60%",
          height: "100%",
          padding: 64,
        }}
      >
        {/* The single crimson accent rule. */}
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
        {/* Footer pinned to the bottom. */}
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

      {/* Right column: cover panel, roughly 40% width. Solid ink when there
            is no cover so the layout never collapses. */}
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
