import "./globals.css";
import { Bricolage_Grotesque, IBM_Plex_Mono, Literata } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import {
  SITE_TITLE,
  SITE_DESCRIPTION,
  SITE_URL,
  SITE_AUTHOR,
  SITE_REPO_URL,
  SITE_FOOTER_BLURB,
  THEME_COLOR,
  THEME_COLOR_DARK,
  DEFAULT_LOCALE,
  DEFAULT_OG_LOCALE,
} from "@/lib/constants";
import BackToTop from "./back-to-top";
import SiteWordmark from "./site-wordmark";
import PeekingMascots from "./peeking-mascots";
import NewWindowHint from "./new-window-hint";
import NavDisclosure from "./nav-disclosure";
import Link from "next/link";
import { draftMode } from "next/headers";
import { ExitPreviewButton } from "./exit-preview-button";
import { getAllAuthors } from "@/lib/api";
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
  // [→ `brand-colour-duplication`]
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLOR },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLOR_DARK },
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
// No adjusted fallback: next/font sizes it against Arial, which is
// proportional.
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  adjustFontFallback: false,
});

// Written as paths; the slash is decoration and stays out of the name.
const NAV_LINKS = [
  { href: "/tags", label: "tags" },
  { href: "/archive", label: "archive" },
  { href: "/about", label: "about" },
  { href: "/search", label: "search" },
];

const navLink =
  "font-mono text-sm font-medium text-brand-dark hover:text-brand-crimson transition-colors duration-200";

function Path({ label }: { label: string }) {
  return (
    <>
      <span aria-hidden="true">/</span>
      {label}
    </>
  );
}

function Header() {
  return (
    <header className="relative z-50 w-full">
      {/* The minimum height is the menu button plus padding, so the header
          keeps one height on home, where the logo hides. */}
      <div className="max-w-frame mx-auto px-4 md:px-10 pt-6 pb-2 min-h-20 flex items-center justify-between gap-4">
        {/* A button on home, a link elsewhere. [→ `wide-page-shell`] */}
        <SiteWordmark title={SITE_TITLE} />
        {/* Mobile nav in a disclosure, desktop nav inline; exactly one is in
            the accessibility tree. */}
        <nav aria-label="Primary" className="ml-auto flex items-center">
          <NavDisclosure>
            <summary
              aria-label="Menu"
              className="list-none cursor-pointer select-none flex size-12 items-center justify-center rounded-xl border-[3px] border-brand-dark bg-brand-bg text-brand-dark shadow-[3px_3px_0_var(--color-brand-crimson)] transition-[translate,box-shadow] duration-150 hover:translate-[3px] hover:shadow-none motion-reduce:transition-none"
            >
              {/* Two icons, swapped by the [open] attribute with no JS. The X
                  is what tells a reader how to close the menu. */}
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                className="h-5 w-5 group-open:hidden"
              >
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                className="hidden h-5 w-5 group-open:block"
              >
                <path d="M5 5l14 14M5 19L19 5" />
              </svg>
            </summary>
            {/* Scrim under the open menu, below the header. It must ignore
                pointer events, or the outside-tap handler sees a tap inside
                and will not close. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-full z-40 hidden h-dvh bg-black/40 group-open:block"
            />
            <div className="absolute right-5 top-full z-50 mt-2 min-w-[12rem] rounded-xl border-[3px] border-brand-dark bg-brand-bg px-4 py-3 shadow-[4px_4px_0_var(--color-brand-crimson)]">
              <ul>
                {NAV_LINKS.map(({ href, label }) => (
                  <li key={href}>
                    {/* 44px rows on touch screens. */}
                    <Link
                      href={href}
                      className={`${navLink} flex min-h-11 items-center`}
                    >
                      <Path label={label} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </NavDisclosure>
          <div className="hidden md:flex items-center gap-5">
            {NAV_LINKS.map(({ href, label }) => (
              <Link key={href} href={href} className={navLink}>
                <Path label={label} />
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
}

const footerLink =
  "font-mono text-sm text-brand-dark hover:text-brand-crimson transition-colors duration-200";

// Column labels are <p>, not headings. [→ `announced-links`]
function FooterLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-sm font-medium text-brand-muted">
      <span aria-hidden="true">// </span>
      {children}
    </p>
  );
}

async function Footer({ isDraftMode }: { isDraftMode: boolean }) {
  const authors = await getAllAuthors(isDraftMode);
  return (
    <footer>
      <div className="max-w-frame mx-auto px-4 md:px-10">
        <PeekingMascots authors={authors} />
        <div className="border-t-[3px] border-brand-dark pt-10 pb-12">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-[2fr_1fr_1fr] md:gap-12">
            <div className="col-span-2 md:col-span-1">
              {/* Not a link, so no shadow: a shadow means pressable. */}
              <p className="inline-block -rotate-2 rounded-lg bg-brand-dark px-3 py-1 font-display text-xl font-[800] text-brand-bg">
                {SITE_TITLE}
              </p>
              <p className="mt-4 max-w-sm text-base">{SITE_FOOTER_BLURB}</p>
            </div>

            <nav aria-label="Browse">
              <FooterLabel>browse</FooterLabel>
              <ul className="mt-3">
                {[
                  ["/categories", "categories"],
                  ["/tags", "tags"],
                  ["/authors", "authors"],
                  ["/archive", "archive"],
                  ["/search", "search"],
                ].map(([href, label]) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className={`${footerLink} inline-flex min-h-11 items-center md:min-h-8`}
                    >
                      <Path label={label} />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-label="Colophon">
              <FooterLabel>colophon</FooterLabel>
              <ul className="mt-3">
                <li>
                  <Link
                    href="/about"
                    className={`${footerLink} inline-flex min-h-11 items-center md:min-h-8`}
                  >
                    <Path label="about" />
                  </Link>
                </li>
                <li>
                  <a
                    href={SITE_REPO_URL}
                    className={`${footerLink} inline-flex min-h-11 items-center md:min-h-8`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    fork_on_github
                    <NewWindowHint />
                  </a>
                </li>
                <li>
                  <a
                    href="/feed.xml"
                    className={`${footerLink} inline-flex min-h-11 items-center md:min-h-8`}
                  >
                    rss_feed
                  </a>
                </li>
                <li>
                  <Link
                    href="/privacy"
                    className={`${footerLink} inline-flex min-h-11 items-center md:min-h-8`}
                  >
                    <Path label="privacy" />
                  </Link>
                </li>
              </ul>
            </nav>
          </div>

          <p className="mt-10 font-ui text-sm text-brand-muted">
            © {new Date().getFullYear()} {SITE_AUTHOR} · Type set in Bricolage
            Grotesque, Literata and IBM Plex Mono
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
      className={`${bricolage.variable} ${literata.variable} ${literataItalic.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://images.ctfassets.net" />
      </head>
      <body className="min-h-screen flex flex-col bg-brand-bg text-brand-dark">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-[100] focus:rounded-md focus:bg-brand-dark focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-brand-bg"
        >
          Skip to content
        </a>
        <Header />
        {/* [→ `skip-link`] */}
        <main id="main" tabIndex={-1} className="grow">
          {children}
        </main>
        <Footer isDraftMode={isEnabled} />
        {isEnabled && <ExitPreviewButton />}
        <BackToTop />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
