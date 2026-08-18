// The "Page N of M" caption for paginated listings. It is the LAST line of the
// wide-page header, below the standfirst — app/wide-page.tsx and
// app/listing-page.tsx own the surrounding shell.
//
// It used to sit inside the masthead band, on the reasoning that position is
// masthead matter: it says which slice of a listing you are looking at, which
// is exactly what the rest of the header establishes. That reasoning did not
// depend on the band's colour and survives Phase 1 of the band retirement
// (CLAUDE.md) unchanged — the caption stays the header's last line on cream
// exactly as it was on navy, still after the standfirst so it never splits
// the heading from it, and still under a portrait row on author pages rather
// than beside it.
//
// No colour class: brand-muted reads fine on cream, matching every other
// piece of meta on the site — dates, bylines, breadcrumbs. It separates from
// the standfirst by size rather than tint.
//
// Renders nothing on page 1, so the common case stays uncluttered and callers
// can render it unconditionally rather than each deciding when a page counts as
// paginated. That is what lets app/listing-page.tsx own it for every route it
// serves — the six taxonomy listings and the index listing at /page/[page].
export default function PageContext({
  currentPage,
  totalPages,
}: {
  currentPage: number;
  totalPages: number;
}) {
  if (currentPage <= 1) return null;
  return (
    <p className="mt-5 text-sm text-brand-muted">
      Page {currentPage} of {totalPages}
    </p>
  );
}
