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

// Simple variant: two crimson small-caps text links, "Older posts" and
// "Newer posts", rather than a numbered list. Home is the only caller —
// a front page is not a listing a reader expects to jump around in by page
// number, and the numbered variant's own visual weight would compete with
// the plates above it in a way it never has to on a browse listing.
function SimplePagination({
  currentPage,
  totalPages,
  basePath,
}: {
  currentPage: number;
  totalPages: number;
  basePath: string;
}) {
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;
  if (!hasPrev && !hasNext) return null;

  const link =
    "font-ui text-xs font-semibold uppercase tracking-[0.14em] text-brand-crimson hover:underline";

  return (
    <nav aria-label="Pagination" className="mx-auto max-w-5xl pt-10 md:pt-12">
      <div className="flex items-center justify-between">
        <div>
          {hasPrev && (
            <Link
              href={hrefFor(basePath, currentPage - 1)}
              rel="prev"
              className={link}
            >
              &larr; Newer posts
            </Link>
          )}
        </div>
        <div>
          {hasNext && (
            <Link
              href={hrefFor(basePath, currentPage + 1)}
              rel="next"
              className={link}
            >
              Older posts &rarr;
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

// Server component. Renders numbered page links plus prev/next.
export default function Pagination({
  currentPage,
  totalPages,
  basePath,
  variant = "numbered",
}: {
  currentPage: number;
  totalPages: number;
  basePath: string;
  variant?: "numbered" | "simple";
}) {
  if (totalPages <= 1) {
    return null;
  }

  if (variant === "simple") {
    return (
      <SimplePagination
        currentPage={currentPage}
        totalPages={totalPages}
        basePath={basePath}
      />
    );
  }

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  const cell =
    "inline-flex h-10 min-w-10 items-center justify-center rounded-md px-3 text-base transition-colors duration-200";

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
      <ul className="flex items-center justify-center gap-2">
        <li>
          {hasPrev ? (
            <Link
              href={hrefFor(basePath, currentPage - 1)}
              rel="prev"
              aria-label="Go to previous page"
              className={`${cell} text-brand-muted hover:text-brand-crimson`}
            >
              {"← Prev"}
            </Link>
          ) : (
            <span aria-hidden="true" className={`${cell} text-brand-muted`}>
              {"← Prev"}
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
                  href={hrefFor(basePath, item.page)}
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
              href={hrefFor(basePath, currentPage + 1)}
              rel="next"
              aria-label="Go to next page"
              className={`${cell} text-brand-muted hover:text-brand-crimson`}
            >
              {"Next →"}
            </Link>
          ) : (
            <span aria-hidden="true" className={`${cell} text-brand-muted`}>
              {"Next →"}
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
