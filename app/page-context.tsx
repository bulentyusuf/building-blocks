// The "Page N of M" caption for paginated listings. It is the LAST line of the
// masthead band, below the standfirst.
//
// It used to sit on cream between the band and the list, and the note here
// argued for that: position describes the list rather than the subject. Two
// things were wrong with it in practice. It floated — a single small line alone
// in the gap, with no edge on either side to belong to. And on author pages the
// bio sat between it and the posts, so the caption counted a list it was not
// next to anyway.
//
// Both dissolve now that the bio is in the band. Position is masthead matter:
// it says which slice of this listing you are looking at, which is exactly what
// the rest of the band establishes. Placing it after the standfirst also avoids
// what got it moved out of the header originally — it no longer splits the
// heading from its standfirst, and on author pages it lands under the whole
// portrait row rather than beside it.
//
// No colour class: it takes solid white from the band's root like everything
// else in there, and separates by size rather than tint. See app/page-band.tsx.
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
    <p className="mt-5 text-sm">
      Page {currentPage} of {totalPages}
    </p>
  );
}
