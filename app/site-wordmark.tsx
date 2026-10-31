"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { scrollToTop } from "@/lib/scroll-to-top";

// A link home, except on home, where it is a button that scrolls to top: a
// same-URL Link in Next 16 neither navigates nor scrolls. The title arrives as a
// prop so lib/constants.ts stays out of the client bundle. [→ `wide-page-shell`]
export default function SiteWordmark({ title }: { title: string }) {
  const isHome = usePathname() === "/";

  // Rotation and the press translate are separate properties, so they compose
  // without either undoing the other.
  const shared =
    "inline-block -rotate-2 rounded-xl bg-brand-dark px-4 py-1.5 font-display text-2xl font-[800] text-brand-bg shadow-[4px_4px_0_var(--color-brand-crimson)] transition-[translate,box-shadow] duration-150 hover:translate-[4px] hover:shadow-none motion-reduce:transition-none";

  if (isHome) {
    return (
      <button
        type="button"
        onClick={scrollToTop}
        className={`${shared} cursor-pointer`}
      >
        {title}
        {/* An sr-only suffix, not aria-label, so the name still contains the
            visible text (WCAG 2.5.3). */}
        <span className="sr-only">, back to top</span>
      </button>
    );
  }

  return (
    <Link href="/" className={shared}>
      {title}
    </Link>
  );
}
