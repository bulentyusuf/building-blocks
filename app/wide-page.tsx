import type { ReactNode } from "react";
import Container from "./container";
import Breadcrumb, { type Crumb } from "./breadcrumb";

/**
 * The shell every wide route renders through: breadcrumb, then heading and
 * standfirst on one row from `md` up, closed by the 3px rule, then children.
 * The rule inherits the ink token, so it needs no dark-mode override, and it
 * is the whole close: anything richer is the retired band again.
 * [→ `page-axis`, `wide-page-shell`, `band-retirement`, `split-masthead`]
 */
export default function WidePage({
  crumbs,
  heading,
  standfirst,
  splitHeader = true,
  children,
  contentOwnsLeading = false,
}: {
  /** Omitted on home, which has nothing above it. */
  crumbs?: Crumb[];
  /** The h1, plus anything inline with it (the author portrait). */
  heading: ReactNode;
  /** Must carry the full standfirst class set, both `md:` prefixes included.
   * [→ `split-masthead`] */
  standfirst?: ReactNode;
  /** False only on the author routes. [→ `page-axis`] */
  splitHeader?: boolean;
  /** Suppresses the gap below the rule, never the margin above it. Only ruled
   * listings set it. [→ `band-retirement`] */
  contentOwnsLeading?: boolean;
  children: ReactNode;
}) {
  return (
    <Container>
      {crumbs && crumbs.length > 0 && <Breadcrumb items={crumbs} />}
      <header className="mb-8">
        {splitHeader && standfirst ? (
          <div className="flex flex-col gap-3 md:flex-row md:items-baseline-last md:justify-between md:gap-10">
            {heading}
            {/* A wrapper, because a fragment would give justify-between three
                children. [→ `page-counter`] */}
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
