import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import LanguageLink from "./language-link";

describe("LanguageLink", () => {
  const html = renderToStaticMarkup(
    <LanguageLink
      href="/de/posts/a-post"
      lang="de-DE"
      label="Auch auf Deutsch lesen"
    />,
  );

  it("marks the link with its target language", () => {
    expect(html).toContain('href="/de/posts/a-post"');
    expect(html).toContain('hrefLang="de-DE"');
    expect(html).toContain('lang="de-DE"');
    expect(html).toContain("Auch auf Deutsch lesen");
  });

  it("hides the icon from assistive tech, so the label is the whole name", () => {
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"/);
  });

  it("keeps the link out of the search index", () => {
    expect(html).toContain("data-pagefind-ignore");
  });
});
