import "./globals.css";
import { Bricolage_Grotesque, Literata } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import {
  SITE_TITLE,
  SITE_DESCRIPTION,
  SITE_URL,
  SITE_REPO_URL,
  SITE_FOOTER_BLURB,
  BRAND_HEADER_COLOR,
  BRAND_HEADER_COLOR_DARK,
  DEFAULT_LOCALE,
  DEFAULT_OG_LOCALE,
} from "@/lib/constants";
import BackToTop from "./back-to-top";
import SidenoteEnterKey from "./sidenote-enter-key";
import NewWindowHint from "./new-window-hint";
import Link from "next/link";
import { draftMode } from "next/headers";
import { ExitPreviewButton } from "./exit-preview-button";
export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_TITLE}`,
  },
  description: SITE_DESCRIPTION,
  icons: {
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_TITLE,
    images: [
      {
        url: "/be_useful.jpg",
        width: 1200,
        height: 630,
        alt: SITE_TITLE,
      },
    ],
    type: "website",
    locale: DEFAULT_OG_LOCALE,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/be_useful.jpg"],
  },
  alternates: {
    types: {
      "application/rss+xml": "/feed.xml",
    },
  },
};
export const viewport = {
  // Scheme-aware so the mobile address bar matches the header band in both
  // modes. colorScheme lets the UA theme native controls and scrollbars.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: BRAND_HEADER_COLOR },
    { media: "(prefers-color-scheme: dark)", color: BRAND_HEADER_COLOR_DARK },
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
};
// Two faces, three jobs — see the token block in globals.css. latin-ext on both
// is deliberate: the capital eszett ẞ (U+1E9E) sits in that range and de-DE will
// need it. German low-9 quotes „ (U+201E) are already inside latin.
//
// opsz only. The wdth axis (75-100) is why Bricolage is the right long-term
// choice — it lets a long German compound narrow rather than drop a size step —
// but nothing reaches for it today and the axis costs bytes for no current
// benefit. Add it when the de-DE work actually needs it.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  axes: ["opsz"],
});
// Literata carries the italic because it is the prose face: <em> in rich text
// and the figure captions were browser-synthesised slants before. Bricolage is
// roman only — a display italic is a separate decision.
const literata = Literata({
  variable: "--font-literata",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  style: ["normal", "italic"],
  axes: ["opsz"],
});
// Every nav item — the four section links and the search icon — shares this
// treatment: small-caps, muted by default so the wordmark stays the loudest
// thing in the row, full white on hover/focus.
const navLink =
  "font-ui text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80 hover:text-white transition-colors duration-200 rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white";

function Header() {
  return (
    <header className="sticky top-0 z-50 w-full bg-brand-header shadow-xs">
      {/* min-h-13 is 52px, which is py-3's 24px plus the 28px line box
          leading-7 sets on the wordmark explicitly (its 16px text carries no
          default that tall). It is here because the bar's height must not be
          a function of which of its children happen to render. Nothing else
          in the row is as tall — the nav items are 11px — so on home, where
          the wordmark hides, the bar was rendering 8px shorter and the chrome
          changed height as the reader navigated. */}
      <div className="max-w-5xl mx-auto px-5 py-3 min-h-13 flex items-center justify-between gap-4">
        {/* Both hide themselves on home, where the masthead names the site
            60px below and the bar would say it twice. The rule is a :has() in
            globals.css rather than a usePathname, so this stays a server
            component and the site ships no JS for it.

            The cost, on the record rather than left to be quietly fixed later:
            past the masthead, home's sticky bar is the nav and the search
            control with no site name in it. The wordmark is wayfinding for a
            reader deep in the site, and on home they are not deep in the site.
            It returns the moment they navigate anywhere else. Do not add a
            scroll listener or an IntersectionObserver to fill the gap, and do
            not reach for a mark, because none exists in public/. */}
        <div className="flex items-baseline gap-3">
          <Link
            href="/"
            className="site-wordmark font-display text-[16px] leading-7 font-[700] text-white rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
          >
            {SITE_TITLE}
          </Link>
          <p className="site-tagline hidden lg:block text-xs text-white/72">
            {SITE_DESCRIPTION}
          </p>
        </div>
        <nav aria-label="Primary" className="flex items-center gap-4 md:gap-6">
          <Link href="/categories" className={navLink}>
            Categories
          </Link>
          <Link href="/tags" className={navLink}>
            Tags
          </Link>
          <Link href="/archive" className={navLink}>
            Archive
          </Link>
          <Link href="/about" className={navLink}>
            About
          </Link>
          {/* Icon-only link: the accessible name comes from aria-label, and
              the SVG is hidden from assistive tech so it is not announced as
              an unlabelled image. No icon library — inline SVG keeps the
              dependency count at zero. */}
          <Link
            href="/search"
            aria-label="Search"
            title="Search"
            className={`p-2 -m-2 ${navLink}`}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              className="h-5 w-5"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </Link>
        </nav>
      </div>
    </header>
  );
}
// Shared link treatment for the footer: quiet by default, visible focus ring
// matching the skip-link convention above.
// Full white at rest, not the usual muted-then-full pattern the nav links
// use: a footer column is nothing but links, so there is no louder sibling
// for a quieter default to defer to. Dims slightly on hover instead.
const footerLink =
  "font-ui text-white hover:text-white/80 transition-colors duration-200 rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white";

function Footer() {
  return (
    <footer className="bg-brand-header text-white">
      <div className="max-w-5xl mx-auto px-5 py-12 md:py-16">
        <div className="grid gap-8 md:grid-cols-[2fr_1fr_1fr] md:gap-12">
          {/* Column 1 — masthead + blurb */}
          <div>
            <p className="font-display text-2xl font-[700] text-white">
              {SITE_TITLE}
            </p>
            <p className="mt-3 max-w-sm text-sm text-white/80">
              {SITE_FOOTER_BLURB}
            </p>
          </div>

          {/* Column 2 — browse: top-level section links. */}
          {/* The column label is a <p>, not a heading. As an <h4> it sat
              directly after the page's h2s and skipped a level on every page
              whose deepest heading is an h2 — post pages, /about, /privacy,
              /search and all four browse indexes — which axe reports as
              heading-order. Promoting it to h2 instead would flip it to
              Bricolage, since globals.css gives the display face to h1-h3. It
              loses nothing as a <p>: the nav already carries aria-label="Browse",
              so the landmark is named either way. Same for Colophon below. */}
          <nav aria-label="Browse">
            <p className="font-ui text-xs font-bold uppercase tracking-widest text-white/72">
              Browse
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link href="/categories" className={footerLink}>
                  Categories
                </Link>
              </li>
              <li>
                <Link href="/tags" className={footerLink}>
                  Tags
                </Link>
              </li>
              <li>
                <Link href="/authors" className={footerLink}>
                  Authors
                </Link>
              </li>
              <li>
                <Link href="/archive" className={footerLink}>
                  Archive
                </Link>
              </li>
              <li>
                <Link href="/search" className={footerLink}>
                  Search
                </Link>
              </li>
            </ul>
          </nav>

          {/* Column 3 — colophon */}
          <nav aria-label="Colophon">
            <p className="font-ui text-xs font-bold uppercase tracking-widest text-white/72">
              Colophon
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link href="/about" className={footerLink}>
                  About
                </Link>
              </li>
              <li>
                <a
                  href={SITE_REPO_URL}
                  className={footerLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Fork this blog on GitHub
                  <NewWindowHint />
                </a>
              </li>
              <li>
                <a href="/feed.xml" className={footerLink}>
                  RSS feed
                </a>
              </li>
              <li>
                <Link href="/privacy" className={footerLink}>
                  Privacy
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 border-t border-white/10 pt-8">
          <p className="font-ui text-xs text-white/72">
            © {new Date().getFullYear()} Bulent Yusuf · Built with Next.js &
            Contentful · Type set in Bricolage Grotesque and Literata
          </p>
        </div>
      </div>
    </footer>
  );
}
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isEnabled } = await draftMode();
  return (
    <html
      lang={DEFAULT_LOCALE}
      className={`${bricolage.variable} ${literata.variable}`}
    >
      <body className="min-h-screen flex flex-col bg-brand-bg text-brand-dark">
        {/* top-2 centres the 36px link in the 52px header band. If the header's
            py-3 or the masthead's text-lg ever changes, this needs revisiting —
            it is a computed value, not an arbitrary one. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-[100] focus:rounded-md focus:bg-brand-header focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white focus:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
        >
          Skip to content
        </a>
        <link rel="preconnect" href="https://images.ctfassets.net" />
        <Header />
        {/* tabIndex={-1} makes the skip link's target focusable. Following a
            fragment moves the sequential-focus starting point in current
            Chrome and Firefox, so Tab continues from here — but it does not
            move focus itself, and Safari has historically not moved the
            starting point either, leaving the reader who just used the skip
            link tabbing from the top of the document again. One attribute,
            and the link keeps its promise everywhere. It adds no tab stop:
            -1 is reachable programmatically, never sequentially. */}
        <main id="main" tabIndex={-1} className="grow">
          {children}
        </main>
        <Footer />
        {isEnabled && <ExitPreviewButton />}
        <BackToTop />
        <SidenoteEnterKey />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
