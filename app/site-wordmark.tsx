"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { scrollToTop } from "@/lib/scroll-to-top";

// A link home, except on home, where it is a button that scrolls to top: a
// same-URL Link in Next 16 neither navigates nor scrolls. The title arrives as a
// prop so lib/constants.ts stays out of the client bundle. No shadow: it is
// the one link without one. [→ `wide-page-shell`]
const SIZES = {
  header: "rounded-xl px-4 py-1.5 text-2xl",
  footer: "rounded-lg px-3 py-1 text-xl",
};

export default function SiteWordmark({
  title,
  size = "header",
}: {
  title: string;
  size?: keyof typeof SIZES;
}) {
  const isHome = usePathname() === "/";

  const shared = `inline-block -rotate-2 bg-brand-dark font-display font-[800] text-brand-bg ${SIZES[size]}`;

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
