import type { ReactNode } from "react";
import Container from "./container";
import PageBand from "./page-band";
import { type Crumb } from "./breadcrumb";

/**
 * The shell every wide route renders through — the four section fronts, all six
 * taxonomy listings, the index listing at /page/[page] and the post page. Which
 * routes are wide is settled by the header measure, not here.
 *
 * It exists because ten of those pages were two implementations of one design.
 * ListingPage owned six of them; the four fronts each hand-rolled the same
 * `<><PageBand/><Container/></>` pair. Every tuning pass then had to be applied
 * twice and the halves drifted every time one was missed — the raised h1 ramp
 * reached the fronts and not the listings, and the standfirst colour was fixed
 * on the fronts while the listings still painted body ink on navy. Neither was
 * a typo; both were the second copy nobody edited.
 *
 * So the vertical rhythm of a wide page is defined once, here:
 *
 *   band      py-8            flat, and equal to Container's own pt-8 so the
 *                             breadcrumb starts the same distance below the
 *                             sticky header on every page, banded or not.
 *                             lib/listing-rhythm.test.ts holds the two equal
 *   gap       pt-6            cream, band edge to first content. Deliberately
 *                             SMALLER than the band's own inset: the band has
 *                             already drawn the boundary, so this space only
 *                             has to stop the content touching it. It used to
 *                             be Container's pt-8 on top of a pb-14 band, and
 *                             the two summed to 96px, which read as a hole.
 *   close     pb-12           Container's own, unchanged, down to the footer
 *
 * The band's bottom inset and this gap are different colours, so they cannot
 * collapse into a single number — one is navy and belongs to the band, the
 * other is cream and belongs to the page. They do add up in the eye, which is
 * why they are set here together rather than in two files.
 *
 * `header` is the band's contents and `children` is everything on cream. The
 * split is by SURFACE, not by importance: anything that cannot render on navy
 * belongs in children, which is why an author's RichText bio is passed down
 * there rather than into the band beside the portrait.
 */
export default function WidePage({
  crumbs,
  header,
  children,
  contentOwnsLeading = false,
  bleed = false,
}: {
  /** Passed straight to the band, which omits the trail when there is none. */
  crumbs?: Crumb[];
  /** Band contents — the h1, a standfirst, whatever sits beside them. */
  header: ReactNode;
  /** Everything below the band, on cream. */
  children: ReactNode;
  /**
   * Set when the content already carries its own space above its first
   * element, so the shell adds none. The ruled listing does: every item is
   * `py-10 md:py-12`, which is the distance a hairline keeps from the cover
   * below it, and the band's bottom edge is playing a hairline's part. Adding
   * the gap on top made the band-to-first-post distance differ from every
   * post-to-post distance under it, which is the inconsistency you see before
   * you can name it. The section fronts do not, so they take the gap.
   */
  contentOwnsLeading?: boolean;
  /**
   * Passed to the band, which deepens its bottom inset. Set by the post page,
   * whose cover pulls up across the band's edge. The band carries the
   * arithmetic.
   */
  bleed?: boolean;
}) {
  return (
    <>
      <PageBand crumbs={crumbs} bleed={bleed}>
        {header}
      </PageBand>
      <Container topPad={contentOwnsLeading ? "none" : "tight"}>
        {children}
      </Container>
    </>
  );
}
