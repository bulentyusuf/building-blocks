import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import nextConfig from "../next.config.js";
import LightboxImage, {
  WIDEST_SERVED_FILE,
  worthEnlarging,
} from "./lightbox-image";

// renderToStaticMarkup never runs effects, so `mounted` stays false and this is
// exactly the HTML a reader with JavaScript disabled is left holding.
const serverHtml = () =>
  renderToStaticMarkup(
    <LightboxImage
      src="https://images.ctfassets.net/x/y.jpg"
      alt="A placeholder"
      caption="A placeholder"
    />,
  );

describe("lightbox server output", () => {
  it("emits no trigger before mount", () => {
    // The button is the whole defect: with scripts off it took focus,
    // announced "Enlarge image" and did nothing on click. A control that
    // cannot do what it advertises should not be in the markup at all.
    const html = serverHtml();

    expect(html).not.toContain("<button");
    expect(html).not.toContain("Enlarge image");
    expect(html).not.toContain("cursor-zoom-in");
  });

  it("still renders the image itself", () => {
    // Degrading the affordance must not degrade the content — the image never
    // depended on JavaScript and must survive with the trigger gone.
    const html = serverHtml();

    expect(html).toContain("<img");
  });
});

describe("lightbox aspect ratio", () => {
  // Every image was laid out 1200x800 regardless of the asset, and the
  // enlarged view went further and claimed 2000x1333. On a portrait photo
  // object-contain then letterboxed the image inside a landscape box, so the
  // white frame hugged empty space and the caption sat below the box rather
  // than below the picture. Nothing asserted on the shape, which is why it
  // survived as long as it did.
  const portrait = () =>
    renderToStaticMarkup(
      <LightboxImage
        src="https://images.ctfassets.net/x/y.jpg"
        alt="A box shot"
        width={800}
        height={1200}
      />,
    );

  it("renders a portrait asset at its own dimensions", () => {
    const html = portrait();

    expect(html).toContain('width="800"');
    expect(html).toContain('height="1200"');
  });

  it("does not fall back to the landscape box for a sized asset", () => {
    const html = portrait();

    expect(html).not.toContain('width="1200"');
    expect(html).not.toContain('height="800"');
    // The old enlarged-view upscale, which was never a served resolution —
    // sizes decides that — only an aspect ratio wearing a large number.
    expect(html).not.toContain('width="2000"');
  });

  it("falls back to 3:2 when the asset carries no dimensions", () => {
    // The path a payload cached before width and height were queried takes,
    // and the one a non-image asset takes, since Contentful returns null for
    // both there. It must render rather than crash or emit width="null".
    const html = renderToStaticMarkup(
      <LightboxImage
        src="https://images.ctfassets.net/x/y.jpg"
        alt="A placeholder"
      />,
    );

    expect(html).toContain('width="1200"');
    expect(html).toContain('height="800"');
  });
});

describe("lightbox accessible naming", () => {
  // alt and caption are two different fields now, so a caption no longer
  // suppresses the alt. The old behaviour existed only because both strings
  // came from Contentful's `description`.
  it("keeps the alt when a caption is also present", () => {
    const html = renderToStaticMarkup(
      <LightboxImage
        src="https://images.ctfassets.net/x/y.jpg"
        alt="A tabby asleep on a keyboard"
        caption="Bruno, entirely unbothered by the deadline"
      />,
    );

    // Only the alt is asserted. This component renders its caption solely
    // inside the open dialog, which needs `mounted && open`, so the caption is
    // absent from the server output by design — the figcaption under a body
    // figure is the caller's, and rich-text.test.tsx covers that pairing.
    // What matters here is that passing one no longer blanks the other.
    expect(html).toContain('alt="A tabby asleep on a keyboard"');
  });

  it("keeps alt when there is no caption to carry the description", () => {
    // Nothing else names the image in this shape, so dropping alt here would
    // lose the description rather than de-duplicate it.
    const html = renderToStaticMarkup(
      <LightboxImage
        src="https://images.ctfassets.net/x/y.jpg"
        alt="A placeholder"
      />,
    );

    expect(html).toContain('alt="A placeholder"');
  });
});

