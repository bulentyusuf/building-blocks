import type { Metadata } from "next";
import Link from "next/link";
import ContentfulImage from "@/lib/contentful-image";
import Container from "./container";
import Tape from "./tape";

export const metadata: Metadata = {
  title: "Page not found",
};

// Home's archive button, so a way out reads as pressable. [→ `tap-targets`]
const action =
  "inline-flex min-h-11 items-center rounded-xl border-[3px] border-outline bg-card px-5 font-ui text-base font-semibold shadow-[4px_4px_0_var(--color-brand-crimson)] transition-[translate,box-shadow] duration-150 hover:translate-[4px] hover:shadow-none motion-reduce:transition-none";

// The layout supplies the chrome, the strand chips included, so no trail.
// The image is public/404-gremlin.webp.
export default function NotFound() {
  return (
    <Container>
      <section className="mx-auto max-w-2xl text-center">
        {/* A picture pinned to an empty page: ink frame, tape, a -2deg tilt.
            The one named exception to the tilt and tape rules. [→ `post-page`] */}
        <div className="relative mx-auto mt-4 w-full max-w-md -rotate-2">
          <Tape className="z-10" />
          {/* ContentfulImage because the global custom loader needs one; it
              passes local assets through untouched. */}
          <ContentfulImage
            unoptimized
            src="/404-gremlin.webp"
            alt="A gremlin sitting in a tangle of wires, holding the two ends of an unplugged cable"
            width={720}
            height={480}
            priority
            className="h-auto w-full rounded-container border-[3px] border-outline"
          />
        </div>

        <p className="mt-9 font-mono text-sm font-medium text-brand-muted">
          <span aria-hidden="true">{"// "}</span>
          error 404
        </p>
        <h1 className="mt-3 text-5xl leading-none font-[800] tracking-[-0.03em] text-balance md:text-6xl">
          A gremlin pulled the plug.
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-pretty md:text-[1.375rem]">
          Someone fed it after midnight. The page you wanted is gone.
        </p>
        <nav
          aria-label="Recovery options"
          className="mt-8 flex flex-wrap items-center justify-center gap-4"
        >
          <Link href="/search" className={action}>
            Search
          </Link>
          <Link href="/archive" className={action}>
            Archive
          </Link>
        </nav>
      </section>
    </Container>
  );
}
