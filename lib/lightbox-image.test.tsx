import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import LightboxImage from "./lightbox-image";

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
    // inside the portal, which needs `mounted && open`, so the caption is
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
