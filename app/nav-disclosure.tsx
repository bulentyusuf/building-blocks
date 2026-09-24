"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Closes the <details> on navigation, Escape (returning focus to the summary)
 * and a pointer outside it; native <details> does none of these.
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

  useEffect(() => {
    const details = detailsRef.current;
    if (!details) return;

    // Focus returns to the summary, or it drops to <body>.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !details.open) return;
      details.open = false;
      details.querySelector("summary")?.focus();
    };

    // pointerdown, not click, so a drag that starts inside does not dismiss. A
    // pointerdown on the summary returns early and the native toggle closes it.
    const onPointerDown = (event: PointerEvent) => {
      if (!details.open) return;
      if (event.target instanceof Node && details.contains(event.target))
        return;
      details.open = false;
    };

    // Always registered: gating on open state would cost a re-render per toggle.
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  return (
    // `group` lets layout.tsx's icons follow this element's [open] state.
    <details ref={detailsRef} className="group md:hidden">
      {children}
    </details>
  );
}
