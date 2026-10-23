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
    /* Two-tone ring: a fixed control floats over grounds no single colour
       clears. inert while hidden keeps it out of the tab order, which is why
       the click moves focus to #main. [→ `focus-indicator`] */
    <button
      type="button"
      aria-label="Back to top"
      inert={!visible}
      onClick={scrollToTop}
      className={`fixed bottom-6 right-12 z-50 flex size-12 items-center justify-center rounded-xl border-[3px] border-brand-dark bg-brand-bg text-brand-dark shadow-[4px_4px_0_var(--color-brand-crimson)] transition-[opacity,translate,box-shadow] duration-150 hover:translate-[4px] hover:shadow-none motion-reduce:transition-none focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-dark focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg ${
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
