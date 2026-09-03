"use client";

import { useEffect, useRef, useState } from "react";
import type { Heading } from "@/lib/headings";
import {
  activationBandTop,
  pickActiveHeading,
  type HeadingPosition,
} from "@/lib/toc-active";
import { widont } from "@/lib/typography";

// How long a ToC click keeps re-asserting the target's scroll position while
// the page settles, before handing control back to the scroll spy. Long enough
// to outlast a web-font swap on a warm connection; the reader scrolling ends it
// sooner regardless.
const PIN_SETTLE_MS = 1500;

// Below this a table of contents is a list as long as the article, so there is
// nothing to navigate. The effect and the render read the same constant on
// purpose: they were two different numbers once, and the effect did all its
// work for a component that rendered nothing.
const MIN_HEADINGS = 3;

export default function TableOfContents({ headings }: { headings: Heading[] }) {
  const [activeId, setActiveId] = useState<string>("");

  // When a heading is targeted (ToC click, or a deep link at load) we "pin" its
  // slug: the scroll spy holds the highlight on it, and reflow re-scrolls to it,
  // until the reader takes over. See armPin. A ref, not state — it is read
  // inside the observer/listener closures and must never restart the effect.
  const pinnedSlug = useRef<string | null>(null);
  // Tears down the listeners/timer of the current pin. Held so a second target,
  // or unmount, can cancel an in-flight pin.
  const releasePin = useRef<(() => void) | null>(null);
  // The effect owns armPin (it closes over the heading elements); the click
  // handler reaches it through here.
  const armPin = useRef<((slug: string) => void) | null>(null);

  useEffect(() => {
    // The same threshold the render guard below uses, and it has to be the
    // same one. At 0 this bailed and at 3 the component renders, so a post
    // with one or two headings fell in the gap: it attached a scroll listener,
    // a resize listener and a ResizeObserver on document.body — which fires on
    // every layout change, the web-font swap included — and drove a
    // getBoundingClientRect per heading on each frame, all to compute an
    // active id for markup that returns null.
    if (headings.length < MIN_HEADINGS) return;

    const elements = headings
      .map((h) => document.getElementById(h.slug))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    // The line a heading must cross to become active. Read from the scroll
    // container's scroll-padding-top, which is what actually parks a targeted
    // heading (globals.css). Previously this read the heading's own
    // scroll-margin-top; that utility is gone, because scroll-padding covers
    // keyboard focus as well as fragment links and the two would have summed.
    const bandTop = activationBandTop(
      window.getComputedStyle(document.documentElement).scrollPaddingTop,
    );

    const recompute = () => {
      // While a click is settling, hold the highlight on the clicked entry.
      // Live geometry would otherwise report the section above while post-click
      // reflow (see onLinkClick) is still sliding the target toward the line.
      if (pinnedSlug.current) {
        setActiveId(pinnedSlug.current);
        return;
      }
      const positions: HeadingPosition[] = elements.map((el) => ({
        id: el.id,
        top: el.getBoundingClientRect().top,
      }));
      setActiveId(pickActiveHeading(positions, bandTop));
    };

    // The decision reads live geometry, so it is never wrong, only ever as
    // fresh as its last trigger. Recompute on the three things that move a
    // heading's top relative to the activation line:
    //   - scroll: the common case;
    //   - resize: viewport height changes the geometry;
    //   - reflow: content ABOVE a heading changing height shifts it down with
    //     NO scroll or resize event — most visibly the display web font
    //     swapping in after load. A ResizeObserver on the document body catches
    //     that; the old IntersectionObserver got it free because the browser
    //     re-evaluates intersections on layout change.
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        recompute();
      });
    };

    const onReflow = () => {
      // That same reflow is what strands a targeted heading mid-viewport: the
      // browser jumps to the fragment, then the font swap grows everything above
      // it and slides it down. While pinned, drag it back to the line.
      if (pinnedSlug.current) {
        document.getElementById(pinnedSlug.current)?.scrollIntoView();
      }
      schedule();
    };

    // Targeting a heading (a ToC click, or a deep link on load) must land it
    // under the sticky header AND light its own entry. The browser's fragment
    // jump gets that momentarily, but the display web font swaps in just after,
    // reflows every line above the target, and slides it a third of the way down
    // the viewport — at which point the scroll spy correctly reports the section
    // above. So we pin the target: hold the highlight on it (recompute), re-
    // scroll to it on each reflow (onReflow) and once fonts finish, and release
    // the moment the reader scrolls or after a short settle window.
    const pin = (slug: string) => {
      releasePin.current?.();
      pinnedSlug.current = slug;
      setActiveId(slug);

      const reassert = () => {
        if (pinnedSlug.current === slug) {
          document.getElementById(slug)?.scrollIntoView();
        }
      };
      // Final correction once the swap that caused the drift has actually landed.
      document.fonts?.ready.then(reassert);

      const release = () => {
        if (pinnedSlug.current !== slug) return;
        pinnedSlug.current = null;
        cleanup();
        // No forced recompute: a timeout release leaves the target already at
        // the line (so the pinned slug is what geometry would pick anyway), and
        // an intent release is a scroll about to happen, whose event recomputes.
      };
      // Any real scroll intent from the reader ends the pin at once.
      window.addEventListener("wheel", release, { passive: true });
      window.addEventListener("pointerdown", release, { passive: true });
      window.addEventListener("keydown", release);
      const timer = window.setTimeout(release, PIN_SETTLE_MS);

      const cleanup = () => {
        window.clearTimeout(timer);
        window.removeEventListener("wheel", release);
        window.removeEventListener("pointerdown", release);
        window.removeEventListener("keydown", release);
        releasePin.current = null;
      };

      releasePin.current = cleanup;
    };
    armPin.current = pin;

    recompute();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    const reflowObserver = new ResizeObserver(onReflow);
    reflowObserver.observe(document.body);

    // A deep link lands with the fragment already in the URL, so the same drift
    // hits it with no click to trigger the pin. If the hash names one of our
    // headings, pin it on mount and re-assert the jump the browser just made.
    const hashSlug = decodeURIComponent(window.location.hash.slice(1));
    if (hashSlug && elements.some((el) => el.id === hashSlug)) {
      pin(hashSlug);
      document.getElementById(hashSlug)?.scrollIntoView();
    }

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      reflowObserver.disconnect();
      releasePin.current?.();
      armPin.current = null;
    };
  }, [headings]);

  const onLinkClick = (slug: string) => armPin.current?.(slug);

  if (headings.length < MIN_HEADINGS) return null;

  return (
    <details className="toc-details group">
      {/*
        summary is the mobile tap target. xl+ CSS hides it and forces the
        panel open regardless of the [open] attribute (see globals.css
        .toc-details rule), so one scroll listener serves both viewports.
      */}
      <summary className="xl:hidden list-none flex items-center justify-between gap-3 cursor-pointer select-none rounded-lg border border-brand-dark/10 bg-brand-dark/5 px-4 py-3 font-ui text-sm font-bold uppercase tracking-wide text-brand-dark">
        <span className="flex items-center gap-2">
          <svg
            className="h-4 w-4 text-brand-crimson"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M3 4.75A.75.75 0 0 1 3.75 4h12.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 4.75Zm0 5A.75.75 0 0 1 3.75 9h12.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 9.75Zm0 5a.75.75 0 0 1 .75-.75h12.5a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75Z" />
          </svg>
          On this page
        </span>
        <svg
          className="h-4 w-4 text-brand-muted motion-safe:transition-transform motion-safe:duration-200 group-open:rotate-180"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </summary>
      <nav aria-label="Table of contents" className="text-sm pt-3 xl:pt-0">
        <p className="mb-3 font-ui text-xs font-bold uppercase tracking-widest text-brand-muted hidden xl:block">
          On this page
        </p>
        <ul className="space-y-2 border-l border-brand-dark/10">
          {headings.map((h) => (
            <li key={h.slug}>
              <a
                href={`#${h.slug}`}
                // The active entry is otherwise signalled by colour, weight and
                // border alone. aria-current gives assistive tech the same
                // position information sighted readers get.
                aria-current={activeId === h.slug ? "location" : undefined}
                onClick={() => onLinkClick(h.slug)}
                className={`block border-l -ml-px pl-3 leading-snug transition-colors duration-200 ${
                  activeId === h.slug
                    ? "border-brand-crimson text-brand-crimson font-medium"
                    : "border-transparent text-brand-muted hover:text-brand-crimson"
                }`}
              >
                {/* h.text is always a plain string; widont de-widows the
                    entry in the narrow TOC column. The link target is h.slug,
                    computed separately, so the NBSP never reaches the anchor. */}
                {widont(h.text)}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </details>
  );
}
