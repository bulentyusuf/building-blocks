import Link from "next/link";

// Points at the other language version of a post. Its own lang, as it sits
// beside text of the opposite language, and kept out of the search index.
// The last item in the byline row, underlined like an article link. [→ `locale`]
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
    <p data-pagefind-ignore>
      <Link
        href={href}
        hrefLang={lang}
        lang={lang}
        className="inline-flex min-h-6 items-center gap-1.5 font-ui font-semibold text-brand-crimson underline decoration-2 underline-offset-[3px] hover:decoration-4"
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
