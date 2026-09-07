"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Wraps a <details> element and closes it on the three things that should
 * close it. Native <details> handles none of them.
 *
 * Pathname change: <details> keeps its [open] state across client-side
 * navigations, so without this the hamburger stays open after the reader taps
 * a link.
 *
 * Escape: the WAI-ARIA disclosure pattern requires it for a disclosure that
 * covers content, and focus has to go back to the <summary> rather than
 * evaporating to <body>, or a keyboard reader loses their place in the header.
 *
 * Outside pointer: a menu that covers the page and ignores a tap on the page
 * is a trap for anyone who does not know the hamburger toggles.
 *
 * All three are DOM calls on one element. No state, no re-renders, and the
 * listeners only exist while the menu is open.
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

    // Escape returns focus to the summary. Closing without that leaves focus on
    // a link inside a subtree that is now display:none, and the browser drops
    // it to <body> — the reader is back at the top of the document with no
    // announcement that anything moved.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !details.open) return;
      details.open = false;
      details.querySelector("summary")?.focus();
    };

    // pointerdown rather than click: a click that starts inside the menu and
    // ends outside it (a drag, or a scroll that the browser resolves as a
    // click) should not count as dismissing.
    //
    // A pointerdown on <summary> itself hits the containment check below and
    // returns early — deliberately. The native click that follows toggles the
    // <details> on its own, no JS required, which is how the hamburger closes
    // its own menu. Routing this through "click" instead, or carving summary
    // out of the containment check so this handler closes it on pointerdown,
    // both reintroduce the drag-starting-inside case the paragraph above
    // exists to rule out — do not do either.
    const onPointerDown = (event: PointerEvent) => {
      if (!details.open) return;
      if (event.target instanceof Node && details.contains(event.target))
        return;
      details.open = false;
    };

    // Both are on document rather than the element because both are about
    // things happening away from it. Registered unconditionally rather than
    // gated on open state: the alternative is a state hook and a re-render on
    // every toggle, to save two listeners that return immediately when closed.
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  return (
    // group: unused in this file, but it lets the trigger's icon in
    // layout.tsx respond to this element's [open] attribute via
    // group-open:, the same mechanism the table of contents chevron uses.
    <details ref={detailsRef} className="group md:hidden">
      {children}
    </details>
  );
}
