import type { Metadata } from "next";
import Link from "next/link";
import ContentfulImage from "@/lib/contentful-image";
import Container from "./container";
import Tape from "./tape";

export const metadata: Metadata = {
  title: "Page not found",
};

const link =
  "text-brand-crimson underline decoration-2 underline-offset-[3px] hover:decoration-4";

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
            className="h-auto w-full rounded-[20px] border-[3px] border-brand-dark"
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
          The page you seek isn&apos;t available or never existed. Apologies!
        </p>
        <p className="mt-8 font-ui font-semibold text-brand-muted">
          Try{" "}
          <Link href="/search" className={link}>
            search
          </Link>{" "}
          or the{" "}
          <Link href="/archive" className={link}>
            archive
          </Link>
          .
        </p>
      </section>
    </Container>
  );
}
