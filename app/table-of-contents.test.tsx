/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import TableOfContents from "./table-of-contents";
import type { Heading } from "@/lib/headings";

// What the component does when it decides to render NOTHING.
//
// The render guard and the effect's guard were two different numbers — the
// effect bailed at zero headings, the render at three — so a post with one or
// two headings fell in the gap. It attached a scroll listener, a resize
// listener and a ResizeObserver on document.body, which fires on every layout
// change including the web-font swap, and recomputed geometry per heading on
// each frame, to produce markup that was null.
//
// Nothing about that is visible from the DOM, which is why it survived: the
// page looks right either way. So the observers are the assertion.

const observe = vi.fn();
const disconnect = vi.fn();
const construct = vi.fn();

class FakeResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    construct(callback);
  }
  observe = observe;
  unobserve = vi.fn();
  disconnect = disconnect;
}

const heading = (n: number): Heading => ({
  slug: `h-${n}`,
  text: `Heading ${n}`,
});

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  vi.spyOn(window, "addEventListener");
  construct.mockClear();
  observe.mockClear();
  // The effect only proceeds once the heading elements exist in the document,
  // so the article's own headings have to be here or every case would pass for
  // the wrong reason.
  document.body.innerHTML = [1, 2, 3, 4]
    .map((n) => `<h2 id="h-${n}">Heading ${n}</h2>`)
    .join("");
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

const scrollListeners = () =>
  vi
    .mocked(window.addEventListener)
    .mock.calls.filter(([type]) => type === "scroll" || type === "resize");

describe("a table of contents with too few headings to render", () => {
  it.each([[0], [1], [2]])(
    "observes nothing with %i headings",
    (count: number) => {
      const { container } = render(
        <TableOfContents headings={[1, 2].slice(0, count).map(heading)} />,
      );
      expect(container.innerHTML).toBe("");
      expect(construct).not.toHaveBeenCalled();
      expect(observe).not.toHaveBeenCalled();
      expect(scrollListeners()).toHaveLength(0);
    },
  );
});

describe("a table of contents that does render", () => {
  // The control. Without it every assertion above would keep passing if the
  // effect stopped observing altogether, and the scroll spy would be dead with
  // no test anywhere reporting it.
  it("observes the document once there are enough headings", () => {
    const { container } = render(
      <TableOfContents headings={[1, 2, 3].map(heading)} />,
    );
    expect(container.innerHTML).not.toBe("");
    expect(construct).toHaveBeenCalledTimes(1);
    expect(observe).toHaveBeenCalledWith(document.body);
    expect(scrollListeners().length).toBeGreaterThan(0);
  });

  it("disconnects on unmount", () => {
    const { unmount } = render(
      <TableOfContents headings={[1, 2, 3].map(heading)} />,
    );
    unmount();
    expect(disconnect).toHaveBeenCalled();
  });
});

describe("a targeted heading holds the highlight", () => {
  // jsdom lays nothing out, so every heading reports top 0 and geometry alone
  // picks the last one. That is the shape of a short final section in a real
  // browser, where the clicked heading can never reach the line and geometry
  // hands the highlight to the section above it. Holding the target against
  // that is the pin's whole job.
  // Frames queue and flush on demand, as a browser runs them after the event,
  // rather than running inside requestAnimationFrame itself.
  let frames: FrameRequestCallback[] = [];
  beforeEach(() => {
    frames = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      frames.push(cb);
      return frames.length;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {});
  });

  const current = (container: HTMLElement) =>
    container.querySelector('[aria-current="location"]')?.getAttribute("href");

  const scroll = () =>
    act(() => {
      window.dispatchEvent(new Event("scroll"));
      frames.splice(0).forEach((cb) => cb(0));
    });

  it("follows geometry when nothing is targeted", () => {
    const { container } = render(
      <TableOfContents headings={[1, 2, 3].map(heading)} />,
    );
    expect(current(container)).toBe("#h-3");
  });

  it("holds a clicked entry through scroll until the reader takes over", () => {
    const { container } = render(
      <TableOfContents headings={[1, 2, 3].map(heading)} />,
    );
    act(() => container.querySelector<HTMLElement>('a[href="#h-1"]')!.click());
    expect(current(container)).toBe("#h-1");

    // The jump's own scroll event must not hand the highlight back.
    scroll();
    expect(current(container)).toBe("#h-1");

    act(() => window.dispatchEvent(new Event("pointerdown")));
    scroll();
    expect(current(container)).toBe("#h-3");
  });

  it("releases on a key or a wheel as well as a pointer", () => {
    const { container } = render(
      <TableOfContents headings={[1, 2, 3].map(heading)} />,
    );
    for (const intent of ["keydown", "wheel"]) {
      act(() =>
        container.querySelector<HTMLElement>('a[href="#h-1"]')!.click(),
      );
      scroll();
      expect(current(container)).toBe("#h-1");
      act(() => window.dispatchEvent(new Event(intent)));
      scroll();
      expect(current(container)).toBe("#h-3");
    }
  });

  it("pins a deep-linked heading on load", () => {
    window.history.replaceState(null, "", "#h-2");
    try {
      const { container } = render(
        <TableOfContents headings={[1, 2, 3].map(heading)} />,
      );
      scroll();
      expect(current(container)).toBe("#h-2");
    } finally {
      window.history.replaceState(null, "", window.location.pathname);
    }
  });

  it("adds no window resize listener beside the body ResizeObserver", () => {
    // A width change resizes the body, which the observer already reports,
    // and a height change moves no heading's top against the line.
    render(<TableOfContents headings={[1, 2, 3].map(heading)} />);
    const resize = vi
      .mocked(window.addEventListener)
      .mock.calls.filter(([type]) => type === "resize");
    expect(resize).toHaveLength(0);
  });
});
