import Link from "next/link";

// basePath is "/" for the index or "/categories/<slug>" for a category.
// Page 1 lives at basePath itself; pages 2+ live at basePath + "/page/<n>".
const hrefFor = (basePath: string, page: number) => {
  if (page <= 1) {
    return basePath;
  }
  const prefix = basePath === "/" ? "" : basePath;
  return `${prefix}/page/${page}`;
};

const linkClass =
  "font-ui text-xs font-semibold uppercase tracking-[0.14em] text-brand-crimson hover:underline";

// The exhausted direction on the last (or first) page: never removed, only
// unlinked and faded to --color-separator (the "faint" token, already used
// for hairlines and the breadcrumb slash). Keeping the slot rather than
// collapsing it is what keeps the count centred and stops the row reflowing
// as a reader pages through a listing.
const exhaustedClass =
  "font-ui text-xs font-semibold uppercase tracking-[0.14em] text-separator";

// Server component. Every listing on the site — home and the six taxonomy
// pages — uses this one shape: Newer on the left, a muted "Page N of M" in
// the centre, Older on the right. Page 1 has nothing newer, so it renders
// only the Older link, left-aligned rather than sitting in the three-slot
// row a page with something on both sides gets.
export default function Pagination({
  currentPage,
  totalPages,
  basePath,
}: {
  currentPage: number;
  totalPages: number;
  basePath: string;
}) {
  if (totalPages <= 1) {
    return null;
  }

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  if (!hasPrev) {
    // Page 1: nothing precedes it, so there is only one direction to offer
    // and no position to caption — "Page 1 of N" tells a reader on page 1
    // nothing they do not already know. hasNext is always true here, because
    // totalPages <= 1 already returned above.
    return (
      <nav
        aria-label="Pagination"
        className="mx-auto max-w-page pt-10 md:pt-12"
      >
        <Link
          href={hrefFor(basePath, currentPage + 1)}
          rel="next"
          className={linkClass}
        >
          Older posts &rarr;
        </Link>
      </nav>
    );
  }

  return (
    // No top border: every listing this follows draws its own closing
    // hairline (see the container note in more-stories.tsx). One here would
    // sit in the same row and print a double line.
    <nav aria-label="Pagination" className="mx-auto max-w-page pt-10 md:pt-12">
      <div className="flex items-center justify-between gap-4">
        <Link
          href={hrefFor(basePath, currentPage - 1)}
          rel="prev"
          className={linkClass}
        >
          &larr; Newer posts
        </Link>
        <p className="font-ui text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-muted">
          Page {currentPage} of {totalPages}
        </p>
        {hasNext ? (
          <Link
            href={hrefFor(basePath, currentPage + 1)}
            rel="next"
            className={linkClass}
          >
            Older posts &rarr;
          </Link>
        ) : (
          <span aria-hidden="true" className={exhaustedClass}>
            Older posts &rarr;
          </span>
        )}
      </div>
    </nav>
  );
}
