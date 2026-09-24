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

// picture is optional: a stale cached payload may lack it.
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
 * The byline, lead author first. Handles the empty case itself; callers must
 * not guard on authors.length, which once dropped the dateline. [→ `authors-array`]
 */
export default function Avatar({
  authors,
  meta,
}: {
  authors: AvatarAuthor[];
  meta?: ReactNode;
}) {
  // An empty array still renders the meta, so the date is never lost.
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
        // Reversed row and array put the lead's disc in front; each ring uses
        // the page colour so the overlap reads as two portraits.
        // [→ `authors-array`]
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
        {/* Names may wrap; clipping would be worse. */}
        <div className="text-xl font-bold">
          {stacked ? (
            authors.map((author, i) => (
              <Fragment key={author.slug ?? author.name}>
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
