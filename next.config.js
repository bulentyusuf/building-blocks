/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV !== "production";

const baseScriptSrc = `'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://va.vercel-scripts.com`;

// Global security headers — no wasm-unsafe-eval here
const baseSecurityHeaders = [
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
    value: [
      "default-src 'self'",
      // 'unsafe-inline' is kept deliberately (see README/CLAUDE.md).
      `script-src ${baseScriptSrc}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' https://images.ctfassets.net data: blob:",
      "font-src 'self'",
      "connect-src 'self' https://vitals.vercel-insights.com https://va.vercel-scripts.com",
      "frame-ancestors 'self' https://app.contentful.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

module.exports = {
  images: {
    loader: "custom",
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  },
  async headers() {
    // More permissive CSP only for search UI and pagefind assets where Pagefind's WASM runs
    const searchScriptSrc = `'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""} https://va.vercel-scripts.com`;

    const searchSecurityHeaders = [
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          `script-src ${searchScriptSrc}`,
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' https://images.ctfassets.net data: blob:",
          "font-src 'self'",
          "connect-src 'self' https://vitals.vercel-insights.com https://va.vercel-scripts.com",
          "frame-ancestors 'self' https://app.contentful.com",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join("; "),
      },
    ];

    return [
      // Relaxed policy for the search page (SearchClient mounts Pagefind here)
      {
        source: "/search(.*)",
        headers: searchSecurityHeaders,
      },
      // Relaxed policy for pagefind static assets under public/pagefind
      {
        source: "/pagefind/:path*",
        headers: searchSecurityHeaders,
      },
      // Keep the sitemap special-case noindex
      {
        source: "/sitemap-xml",
        headers: [{ key: "X-Robots-Tag", value: "noindex" }],
      },
      // Catch-all: the stricter base headers (no wasm-unsafe-eval)
      {
        source: "/(.*)",
        headers: baseSecurityHeaders,
      },
    ];
  },
  async rewrites() {
    return [{ source: "/sitemap.xml", destination: "/sitemap-xml" }];
  },
};
