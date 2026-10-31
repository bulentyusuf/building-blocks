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
  lang,
}: {
  headings: Heading[];
  activeId: string | null;
  onLinkClick: (slug: string) => void;
  lang?: string;
}) {
  return (
    <nav aria-label="Table of contents">
      <p className="mb-4 hidden font-mono text-sm font-medium text-brand-muted xl:block">
        <span aria-hidden="true">{"// "}</span>
        on this page
      </p>
      {/* The entries are the post's headings, so they take its language; the
          label above is chrome. [→ `locale`] */}
      <ul lang={lang} className="space-y-4 font-ui leading-[1.3]">
        {headings.map((h) => (
          <li key={h.slug}>
            <a
              href={`#${h.slug}`}
              // The active entry is otherwise signalled by colour and weight
              // alone. aria-current gives assistive tech the same position
              // information sighted readers get.
              aria-current={activeId === h.slug ? "location" : undefined}
              onClick={() => onLinkClick(h.slug)}
              className={`block transition-colors duration-200 ${
                activeId === h.slug
                  ? "font-bold text-brand-crimson"
                  : "font-medium hover:text-brand-crimson"
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

export default function TableOfContents({
  headings,
  lang,
}: {
  headings: Heading[];
  lang?: string;
}) {
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

    // A hand-typed "#%" makes decodeURIComponent throw, which would take the
    // whole post down to the error page. It matches no heading either way.
    let hashSlug = "";
    try {
      hashSlug = decodeURIComponent(window.location.hash.slice(1));
    } catch {}
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
      <details className="group overflow-hidden rounded-[18px] border-[3px] border-brand-dark bg-card xl:hidden">
        {/*
          summary is the mobile tap target and only exists on mobile now — the
          whole disclosure is xl:hidden, so there is nothing here for xl+ to
          hide or force open. The card surface (border, background, rounded
          corner) lives on the <details> above, not here, so the expanded
          panel below is inside the same card rather than a separate block
          sitting beneath it.
        */}
        <summary className="list-none flex min-h-12 items-center justify-between gap-3 cursor-pointer select-none px-5 py-3 font-mono text-sm font-medium text-brand-muted">
          <span>
            <span aria-hidden="true">{"// "}</span>
            on this page
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
        <div className="px-5 pt-1 pb-5">
          <TocNav
            headings={headings}
            activeId={activeId}
            onLinkClick={pin}
            lang={lang}
          />
        </div>
      </details>
      {/* The page's one strip of tape, half on and half off the top edge.
          Never on anything carrying text. [→ `post-page`] */}
      <div className="relative hidden rounded-[18px] border-[3px] border-brand-dark bg-card px-5.5 pt-5 pb-6 xl:block">
        <span
          aria-hidden="true"
          className="absolute -top-4 left-1/2 h-8 w-35 -translate-x-1/2 -rotate-3 bg-tape mix-blend-multiply [clip-path:polygon(0_4%,4%_0,8%_6%,12%_0,88%_0,92%_5%,96%_0,100%_6%,100%_96%,96%_100%,92%_94%,88%_100%,12%_100%,8%_95%,4%_100%,0_94%)] dark:mix-blend-normal"
        />
        <TocNav
          headings={headings}
          activeId={activeId}
          onLinkClick={pin}
          lang={lang}
        />
      </div>
    </>
  );
}
