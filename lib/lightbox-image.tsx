"use client";

import { useEffect, useId, useRef, useState } from "react";
import ContentfulImage from "@/lib/contentful-image";

// Offer the click only if the enlarged view is at least this much wider. On a
// phone most pictures already fill the column.
const MIN_ENLARGE_GAIN = 1.25;

// The largest images.deviceSizes entry, so nothing enlarges past the pixels it
// receives. lib/lightbox-image.test.tsx holds it against next.config.js.
export const WIDEST_SERVED_FILE = 1920;

// Mirrors enlargedWidth below in script, because the dialog is empty until
// opened. Its padding (p-4, md:p-8) and 75vh must change with the dialog's.
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

// An inline body image that opens into a native <dialog>.
// [→ `lightbox-mounted`, `lightbox-dialog`]
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

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // False until judged, so the server and first client render agree.
  const [enlargeable, setEnlargeable] = useState(false);

  const titleId = useId();

  useEffect(() => setMounted(true), []);

  // Focus is set explicitly, because engines differ. [→ `lightbox-dialog`]
  useEffect(() => {
    if (!open) return;
    dialogRef.current?.showModal();
    closeRef.current?.focus();
  }, [open]);

  // Every way out ends in the dialog's close event, so state follows only here.
  const close = () => dialogRef.current?.close();
  const onClose = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  // Null on a non-image asset or an old cached payload, so 3:2 is the fallback,
  // with object-contain on the enlarged view as the safety net.
  const w = width ?? 1200;
  const h = height ?? 800;

  // The smallest of the dialog's width, 75vh tall, and the served file's width.
  // Accepted: a square picture on a short screen can open smaller than inline.
  const enlargedWidth = `min(100%, calc(75vh * ${w} / ${h}), ${Math.min(w, WIDEST_SERVED_FILE)}px)`;

  // Re-judged on resize, because the answer depends on the screen too.
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

  const offered = mounted && (enlargeable || open);

  const image = (
    <ContentfulImage
      ref={imageRef}
      src={src}
      alt={alt}
      width={w}
      height={h}
      sizes="(max-width: 768px) 100vw, 672px"
      className="mx-auto w-full h-auto rounded-content border-2 border-gray-300 dark:border-brand-dark/15"
      // Never wider than the asset, or a narrow screenshot stretches and blurs.
      style={{ maxWidth: w }}
    />
  );

  return (
    <>
      {/* Stays while the dialog is open, so focus has somewhere to return.
          [→ `lightbox-mounted`] */}
      {offered ? (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(true)}
          // Bare on purpose. aria-label overrides the contents, and the img
          // already carries the alt.
          aria-label="Enlarge image"
          // No local focus styling. [→ `focus-indicator`]
          className="mx-auto block w-full cursor-zoom-in"
          style={{ maxWidth: w }}
        >
          {image}
        </button>
      ) : (
        image
      )}

      {offered && (
        <dialog
          ref={dialogRef}
          aria-labelledby={caption ? titleId : undefined}
          aria-label={caption ? undefined : alt || "Enlarged image"}
          onClose={onClose}
          onClick={close}
          // Full-viewport, so a click anywhere but the picture closes. Padding
          // must match worthEnlarging().
          className="fixed inset-0 m-0 size-full max-h-none max-w-none items-center justify-center bg-transparent p-4 open:flex md:p-8 backdrop:bg-black/80"
        >
          {open && (
            <>
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                aria-label="Close enlarged image"
                // A focus exception. Crimson is about 1.7:1 on the backdrop,
                // white clears 12:1. [→ `focus-indicator`]
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

              {/* Sized to the picture, so only the picture stops a click. */}
              <figure
                className="flex max-h-full flex-col"
                style={{ width: enlargedWidth }}
              >
                <ContentfulImage
                  src={src}
                  alt={alt}
                  onClick={(e) => e.stopPropagation()}
                  // For the aspect ratio only. sizes picks the resolution.
                  width={w}
                  height={h}
                  sizes="100vw"
                  // A white hairline, because a grey edge glares on black.
                  className="max-h-[75vh] w-full h-auto object-contain border-2 border-white/15"
                />
                {caption && (
                  <figcaption
                    id={titleId}
                    // Its own black backing, because the backdrop lets the page
                    // through. The backdrop stays, as the close button's
                    // contrast is measured against it.
                    className="mt-1.5 self-center bg-black px-2 py-0.5 text-center text-sm italic text-white/80"
                  >
                    {caption}
                  </figcaption>
                )}
              </figure>
            </>
          )}
        </dialog>
      )}
    </>
  );
}
