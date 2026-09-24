import Link from "next/link";

// Page 1 lives at basePath; later pages at basePath/page/N.
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

  const hrefFor = (page: number) => {
    if (page <= 1) {
      return basePath;
    }
    const prefix = basePath === "/" ? "" : basePath;
    return `${prefix}/page/${page}`;
  };

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  // Below sm the cells shrink so the worst-case row fits a 390px viewport up to
  // a 21.7px root; wrapping catches anything beyond.
  const cell =
    "inline-flex h-10 min-w-8 sm:min-w-10 items-center justify-center gap-1 rounded-md px-2 sm:px-3 text-base transition-colors duration-200";

  // Below sm the words go, or the row overflowed the page. Names come from
  // aria-label, so hiding them changes nothing a screen reader hears.
  const prevLabel = (
    <>
      {"←"}
      <span className="hidden sm:inline">Prev</span>
    </>
  );
  const nextLabel = (
    <>
      <span className="hidden sm:inline">Next</span>
      {"→"}
    </>
  );

  // Windowed page list, one sibling each side.
  const pageSet = new Set<number>([1, totalPages]);
  if (currentPage - 1 >= 1) pageSet.add(currentPage - 1);
  pageSet.add(currentPage);
  if (currentPage + 1 <= totalPages) pageSet.add(currentPage + 1);

  // Never an ellipsis for a single missing page.
  const sorted = Array.from(pageSet).sort((a, b) => a - b);
  const expanded: number[] = [];
  for (let i = 0; i < sorted.length; i++) {
    expanded.push(sorted[i]);
    if (i + 1 < sorted.length && sorted[i + 1] - sorted[i] === 2) {
      expanded.push(sorted[i] + 1);
    }
  }

  type PageItem =
    { kind: "page"; page: number } | { kind: "ellipsis"; key: string };
  const items: PageItem[] = [];
  let ellipsisIndex = 0;
  for (let i = 0; i < expanded.length; i++) {
    if (i > 0 && expanded[i] - expanded[i - 1] > 1) {
      ellipsisIndex += 1;
      items.push({
        kind: "ellipsis",
        key: ellipsisIndex === 1 ? "left-ellipsis" : "right-ellipsis",
      });
    }
    items.push({ kind: "page", page: expanded[i] });
  }

  return (
    // No top border: the listing above closes itself. [→ `border-roles`]
    <nav aria-label="Pagination" className="mx-auto max-w-5xl pt-10 md:pt-12">
      {/* Wrapping is the guarantee: at a large font scale a centred row would
          overflow past the left edge where no scroll reaches. */}
      <ul className="flex flex-wrap items-center justify-center gap-1 sm:gap-2">
        <li>
          {hasPrev ? (
            <Link
              href={hrefFor(currentPage - 1)}
              rel="prev"
              aria-label="Go to previous page"
              className={`${cell} text-brand-muted hover:text-brand-crimson`}
            >
              {prevLabel}
            </Link>
          ) : (
            <span aria-hidden="true" className={`${cell} text-brand-muted`}>
              {prevLabel}
            </span>
          )}
        </li>

        {items.map((item) => {
          if (item.kind === "ellipsis") {
            return (
              <li key={item.key}>
                <span aria-hidden="true" className={`${cell} text-brand-muted`}>
                  {"…"}
                </span>
              </li>
            );
          }
          const isCurrent = item.page === currentPage;
          return (
            <li key={item.page}>
              {isCurrent ? (
                <span
                  aria-current="page"
                  className={`${cell} font-bold text-brand-crimson`}
                >
                  {item.page}
                </span>
              ) : (
                <Link
                  href={hrefFor(item.page)}
                  aria-label={`Go to page ${item.page}`}
                  className={`${cell} text-brand-muted hover:text-brand-crimson`}
                >
                  {item.page}
                </Link>
              )}
            </li>
          );
        })}

        <li>
          {hasNext ? (
            <Link
              href={hrefFor(currentPage + 1)}
              rel="next"
              aria-label="Go to next page"
              className={`${cell} text-brand-muted hover:text-brand-crimson`}
            >
              {nextLabel}
            </Link>
          ) : (
            <span aria-hidden="true" className={`${cell} text-brand-muted`}>
              {nextLabel}
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
