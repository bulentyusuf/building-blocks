"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { STRANDS, currentStrand } from "@/lib/strands";

// Below md the chips are one row that scrolls sideways, sized so the last
// chip is always cut off at the edge, the cue that there is more. [→ `strands`]
const chip =
  "flex h-11 shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl border-[3px] border-outline pr-3 pl-2.5 font-display text-[0.9375rem] font-[800] transition-[translate,box-shadow] duration-150 motion-reduce:transition-none md:h-12 md:px-4 md:text-lg";
// Raised until hovered. Pressed is the same chip already pushed in, flat.
// Every fill is opaque, so the graph paper never shows through. [→ `strands`]
const raised = "bg-card hover:translate-[4px] hover:shadow-none";
const pressed = "translate-[4px]";
const dot = "size-[18px] shrink-0 rounded-full border-2 border-brand-dark";

/**
 * The header's chips on every page. Links, not filters: home and a strand page
 * press their own chip as `aria-current="page"`; a post presses its strand as
 * `"true"`, since the chip links away. `postStrands` maps slug to strand.
 * [→ `strands`]
 */
export default function StrandChips({
  postStrands,
}: {
  postStrands: Record<string, string>;
}) {
  const found = currentStrand(usePathname(), postStrands);
  const current = found?.slug;
  const mark = found?.onPost ? "true" : "page";
  const row = useRef<HTMLElement>(null);
  const [more, setMore] = useState(false);
  // While more chips lie past the right edge, the row fades out there. The
  // cut-off chip alone is not enough: at a 20px root a chip edge can land
  // exactly on the screen edge. [→ `strands`]
  useEffect(() => {
    const nav = row.current;
    if (!nav) return;
    const check = () =>
      setMore(
        getComputedStyle(nav).overflowX !== "visible" &&
          nav.scrollWidth - nav.clientWidth - nav.scrollLeft > 1,
      );
    check();
    nav.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      nav.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, []);
  // A pressed chip cut off at the edge (Games & Gadgets on a phone) scrolls
  // fully into view. scrollLeft, not scrollIntoView, so the page never moves.
  useEffect(() => {
    const nav = row.current;
    const on = nav?.querySelector<HTMLElement>("[aria-current]");
    if (!nav || !on) return;
    const over =
      on.getBoundingClientRect().right -
      (nav.getBoundingClientRect().right -
        parseFloat(getComputedStyle(nav).paddingRight));
    if (over > 0) nav.scrollLeft += over;
  }, [current]);
  return (
    <nav
      aria-label="Strands"
      ref={row}
      data-more={more || undefined}
      className="order-last -mx-4 flex w-[calc(100%+2rem)] items-center gap-2 overflow-x-auto px-4 pb-1.5 md:order-none md:mx-0 md:w-auto md:flex-wrap md:gap-5 md:overflow-visible md:px-0 md:pb-0 data-more:[mask-image:linear-gradient(to_right,black_calc(100%-3rem),transparent)]"
    >
      <Link
        href="/"
        aria-current={current === "all" ? mark : undefined}
        className={`${chip} ${
          current === "all"
            ? `${pressed} bg-[color-mix(in_oklab,var(--color-brand-dark)_5%,var(--color-brand-bg))]`
            : `${raised} shadow-[4px_4px_0_var(--color-brand-crimson)]`
        }`}
      >
        All
      </Link>
      {STRANDS.map((strand) => {
        const on = current === strand.slug;
        return (
          <Link
            key={strand.slug}
            href={`/categories/${strand.slug}`}
            aria-current={on ? mark : undefined}
            className={`${chip} md:pl-3 ${
              on
                ? `${pressed} ${strand.fill} text-on-strand`
                : `${raised} ${strand.shadow}`
            }`}
          >
            <span
              aria-hidden="true"
              className={`${dot} ${on ? "bg-on-strand" : strand.fill}`}
            />
            {strand.label}
          </Link>
        );
      })}
    </nav>
  );
}
