import ContentfulImage from "@/lib/contentful-image";
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import type { Author } from "@/lib/types";

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

// picture is optional here even though Author.picture is a required
// Contentful field: authorsCollection can return a stale payload cached
// before the field was queried, and this stays defensive rather than
// assuming the shape, the same posture every other picture-reading consumer
// on the site takes.
type AvatarAuthor = Pick<Author, "name" | "slug"> & {
  picture?: { url?: string };
};

function Portrait({ author }: { author: AvatarAuthor }) {
  return author.picture?.url ? (
    <ContentfulImage
      alt=""
      className="object-cover h-full w-full rounded-full"
      height={48}
      width={48}
      src={author.picture.url}
    />
  ) : (
    <div
      aria-hidden="true"
      className="flex h-full w-full items-center justify-center rounded-full bg-brand-dark/10 text-sm font-bold text-brand-muted"
    >
      {initials(author.name)}
    </div>
  );
}

function AuthorLink({ author }: { author: AvatarAuthor }) {
  return author.slug ? (
    <Link
      href={`/authors/${author.slug}`}
      className="hover:text-brand-crimson transition-colors duration-200"
    >
      {author.name}
    </Link>
  ) : (
    author.name
  );
}

/**
 * The byline: one to three co-authors, portrait(s) and name(s), plus optional
 * meta beside them (a dateline).
 *
 * The array order is the credit order. A single author renders exactly as it
 * always has — one disc, no ring, name and meta beside it — because that is
 * every post on the site today and it must not visibly change. Two or three
 * authors get an overlapping portrait stack, the first (lead) author in
 * front, and their names on one line joined by an ampersand rather than
 * moved below the discs, matching the single-author shape as closely as the
 * extra name allows.
 */
export default function Avatar({
  authors,
  meta,
}: {
  authors: AvatarAuthor[];
  meta?: ReactNode;
}) {
  // An unpublished author reference comes back from Contentful as null and is
  // filtered out upstream, so a post can reach here with an empty array while
  // still carrying a date and a reading time. Returning null outright took the
  // meta down with the byline, which is silent data loss on the only surface
  // that renders it. Empty AND no meta still renders nothing, so the
  // zero-authors contract for callers that pass no meta is unchanged.
  if (authors.length === 0) {
    return meta ? (
      <div className="text-sm font-normal leading-tight text-brand-muted">
        {meta}
      </div>
    ) : null;
  }

  const last = authors.length - 1;
  const stacked = authors.length > 1;

  return (
    <div className="flex items-center">
      {stacked ? (
        // row-reverse plus a reversed authors array puts the FIRST (lead)
        // author's disc in front, with no z-index and no stacking context:
        // the last element in DOM order sits visually first in a reversed
        // row. -mr-3.5 (14px) overlap sits on every disc except the last one
        // RENDERED, which is the lead author, because the row is reversed.
        // Each disc carries its own ring in the page background colour —
        // without it the overlap reads as one shape rather than two
        // portraits. ring-brand-bg rather than a hardcoded hex because the
        // ring has to follow the theme; checked against both schemes and
        // against both routes this renders on (post page, home hero), which
        // share the same bg-brand-bg body background.
        <div className="mr-4 flex shrink-0 flex-row-reverse">
          {[...authors].reverse().map((author) => (
            <div
              key={author.slug ?? author.name}
              className="h-12 w-12 shrink-0 rounded-full ring-3 ring-brand-bg [&+*]:-mr-3.5"
            >
              <Portrait author={author} />
            </div>
          ))}
        </div>
      ) : (
        <div className="mr-4 w-12 h-12 shrink-0">
          <Portrait author={authors[0]} />
        </div>
      )}
      <div className="leading-tight">
        {/* No whitespace-nowrap: three long names fit at 608px but only
            just, and a wrapped name line is fine where a clipped one is
            not. */}
        <div className="text-xl font-bold">
          {stacked ? (
            authors.map((author, i) => (
              <Fragment key={author.slug ?? author.name}>
                {/* The separator sits outside the anchors and before each
                      name rather than after it, so the final item needs no
                      special case. Ampersand, not "and", and no serial comma
                      before it. */}
                {i > 0 && (i === last ? " & " : ", ")}
                <AuthorLink author={author} />
              </Fragment>
            ))
          ) : (
            <AuthorLink author={authors[0]} />
          )}
        </div>
        {meta && (
          <div className="mt-1 text-sm font-normal text-brand-muted">
            {meta}
          </div>
        )}
      </div>
    </div>
  );
}
