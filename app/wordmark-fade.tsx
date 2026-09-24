"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Fades the bar's wordmark back in on home once the masthead scrolls away;
// globals.css hides it without JS. It observes the masthead and leaves the
// meaning to CSS. Re-runs on pathname, because RootLayout survives client
// navigation and would otherwise watch a stale masthead. [→ `wide-page-shell`]
export default function WordmarkFade() {
  const pathname = usePathname();

  useEffect(() => {
    const body = document.body;

    // Cleared on every run, so no route inherits the last one's state.
    const clear = () =>
      body.classList.remove("js-wordmark-observed", "wordmark-visible");

    const masthead = document.querySelector(".site-masthead");
    if (!masthead) {
      clear();
      return;
    }

    // A separate class from wordmark-visible, so a page loaded already
    // scrolled does not flash hidden before the first callback.
    body.classList.add("js-wordmark-observed");

    const observer = new IntersectionObserver(
      ([entry]) => {
        body.classList.toggle("wordmark-visible", !entry.isIntersecting);
      },
      // The 52px bar; recompute with the header's height.
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
