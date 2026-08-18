/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { scrollToTop } from "./scroll-to-top";

// This exists because the focus call in scroll-to-top.ts looks removable —
// window.scrollTo already does the visible work, and nothing else on the page
// reacts to focus changing. It is not removable: every caller hides itself
// once the reader reaches the top, and a focused element that becomes inert
// or hidden drops focus to <body>, silently ejecting a keyboard reader from
// the tab order at the moment they used the control.

describe("scrollToTop", () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    document.body.innerHTML = '<main id="main" tabindex="-1"></main>';
  });

  it("moves focus to #main", () => {
    scrollToTop();
    expect(document.activeElement).toBe(document.getElementById("main"));
  });

  it("scrolls smoothly by default", () => {
    scrollToTop();
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      behavior: "smooth",
    });
  });

  it("jumps rather than glides under reduced motion", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    scrollToTop();
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "auto" });
  });

  it("does not throw when #main is absent", () => {
    // A page without the landmark should still scroll. The optional chain is
    // the whole guard, so this is the assertion that keeps it there.
    document.body.innerHTML = "";
    expect(() => scrollToTop()).not.toThrow();
  });
});
