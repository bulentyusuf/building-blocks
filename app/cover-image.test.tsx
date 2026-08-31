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

// A described asset, and the shape every call site now passes: the whole
// thing, not a url beside an alt string.
const described = {
  url: URL,
  title: "A brass desk lamp lighting a stack of paperbacks",
  fileName: "cover.jpg",
};

// No usable title. Contentful requires the field, so this is what the library
// actually contained: the filename stem, restated.
const untitled = { url: URL, title: "cover", fileName: "cover.jpg" };

describe("CoverImage link semantics", () => {
  // Every call site that links the cover also renders a heading link to the
  // same destination beside it: the card title, the home hero h1, the
  // categories index h2. Named, that was two adjacent links per card with
  // identical accessible names — double the tab stops on every listing and
  // every title twice over in a screen reader's link list.
  it("hides a linked cover from assistive tech and the tab order", async () => {
    const out = await html({ image: described, slug: "a-post" });

    expect(out).toContain('href="/posts/a-post"');
    expect(out).toContain('aria-hidden="true"');
    expect(out).toContain('tabindex="-1"');
  });

  it("never names the cover link", async () => {
    // aria-label={title} was the duplicate announcement. aria-hidden without
    // the tabindex would be its own violation, so the pair is asserted above.
    const out = await html({ image: described, slug: "a-post" });

    expect(out).not.toContain("aria-label");
  });

  it("honours an explicit href the same way", async () => {
    const out = await html({ image: described, href: "/categories/games" });

    expect(out).toContain('href="/categories/games"');
    expect(out).toContain('tabindex="-1"');
  });

  it("renders no link at all without a slug or href", async () => {
    // The post-page cover. Nothing to hide, and nothing to duplicate.
    const out = await html({ image: described });

    expect(out).not.toContain("<a ");
    expect(out).not.toContain('tabindex="-1"');
  });

  it("renders the asset title as alt when it describes the picture", async () => {
    const out = await html({ image: described, slug: "a-post" });

    expect(out).toContain(
      'alt="A brass desk lamp lighting a stack of paperbacks"',
    );
  });

  it("keeps a linked cover out of the accessibility tree even with alt text", async () => {
    // The aria-hidden Link is what makes a listing cover decorative, not the
    // empty alt. Alt text on a linked cover is for crawlers, which read the
    // DOM. Both must hold at once.
    const out = await html({ image: described, slug: "a-post" });

    expect(out).toContain('aria-hidden="true"');
    expect(out).toContain('tabindex="-1"');
    expect(out).toContain(
      'alt="A brass desk lamp lighting a stack of paperbacks"',
    );
  });
});

describe("CoverImage alt text", () => {
  // The guard this suite exists to prove reaches a cover at all.
  //
  // isPlaceholderTitle had exactly ONE call site — embedded rich-text figures
  // — and covers rendered `alt={coverImage.title ?? ""}` straight from the
  // CMS, unchecked. It could not have been checked either: the cover
  // selections in lib/api.ts asked for url and title and nothing else, and the
  // comparison needs the filename. So the whole class of defect the helper was
  // written for went unguarded on the largest image on every page.
  it("drops a title that is only the filename restated", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const out = await html({ image: untitled });

    expect(out).toContain('alt=""');
    // The specific failure: never the stem itself.
    expect(out).not.toContain('alt="cover"');
    // And it says so, the way lib/rich-text.tsx does for an embedded figure —
    // a silent empty alt is a content problem nobody would ever learn about.
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it("drops generator output too", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const out = await html({
      image: {
        url: URL,
        title: "Gemini Generated Image abc123",
        fileName: "Gemini_Generated_Image_abc123.png",
      },
    });

    expect(out).toContain('alt=""');
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it("says nothing about a title that does describe the picture", async () => {
    // The control. Without it every assertion above would keep passing if the
    // helper started rejecting everything, and the site would silently go
    // fully decorative.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const out = await html({ image: described });

    expect(out).toContain(
      'alt="A brass desk lamp lighting a stack of paperbacks"',
    );
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
