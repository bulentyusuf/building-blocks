import type { ReactNode } from "react";
import Container from "./container";
import Breadcrumb, { type Crumb } from "./breadcrumb";

/**
 * The shell every wide route renders through — the taxonomy listings and the
 * index listing at /page/[page]. Home and the post page render their own
 * bespoke header (a full-width masthead, a full-bleed cover) and no longer go
 * through this component. Which routes are wide is settled by the header
 * measure, not here.
 *
 * The masthead band this used to carry is retired sitewide: chrome is the
 * sticky bar and the footer only, and every route sits on cream underneath
 * it. So this collapses to a breadcrumb, then the route's own header content
 * (an h1, a standfirst, whatever sits beside them), then the route's content
 * — all one surface, one Container.
 *
 * `header` is what used to be the band's contents and `children` is
 * everything below it. The split survives the band's removal because it is
 * still where the six taxonomy listings genuinely differ (a plain heading for
 * a category or tag, a heading beside a portrait for an author) — see
 * app/listing-page.tsx.
 */
export default function WidePage({
  crumbs,
  header,
  children,
  contentOwnsLeading = false,
}: {
  /** Omitted, or empty, on a route with nothing above it. */
  crumbs?: Crumb[];
  /** The heading and whatever sits beside it. */
  header: ReactNode;
  /** Everything below the header. */
  children: ReactNode;
  /**
   * Set when the content already carries its own space above its first
   * element, so the shell adds less. The ruled listing does: every item is
   * `py-10 md:py-12`, which is the distance a hairline keeps from the cover
   * below it, and the gap under the header plays a hairline's part. Adding
   * the full section-front gap on top made the header-to-first-post distance
   * differ from every post-to-post distance under it. The section fronts do
   * not set this, so they take the larger gap.
   */
  contentOwnsLeading?: boolean;
}) {
  return (
    <Container>
      {crumbs && crumbs.length > 0 && <Breadcrumb items={crumbs} />}
      <header className={contentOwnsLeading ? "mb-8" : "mb-14"}>
        {header}
      </header>
      {children}
    </Container>
  );
}
