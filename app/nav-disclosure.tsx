"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Wraps a <details> element and closes it whenever the pathname changes.
 * Native <details> keeps its [open] state across client-side navigations,
 * so without this the hamburger menu stays open after the reader taps a link.
 *
 * The mechanism: a ref to the <details> element, and a useEffect that closes
 * it when usePathname returns a new value. No state, no re-renders — just a
 * DOM call on the one element that needs it.
 */
export default function NavDisclosure({
  children,
}: {
  children: React.ReactNode;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();
  const prevPath = useRef(pathname);

  useEffect(() => {
    if (pathname !== prevPath.current) {
      prevPath.current = pathname;
      if (detailsRef.current?.open) {
        detailsRef.current.open = false;
      }
    }
  }, [pathname]);

  return (
    <details ref={detailsRef} className="md:hidden">
      {children}
    </details>
  );
}
