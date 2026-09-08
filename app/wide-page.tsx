import type { ReactNode } from "react";
import Container from "./container";
import Breadcrumb, { type Crumb } from "./breadcrumb";

/**
 * The shell every wide route renders through — the four section fronts, all six
 * taxonomy listings, the index listing at `/page/[page]`, the post page and
 * home. Which routes are wide is settled by the header measure, not here.
 * [→ `page-axis`]
 *
 * Renders the breadcrumb (if any), then `heading` and `standfirst` on one row
 * from `md` up, closed by a 3px `border-brand-dark` rule, then `children`.
 * [→ `wide-page-shell`, `band-retirement`, `split-masthead`]
 *
 * Tripwires:
 *
 * - **`contentOwnsLeading` suppresses the gap below the 3px rule, never the
 *   header's `mb-8` above it.** Which side it acts on is the whole point — see
 *   the prop's own doc below. [→ `band-retirement`]
 * - **Do not invent anything richer than the 3px rule as the header's close.**
 *   Any replacement is the retired band again with extra steps.
 * - **The rule needs no dark-mode override.** It inherits `--color-brand-dark`
 *   and inverts with the scheme exactly as the ink does; adding one would
 *   fight the token rather than follow it.
 * - **`flex-col` below `md` is required, not decorative.** A 60px heading is
 *   330px wide at its widest and a 390px phone has 350px of content, so there
 *   is no room for a standfirst beside it there.
 * - **Last-baseline alignment, not first.** Plain `baseline` aligns first
 *   baselines, which hangs a two-line standfirst below the heading instead of
 *   closing both blocks at the bottom.
 * - **The standfirst's width cap and the `justify-between` anchor are one
 *   decision.** Do not ship one without the other — `justify-between` alone
 *   reopens the gap the cap exists to close. [→ `split-masthead`]
 * - **Do not give a narrow route `splitHeader` at all** — see the prop's own
 *   doc below. [→ `page-axis`]
 */
export default function WidePage({
  crumbs,
  heading,
  standfirst,
  splitHeader = true,
  children,
  contentOwnsLeading = false,
}: {
  /** Omitted, or empty, on a wide route with nothing above the header — home,
   * and page 1 of a paginated listing (app/listing-page.tsx handles the rest
   * of those). */
  crumbs?: Crumb[];
  /** The h1, plus anything meant to sit inline with it (a portrait, on the
   * author routes). */
  heading: ReactNode;
  /** The standfirst, when the route has one. Every standfirst passed here
   * must carry `md:max-w-[20rem] text-lg leading-relaxed md:text-right
   * text-brand-muted` — both `md:` prefixes are mandatory, and
   * `lib/palette-contrast.test.ts`'s standfirst guard requires all four
   * classes in its pattern. Unprefixed, the two `md:` ones still apply on
   * their own: the standfirst shrinks to a 320px box on mobile and
   * right-aligns its text inside it, landing short of the page edge under a
   * left-aligned heading. [→ `split-masthead`] */
  standfirst?: ReactNode;
  /** False only on the author routes, whose `h1` already sits beside a 112px
   * portrait. Never true on a narrow route — the wide header is not an option
   * there regardless of this prop. [→ `page-axis`] */
  splitHeader?: boolean;
  /** Suppresses the gap below the 3px rule, never the header's margin above
   * it — a prop meaning "the content below supplies its own space" cannot be
   * spent on the space above the boundary. Every ruled listing sets it, since
   * each item carries `py-10 md:py-12` of its own vertical padding and would
   * otherwise get two gaps stacked. Nothing else sets it. [→ `band-retirement`] */
  contentOwnsLeading?: boolean;
  /** Everything below the header. */
  children: ReactNode;
}) {
  return (
    <Container>
      {crumbs && crumbs.length > 0 && <Breadcrumb items={crumbs} />}
      <header className="mb-8">
        {splitHeader && standfirst ? (
          <div className="flex flex-col gap-3 md:flex-row md:items-baseline-last md:justify-between md:gap-10">
            {heading}
            {/* Load-bearing, not tidy markup: a fragment generates no box, so
                justify-between would see three children instead of two and
                strand the middle one. Guards against a future caller passing
                a fragment here, not a fix for a bug that exists today.
                [→ `page-counter`] */}
            <div>{standfirst}</div>
          </div>
        ) : (
          <>
            {heading}
            {standfirst}
          </>
        )}
      </header>
      <div className="border-t-[3px] border-brand-dark" />
      <div className={contentOwnsLeading ? undefined : "pt-6"}>{children}</div>
    </Container>
  );
}
