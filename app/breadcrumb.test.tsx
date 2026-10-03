import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Breadcrumb from "./breadcrumb";

describe("Breadcrumb", () => {
  it("tags a crumb whose label is in another language", () => {
    const html = renderToStaticMarkup(
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Große Künstler klauen", lang: "de-DE" },
        ]}
      />,
    );
    expect(html).toMatch(/<span[^>]*lang="de-DE"[^>]*>Große Künstler klauen/);
    // Known-bad control: the English crumb stays untagged.
    expect(html).not.toMatch(/lang="[^"]*"[^>]*>Home/);
  });
});
