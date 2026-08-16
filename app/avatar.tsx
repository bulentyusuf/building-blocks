import ContentfulImage from "@/lib/contentful-image";
import Link from "next/link";
import type { ReactNode } from "react";

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export default function Avatar({
  name,
  picture,
  slug,
  meta,
}: {
  name: string;
  picture?: { url?: string };
  slug?: string;
  meta?: ReactNode;
}) {
  // 34px below md, 38px at md and up — the post sidebar's byline, an
  // attribution stamp read once rather than a card's own heading.
  // app/author-bio-card.tsx renders its own, larger, separately-responsive
  // portrait for the foot-of-article card; the two are deliberately
  // different components; see the note there. width/height stay the larger,
  // 38px figure regardless of breakpoint — they size Next/Image's request,
  // not the rendered box, which the wrapper's own h-/w- utilities control via
  // object-cover h-full w-full.
  return (
    <div className="flex items-center">
      <div className="mr-3 h-[34px] w-[34px] md:h-[38px] md:w-[38px] shrink-0">
        {picture?.url ? (
          <ContentfulImage
            alt=""
            className="object-cover h-full w-full rounded-full"
            height={38}
            width={38}
            src={picture.url}
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-full w-full items-center justify-center rounded-full bg-brand-dark/10 text-xs font-bold text-brand-muted"
          >
            {initials(name)}
          </div>
        )}
      </div>
      {/* One inline row below md — "Name · Date" — flex md:block switches to
          the desktop pair of stacked lines. The middot is the mobile row's
          own separator and is meaningless once the date drops to its own
          line, so it hides at md rather than rendering unused. */}
      <div className="leading-tight flex flex-wrap items-baseline gap-x-1.5 md:block">
        <span className="text-[15px] font-semibold">
          {slug ? (
            <Link
              href={`/authors/${slug}`}
              className="hover:text-brand-crimson transition-colors duration-200"
            >
              {name}
            </Link>
          ) : (
            name
          )}
        </span>
        {meta && (
          <span className="text-sm font-normal text-brand-muted md:mt-0.5 md:block">
            <span aria-hidden="true" className="text-separator md:hidden">
              &middot;{" "}
            </span>
            {meta}
          </span>
        )}
      </div>
    </div>
  );
}
