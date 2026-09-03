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

// Site identity is a code constant with an environment override, and the
// override exists for one caller: demo-site, which builds this same repo from
// the `demo` branch against a different Contentful space. The two projects run
// identical code and differ only in environment variables, so a demo wanting
// its own name has no other lever. Editing this on `demo` would end the
// fast-forward sync — `git push origin main:demo` would stop being a
// fast-forward and the weekly sync workflow would start failing — which is the
// source divergence the one-repo setup exists to avoid.
//
// This is not the "move site identity into the CMS" change CLAUDE.md rejects.
// That one puts constants fourteen files deep behind a network fetch on routes
// that never touch Contentful. This is build-time config in the same shape as
// NEXT_PUBLIC_SITE_URL above, and the default in code is still the live name,
// so a fork that sets nothing is unaffected.
//
// All four are NEXT_PUBLIC_ despite every current read being server-side. Each
// is rendered on the page, so nothing is being withheld, and the prefix means a
// future client component reading one gets the configured value rather than
// silently falling back to the default in the browser alone.
//
// The four are exactly the constants that name or place the site: the two the
// masthead renders, the footer blurb, and the repository the footer links to.
// Title and description in particular move together, because app/page.tsx
// renders them as home's masthead and the standfirst directly beneath it, so
// overriding one leaves the band half-renamed.
//
// SITE_AUTHOR is deliberately not among them. It credits whoever wrote the
// posts, which on any deployment of this repo is still the same person, and the
// feed's author is a truthful credit rather than a name to disguise.
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

// Posts shown per listing page (index and category). On page 1 of the index
// the hero counts as one of these, so every page holds the same number of posts.
export const POSTS_PER_PAGE = 5;

// The RSS <author> address, and the one identity value with NO default.
//
// It used to be derived as `contact@` plus the hostname, which meant any
// deployment that set NEXT_PUBLIC_SITE_URL and nothing else began publishing a
// mailbox at its own domain in a machine-readable file, in every item of the
// feed, without anyone having decided that mailbox exists. Inferring an address
// is not the same as having one.
//
// So it is opt-in, and app/feed.xml/route.ts omits the <author> element
// entirely when it is unset — <author> is optional in RSS 2.0, and no element
// is the honest answer to "we were not told". Set AUTHOR_EMAIL to turn it back
// on. Deliberately not NEXT_PUBLIC_, unlike the four identity overrides above:
// this one is read on the server only, and the prefix would inline an address
// into the client bundle for no reader's benefit.
export const AUTHOR_EMAIL = process.env.AUTHOR_EMAIL?.trim() || "";

// Chrome colour, carried by the sticky bar and the footer. CSS twin lives in
// app/globals.css as --color-brand-header; keep both at #2B1C3F (CSS @theme
// cannot import from TS). Feeds the light-scheme viewport themeColor and the
// PWA manifest's theme_color.
export const BRAND_HEADER_COLOR = "#2B1C3F";

// Dark-scheme chrome, used for the scheme-aware viewport themeColor so the
// mobile address bar matches the bar in dark mode. CSS twin is the
// --color-brand-header override under prefers-color-scheme: dark in globals.css.
//
// Both were navy (#1E3A8A / #2E4A9E) until the aubergine change. They are the
// only copies of the chrome colour that live outside globals.css, so
// lib/palette-contrast.test.ts holds each against its own scheme's token.
export const BRAND_HEADER_COLOR_DARK = "#3B2A52";

// BCP-47 default locale for html lang and hreflang. Matches the renamed
// Contentful default locale (en-GB). Phase 1 localisation makes this per-route.
export const DEFAULT_LOCALE = "en-GB";

// Open Graph locale format uses an underscore, not a hyphen.
export const DEFAULT_OG_LOCALE = "en_GB";
