/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV !== "production";

// 'unsafe-inline' is kept deliberately. Removing it needs a per-request
// nonce, which on App Router forces dynamic rendering and disables static
// optimisation, ISR, and CDN HTML caching. Trusted-CMS, single-author threat
// model makes that trade not worth it. See CLAUDE.md.
// 'unsafe-eval' is added in development only. Turbopack and React need it for
// dev debugging features, and React never uses eval in production, so the
// production policy stays strict.
// 'wasm-unsafe-eval' permits WebAssembly compilation only (not JS eval). It is
// passed in by the /search rule below and deliberately absent from the base
// policy: Pagefind's search core compiles WASM on /search alone, so every
// other route serves the stricter form.
//
// cmsFraming adds Contentful to frame-ancestors, and is likewise passed in by
// one rule rather than sitting in the base policy. The preview surface is a
// single route family: the README configures the Post type's preview URL as
// /api/draft?…&slug={entry.fields.slug}, which redirects to /posts/<slug>, so
// that is the only document Contentful ever frames. It sat on the catch-all
// for a long time, which made every published page on the site framable by the
// CMS to buy preview on one of them.
//
// /api/draft deliberately does NOT carry it. frame-ancestors is enforced when
// a document is DISPLAYED in a frame, and a 302 is never displayed — the final
// /posts/<slug> response is the one the browser renders and checks. Adding a
// rule there would be a rule that never fires.
//
// If a Page entry (about, privacy) is ever given a preview URL of its own,
// this list is what has to grow with it, and preview will fail with a framing
// error rather than anything that names this file.
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
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy(),
  },
];

// The one relaxation: /search loads Pagefind, whose core compiles WebAssembly,
// so its document CSP adds 'wasm-unsafe-eval'. It carries only the CSP header;
// X-Content-Type-Options and friends still reach /search through the catch-all,
// whose other keys merge with this one.
//
// /pagefind/* also needs the relaxed CSP because Pagefind compiles WASM inside
// a SharedWorker (pagefind-worker.js). SharedWorkers get their CSP from the
// worker script's own response headers, not from the creating document, so
// the worker script must carry 'wasm-unsafe-eval' on its own response.
//
// ORDERING IS LOAD-BEARING. Next.js walks header rules in array order and a
// later match overwrites the same key, so the catch-all must come FIRST and
// these rules win by following it. Inverted (PR #425), /search silently loses
// 'wasm-unsafe-eval' and search fails in every Chromium browser with no
// visible error. lib/csp-headers.test.ts resolves this array through those
// semantics so the inversion cannot come back.
const wasmCspHeaders = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy({ wasm: true }),
  },
];

// The other relaxation, and it follows the catch-all for the same last-wins
// reason: /posts/* is the one document Contentful frames for live preview.
// Everything else on the site is framable by this origin alone.
const previewCspHeaders = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy({ cmsFraming: true }),
  },
];

module.exports = {
  // Off by default in Next; suppresses free stack fingerprinting for no
  // functional cost.
  poweredByHeader: false,
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
        // The dupe route. Crawlers only know /sitemap.xml. This marks the bare
        // /sitemap-xml URL noindex without touching /sitemap.xml, because header
        // source matching runs against the requested path, not the rewrite
        // destination.
        source: "/sitemap-xml",
        headers: [{ key: "X-Robots-Tag", value: "noindex" }],
      },
    ];
  },
  async rewrites() {
    // /sitemap.xml is a Next-reserved metadata path whose special route does
    // not honour on-demand tag invalidation. Serve our ordinary /sitemap-xml
    // route handler at the canonical /sitemap.xml instead. This is an
    // afterFiles rewrite, so it only fires because no /sitemap.xml file exists.
    return [{ source: "/sitemap.xml", destination: "/sitemap-xml" }];
  },
};
