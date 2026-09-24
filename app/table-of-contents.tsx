"use client";

import { useEffect, useRef, useState } from "react";
import { hasTableOfContents, type Heading } from "@/lib/headings";
import {
  activationBandTop,
  pickActiveHeading,
  type HeadingPosition,
} from "@/lib/toc-active";
import { widont } from "@/lib/typography";

// The nav is rendered twice, once behind the mobile disclosure and once bare at
// xl+. Exactly one is in the DOM at any viewport (the other is display:none via
// the breakpoint class, which removes it from the accessibility tree as well as
// the page), so there is never a duplicate "Table of contents" landmark. Do not
// collapse this back to one instance forced open with CSS at xl+: a <details>
// without its [open] attribute reports a collapsed widget to the accessibility
// tree even while visible.
function TocNav({
  headings,
  activeId,
  onLinkClick,
}: {
  headings: Heading[];
  activeId: string | null;
  onLinkClick: (slug: string) => void;
}) {
  return (
    <nav aria-label="Table of contents" className="text-sm">
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
              {/* h.text is always a plain string; widont de-widows the entry in
                  the narrow TOC column. The link target is h.slug, computed
                  separately, so the NBSP never reaches the anchor. */}
              {widont(h.text)}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function TableOfContents({ headings }: { headings: Heading[] }) {
  const [activeId, setActiveId] = useState<string>("");

  // A targeted heading (a ToC click, or a deep link at load) holds the
  // highlight until the reader next wheels, taps or presses a key. Geometry
  // alone would hand it to the section above whenever the target cannot reach
  // the line, which is every short section at the foot of a post. Where the
  // heading lands is the browser's job: the jump is instant, and measured in
  // Chromium the fragment stays at the line through the web-font swap.
  const pinnedSlug = useRef<string | null>(null);
  const releasePin = useRef<AbortController | null>(null);

  const pin = (slug: string) => {
    releasePin.current?.abort();
    const release = new AbortController();
    releasePin.current = release;
    pinnedSlug.current = slug;
    setActiveId(slug);

    const unpin = () => {
      pinnedSlug.current = null;
      release.abort();
    };
    const options = { once: true, passive: true, signal: release.signal };
    window.addEventListener("wheel", unpin, options);
    window.addEventListener("pointerdown", unpin, options);
    window.addEventListener("keydown", unpin, options);
  };

  useEffect(() => {
    // The same threshold the render guard below uses, and it has to be the
    // same one — a mismatch attaches a scroll listener and a ResizeObserver,
    // driving a getBoundingClientRect per heading per frame, to compute an
    // active id for markup that renders null.
    if (!hasTableOfContents(headings)) return;

    const elements = headings
      .map((h) => document.getElementById(h.slug))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    // The line a heading must cross to become active, read from the scroll
    // container's scroll-padding-top — never the heading's own
    // scroll-margin-top. [→ `scroll-offset`]
    const bandTop = activationBandTop(
      window.getComputedStyle(document.documentElement).scrollPaddingTop,
    );

    const recompute = () => {
      if (pinnedSlug.current) return;
      const positions: HeadingPosition[] = elements.map((el) => ({
        id: el.id,
        top: el.getBoundingClientRect().top,
      }));
      setActiveId(pickActiveHeading(positions, bandTop));
    };

    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        recompute();
      });
    };

    // Scroll is the common case. The ResizeObserver catches everything else
    // that moves a heading against the line with no scroll event: content
    // above it changing height (the web-font swap most visibly) and a window
    // width change, which resizes the body too. Viewport height alone moves no
    // heading's top, so there is no separate resize listener.
    window.addEventListener("scroll", schedule, { passive: true });
    const reflowObserver = new ResizeObserver(schedule);
    reflowObserver.observe(document.body);

    const hashSlug = decodeURIComponent(window.location.hash.slice(1));
    if (elements.some((el) => el.id === hashSlug)) pin(hashSlug);
    else recompute();

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      reflowObserver.disconnect();
      releasePin.current?.abort();
    };
    // pin is left out of the dependencies on purpose. It only touches refs and
    // a state setter, so a stale copy behaves identically.
  }, [headings]);

  if (!hasTableOfContents(headings)) return null;

  return (
    <>
      <details className="group overflow-hidden rounded-lg border border-brand-dark/10 bg-brand-dark/5 xl:hidden">
        {/*
          summary is the mobile tap target and only exists on mobile now — the
          whole disclosure is xl:hidden, so there is nothing here for xl+ to
          hide or force open. The card surface (border, background, rounded
          corner) lives on the <details> above, not here, so the expanded
          panel below is inside the same card rather than a separate block
          sitting beneath it.
        */}
        <summary className="list-none flex items-center justify-between gap-3 cursor-pointer select-none px-4 py-3 font-ui text-sm font-bold uppercase tracking-wide text-brand-dark">
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
        <div className="border-t border-brand-dark/10 px-4 pt-3 pb-4">
          <TocNav headings={headings} activeId={activeId} onLinkClick={pin} />
        </div>
      </details>
      <div className="hidden xl:block">
        <TocNav headings={headings} activeId={activeId} onLinkClick={pin} />
      </div>
    </>
  );
}
