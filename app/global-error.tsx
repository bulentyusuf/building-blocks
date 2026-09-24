"use client";

// Replaces the root layout when it throws, so it renders its own <html> and no
// chrome. The font variables are bypassed, so type falls back to system.

import "./globals.css";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en-GB">
      <body className="min-h-screen flex items-center justify-center bg-brand-bg px-5">
        <main className="mx-auto max-w-xl text-center">
          <p className="text-lg font-bold uppercase tracking-wide text-brand-crimson">
            Whoops
          </p>
          <h1 className="mt-4 text-4xl text-brand-dark text-pretty">
            The site hit a wall.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-brand-dark text-pretty">
            A critical error stopped the page from rendering. Reloading usually
            clears it.
          </p>
          {error.digest && (
            <p className="mt-4 text-sm text-brand-muted">
              Reference {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            className="mt-8 text-base font-bold text-brand-crimson hover:opacity-80 transition-opacity duration-200"
          >
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}
