"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { STRANDS, currentStrand } from "@/lib/strands";

const chip =
  "flex h-12 items-center gap-2.5 rounded-xl border-[3px] border-brand-dark px-4 font-display text-lg font-[800] transition-[translate,box-shadow] duration-150 motion-reduce:transition-none";
// Raised until hovered. Pressed is the same chip already pushed in, flat.
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
  return (
    <nav
      aria-label="Strands"
      className="order-last flex w-full flex-wrap items-center gap-3 md:order-none md:w-auto md:gap-5"
    >
      <Link
        href="/"
        aria-current={current === "all" ? mark : undefined}
        className={`${chip} ${
          current === "all"
            ? `${pressed} bg-brand-dark/5`
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
            className={`${chip} pl-3 ${
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
