"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { scrollToTop } from "@/lib/scroll-to-top";

// The site name in the sticky bar. A link to home on every route, and on home
// itself a button that returns the reader to the top.
//
// Not a link on home, because in Next 16 a same-URL Link click is treated as a
// leaf-segment refresh rather than a route change, and only a route change is
// assigned a scroll target — so an href there navigated nowhere and scrolled
// nowhere. A button is also the honest element for it: this performs an action
// on the page the reader is already on rather than taking them somewhere.
//
// On home it is only ever visible once the masthead has scrolled out of view
// (see globals.css and app/wordmark-fade.tsx), which is precisely when
// returning to the top is worth offering. Before that the reader is already
// there and the control is hidden.
//
// Client-side only for the pathname. Header stays a server component and this
// is the one element inside it that needs to know where it is. SITE_TITLE
// arrives as a prop rather than through @/lib/constants, so that module's
// module-scope URL resolution stays out of the browser bundle.
export default function SiteWordmark({ title }: { title: string }) {
  const isHome = usePathname() === "/";

  // .site-wordmark is what globals.css's hide-and-fade rules target, so it
  // must be present on BOTH branches. Losing it on either one breaks the fade
  // on home, and it fails silently.
  //
  // Both branches carry the focus ring now. The span this button replaces took
  // no focus, so it deliberately had none; a button does, and an unringed one
  // on the coloured bar is invisible to a keyboard reader.
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
        {/* The visible text names the site, not the action. An sr-only suffix
            rather than an aria-label, so the accessible name still CONTAINS
            the visible string and WCAG 2.5.3 Label in Name holds — an
            aria-label of "Back to top" alone would replace it and break that.
            Same device as the archive's "in " and its year suffix. */}
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
