import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BLOCKS, type Document } from "@contentful/rich-text-types";
import AuthorBioCard, { AuthorBioSection } from "./author-bio-card";
import type { Author } from "@/lib/types";

const richText = (text: string) => ({
  json: {
    nodeType: BLOCKS.DOCUMENT,
    data: {},
    content: [
      {
        nodeType: BLOCKS.PARAGRAPH,
        data: {},
        content: [
          { nodeType: "text" as const, value: text, marks: [], data: {} },
        ],
      },
    ],
  } as unknown as Document,
  links: { assets: { block: [] }, entries: { block: [], inline: [] } },
});

const authorWithBio = (
  slug?: string,
  name = "Bulent Yusuf",
  pictureUrl = "https://images.ctfassets.net/test/avatar.jpg",
): Author => ({
  name,
  slug,
  picture: { url: pictureUrl },
  bio: richText(`${name} is a writer and developer.`),
});

const authorWithoutBio = (
  slug?: string,
  name = "Author Without Bio",
): Author => ({
  name,
  slug,
  picture: { url: "https://images.ctfassets.net/test/avatar.jpg" },
  bio: undefined,
});

describe("AuthorBioCard", () => {
  it("renders nothing when the author has no bio", () => {
    const html = renderToStaticMarkup(
      <AuthorBioCard author={authorWithoutBio("jane-doe", "Jane Doe")} />,
    );
    expect(html).toBe("");
  });

  it("renders the author's name, bio, portrait, and profile link when bio is present", () => {
    const author = authorWithBio("bulent-yusuf", "Bulent Yusuf");
    const html = renderToStaticMarkup(<AuthorBioCard author={author} />);

    expect(html).toContain("Bulent Yusuf is a writer");
    expect(html).toContain("developer.");
    expect(html).toContain('href="/authors/bulent-yusuf"');
    expect(html).toContain("More posts by Bulent Yusuf →");
    expect(html).toContain("https://images.ctfassets.net/test/avatar.jpg");
  });

  it("renders without profile link when author has no slug", () => {
    const author = authorWithBio(undefined, "Guest Contributor");
    const html = renderToStaticMarkup(<AuthorBioCard author={author} />);

    expect(html).toContain("Guest Contributor");
    expect(html).not.toContain("href=");
    expect(html).not.toContain("More posts by");
  });
});

describe("AuthorBioSection (foot-of-post bio stack)", () => {
  it("renders no wrapper element at all when zero authors have a bio (no empty shell)", () => {
    const authors = [
      authorWithoutBio("author-1", "Author 1"),
      authorWithoutBio("author-2", "Author 2"),
    ];
    const html = renderToStaticMarkup(<AuthorBioSection authors={authors} />);
    expect(html).toBe("");
  });

  it("renders no wrapper element at all when authors list is empty", () => {
    const html = renderToStaticMarkup(<AuthorBioSection authors={[]} />);
    expect(html).toBe("");
  });

  it("renders one card with singular 'About the author' for a single-author post with bio", () => {
    const author = authorWithBio("bulent-yusuf", "Bulent Yusuf");
    const html = renderToStaticMarkup(<AuthorBioSection authors={[author]} />);

    expect(html).toContain("About the author");
    expect(html).not.toContain("About the authors");
    expect(html).toContain("Bulent Yusuf");
    // Exactly one card rendered
    expect(html.match(/More posts by/g)).toHaveLength(1);
  });

  it("keeps the foot-of-post bio out of the search index", () => {
    // The bio is identical on every post by that author, so indexed as prose
    // it matches a query a dozen times over and hands back the bio as the
    // excerpt instead of anything about the post.
    const author = authorWithBio("bulent-yusuf", "Bulent Yusuf");
    const html = renderToStaticMarkup(<AuthorBioSection authors={[author]} />);
    const wrapper = /^<div[^>]*>/.exec(html)?.[0];
    expect(wrapper, "AuthorBioSection wrapper not found").toBeTruthy();
    expect(wrapper).toContain("data-pagefind-ignore");
  });

  it("would catch the ignore attribute drifting off the wrapper", () => {
    // Known-bad control. Proves the check above can actually fail rather than
    // passing on any data-pagefind-ignore it finds in the document.
    const author = authorWithBio("bulent-yusuf", "Bulent Yusuf");
    const html = renderToStaticMarkup(
      <AuthorBioSection authors={[author]} />,
    ).replace(/(<div[^>]*?)\sdata-pagefind-ignore/, "$1");
    const wrapper = /^<div[^>]*>/.exec(html)?.[0];
    expect(wrapper).toBeTruthy();
    expect(wrapper).not.toContain("data-pagefind-ignore");
  });

  it("renders two cards with plural 'About the authors' for a co-authored post where both have bios", () => {
    const author1 = authorWithBio("bulent-yusuf", "Bulent Yusuf");
    const author2 = authorWithBio("trippy-robot", "Trippy Robot");
    const html = renderToStaticMarkup(
      <AuthorBioSection authors={[author1, author2]} />,
    );

    expect(html).toContain("About the authors");
    expect(html).not.toContain("About the author<");
    expect(html).toContain("Bulent Yusuf");
    expect(html).toContain("Trippy Robot");
    expect(html).toContain("space-y-10");
    // Two cards rendered
    expect(html.match(/More posts by/g)).toHaveLength(2);
  });

  it("renders only one card with singular 'About the author' for a two-author post where only one has a bio", () => {
    const author1 = authorWithBio("bulent-yusuf", "Bulent Yusuf");
    const author2 = authorWithoutBio("trippy-robot", "Trippy Robot");
    const html = renderToStaticMarkup(
      <AuthorBioSection authors={[author1, author2]} />,
    );

    // Only one author has a bio, so singular label and exactly one card
    expect(html).toContain("About the author");
    expect(html).not.toContain("About the authors");
    expect(html).toContain("Bulent Yusuf");
    expect(html).not.toContain("Trippy Robot");
    expect(html.match(/More posts by/g)).toHaveLength(1);
  });

  it("applies mt-8 and omits border-t when hasTags is true (single divider above tags)", () => {
    const author = authorWithBio("bulent-yusuf", "Bulent Yusuf");
    const html = renderToStaticMarkup(
      <AuthorBioSection authors={[author]} hasTags={true} />,
    );
    expect(html).toContain("mt-8");
    expect(html).not.toContain("border-t");
  });

  it("applies mt-8, border-t, and pt-8 when hasTags is false (opens section itself)", () => {
    const author = authorWithBio("bulent-yusuf", "Bulent Yusuf");
    const html = renderToStaticMarkup(
      <AuthorBioSection authors={[author]} hasTags={false} />,
    );
    expect(html).toContain("mt-8");
    expect(html).toContain("border-t");
    expect(html).toContain("pt-8");
  });
});
