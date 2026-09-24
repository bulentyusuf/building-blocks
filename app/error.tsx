"use client";

// Renders inside the root layout. A client component, so no metadata export.

import { useEffect } from "react";
import Link from "next/link";
import Container from "./container";

export default function Error({
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
    <Container>
      <section className="mx-auto max-w-2xl text-center">
        <p className="font-ui text-lg font-bold uppercase tracking-wide text-brand-crimson">
          Whoops
        </p>
        <h1 className="mt-4 text-4xl lg:text-6xl leading-tight text-pretty">
          Something broke on our end.
        </h1>

        <p className="mt-6 text-lg leading-relaxed text-pretty">
          An unexpected error stopped this page from loading. Try again, and if
          it keeps happening it is the site to blame, not you.
        </p>

        {error.digest && (
          <p className="mt-4 text-sm text-brand-muted">
            Reference <code>{error.digest}</code>
          </p>
        )}

        <nav
          aria-label="Recovery options"
          className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3"
        >
          <button
            type="button"
            onClick={reset}
            className="text-base font-bold text-brand-crimson hover:opacity-80 transition-opacity duration-200"
          >
            Try again
          </button>
          <Link
            href="/"
            className="text-base font-bold text-brand-crimson hover:opacity-80 transition-opacity duration-200"
          >
            Home
          </Link>
        </nav>
      </section>
    </Container>
  );
}
