import Link from "next/link";

// Server component. Renders numbered page links plus prev/next.
// basePath is "/" for the index or "/categories/<slug>" for a category.
// Page 1 lives at basePath itself; pages 2+ live at basePath + "/page/<n>".
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

  // gap-1 draws the space between the arrow and its word. They are two flex
  // items now, so the word can hide below sm, and whitespace between flex
  // items is discarded rather than rendered. 4px against Literata's 3.2px
  // space at 16px, and it scales with the type because it is a rem.
  const cell =
    "inline-flex h-10 min-w-10 items-center justify-center gap-1 rounded-md px-3 text-base transition-colors duration-200";

  // Below sm the row cannot afford the words. Seven 40px cells and six 4px
  // gaps is 304px, inside the 350px Container's px-5 leaves on a 390px phone.
  // With the words it measured 368px on the middle pages, where the window
  // shows all five numbers and no ellipsis, and the excess became
  // document-level horizontal scroll. The bare arrow is 9.12px wide, so
  // min-w-10 still sets the cell and the touch target does not change.
  //
  // The accessible name comes from aria-label on the link, or is suppressed by
  // aria-hidden on the disabled span, so neither of these spans is announced
  // and hiding one changes nothing a screen reader hears.
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

  // Build the windowed page list (siblingCount = 1).
  // Step 1: seed the visible page numbers.
  const pageSet = new Set<number>([1, totalPages]);
  if (currentPage - 1 >= 1) pageSet.add(currentPage - 1);
  pageSet.add(currentPage);
  if (currentPage + 1 <= totalPages) pageSet.add(currentPage + 1);

  // Step 2: sort and fill single-page gaps (rule 4: never ellipsis for one page).
  const sorted = Array.from(pageSet).sort((a, b) => a - b);
  const expanded: number[] = [];
  for (let i = 0; i < sorted.length; i++) {
    expanded.push(sorted[i]);
    if (i + 1 < sorted.length && sorted[i + 1] - sorted[i] === 2) {
      expanded.push(sorted[i] + 1);
    }
  }

  // Step 3: build the final item list, inserting ellipses for gaps > 1.
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
    // No top border: every listing this follows draws its own closing hairline
    // (see the container note in more-stories.tsx). One here would sit in the
    // same row and print a double line.
    <nav aria-label="Pagination" className="mx-auto max-w-5xl pt-10 md:pt-12">
      {/* flex-wrap is the guarantee, not the tuning. Every width in this row
          is a rem multiple and the viewport is not, so a large enough browser
          font scale overruns any budget; wrapping to a second centred row is
          the only failure mode that leaves nothing off-screen. Without it,
          justify-center splits the overflow across both edges and the left end
          lands past the viewport where no scroll reaches it. The sm breakpoint
          is 40rem, so a raised font scale also pushes the words out later,
          which is the behaviour we want. */}
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
