"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Home hides the bar's wordmark outright (see globals.css's
// `body:has(.site-masthead) .site-wordmark` rule) because the band's masthead
// already names the site 60px below. This is the enhancement on top: once the
// reader scrolls the masthead out of view, the wordmark is the only
// wayfinding left in the row, so it fades back in.
//
// This component does not know about the wordmark by name — it observes the
// masthead and reports whether it is on screen, and globals.css decides what
// that means. Adding another element to the bar needs no change here.
//
// Renders on every page rather than only home. Off home the querySelector
// below is a single failed lookup, and the cleanup has already cleared both
// body classes, so nothing is left behind.
//
// usePathname is a re-run trigger, not a route check. RootLayout does not
// unmount across a client-side navigation, so with an empty dependency array
// this effect ran once for the life of the tab: the observer stayed bound to
// the first masthead element it ever saw, and returning to home mounted a new
// one it was not watching. wordmark-visible then held whatever value the
// reader left home with. The querySelector below still decides whether there
// is anything to observe — that part never needed the pathname.
export default function WordmarkFade() {
  const pathname = usePathname();

  useEffect(() => {
    const body = document.body;

    // Both classes are cleared on every run, not only on the home branch. A
    // route with no masthead must not inherit the previous route's state, and
    // the CSS is inert there so nothing would reveal a stale class until the
    // reader came back.
    const clear = () =>
      body.classList.remove("js-wordmark-observed", "wordmark-visible");

    const masthead = document.querySelector(".site-masthead");
    if (!masthead) {
      clear();
      return;
    }

    // Marks <body> so globals.css can swap its no-JS `display: none`
    // fallback for an opacity fade. Kept as a separate class from
    // `wordmark-visible` below rather than folded into one: without it, a
    // reader who loads the page already scrolled past the masthead would have
    // the fade rules active but `wordmark-visible` not yet set by the
    // observer's first callback, and the wordmark would flash hidden for a
    // frame instead of the fallback's steady state carrying through.
    body.classList.add("js-wordmark-observed");

    const observer = new IntersectionObserver(
      ([entry]) => {
        body.classList.toggle("wordmark-visible", !entry.isIntersecting);
      },
      // Accounts for the sticky bar sitting over the top of the viewport. 52px
      // is the bar's height, which is min-h-13 in app/layout.tsx's Header and
      // is computed there from py-3 plus the wordmark's own line box. Recompute
      // this if that changes, the same dependency the skip link's focus:top-2
      // and globals.css's scroll-padding-top already carry.
      { rootMargin: "-52px 0px 0px 0px" },
    );
    observer.observe(masthead);

    return () => {
      observer.disconnect();
      clear();
    };
  }, [pathname]);

  return null;
}
