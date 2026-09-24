"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ContentfulImage from "@/lib/contentful-image";

// The enlarge control is only offered when the enlarged view would be at least
// this much wider than the picture as it sits in the post. On a phone the post
// column already spans the screen, and a screenshot barely wider than the
// column opens barely larger, so the click promises more than it gives.
const MIN_ENLARGE_GAIN = 1.25;

// The widest file the site ever asks Contentful for, the largest entry in
// images.deviceSizes in next.config.js. An asset stored wider than this still
// reaches the reader as a file this wide, so the enlarged view stops here too,
// or on a very large screen it would stretch that file past its own pixels.
// lib/lightbox-image.test.tsx holds it against the config.
export const WIDEST_SERVED_FILE = 1920;

// How wide the enlarged picture will be, worked out in script the same way the
// overlay's width calculation below works it out in the stylesheet. It is
// computed here because the overlay does not exist until the reader clicks,
// and the question is whether to offer the click at all. The overlay's padding
// is 1rem a side, rising to 2rem from 48rem up, the breakpoint its own padding
// classes use. The 0.75 is the 75vh height limit. Change either there and it
// has to change here too. The last limit is the width of the file the reader
// actually receives, not the asset as stored.
export function worthEnlarging({
  shownWidth,
  assetWidth,
  assetHeight,
  viewportWidth,
  viewportHeight,
  rootFontSize,
}: {
  shownWidth: number;
  assetWidth: number;
  assetHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  rootFontSize: number;
}): boolean {
  const padding = (viewportWidth >= 48 * rootFontSize ? 2 : 1) * rootFontSize;
  const enlarged = Math.min(
    viewportWidth - 2 * padding,
    (0.75 * viewportHeight * assetWidth) / assetHeight,
    Math.min(assetWidth, WIDEST_SERVED_FILE),
  );
  return enlarged >= shownWidth * MIN_ENLARGE_GAIN;
}

