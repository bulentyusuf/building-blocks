// Resolution order, most specific first: NEXT_PUBLIC_SITE_URL (the explicit
// setting, and the only one of the three that survives moving off Vercel),
// then VERCEL_PROJECT_PRODUCTION_URL (so a fork deployed without the first
// emits its real domain rather than localhost — set at both build and
// runtime, always to the production domain even inside a preview deployment),
// then localhost for `next dev`. VERCEL_URL is deliberately not used: it is
// per-deployment, so it would change canonicals on every push, and it is
// unreachable when Standard Deployment Protection is enabled.
//
// Both sources go through normaliseOrigin, because a bare domain is the
// commonest way to set either by hand and Vercel documents its own production
// URL as scheme-less. Everything downstream feeds `new URL()`: metadataBase in
// app/layout.tsx throws outright on a scheme-less value, failing the build with
// an ERR_INVALID_URL that names neither the variable nor the setting, and
// parseHostname below swallows that same error and silently yields "localhost",
// which then lands in every rich-text link's internal/external judgement.

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

// Site identity is a code constant with an environment override, set on
// demo-site only. [→ `demo-site`] All four are NEXT_PUBLIC_ despite every
// current read being server-side, so a future client component reading one
// gets the configured value rather than silently falling back to the default
// in the browser alone.
//
// Resolution is `?.trim() || fallback` in all four. Do not tidy it to `??`: an
// unset variable on Vercel is frequently an empty string rather than undefined,
// which `??` passes through, and an empty title renders an empty masthead.
// lib/site-identity.test.ts keeps those cases as its known-bad control.
export const SITE_TITLE =
  process.env.NEXT_PUBLIC_SITE_TITLE?.trim() || "Be Useful.";

export const SITE_DESCRIPTION =
  process.env.NEXT_PUBLIC_SITE_DESCRIPTION?.trim() ||
  "Content & Code, with a little help from Generative AI.";

export const SITE_AUTHOR = "Bulent Yusuf";

// Shown in the footer's first column. Replace this with your own blurb.
export const SITE_FOOTER_BLURB =
  process.env.NEXT_PUBLIC_SITE_FOOTER_BLURB?.trim() ||
  "A blog about content, code, and collaborating with generative AI. Written in Munich and published from a headless CMS.";

// Shown as the footer "GitHub" link. Point this at your own repository. The
// default here is the canonical repo, and lib/docs-consistency.test.ts holds it
// against README.md and public/llms.txt — that guard reads the default only,
// which is right, because those documents describe the repository rather than
// whatever a given deployment links to.
export const SITE_REPO_URL =
  process.env.NEXT_PUBLIC_SITE_REPO_URL?.trim() ||
  "https://github.com/bulentyusuf/building-blocks";

// Posts shown per listing page. [→ `posts-per-page`]
export const POSTS_PER_PAGE = 5;

// Must match lib/api.ts's authorsCollection(limit: MAX_AUTHORS) and the
// Contentful size validation on both spaces — a fourth author would silently
// vanish from every query if they disagree. [→ `authors-array`]
export const MAX_AUTHORS = 3;

// The RSS <author> address, and the one identity value with NO default. It is
// opt-in: app/feed.xml/route.ts omits the <author> element entirely when unset
// — <author> is optional in RSS 2.0, and no element is the honest answer to
// "we were not told". Deliberately not NEXT_PUBLIC_, unlike the four identity
// overrides above: this one is read on the server only.
export const AUTHOR_EMAIL = process.env.AUTHOR_EMAIL?.trim() || "";

// Chrome colour. CSS twin lives in app/globals.css as --color-brand-header;
// CSS @theme cannot import from TS, so a change touches both files.
// [→ `brand-colour-duplication`, `chrome-aubergine`]
export const BRAND_HEADER_COLOR = "#2B1C3F";

// Dark-scheme twin, same reason. lib/palette-contrast.test.ts holds each
// literal against its own scheme's token.
export const BRAND_HEADER_COLOR_DARK = "#3B2A52";

// BCP-47 default locale for html lang and hreflang. [→ `locale`] Phase 1
// localisation makes this per-route.
export const DEFAULT_LOCALE = "en-GB";

// Open Graph locale format uses an underscore, not a hyphen.
export const DEFAULT_OG_LOCALE = "en_GB";