describe("whether enlarging is worth offering", () => {
  // Each case is an image and screen measured in a browser, so the numbers
  // are the ones a reader actually gets. The enlarge control is offered only
  // when the enlarged view is at least a quarter wider than the picture in
  // the post.
  const at2560 = {
    viewportWidth: 2560,
    viewportHeight: 1330,
    rootFontSize: 16,
  };

  it("offers it for a large photo on a large screen", () => {
    // 1920x1080 opens at 1773 wide against 672 in the post.
    expect(
      worthEnlarging({
        ...at2560,
        shownWidth: 672,
        assetWidth: 1920,
        assetHeight: 1080,
      }),
    ).toBe(true);
  });

  it("offers it for a screenshot a third wider than the column", () => {
    // 891x844 opens at its own 891 against 672, a gain of 1.33.
    expect(
      worthEnlarging({
        ...at2560,
        shownWidth: 672,
        assetWidth: 891,
        assetHeight: 844,
      }),
    ).toBe(true);
  });

  it("withholds it for a screenshot barely wider than the column", () => {
    // 772x772 can open no wider than its own 772, a gain of 1.15.
    expect(
      worthEnlarging({
        ...at2560,
        shownWidth: 672,
        assetWidth: 772,
        assetHeight: 772,
      }),
    ).toBe(false);
  });

  it("withholds it when the screen's height is what holds it back", () => {
    // 3000x3000 on a 1920x1080 screen can only reach 810 tall, so it opens
    // at 810 wide against 672 in the post, a gain of 1.21.
    expect(
      worthEnlarging({
        viewportWidth: 1920,
        viewportHeight: 1080,
        rootFontSize: 16,
        shownWidth: 672,
        assetWidth: 3000,
        assetHeight: 3000,
      }),
    ).toBe(false);
  });

  it("withholds it on a phone, where the column already spans the screen", () => {
    // 390 wide: the overlay leaves 358, the post shows the picture at 350.
    expect(
      worthEnlarging({
        viewportWidth: 390,
        viewportHeight: 844,
        rootFontSize: 16,
        shownWidth: 350,
        assetWidth: 1920,
        assetHeight: 1080,
      }),
    ).toBe(false);
  });

  it("uses the wider overlay padding from the 48rem breakpoint", () => {
    // At 768 wide and a 16px root the padding is 32 a side, leaving 704.
    // With 16 a side it would be 736 and clear the 1.25 bar against 580.
    expect(
      worthEnlarging({
        viewportWidth: 768,
        viewportHeight: 2000,
        rootFontSize: 16,
        shownWidth: 580,
        assetWidth: 3000,
        assetHeight: 1000,
      }),
    ).toBe(false);
  });
});

describe("the widest file the site serves", () => {
  it("matches the largest image width next.config.js asks for", () => {
    // The lightbox stops at this width because no file wider than it ever
    // reaches the reader. If deviceSizes gains a larger entry and this does
    // not follow, big photos are held smaller than they need to be. If it
    // loses one, they are stretched past the file again.
    expect(WIDEST_SERVED_FILE).toBe(Math.max(...nextConfig.images.deviceSizes));
  });

  it("holds the judgement to the served file, not the stored asset", () => {
    // 3000 wide as stored, but the reader receives 1920. Against a picture
    // shown at 1600 in the post that is a gain of 1.2, under the bar, where
    // the stored width would claim 1.875.
    expect(
      worthEnlarging({
        viewportWidth: 3840,
        viewportHeight: 2160,
        rootFontSize: 16,
        shownWidth: 1600,
        assetWidth: 3000,
        assetHeight: 1000,
      }),
    ).toBe(false);
  });
});
