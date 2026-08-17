"use client";

import { useEffect } from "react";

// Home hides the bar's wordmark outright (see globals.css's
// `body:has(.site-masthead) .site-wordmark` rule) because the band's masthead
// already names the site 60px below. This is the enhancement on top: once the
// reader scrolls the masthead out of view, the wordmark is the only
// wayfinding left in the row, so it fades back in.
//
// Renders on every page rather than only home. Cheaper than threading a
// usePathname check through the layout, and off home the querySelector below
// is a single failed lookup with no observer and no listener left behind.
export default function WordmarkFade() {
  useEffect(() => {
    const masthead = document.querySelector(".site-masthead");
    if (!masthead) return;

    // Marks <body> so globals.css can swap its no-JS `display: none`
    // fallback for an opacity fade. Kept as a separate class from
    // `wordmark-visible` below rather than folded into one: without it, a
    // reader who loads the page already scrolled past the masthead would have
    // the fade rules active but `wordmark-visible` not yet set by the
    // observer's first callback, and the wordmark would flash hidden for a
    // frame instead of the fallback's steady state carrying through.
    document.body.classList.add("js-wordmark-observed");

    const observer = new IntersectionObserver(
      ([entry]) => {
        document.body.classList.toggle(
          "wordmark-visible",
          !entry.isIntersecting,
        );
      },
      // Accounts for the sticky bar sitting over the top of the viewport. 52px
      // is the bar's height, which is min-h-13 in app/layout.tsx's Header and
      // is computed there from py-3 plus the wordmark's own line box. Recompute
      // this if that changes, the same dependency the skip link's focus:top-2
      // and globals.css's scroll-padding-top already carry.
      { rootMargin: "-52px 0px 0px 0px" },
    );
    observer.observe(masthead);
    return () => observer.disconnect();
  }, []);

  return null;
}
