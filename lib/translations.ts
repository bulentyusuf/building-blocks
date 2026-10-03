import { SITE_URL, DEFAULT_LOCALE, GERMAN_LOCALE } from "./constants";

// Both language versions of a translated post, for hreflang in the page head
// and the sitemap. English is x-default. [→ `locale`]
export function postLanguageAlternates(slug: string): Record<string, string> {
  const english = `${SITE_URL}/posts/${slug}`;
  return {
    [DEFAULT_LOCALE]: english,
    [GERMAN_LOCALE]: `${SITE_URL}/de/posts/${slug}`,
    "x-default": english,
  };
}
