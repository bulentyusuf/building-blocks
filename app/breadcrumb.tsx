import Link from "next/link";
import { SITE_URL } from "@/lib/constants";
import { jsonLdHtml } from "@/lib/json-ld";

// lang only where a label is content in another language. [→ `locale`]
export type Crumb = { label: string; href?: string; lang?: string };

export default function Breadcrumb({ items }: { items: Crumb[] }) {
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
      {/* Muted root, crimson steps, an unlinked current page in ink.
          [→ `breadcrumbs`] */}
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 font-ui text-[0.9375rem] font-semibold text-brand-muted">
          {items.map((item, i) => {
            const isLast = i === items.length - 1;
            return (
              <li key={i} className="flex items-center gap-x-1.5">
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    lang={item.lang}
                    className={`transition-colors duration-200 hover:text-brand-crimson ${
                      i === 0 ? "" : "text-brand-crimson"
                    }`}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    className={isLast ? "text-brand-dark" : undefined}
                    aria-current={isLast ? "page" : undefined}
                    lang={item.lang}
                  >
                    {item.label}
                  </span>
                )}
                {!isLast && (
                  <span aria-hidden="true" className="text-brand-muted">
                    ›
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
