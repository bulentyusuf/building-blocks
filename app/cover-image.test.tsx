import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// cover-image imports lib/blur.ts, which is "server-only" and throws the
// moment it is evaluated outside a React Server Component. Same stub the other
// suites use. The undefined return is the real component's "no LQIP" branch.
vi.mock("server-only", () => ({}));
vi.mock("@/lib/blur", () => ({ getBlurDataURL: async () => undefined }));

const { default: CoverImage } = await import("./cover-image");

// CoverImage is an async server component, so it is awaited to an element here
// rather than rendered through the client renderer.
const html = async (props: Parameters<typeof CoverImage>[0]) =>
  renderToStaticMarkup(await CoverImage(props));

const URL = "https://images.ctfassets.net/x/y/cover.jpg";

describe("CoverImage link semantics", () => {
  // Every call site that links the cover also renders a heading link to the
  // same destination beside it: the card title, the home hero h1, the
  // categories index h2. Named, that was two adjacent links per card with
  // identical accessible names — double the tab stops on every listing and
  // every title twice over in a screen reader's link list.
  it("hides a linked cover from assistive tech and the tab order", async () => {
    const out = await html({ url: URL, slug: "a-post" });

    expect(out).toContain('href="/posts/a-post"');
    expect(out).toContain('aria-hidden="true"');
    expect(out).toContain('tabindex="-1"');
  });

  it("never names the cover link", async () => {
    // aria-label={title} was the duplicate announcement. aria-hidden without
    // the tabindex would be its own violation, so the pair is asserted above.
    const out = await html({ url: URL, slug: "a-post" });

    expect(out).not.toContain("aria-label");
  });

  it("honours an explicit href the same way", async () => {
    const out = await html({ url: URL, href: "/categories/games" });

    expect(out).toContain('href="/categories/games"');
    expect(out).toContain('tabindex="-1"');
  });

  it("renders no link at all without a slug or href", async () => {
    // The post-page cover. Nothing to hide, and nothing to duplicate.
    const out = await html({ url: URL });

    expect(out).not.toContain("<a ");
    expect(out).not.toContain('tabindex="-1"');
  });

  it("defaults to empty alt when no asset title is passed", async () => {
    // An asset with no Contentful title renders exactly what it rendered
    // before the alt prop existed. Never a filename, never the post title.
    const out = await html({ url: URL, slug: "a-post" });

    expect(out).toContain('alt=""');
  });

  it("renders the asset title as alt when given one", async () => {
    const out = await html({
      url: URL,
      slug: "a-post",
      alt: "A brass desk lamp lighting a stack of paperbacks",
    });

    expect(out).toContain(
      'alt="A brass desk lamp lighting a stack of paperbacks"',
    );
  });

  it("keeps a linked cover out of the accessibility tree even with alt text", async () => {
    // The aria-hidden Link is what makes a listing cover decorative, not the
    // empty alt. Alt text on a linked cover is for crawlers, which read the
    // DOM. Both must hold at once.
    const out = await html({
      url: URL,
      slug: "a-post",
      alt: "A brass desk lamp lighting a stack of paperbacks",
    });

    expect(out).toContain('aria-hidden="true"');
    expect(out).toContain('tabindex="-1"');
    expect(out).toContain(
      'alt="A brass desk lamp lighting a stack of paperbacks"',
    );
  });
});
