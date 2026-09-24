/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import LightboxImage from "./lightbox-image";

// The server output is covered in lightbox-image.test.tsx. This file covers
// what only exists after mount: whether the enlarge control is offered, which
// depends on the picture's width in the post, measured through a ref that
// passes through lib/contentful-image.tsx. If that ref stops reaching the img,
// the control silently never appears, and only a mounted render shows it.

let shownWidth = 672;
const realRect = HTMLImageElement.prototype.getBoundingClientRect;

function screen(width: number, height: number) {
  Object.defineProperty(document.documentElement, "clientWidth", {
    value: width,
    configurable: true,
  });
  Object.defineProperty(window, "innerHeight", {
    value: height,
    configurable: true,
  });
}

function mount(assetWidth: number, assetHeight: number) {
  HTMLImageElement.prototype.getBoundingClientRect = () =>
    ({ width: shownWidth }) as DOMRect;
  document.documentElement.style.fontSize = "16px";
  return render(
    <LightboxImage
      src="https://images.ctfassets.net/x/y.jpg"
      alt="A placeholder"
      width={assetWidth}
      height={assetHeight}
    />,
  );
}

afterEach(() => {
  cleanup();
  HTMLImageElement.prototype.getBoundingClientRect = realRect;
  shownWidth = 672;
});

describe("lightbox enlarge control after mount", () => {
  it("is offered for a large photo on a large screen", () => {
    screen(2560, 1330);
    const { container } = mount(1920, 1080);

    expect(container.querySelector("button")).not.toBeNull();
  });

  it("is withheld for a screenshot barely wider than the column", () => {
    screen(2560, 1330);
    const { container } = mount(772, 772);

    expect(container.querySelector("button")).toBeNull();
    expect(container.querySelector("img")).not.toBeNull();
  });

  it("is withdrawn when the window shrinks to a phone", () => {
    screen(2560, 1330);
    const { container } = mount(1920, 1080);
    expect(container.querySelector("button")).not.toBeNull();

    screen(390, 844);
    shownWidth = 350;
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });

    expect(container.querySelector("button")).toBeNull();
  });
});
