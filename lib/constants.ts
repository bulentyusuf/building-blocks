// NEXT_PUBLIC_SITE_URL, then VERCEL_PROJECT_PRODUCTION_URL (the production
// domain even in a preview), then localhost. Never VERCEL_URL, which changes
// per deployment. Both go through normaliseOrigin: a bare domain makes
// `new URL()` fail the build, or silently yield "localhost" in parseHostname.

// Trailing slashes stripped, since consumers append paths. An existing scheme
// is kept, so http://localhost still works.
function normaliseOrigin(value: string): string {
  const trimmed = value.replace(/\/+$/, "");
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function isParsable(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function resolveSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    const normalised = normaliseOrigin(configured);
    if (isParsable(normalised)) return normalised;
    // Warn and fall through, so the Vercel domain can still rescue the build.
    console.warn(
      `[constants] NEXT_PUBLIC_SITE_URL is set to "${configured}", which is not a valid URL. Ignoring it.`,
    );
  }

  const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProduction) {
    const normalised = normaliseOrigin(vercelProduction);
    if (isParsable(normalised)) return normalised;
  }

  // localhost canonicals in production break every crawler, so say so.
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[constants] NEXT_PUBLIC_SITE_URL is not set and no Vercel production URL was found. " +
        "Canonical links, the sitemap, robots.txt and the RSS feed will point at localhost.",
    );
  }

  return "http://localhost:3000";
}

export const SITE_URL = resolveSiteUrl();

function parseHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "localhost";
  }
}

export const SITE_HOSTNAME = parseHostname(SITE_URL);

// Overridable identity. NEXT_PUBLIC_ so a future client read sees the same
// value. Keep `?.trim() ||`, never `??`: Vercel often sets an unset variable to
// "", which `??` passes through. lib/site-identity.test.ts holds this.
export const SITE_TITLE =
  process.env.NEXT_PUBLIC_SITE_TITLE?.trim() || "Be Useful.";

export const SITE_DESCRIPTION =
  process.env.NEXT_PUBLIC_SITE_DESCRIPTION?.trim() ||
  "Content & Code, with a little help from Generative AI.";

export const SITE_AUTHOR = "Bulent Yusuf";

// Replace with your own blurb.
export const SITE_FOOTER_BLURB =
  process.env.NEXT_PUBLIC_SITE_FOOTER_BLURB?.trim() ||
  "A blog about content, code, and collaborating with generative AI. Written in Munich and published from a headless CMS.";

// Point at your own repository. lib/docs-consistency.test.ts holds the default
// against README.md and public/llms.txt.
export const SITE_REPO_URL =
  process.env.NEXT_PUBLIC_SITE_REPO_URL?.trim() ||
  "https://github.com/bulentyusuf/building-blocks";

// [→ `posts-per-page`]
export const POSTS_PER_PAGE = 5;

// Must match the GraphQL limit and the Contentful validation, or a fourth
// author silently vanishes. [→ `authors-array`]
export const MAX_AUTHORS = 3;

// Opt-in, no default: the feed omits <author> when unset. Server-only.
export const AUTHOR_EMAIL = process.env.AUTHOR_EMAIL?.trim() || "";

// Twin of --color-brand-header in app/globals.css; change both.
// [→ `brand-colour-duplication`, `chrome-aubergine`]
export const BRAND_HEADER_COLOR = "#2B1C3F";

// Dark-scheme twin.
export const BRAND_HEADER_COLOR_DARK = "#3B2A52";

// [→ `locale`]
export const DEFAULT_LOCALE = "en-GB";

// Open Graph uses an underscore.
export const DEFAULT_OG_LOCALE = "en_GB";