// A single inline body image that opens into a modal lightbox on click.
// Server-rendered as a plain image — the button appears only after mount, so
// with scripts off readers get the image rather than a dead control. The
// overlay is portaled to document.body only while open. Full a11y:
// role=dialog/aria-modal, Esc + backdrop close, focus trap, focus return to the
// trigger, page scroll-lock, reduced-motion.
export default function LightboxImage({
  src,
  alt,
  caption,
  width,
  height,
}: {
  src: string;
  alt: string;
  caption?: string;
  width?: number | null;
  height?: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Refs for focus management: where focus was before opening (to restore),
  // and the overlay container (to scope the focus trap).
  const triggerRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Whether this picture gets the enlarge control at all. False until judged,
  // so the server and the first client render agree on a plain image.
  const [enlargeable, setEnlargeable] = useState(false);

  const titleId = useId();

  // Portals need document.body, which only exists after mount on the client.
  useEffect(() => setMounted(true), []);

  const close = useCallback(() => setOpen(false), []);

  // While open: lock body scroll, handle Esc + Tab trapping, move focus in.
  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Scroll-lock: preserve the scrollbar gutter so layout doesn't jump.
    // The lock goes on html as well as body. app/globals.css gives html
    // overflow-y: scroll, and once html's overflow is anything but visible
    // the page scrolls on html and body's overflow stops reaching it, so a
    // lock on body alone left the page scrolling behind the overlay. Locking
    // html also removes the scrollbar, which is what the padding below makes
    // up for.
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    // Move focus into the dialog (the close button).
    closeRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab") return;

      // Focus trap: keep Tab / Shift+Tab within the overlay's focusables.
      const root = overlayRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll<HTMLElement>(
        'button, [href], [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
      // Return focus to the trigger (fall back to whatever held it before).
      (triggerRef.current ?? previouslyFocused)?.focus();
    };
  }, [open, close]);

  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // The asset's real shape, which is what both renders below are laid out
  // against. Contentful returns null for these on a non-image asset and a
  // payload cached before they were queried has neither, so 3:2 remains as a
  // fallback — it is the shape this component assumed for every image until
  // now, and object-contain on the enlarged view is its safety net.
  const w = width ?? 1200;
  const h = height ?? 800;

  // The enlarged picture's width, worked out from the asset's own shape and
  // the screen, never from the file the browser downloads. Left to size
  // itself, the picture took the file's pixels divided by the screen's
  // density, so one image opened at a different size on every screen, and on
  // a phone some opened smaller than they sit in the post. Three limits, and
  // the smallest wins. The overlay's width. The width at which the picture
  // reaches 75vh tall, which leaves the picture room to breathe rather than
  // filling the screen edge to edge. The width of the file the reader
  // receives, which is the asset's own width or the widest file the site
  // serves, whichever is smaller, because a picture blown up past its own
  // pixels looks soft, and that is worse than a smaller one. On a short screen at a large reader font, a square picture can open
  // a little smaller than it sits in the post. That is accepted, because the
  // whole picture still shows in one view.
  const enlargedWidth = `min(100%, calc(75vh * ${w} / ${h}), ${Math.min(w, WIDEST_SERVED_FILE)}px)`;

  // Never wider than the asset itself. The column grows with the reader's font
  // size, and at 20px it is 840px across, so a screenshot narrower than that
  // was stretched to fill it and blurred. Capped here it sits centred at its
  // own width instead. The trigger below takes the same cap, so the clickable
  // area ends where the picture does.
  // Judged after mount and again whenever the window changes size, because
  // the answer depends on the screen as much as on the picture.
  useEffect(() => {
    function judge() {
      const shown = imageRef.current?.getBoundingClientRect().width;
      if (!shown) return;
      setEnlargeable(
        worthEnlarging({
          shownWidth: shown,
          assetWidth: w,
          assetHeight: h,
          viewportWidth: document.documentElement.clientWidth,
          viewportHeight: window.innerHeight,
          rootFontSize: parseFloat(
            getComputedStyle(document.documentElement).fontSize,
          ),
        }),
      );
    }
    judge();
    window.addEventListener("resize", judge);
    return () => window.removeEventListener("resize", judge);
  }, [w, h]);

  const image = (
    <ContentfulImage
      ref={imageRef}
      src={src}
      alt={alt}
      width={w}
      height={h}
      sizes="(max-width: 768px) 100vw, 672px"
      className="mx-auto w-full h-auto border-2 border-gray-300 dark:border-brand-dark/15"
      style={{ maxWidth: w }}
    />
  );

  return (
    <>
      {/* The trigger only exists once the script that powers it is running.
          Rendered unconditionally it was a control that lies with JavaScript
          off: focusable, announced as "Enlarge image", cursor-zoom-in, and
          inert on click. The image itself never depended on JS, so degrading
          to a plain image loses nothing — mounted gates the affordance, not
          the content. Same flag the portal already waits on, so this costs no
          extra state and flips immediately after hydration. It also appears
          only where enlarging is worth a click, judged above, and stays while
          the overlay is open so focus has somewhere to return to. */}
      {mounted && (enlargeable || open) ? (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(true)}
          // Deliberately bare, and never `Enlarge image: ${alt}`. aria-label on
          // a button overrides its contents for naming, so folding the alt in
          // here would duplicate a string the img already carries for crawlers
          // while adding nothing for assistive tech. The button names the
          // action; the image describes itself.
          aria-label="Enlarge image"
          // No local focus styling. The sitewide indicator in app/globals.css
          // already clears 3:1 on both page grounds, and the local override it
          // replaced drew a pure white gap between image and indicator, which
          // showed as a pale stripe on the dark page. [→ `focus-indicator`]
          className="mx-auto block w-full cursor-zoom-in"
          style={{ maxWidth: w }}
        >
          {image}
        </button>
      ) : (
        image
      )}

      {mounted &&
        open &&
        createPortal(
          <div
            ref={overlayRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={caption ? titleId : undefined}
            aria-label={caption ? undefined : alt || "Enlarged image"}
            onClick={close}
            className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 md:p-8 ${
              reduceMotion ? "" : "transition-opacity duration-200"
            }`}
          >
            <button
              ref={closeRef}
              type="button"
              onClick={close}
              aria-label="Close enlarged image"
              // One of the sitewide focus exceptions. This button sits on the
              // dimmed overlay, where crimson falls to roughly 1.7:1 against
              // the darkened ground (#9E2238 on #323130), so it takes white
              // instead, which clears 12:1. [→ `focus-indicator`]
              className="absolute top-4 right-4 flex h-11 w-11 items-center justify-center rounded-full border-2 border-white/40 bg-black/40 text-white hover:bg-brand-crimson focus:outline-hidden focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>

            {/* Sized to the picture exactly, so there is no margin around it
                where a click lands without closing. Only the picture itself
                stops the click, so the caption and everything around the
                picture close the overlay. */}
            <figure
              className="flex max-h-full flex-col"
              style={{ width: enlargedWidth }}
            >
              <ContentfulImage
                src={src}
                alt={alt}
                onClick={(e) => e.stopPropagation()}
                // The asset's own dimensions, not an upscaled 3:2 box. sizes
                // already tells Next what resolution to request, so these are
                // here to establish the aspect ratio and nothing else.
                width={w}
                height={h}
                sizes="100vw"
                // Framed like the inline figure, but the scrim is always black,
                // so a light gray-300 edge would glare — a soft white hairline
                // reads as the same intentional frame here. The frame traces
                // the photograph now: laid out 3:2 regardless of the asset, it
                // hugged a reserved box that object-contain then letterboxed a
                // portrait inside, leaving the caption stranded below the empty
                // space rather than under the image.
                className="max-h-[75vh] w-full h-auto object-contain border-2 border-white/15"
              />
              {caption && (
                <figcaption
                  id={titleId}
                  // A solid black backing of its own, sized to the text. The
                  // backdrop is only partly opaque, so headings and paragraphs
                  // from the page behind show through it and collided with the
                  // caption on most posts, in both colour schemes. The
                  // backdrop's own opacity stays as it is, because the close
                  // button's contrast figures above are worked out against it.
                  className="mt-1.5 self-center bg-black px-2 py-0.5 text-center text-sm italic text-white/80"
                >
                  {caption}
                </figcaption>
              )}
            </figure>
          </div>,
          document.body,
        )}
    </>
  );
}
