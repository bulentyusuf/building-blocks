import "./globals.css";
import { Bricolage_Grotesque, Literata } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import {
  SITE_TITLE,
  SITE_DESCRIPTION,
  SITE_URL,
  SITE_AUTHOR,
  SITE_REPO_URL,
  SITE_FOOTER_BLURB,
  BRAND_HEADER_COLOR,
  BRAND_HEADER_COLOR_DARK,
  DEFAULT_LOCALE,
  DEFAULT_OG_LOCALE,
} from "@/lib/constants";
import BackToTop from "./back-to-top";
import SidenoteEnterKey from "./sidenote-enter-key";
import WordmarkFade from "./wordmark-fade";
import SiteWordmark from "./site-wordmark";
import NewWindowHint from "./new-window-hint";
import NavDisclosure from "./nav-disclosure";
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
  // Scheme-aware so the mobile address bar matches the sticky bar in both
  // modes. TS literals, not the CSS token — neither this export nor the PWA
  // manifest can read a custom property. [→ `chrome-aubergine`, `brand-colour-duplication`]
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: BRAND_HEADER_COLOR },
    { media: "(prefers-color-scheme: dark)", color: BRAND_HEADER_COLOR_DARK },
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
};
// [→ `font-subsets`, `type-roles`]
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz"],
});
// Split across two next/font/google calls so the italic can drop out of the
// preload set: `preload` is per-instance, and `style` is not a subset, so one
// call covering both styles preloads both or neither — `subsets` is the only
// per-file preload lever the package exposes (google/loader.js:102 keys
// preloading on subset membership).
//
// Both calls emit font-family: Literata, the real family name, so this is one
// family to the browser and native style matching resolves <i> to the italic
// faces — no CSS selector targets italic, or it would need to enumerate every
// container rich text renders into and fall back to synthetic oblique on
// anything missed.
//
// The italic still loads, on demand, with unchanged unicode-range coverage.
// What goes away is 113,196 B of High-priority bandwidth in <head> on every
// route, competing with the LCP hero image, on pages that paint no italic.
const literata = Literata({
  variable: "--font-literata",
  subsets: ["latin"],
  display: "swap",
  style: ["normal"],
  axes: ["opsz"],
});
// Referenced only for its side effect: the returned object must be assigned
// to a variable that is actually used (below, in the <html> class list) or
// next/font never emits this instance's faces at all. Nothing reads
// --font-literata-italic — the family name is what does the work, since both
// instances share it — but the variable still has to exist and be wired in.
const literataItalic = Literata({
  variable: "--font-literata-italic",
  subsets: ["latin"],
  display: "swap",
  style: ["italic"],
  axes: ["opsz"],
  preload: false,
});
function Header() {
  return (
    <header className="sticky top-0 z-50 w-full bg-brand-header shadow-xs">
      {/* min-h-13 is 52px: py-3's 24px plus the 28px line box the text-lg
          wordmark establishes. The bar's height must not depend on which
          children happen to render — nothing else in the row is as tall, so
          on home, where the wordmark hides, the bar rendered 8px shorter and
          the chrome changed height as the reader navigated. */}
      <div className="max-w-5xl mx-auto px-5 py-3 min-h-13 flex items-center justify-between gap-4">
        {/* The wordmark hides itself on home via a :has() rule.
            [→ `wide-page-shell`] It is a link on every route except home,
            where it is a button that returns the reader to the top — in
            Next 16 a same-URL Link click is a leaf-segment refresh rather
            than a route change, and only a route change gets a scroll
            target, so on home a Link would neither navigate nor scroll.
            See app/site-wordmark.tsx. */}
        <div className="flex items-baseline gap-3">
          <SiteWordmark title={SITE_TITLE} />
        </div>
        {/* On mobile the full nav sits inside a <details> disclosure so the
            bar stays at one row of links; from md up the disclosure is
            hidden outright and a second, inline copy takes over — mutually
            exclusive (md:hidden / hidden md:flex) so only one is ever in the
            accessibility tree. Not the table-of-contents mechanism, which
            keeps a single copy and forces it open with CSS: the two copies
            here are laid out differently (stacked panel vs. inline row), so
            a single copy would need the branch anyway. */}
        <nav aria-label="Primary" className="flex items-center gap-4">
          <NavDisclosure>
            <summary
              aria-label="Menu"
              className="list-none cursor-pointer select-none font-ui text-sm font-bold text-white hover:opacity-80 transition-opacity duration-200 rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white p-1 -m-1"
            >
              {/* Two icons, not one morphing path: the X is the only thing
                  on screen telling a reader how to get out of the menu.
                  group-open: reads the [open] attribute on the <details> in
                  nav-disclosure.tsx, the same hook the table of contents
                  chevron uses — no JS, no state, correct icon in the
                  server-rendered markup before hydration. */}
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                className="h-5 w-5 group-open:hidden"
              >
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                className="hidden h-5 w-5 group-open:block"
              >
                <path d="M5 5l14 14M5 19L19 5" />
              </svg>
            </summary>
            {/* Dims the page under the open menu, which otherwise reads as a
                competing layer rather than a menu over a page.
                absolute + top-full rather than fixed inset-0: the containing
                block is the sticky header, so the scrim starts immediately
                below it, keeping the header, wordmark and close X at full
                brightness. pointer-events-none is load-bearing: the scrim is
                a child of the <details>, so if it captured taps the
                outside-tap handler in nav-disclosure.tsx would see
                details.contains(target) === true and refuse to close. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-full z-40 hidden h-dvh bg-black/40 group-open:block"
            />
            <div className="absolute right-5 top-full z-50 mt-2 min-w-[12rem] rounded-lg border border-white/10 bg-brand-header px-4 py-3 shadow-lg">
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/categories"
                    className="font-ui text-sm font-bold text-white hover:opacity-80 transition-opacity duration-200 rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
                  >
                    Categories
                  </Link>
                </li>
                <li>
                  <Link
                    href="/tags"
                    className="font-ui text-sm font-bold text-white hover:opacity-80 transition-opacity duration-200 rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
                  >
                    Tags
                  </Link>
                </li>
                <li>
                  <Link
                    href="/authors"
                    className="font-ui text-sm font-bold text-white hover:opacity-80 transition-opacity duration-200 rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
                  >
                    Authors
                  </Link>
                </li>
                <li>
                  <Link
                    href="/archive"
                    className="font-ui text-sm font-bold text-white hover:opacity-80 transition-opacity duration-200 rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
                  >
                    Archive
                  </Link>
                </li>
                <li>
                  <Link
                    href="/about"
                    className="font-ui text-sm font-bold text-white hover:opacity-80 transition-opacity duration-200 rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
                  >
                    About
                  </Link>
                </li>
              </ul>
            </div>
          </NavDisclosure>
          <div className="hidden md:flex items-center gap-4 md:gap-6">
            <Link
              href="/categories"
              className="font-ui text-sm font-bold text-white hover:opacity-80 transition-opacity duration-200 rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
            >
              Categories
            </Link>
            <Link
              href="/tags"
              className="font-ui text-sm font-bold text-white hover:opacity-80 transition-opacity duration-200 rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
            >
              Tags
            </Link>
            <Link
              href="/authors"
              className="font-ui text-sm font-bold text-white hover:opacity-80 transition-opacity duration-200 rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
            >
              Authors
            </Link>
            <Link
              href="/archive"
              className="font-ui text-sm font-bold text-white hover:opacity-80 transition-opacity duration-200 rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
            >
              Archive
            </Link>
            <Link
              href="/about"
              className="font-ui text-sm font-bold text-white hover:opacity-80 transition-opacity duration-200 rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
            >
              About
            </Link>
          </div>
          {/* Icon-only link: accessible name from aria-label, SVG hidden
              from assistive tech so it isn't announced as an unlabelled
              image. p-3 -m-3 is the WCAG 2.5.5 touch target: padding grows
              the hit area to 44px while the matching negative margin
              cancels its footprint, so the bar's height calculation never
              sees it. The 36px it replaces already cleared 2.5.8's 24px AA
              floor — this is the AAA-grade figure, not a fix. */}
          <Link
            href="/search"
            aria-label="Search"
            title="Search"
            className="p-3 -m-3 text-white hover:opacity-80 transition-opacity duration-200 rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
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
//
// The footer's faintest tint is white/72, not white/65. [→ `chrome-aubergine`]
const footerLink =
  "font-ui text-white/80 hover:text-white transition-colors duration-200 rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white";

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
          {/* The column label is a <p>, not a heading. [→ `announced-links`]
              Same for Colophon below. */}
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
            © {new Date().getFullYear()} {SITE_AUTHOR} · Built with Next.js &
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
      className={`${bricolage.variable} ${literata.variable} ${literataItalic.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://images.ctfassets.net" />
      </head>
      <body className="min-h-screen flex flex-col bg-brand-bg text-brand-dark">
        {/* top-2 centres the 36px link in the 52px header band, a computed
            value. [→ `scroll-offset`] */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-[100] focus:rounded-md focus:bg-brand-header focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white focus:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
        >
          Skip to content
        </a>
        <Header />
        {/* tabIndex={-1} makes the skip link's target focusable.
            [→ `skip-link`] Adds no tab stop: -1 is reachable
            programmatically, never sequentially. */}
        <main id="main" tabIndex={-1} className="grow">
          {children}
        </main>
        <Footer />
        {isEnabled && <ExitPreviewButton />}
        <BackToTop />
        <SidenoteEnterKey />
        <WordmarkFade />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
