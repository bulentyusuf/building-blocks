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
});
