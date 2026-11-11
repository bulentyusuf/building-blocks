import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { INLINES, type Inline } from "@contentful/rich-text-types";
import { renderHyperlink } from "./rich-text-link";

const link = (uri: string): Inline => ({
  nodeType: INLINES.HYPERLINK,
  data: { uri },
  content: [],
});

const html = (uri: string) =>
  renderToStaticMarkup(<>{renderHyperlink(link(uri), "text")}</>);

describe("renderHyperlink", () => {
  it("keeps a same-page fragment as a plain link", () => {
    expect(html("#was-mit-hinueberkam")).toBe(
      '<a href="#was-mit-hinueberkam">text</a>',
    );
  });

  // Known-bad control: the fragment branch must not open the allowlist.
  it("still degrades a javascript: href to text", () => {
    expect(html("javascript:alert(1)")).toBe("text");
  });

  it("degrades a root-relative path hiding a tab or newline to text", () => {
    expect(html("/\t/evil.com")).toBe("text");
    expect(html("/\n/evil.com")).toBe("text");
    expect(html("/\r/evil.com")).toBe("text");
  });

  // Known-bad control: the control-character check must not eat plain paths.
  it("keeps a plain root-relative path as a link", () => {
    expect(html("/posts/hello")).toBe('<a href="/posts/hello">text</a>');
  });
});
