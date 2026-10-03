import Link from "next/link";

// Points at the other language version of a post. Its own lang, as it sits
// beside text of the opposite language, and kept out of the search index.
// A tinted fill and an icon, so it never reads as a tag pill. [→ `locale`]
export default function LanguageLink({
  href,
  lang,
  label,
}: {
  href: string;
  lang: string;
  label: string;
}) {
  return (
    <p data-pagefind-ignore className="mt-4">
      <Link
        href={href}
        hrefLang={lang}
        lang={lang}
        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-brand-crimson/10 px-3.5 font-ui text-sm font-semibold text-brand-crimson no-underline transition-colors duration-200 hover:bg-brand-crimson/15"
      >
        {/* Lucide 'languages' icon, ISC licence. */}
        <svg
          aria-hidden="true"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m5 8 6 6" />
          <path d="m4 14 6-6 2-3" />
          <path d="M2 5h12" />
          <path d="M7 2h1" />
          <path d="m22 22-5-10-5 10" />
          <path d="M14 18h6" />
        </svg>
        {label}
      </Link>
    </p>
  );
}
