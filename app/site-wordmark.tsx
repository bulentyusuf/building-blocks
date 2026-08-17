"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The site name in the sticky bar. A link to home on every route, and plain
// text on home itself.
//
// Not because a link to the current page is forbidden — it is not, and no
// success criterion prohibits one — but because in Next 16 this particular
// link does nothing. A same-URL Link click is treated as a leaf-segment
// refresh rather than a route change, and only a route change is assigned a
// scroll target, so clicking it from a scrolled home neither navigates nor
// returns the reader to the top. A control that silently does nothing is
// worse than no control.
//
// It renders as text rather than disappearing, because the bar's own layout
// depends on it: the row's height is set by this element's line box (see the
// min-h note in app/layout.tsx), and on home the fade in globals.css needs
// something carrying .site-wordmark to fade.
//
// Client-side only for the pathname. Header stays a server component and this
// is the one element inside it that needs to know where it is. SITE_TITLE
// arrives as a prop rather than through @/lib/constants, so that module's
// module-scope URL resolution stays out of the browser bundle.
export default function SiteWordmark({ title }: { title: string }) {
  const isHome = usePathname() === "/";

  // .site-wordmark carries view-transition-name and is what globals.css's
  // hide-and-fade rules target, so it must be present on BOTH branches. Losing
  // it on either one breaks the fade on home or the name morph everywhere
  // else, and neither fails loudly.
  const shared = "site-wordmark font-display text-lg font-[700] text-white";

  if (isHome) {
    // No focus utilities: a span takes no focus, so a ring here would be a
    // dead rule claiming otherwise.
    return <span className={shared}>{title}</span>;
  }

  return (
    <Link
      href="/"
      className={`${shared} rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white`}
    >
      {title}
    </Link>
  );
}
