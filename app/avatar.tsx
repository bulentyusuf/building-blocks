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
  // 38px — the post sidebar's byline, an attribution stamp read once rather
  // than a card's own heading. app/author-bio-card.tsx renders its own,
  // larger portrait for the foot-of-article card; the two are deliberately
  // different components; see the note there.
  return (
    <div className="flex items-center">
      <div className="mr-3 h-[38px] w-[38px] shrink-0">
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
      <div className="leading-tight">
        <div className="text-[15px] font-semibold">
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
        </div>
        {meta && (
          <div className="mt-0.5 text-sm font-normal text-brand-muted">
            {meta}
          </div>
        )}
      </div>
    </div>
  );
}
