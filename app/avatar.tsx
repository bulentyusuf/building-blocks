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
 * meta beside them (a dateline). Array order is the credit order, lead first.
 * [→ `authors-array`]
 *
 * The empty-authors case is handled here, not at the call sites. Both callers
 * pass meta unconditionally and let this decide. Do not add an
 * `authors.length > 0` guard at a call site: two of them had one, they drifted
 * apart, and the one on the home hero was still silently dropping the dateline
 * after the post page stopped. A caller that genuinely wants nothing rendered
 * for an authorless post passes no meta.
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
        // author's disc in front, no z-index needed: the last DOM element
        // sits visually first in a reversed row. [→ `authors-array`]
        // Each disc carries its own ring in the page background colour, or
        // the overlap reads as one shape rather than two portraits.
        // ring-brand-bg rather than a hardcoded hex so it follows the theme.
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
                {/* Separator outside the anchors, before each name so the
                      final item needs no special case. [→ `authors-array`] */}
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
