/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV !== "production";

// Relaxations are passed in per route, never set on the base. 'unsafe-eval' is
// dev-only, for Turbopack and React debugging. [→ `csp-scoping`]
const contentSecurityPolicy = ({ wasm = false, cmsFraming = false } = {}) =>
  [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${wasm ? " 'wasm-unsafe-eval'" : ""}${isDev ? " 'unsafe-eval'" : ""} https://va.vercel-scripts.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' https://images.ctfassets.net data:",
    "font-src 'self'",
    "connect-src 'self' https://vitals.vercel-insights.com https://va.vercel-scripts.com",
    `frame-ancestors 'self'${cmsFraming ? " https://app.contentful.com" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Severs window.opener both ways. same-origin, not -allow-popups, because
  // nothing here keeps talking to a window it opens.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy(),
  },
];

// /search and /pagefind/* only. The worker script carries its own CSP. Must
// follow the catch-all, because later rules win. [→ `csp-scoping`]
const wasmCspHeaders = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy({ wasm: true }),
  },
];

// The only documents Contentful frames for preview. [→ `csp-scoping`]
const previewCspHeaders = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy({ cmsFraming: true }),
  },
];

module.exports = {
  // Suppresses free stack fingerprinting.
  poweredByHeader: false,
  // Stops next dev writing a managed block into the tracked CLAUDE.md on every
  // start, a diff easily committed by mistake.
  agentRules: false,
  images: {
    loader: "custom",
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        source: "/search",
        headers: wasmCspHeaders,
      },
      {
        source: "/search/:path*",
        headers: wasmCspHeaders,
      },
      {
        source: "/pagefind/:path*",
        headers: wasmCspHeaders,
      },
      {
        source: "/posts/:path*",
        headers: previewCspHeaders,
      },
      {
        source: "/de/posts/:path*",
        headers: previewCspHeaders,
      },
      {
        // Noindexes the bare route only. Headers match the requested path, so
        // /sitemap.xml, rewritten here below, is untouched.
        source: "/sitemap-xml",
        headers: [{ key: "X-Robots-Tag", value: "noindex" }],
      },
    ];
  },
  async redirects() {
    // Renamed post slugs that still get visits. Archived posts stay 404 unless
    // a published post genuinely replaces them.
    return [
      {
        source: "/posts/static-site-search",
        destination: "/posts/static-site-search-pagefind",
        permanent: true,
      },
      // Home and the strand pages have no pager. [→ `strands`]
      { source: "/page/:n", destination: "/archive", permanent: true },
      {
        source: "/categories/:slug/page/:n",
        destination: "/categories/:slug",
        permanent: true,
      },
      // Tag and author pages list every post too. [→ `listing-shell`]
      {
        source: "/tags/:slug/page/:n",
        destination: "/tags/:slug",
        permanent: true,
      },
      {
        source: "/authors/:slug/page/:n",
        destination: "/authors/:slug",
        permanent: true,
      },
      // Main Quest became Blogging. Side Quests split into Films and Games &
      // Gadgets, so it lands on home, where both chips are.
      {
        source: "/categories/main-quest/:path*",
        destination: "/categories/blogging",
        permanent: true,
      },
      {
        source: "/categories/side-quests/:path*",
        destination: "/",
        permanent: true,
      },
      // No index pages for strands or writers: the chips and mascots are the
      // way in. [→ `listing-shell`]
      { source: "/categories", destination: "/", permanent: true },
      { source: "/authors", destination: "/about", permanent: true },
      // Tags never repeat a strand, so these two retired into theirs.
      {
        source: "/tags/film/:path*",
        destination: "/categories/films",
        permanent: true,
      },
      {
        source: "/tags/blogging/:path*",
        destination: "/categories/blogging",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    // Next's own /sitemap.xml ignores tag invalidation. This afterFiles rewrite
    // fires only while no app/sitemap.xml file exists.
    return [{ source: "/sitemap.xml", destination: "/sitemap-xml" }];
  },
};
