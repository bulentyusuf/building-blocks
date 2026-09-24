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
  // TS literals because this export cannot read a custom property.
  // [→ `chrome-aubergine`, `brand-colour-duplication`]
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
// Italic is its own instance so it can stay out of the preload set; `preload`
// is per instance. Both emit the real family name, so <i> still resolves to the
// italic faces, which load on demand.
const literata = Literata({
  variable: "--font-literata",
  subsets: ["latin"],
  display: "swap",
  style: ["normal"],
  axes: ["opsz"],
});
// Must be wired into the <html> classes below, or next/font emits nothing.
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
      {/* The minimum height keeps the bar the same height on home, where the
          wordmark hides. */}
      <div className="max-w-5xl mx-auto px-5 py-3 min-h-13 flex items-center justify-between gap-4">
        {/* A button on home, a link elsewhere. [→ `wide-page-shell`] */}
        <div className="flex items-baseline gap-3">
          <SiteWordmark title={SITE_TITLE} />
        </div>
        {/* Mobile nav in a disclosure, desktop nav inline; exactly one is in
            the accessibility tree. The wider mobile gap keeps two 44px hit
            areas from overlapping. */}
        <nav aria-label="Primary" className="flex items-center gap-6 md:gap-4">
          <NavDisclosure>
            {/* 44px touch target, like Search. */}
            <summary
              aria-label="Menu"
              className="list-none cursor-pointer select-none font-ui text-sm font-bold text-white hover:opacity-80 transition-opacity duration-200 rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white p-3 -m-3"
            >
              {/* Two icons, swapped by the [open] attribute with no JS. The X
                  is what tells a reader how to close the menu. */}
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
            {/* Scrim under the open menu. It must ignore pointer events, or
                the outside-tap handler sees a tap inside and will not close. */}
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
          {/* Padding with a matching negative margin gives a 44px target
              without changing the bar's height. */}
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
// The footer's faintest tint is white/72. [→ `chrome-aubergine`]
const footerLink =
  "font-ui text-white/80 hover:text-white transition-colors duration-200 rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white";

function Footer() {
  return (
    <footer className="bg-brand-header text-white">
      <div className="max-w-5xl mx-auto px-5 py-12 md:py-16">
        <div className="grid gap-8 md:grid-cols-[2fr_1fr_1fr] md:gap-12">
          <div>
            <p className="font-display text-2xl font-[700] text-white">
              {SITE_TITLE}
            </p>
            <p className="mt-3 max-w-sm text-sm text-white/80">
              {SITE_FOOTER_BLURB}
            </p>
          </div>

          {/* Column labels are <p>, not headings. [→ `announced-links`] */}
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
        {/* Centred in the 52px bar. [→ `scroll-offset`] */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-[100] focus:rounded-md focus:bg-brand-header focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white focus:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
        >
          Skip to content
        </a>
        <Header />
        {/* [→ `skip-link`] */}
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
