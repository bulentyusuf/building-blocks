import type { ReactNode } from "react";
import Container from "./container";
import Breadcrumb, { type Crumb } from "./breadcrumb";

/**
 * The shell every wide route renders through: breadcrumb, heading, then
 * children. No standfirst and no rule under the header, as on every page.
 * [→ `wide-page-shell`, `band-retirement`]
 */
export default function WidePage({
  crumbs,
  heading,
  children,
}: {
  crumbs: Crumb[];
  heading: ReactNode;
  children: ReactNode;
}) {
  return (
    <Container>
      <Breadcrumb items={crumbs} />
      <header className="mb-12">{heading}</header>
      <div>{children}</div>
    </Container>
  );
}
