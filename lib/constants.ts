// Resolution order, most specific first.
//
// 1. NEXT_PUBLIC_SITE_URL, the explicit setting. Needed for a custom domain and
//    the only one of the three that survives moving off Vercel.
// 2. VERCEL_PROJECT_PRODUCTION_URL, so a fork deployed without step 1 emits its
//    real domain rather than localhost. Vercel sets this at both build and
//    runtime, and always to the production domain even inside a preview
//    deployment, which is what canonicals and feed links want. VERCEL_URL is
//    deliberately not used: it is per-deployment, so it would change canonicals
//    on every push, and it is unreachable when Standard Deployment Protection
//    is enabled.
// 3. localhost, for `next dev`.
//
// Both sources go through normaliseOrigin, because a bare domain is the
// commonest way to set either by hand and Vercel documents its own production
// URL as scheme-less. Everything downstream feeds `new URL()`: metadataBase in
// app/layout.tsx throws outright on a scheme-less value, failing the build with
// an ERR_INVALID_URL that names neither the variable nor the setting, and
// parseHostname below swallows that same error and silently yields "localhost",
// which then lands in AUTHOR_EMAIL.

// Trailing slashes are stripped because every consumer appends its own path, so
// `https://example.com/` would otherwise emit `https://example.com//posts/x`
// into the sitemap and the feed. An existing scheme is preserved rather than
// forced to https, so an explicit `http://localhost:3000` keeps working.
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
    // Not gated on NODE_ENV: an unparsable value is always a mistake, unlike
    // the localhost fallback below, which is normal in development. Falling
    // through rather than throwing lets the Vercel domain rescue the build.
    console.warn(
      `[constants] NEXT_PUBLIC_SITE_URL is set to "${configured}", which is not a valid URL. Ignoring it.`,
    );
  }

  const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProduction) {
    const normalised = normaliseOrigin(vercelProduction);
    if (isParsable(normalised)) return normalised;
  }

  // A deployed site emitting localhost canonicals, sitemap entries and feed
  // links is silently broken for every crawler, so say so in the build log.
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

export const SITE_TITLE = "Be Useful.";

export const SITE_DESCRIPTION =
  "Content & Code, with a little help from Generative AI.";

export const SITE_AUTHOR = "Bulent Yusuf";

// Shown in the footer's first column. Replace this with your own blurb.
export const SITE_FOOTER_BLURB =
  "A blog about content, code, and collaborating with generative AI. Written in Munich and published from a headless CMS.";

// Shown as the footer "GitHub" link. Point this at your own repository.
export const SITE_REPO_URL = "https://github.com/bulentyusuf/building-blocks";

// Posts shown per listing page (index and category). On page 1 of the index
// the hero counts as one of these, so every page holds the same number of posts.
export const POSTS_PER_PAGE = 5;

export const AUTHOR_EMAIL = `contact@${SITE_HOSTNAME}`;

// Header band colour. CSS twin lives in app/globals.css as --color-brand-header;
// keep both at #1E3A8A (CSS @theme cannot import from TS).
export const BRAND_HEADER_COLOR = "#1E3A8A";

// Dark-scheme header band, used for the scheme-aware viewport themeColor so the
// mobile address bar matches the header in dark mode. CSS twin is the
// --color-brand-header override under prefers-color-scheme: dark in globals.css.
export const BRAND_HEADER_COLOR_DARK = "#2E4A9E";

// BCP-47 default locale for html lang and hreflang. Matches the renamed
// Contentful default locale (en-GB). Phase 1 localisation makes this per-route.
export const DEFAULT_LOCALE = "en-GB";

// Open Graph locale format uses an underscore, not a hyphen.
export const DEFAULT_OG_LOCALE = "en_GB";
