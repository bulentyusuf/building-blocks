import Link from "next/link";
import { SITE_URL } from "@/lib/constants";
import { jsonLdHtml } from "@/lib/json-ld";

export type Crumb = { label: string; href?: string };

export default function Breadcrumb({ items }: { items: Crumb[] }) {
  // Tone-independent: the structured data describes the trail, not its paint.
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
        {/* 13px rather than the sitewide text-sm (14px): a trail is the
            least informative line on the page, one step below meta. Links
            are crimson by default, not the usual muted-then-hover-crimson —
            with the band gone this is the one place the accent stands in for
            what colour used to be doing on navy, marking every step of the
            trail as a step rather than only naming the current page. */}
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
          {items.map((item, i) => {
            const isLast = i === items.length - 1;
            return (
              <li key={i} className="flex items-center gap-x-2">
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className="text-brand-crimson transition-opacity duration-200 hover:opacity-80"
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
                  <span aria-hidden="true" className="text-separator">
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
