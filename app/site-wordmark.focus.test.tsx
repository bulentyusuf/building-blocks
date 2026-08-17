/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";

// This exists because the focus call in site-wordmark.tsx looks removable —
// scrollTo already does the visible work, and nothing else on the page
// reacts to focus changing. It is not removable: the fade takes the button
// itself to visibility: hidden about 300ms after the scroll starts, and a
// focused element that becomes hidden drops focus to <body>, silently
// ejecting a keyboard reader from the tab order at the exact moment they
// used the control. Nothing here or in site-wordmark.test.tsx (which never
// clicks the button) would catch that regression without this test.

const pathname = vi.hoisted(() => ({ current: "/" }));
vi.mock("next/navigation", () => ({
  usePathname: () => pathname.current,
}));

const SiteWordmark = (await import("./site-wordmark")).default;

// react-dom/client's act() requires this flag outside a testing-library
// wrapper, or it warns on every call without failing anything.
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("the home wordmark's click handler", () => {
  it("moves focus to #main", () => {
    window.scrollTo = vi.fn();
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });

    document.body.innerHTML =
      '<main id="main" tabindex="-1"></main><div id="root"></div>';
    const root = createRoot(document.getElementById("root")!);
    act(() => {
      root.render(<SiteWordmark title="Be Useful." />);
    });

    const button = document.querySelector("button")!;
    act(() => {
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(document.activeElement).toBe(document.getElementById("main"));
  });
});
