"use client";

import { useEffect } from "react";

// Home hides the bar's wordmark outright (see globals.css's
// `body:has(.site-masthead) .site-wordmark` rule) because the masthead
// already names the site 60px below. This is the enhancement on top: once the
// reader scrolls the masthead out of view, the wordmark is the only
// wayfinding left in the row, and it fades back in.
//
// Renders on every page, not only home — cheaper than threading a
// usePathname check through, and the querySelector below is a no-op (one
// failed lookup, no observer, no listener) everywhere the masthead does not
// exist.
export default function WordmarkFade() {
  useEffect(() => {
    const masthead = document.querySelector(".site-masthead");
    if (!masthead) return;

    // Marks <body> so globals.css can swap its no-JS `display: none`
    // fallback for an opacity fade. Kept as a separate class from
    // `wordmark-visible` below rather than folded into one: without it, a
    // reader who loads the page already scrolled past the masthead would
    // have the fade rules active but `wordmark-visible` not yet set by the
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
      // Accounts for the sticky bar sitting over the top of the viewport: the
      // 52px figure is the desktop bar height (see app/layout.tsx's Header),
      // the taller of its two responsive heights, so the wordmark never fades
      // in a frame early on the 48px mobile bar.
      { rootMargin: "-52px 0px 0px 0px" },
    );
    observer.observe(masthead);
    return () => observer.disconnect();
  }, []);

  return null;
}
