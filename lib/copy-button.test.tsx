import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import CopyButton from "./copy-button";

describe("CopyButton before hydration", () => {
  it("renders no button on the server, only an invisible stand-in", () => {
    // The button is the whole defect: copying needs navigator.clipboard, so
    // with scripts off it took focus, announced "Copy code", and did nothing.
    // Same shape as the lightbox trigger fixed in #285. The stand-in keeps the
    // button's box, so hydration moves nothing; invisible keeps it out of the
    // accessibility tree. [→ `post-page`]
    const html = renderToStaticMarkup(<CopyButton code="const a = 1;" />);
    expect(html).not.toContain("<button");
    expect(html).toMatch(
      /^<span aria-hidden="true" data-pagefind-ignore="true" class="invisible [^"]*px-2 py-1[^"]*">Copy<\/span>$/,
    );
  });

  it("renders no button for either variant or label", () => {
    for (const props of [
      { code: "x", label: "prompt", variant: "dark" as const },
      { code: "x", variant: "light" as const },
    ]) {
      const html = renderToStaticMarkup(<CopyButton {...props} />);
      expect(html).not.toContain("<button");
      expect(html).not.toContain("aria-label");
      expect(html).toContain('class="invisible');
    }
  });
});
