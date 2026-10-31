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
  picture?: { url?: string } | null;
};

function Portrait({ author }: { author: AvatarAuthor }) {
  return author.picture?.url ? (
    <ContentfulImage
      alt=""
      className="h-full w-full rounded-full object-cover"
      height={40}
      width={40}
      src={author.picture.url}
    />
  ) : (
    <div
      aria-hidden="true"
      className="flex h-full w-full items-center justify-center rounded-full bg-brand-dark/10 text-xs font-bold text-brand-muted"
    >
      {initials(author.name)}
    </div>
  );
}

function AuthorLink({ author }: { author: AvatarAuthor }) {
  return author.slug ? (
    <Link
      href={`/authors/${author.slug}`}
      className="transition-colors duration-200 hover:text-brand-crimson"
    >
      {author.name}
    </Link>
  ) : (
    author.name
  );
}

/**
 * The byline row: each author as a ringed portrait and name, then the meta.
 * Handles the empty case itself; callers must not guard on authors.length,
 * which once dropped the dateline. [→ `authors-array`]
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
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 font-ui text-base">
        {meta}
      </div>
    ) : null;
  }

  const last = authors.length - 1;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 font-ui text-base">
      {/* Names may wrap; clipping would be worse. */}
      {/* Inline, not flex, so the spaces around "&" survive. */}
      <p className="font-[800] leading-10">
        {authors.map((author, i) => (
          <Fragment key={author.slug ?? author.name}>
            {i > 0 && (i === last ? " & " : ", ")}
            <span className="inline-flex items-center gap-2.5 align-middle">
              <span className="h-10 w-10 shrink-0 rounded-full border-[3px] border-brand-dark bg-brand-bg">
                <Portrait author={author} />
              </span>
              <AuthorLink author={author} />
            </span>
          </Fragment>
        ))}
      </p>
      {meta}
    </div>
  );
}
