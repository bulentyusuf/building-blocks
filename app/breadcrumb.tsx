import Link from "next/link";
import { SITE_URL } from "@/lib/constants";
import { jsonLdHtml } from "@/lib/json-ld";

export type Crumb = { label: string; href?: string };

/**
 * One surface, one style. Every wide route rendered its trail on the navy
 * masthead band until Phase 1 of the band retirement (docs/decisions.md),
 * which is why this used to carry a `tone` prop switching between a light
 * (cream) and a dark (navy) treatment — brand-crimson computed to 1.35:1 on
 * that navy, so the dark tone needed a white ring and an opacity hover
 * instead of the ordinary link styling. With the band gone every trail sits
 * on cream, so there is only one styling to carry and the accent is
 * available again.
 *
 * The one focus-visible exception the dark tone used to need — an explicit
 * white ring plus `outline-hidden` — is gone with it. Every link here now
 * takes the sitewide `:focus-visible` rule from `app/globals.css` like any
 * other crimson link, and needs nothing of its own.
 */
export default function Breadcrumb({ items }: { items: Crumb[] }) {
  // The structured data describes the trail, not its paint, so it never
  // depended on the retired tone either.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      ...(item.href ? { item: `${SITE_URL}${item.href}` } : {}),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }}
      />
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-brand-muted">
          {items.map((item, i) => {
            const isLast = i === items.length - 1;
            return (
              <li key={i} className="flex items-center gap-x-2">
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className="hover:text-brand-crimson transition-colors duration-200"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    className={
                      isLast ? "font-medium text-brand-dark" : undefined
                    }
                    aria-current={isLast ? "page" : undefined}
                  >
                    {item.label}
                  </span>
                )}
                {!isLast && (
                  <span aria-hidden="true" className="text-brand-muted">
                    /
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
