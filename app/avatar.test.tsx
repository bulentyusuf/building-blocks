import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { default: Avatar } = await import("./avatar");

type TestAuthor = { name: string; slug?: string; picture?: { url?: string } };

const author = (slug: string, name = slug): TestAuthor => ({ name, slug });

const html = (authors: TestAuthor[], meta?: React.ReactNode) =>
  renderToStaticMarkup(<Avatar authors={authors} meta={meta} />);

describe("Avatar, single author", () => {
  it("renders nothing for zero authors", () => {
    expect(html([])).toBe("");
  });

  it("renders the meta alone when there are no authors", () => {
    // The regression this fixes: Avatar returned null for zero authors and
    // dropped the dateline with it, so a post whose only author reference was
    // unpublished lost its date and reading time entirely.
    const out = html([], <span>3 min read</span>);
    expect(out).toContain("3 min read");
    expect(out).not.toContain("<a ");
  });

  it("still renders nothing for zero authors and no meta", () => {
    // The other direction. Widening the empty case to always render a wrapper
    // would put an empty div on every caller that passes no meta.
    expect(html([], undefined)).toBe("");
  });

  it("links the single name to the author's page", () => {
    const out = html([author("bulent-yusuf", "Bulent Yusuf")]);
    expect(out).toContain('href="/authors/bulent-yusuf"');
    expect(out).toContain("Bulent Yusuf");
    // Exactly one anchor for one author.
    expect(out.match(/<a /g)).toHaveLength(1);
  });

  it("renders a plain name, no anchor, when the author has no slug", () => {
    const out = html([{ name: "No Slug" }]);
    expect(out).not.toContain("<a ");
    expect(out).toContain("No Slug");
  });

  it("renders the meta with one author", () => {
    const out = html(
      [author("bulent-yusuf", "Bulent Yusuf")],
      <span>1 January 2026</span>,
    );
    expect(out).toContain("1 January 2026");
  });

  it("falls back to initials with no picture", () => {
    const out = html([author("bulent-yusuf", "Bulent Yusuf")]);
    expect(out).toContain("BY");
  });
});

describe("Avatar, co-authors", () => {
  it("renders no separator and no & for one author", () => {
    const out = html([author("a", "A")]);
    expect(out).not.toContain(" & ");
    expect(out).not.toContain(",");
  });

  it("joins two names with an ampersand, no comma", () => {
    const out = html([author("a", "A"), author("b", "B")]);
    expect(out).toContain("A");
    expect(out).toContain(" &amp; ");
    expect(out).not.toContain(",");
  });

  it("joins three names as 'A, B & C', no serial comma before the &", () => {
    const out = html([author("a", "A"), author("b", "B"), author("c", "C")]);
    // Each name is its own anchor, so the joined text is not one contiguous
    // string — check the separators in place around the anchors instead.
    expect(out).toContain(">A</a>, <a");
    expect(out).toContain(">B</a> &amp; <a");
    expect(out).toContain(">C</a>");
    // No serial comma before the ampersand.
    expect(out).not.toContain(", &amp;");
  });

  it("links every co-author's name", () => {
    const out = html([author("a", "A"), author("b", "B")]);
    expect(out).toContain('href="/authors/a"');
    expect(out).toContain('href="/authors/b"');
    expect(out.match(/<a /g)).toHaveLength(2);
  });
});
