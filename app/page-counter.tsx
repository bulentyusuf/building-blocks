/**
 * "N of M", inline as the tail of the route's own h1. Returns null on page 1.
 * [→ `page-counter`] Its classes undo the inherited h1 face, weight and
 * tracking, so it reads as meta. No margin, no brackets, and it never wraps
 * internally. Never glue it to the heading with a non-breaking space: an
 * unbreakable heading overflows.
 */
export default function PageCounter({
  currentPage,
  totalPages,
}: {
  currentPage: number;
  totalPages: number;
}) {
  if (currentPage <= 1) return null;
  return (
    <span className="font-body font-normal tracking-normal text-lg text-brand-muted whitespace-nowrap">
      {currentPage} of {totalPages}
    </span>
  );
}
