import Link from "next/link";

// Points at the other language version of a post. Its own lang, because it sits
// in an article of the opposite language, and kept out of the search index.
// [→ `locale`]
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
    <p data-pagefind-ignore className="mt-4 font-ui text-sm">
      <Link
        href={href}
        hrefLang={lang}
        lang={lang}
        className="text-brand-muted underline underline-offset-2 transition-colors duration-200 hover:text-brand-crimson"
      >
        {label}
      </Link>
    </p>
  );
}
