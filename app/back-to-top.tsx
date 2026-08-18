"use client";

import { useEffect, useState } from "react";
import { scrollToTop } from "@/lib/scroll-to-top";

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 600);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    /* A deliberate exception to the sitewide crimson focus outline, and the
       first of two: app/exit-preview-button.tsx is the other position:fixed
       control (draft mode only) and carries the same ring for the same reason.
       A fixed control's indicator floats over unknown ground — light page,
       dark page, the footer band, a code block. No single colour clears 3:1 against all of those: crimson is
       2.19:1 on the light-mode footer (#9E2238 on #241B1D), which is where it
       was caught. The white ring plus dark offset is a two-tone indicator —
       whichever tone loses contrast against the background, the other carries
       (white is 18.7:1 on the dark page, the dark offset is 15.5:1 on the light
       page). Do not "simplify" this to the base outline. */
    /* opacity-0 and pointer-events-none hide it visually but leave it in the
       tab order, so keyboard users landed on an invisible control near the top
       of every page. inert removes it from both the tab order and the
       accessibility tree while it is hidden.

       inert is also why the click handler moves focus. The button goes inert
       the moment scrollY drops under 600, which happens while the smooth
       scroll it just started is still running — so the element holding focus
       becomes unfocusable a beat after it was activated, and focus falls to
       <body>. lib/scroll-to-top.ts moves it to #main first. Removing that call
       looks harmless and ejects every keyboard reader who uses this button. */
    <button
      type="button"
      aria-label="Back to top"
      inert={!visible}
      onClick={scrollToTop}
      className={`fixed bottom-6 right-12 z-50 flex h-11 w-11 items-center justify-center rounded-full border-2 border-gray-400 bg-surface-dark text-white shadow-lg transition-opacity duration-200 hover:bg-brand-crimson focus:outline-hidden focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-surface-dark ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 19V5" />
        <path d="m5 12 7-7 7 7" />
      </svg>
    </button>
  );
}
