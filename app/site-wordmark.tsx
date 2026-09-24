"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { scrollToTop } from "@/lib/scroll-to-top";

// A link home, except on home, where it is a button that scrolls to top: a
// same-URL Link in Next 16 neither navigates nor scrolls. The title arrives as a
// prop so lib/constants.ts stays out of the client bundle. [→ `wide-page-shell`]
export default function SiteWordmark({ title }: { title: string }) {
  const isHome = usePathname() === "/";

  // .site-wordmark on both branches, or the home fade silently breaks.
  const shared =
    "site-wordmark font-display text-lg font-[700] text-white rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white";

  if (isHome) {
    return (
      <button
        type="button"
        onClick={scrollToTop}
        className={`${shared} cursor-pointer`}
      >
        {title}
        {/* An sr-only suffix, not aria-label, so the name still contains the
            visible text (WCAG 2.5.3). */}
        <span className="sr-only">, back to top</span>
      </button>
    );
  }

  return (
    <Link href="/" className={shared}>
      {title}
    </Link>
  );
}
