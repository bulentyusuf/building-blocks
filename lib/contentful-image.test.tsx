import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ContentfulImage, { contentfulLoader } from "./contentful-image";

describe("contentfulLoader", () => {
  it("appends the transform query params for a Contentful asset", () => {
    const url = contentfulLoader({
      src: "https://images.ctfassets.net/space/asset.jpg",
      width: 640,
      quality: 80,
    });
    expect(url).toBe(
      "https://images.ctfassets.net/space/asset.jpg?w=640&q=80&fm=webp",
    );
  });

  it("returns a non-Contentful src untouched", () => {
    const url = contentfulLoader({
      src: "https://example.com/asset.jpg",
      width: 640,
      quality: 80,
    });
    expect(url).toBe("https://example.com/asset.jpg");
  });

  // Known-bad control. The host check is `url.hostname !== CONTENTFUL_IMAGE_HOST`,
  // an exact match rather than a substring test, for the same reason
  // lib/csp-headers.test.ts's allowsFrameAncestor is exact rather than
  // `.includes()`: a lookalike host containing the real one as a substring
  // must not be treated as the real one. Without this, a loosened check (say,
  // `src.includes(CONTENTFUL_IMAGE_HOST)`) would still pass the two tests
  // above and start appending Contentful's transform params to a URL this
  // repo does not control.
  it("does not treat a lookalike host as Contentful", () => {
    const url = contentfulLoader({
      src: "https://evil.example/images.ctfassets.net/asset.jpg",
      width: 640,
      quality: 80,
    });
    expect(url).toBe("https://evil.example/images.ctfassets.net/asset.jpg");
  });

  it("defaults quality to 75 when none is given", () => {
    const url = contentfulLoader({
      src: "https://images.ctfassets.net/space/asset.jpg",
      width: 640,
    });
    expect(url).toBe(
      "https://images.ctfassets.net/space/asset.jpg?w=640&q=75&fm=webp",
    );
  });
});

describe("ContentfulImage", () => {
  it("passes a blurDataURL through to the rendered placeholder", () => {
    const html = renderToStaticMarkup(
      <ContentfulImage
        src="https://images.ctfassets.net/space/asset.jpg"
        alt=""
        width={100}
        height={100}
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,ABCD"
      />,
    );

    // next/image renders the placeholder as an inline SVG data URI background
    // embedding the given blurDataURL as its <image href>, cleared once the
    // real bitmap decodes — no reveal state or opacity handling left in this
    // component for that to depend on.
    expect(html).toContain("ABCD");
  });
});
