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
  children,
}: {
  crumbs: Crumb[];
  heading: ReactNode;
  /** Must carry the full standfirst class set, both `md:` prefixes included.
   * [→ `split-masthead`] */
  standfirst?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Container>
      <Breadcrumb items={crumbs} />
      <header className="mb-8">
        {standfirst ? (
          <div className="flex flex-col gap-3 md:flex-row md:items-baseline-last md:justify-between md:gap-10">
            {heading}
            {/* A wrapper, so justify-between always sees two children. */}
            <div>{standfirst}</div>
          </div>
        ) : (
          heading
        )}
      </header>
      <div className="border-t-[3px] border-brand-dark" />
      <div className="pt-6">{children}</div>
    </Container>
  );
}
