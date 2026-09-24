import type { Metadata } from "next";
import Link from "next/link";
import ContentfulImage from "@/lib/contentful-image";
import Container from "./container";

export const metadata: Metadata = {
  title: "Page not found",
};

// The layout supplies the chrome. The image is public/404-gremlin.webp; reduced
// motion gets it still.
export default function NotFound() {
  return (
    <Container>
      <style>{`
        @keyframes gremlin-wobble {
          0%, 100% { transform: rotate(-2deg); }
          50% { transform: rotate(2deg); }
        }
        .gremlin-img { animation: gremlin-wobble 2.4s ease-in-out infinite; transform-origin: center bottom; }
        @media (prefers-reduced-motion: reduce) {
          .gremlin-img { animation: none; }
        }
      `}</style>

      <section className="mx-auto max-w-2xl text-center">
        <div className="mb-8 flex justify-center">
          {/* ContentfulImage because the global custom loader needs one; it
              passes local assets through untouched. */}
          <ContentfulImage
            unoptimized
            src="/404-gremlin.webp"
            alt="A gremlin sitting in a tangle of wires, holding the two ends of an unplugged cable"
            width={720}
            height={480}
            priority
            className="gremlin-img w-full max-w-md h-auto rounded-lg"
          />
        </div>

        <p className="font-ui text-lg font-bold uppercase tracking-wide text-brand-crimson">
          Whoops
        </p>
        <h1 className="mt-4 text-4xl lg:text-6xl leading-tight text-pretty">
          404: A gremlin pulled the plug.
        </h1>

        <p className="mt-6 text-lg leading-relaxed text-pretty">
          The page you seek isn't available or never existed. Apologies!
        </p>

        <nav
          aria-label="Helpful links"
          className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3"
        >
          <Link
            href="/"
            className="text-base font-bold text-brand-crimson hover:opacity-80 transition-opacity duration-200"
          >
            Home
          </Link>
          <Link
            href="/categories"
            className="text-base font-bold text-brand-crimson hover:opacity-80 transition-opacity duration-200"
          >
            Categories
          </Link>
          <Link
            href="/authors"
            className="text-base font-bold text-brand-crimson hover:opacity-80 transition-opacity duration-200"
          >
            Authors
          </Link>
        </nav>
      </section>
    </Container>
  );
}
