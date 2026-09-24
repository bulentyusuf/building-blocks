/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import LightboxImage from "./lightbox-image";

// The server output is covered in lightbox-image.test.tsx. This file covers
// what only exists after mount: whether the enlarge control is offered, which
// depends on the picture's width in the post, measured through a ref that
// passes through lib/contentful-image.tsx. If that ref stops reaching the img,
// the control silently never appears, and only a mounted render shows it.

// jsdom has no showModal() or close(). The stubs keep the one contract the
// component relies on: close() clears [open] and fires the dialog's own close
// event, which is where every way out (Escape included) ends up.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (
    this: HTMLDialogElement,
  ) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    if (!this.hasAttribute("open")) return;
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

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
  vi.mocked(HTMLDialogElement.prototype.showModal).mockClear();
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

  it("opens no wider than the widest file the site serves", () => {
    // A 4K screen at 100% scaling leaves room for a 2048 wide photo at its
    // stored width, but the reader only ever receives a 1920 wide file.
    screen(3840, 2040);
    const { container } = mount(2048, 1152);
    act(() => {
      container.querySelector("button")?.click();
    });

    const figure = document.querySelector<HTMLElement>("dialog figure");
    expect(figure?.style.width).toContain("1920px");
    expect(figure?.style.width).not.toContain("2048px");
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

describe("lightbox dialog", () => {
  const openLightbox = () => {
    screen(2560, 1330);
    const utils = mount(1920, 1080);
    const trigger = utils.container.querySelector<HTMLButtonElement>(
      "button[aria-label='Enlarge image']",
    )!;
    act(() => trigger.click());
    const dialog = utils.container.querySelector("dialog")!;
    return { ...utils, trigger, dialog };
  };

  it("carries no dialog where the control is withheld", () => {
    screen(2560, 1330);
    const { container } = mount(772, 772);

    expect(container.querySelector("dialog")).toBeNull();
  });

  it("opens as a modal and focuses the close button", () => {
    const { dialog } = openLightbox();

    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledTimes(1);
    expect(dialog.hasAttribute("open")).toBe(true);
    expect(document.activeElement?.getAttribute("aria-label")).toBe(
      "Close enlarged image",
    );
  });

  it("closes from the close button and returns focus to the trigger", () => {
    const { dialog, trigger } = openLightbox();

    act(() => {
      dialog
        .querySelector<HTMLButtonElement>(
          "button[aria-label='Close enlarged image']",
        )!
        .click();
    });

    expect(dialog.hasAttribute("open")).toBe(false);
    expect(dialog.querySelector("figure")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("follows a close the platform makes on its own, such as Escape", () => {
    // Escape is the browser's job now. What the component owns is following
    // the close event it ends in, so the contents unmount and focus returns.
    const { dialog, trigger } = openLightbox();

    act(() => dialog.close());

    expect(dialog.querySelector("figure")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("stays open on a click on the picture and closes on one beside it", () => {
    const { dialog } = openLightbox();

    act(() => dialog.querySelector<HTMLImageElement>("figure img")!.click());
    expect(dialog.hasAttribute("open")).toBe(true);

    act(() => dialog.click());
    expect(dialog.hasAttribute("open")).toBe(false);
  });

  it("is named by its caption when there is one, by the alt otherwise", () => {
    screen(2560, 1330);
    HTMLImageElement.prototype.getBoundingClientRect = () =>
      ({ width: shownWidth }) as DOMRect;
    const { container } = render(
      <LightboxImage
        src="https://images.ctfassets.net/x/y.jpg"
        alt="A tabby asleep on a keyboard"
        caption="Bruno, unbothered"
        width={1920}
        height={1080}
      />,
    );
    act(() => container.querySelector("button")!.click());

    const dialog = container.querySelector("dialog")!;
    const caption = dialog.querySelector("figcaption")!;
    expect(dialog.getAttribute("aria-labelledby")).toBe(caption.id);
    expect(dialog.hasAttribute("aria-label")).toBe(false);

    cleanup();
    const { dialog: bare } = openLightbox();
    expect(bare.getAttribute("aria-label")).toBe("A placeholder");
    expect(bare.hasAttribute("aria-labelledby")).toBe(false);
  });

  it("leaves the page's inline styles alone", () => {
    // The scroll lock is a stylesheet rule on html:has(dialog:modal), guarded
    // in app/globals.measure.test.ts. Script touching overflow again would be
    // the hand-rolled lock coming back. [→ `lightbox-dialog`]
    openLightbox();

    expect(document.documentElement.style.overflow).toBe("");
    expect(document.body.style.overflow).toBe("");
    expect(document.body.style.paddingRight).toBe("");
  });
});
