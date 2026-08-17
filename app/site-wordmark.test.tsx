/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// Set per test. usePathname is the whole behaviour under test, so it is the
// one thing mocked and it is read fresh on every render.
const pathname = vi.hoisted(() => ({ current: "/" }));
vi.mock("next/navigation", () => ({
  usePathname: () => pathname.current,
}));

const SiteWordmark = (await import("./site-wordmark")).default;

function render(at: string): string {
  pathname.current = at;
  return renderToStaticMarkup(<SiteWordmark title="Be Useful." />);
}

describe("the sticky bar's wordmark", () => {
  beforeEach(() => {
    pathname.current = "/";
  });

  it("is a button on home, not a link", () => {
    // A same-URL Link click in Next 16 is a leaf-segment refresh with no
    // scroll target, so an href here would be a control that does nothing.
    // It scrolls to the top instead, which is the action a wordmark on a
    // scrolled page is expected to perform.
    const html = render("/");
    expect(html).toContain("<button");
    expect(html).not.toContain("<a");
  });

  it("keeps the site name as the start of its accessible name on home", () => {
    // WCAG 2.5.3 Label in Name. An aria-label of "Back to top" would replace
    // the visible string rather than extend it, so speech-input users could
    // not say what they can see.
    const html = render("/");
    expect(html).toContain("Be Useful.");
    expect(html).toContain("sr-only");
    expect(html).not.toContain("aria-label");
  });

  it.each([
    "/about",
    "/tags",
    "/archive",
    "/categories/design",
    "/posts/some-post",
    "/page/2",
  ])("links to home from %s", (route) => {
    // The regression this guards: an earlier fix removed the href on every
    // route to solve a problem that only existed on one. The wordmark is the
    // site's only "go home" control and it is present on all of these.
    const html = render(route);
    expect(html).toContain('href="/"');
  });

  it("carries .site-wordmark on both branches", () => {
    // globals.css targets this class for the home hide-and-fade and for
    // view-transition-name. Losing it on either branch breaks the fade or the
    // name morph, and neither fails loudly at runtime.
    expect(render("/")).toContain("site-wordmark");
    expect(render("/about")).toContain("site-wordmark");
  });

  it("carries a focus ring on both branches", () => {
    // Both are focusable now. The button replaced a span, which was not, and
    // the ring was dropped with it at the time for that reason.
    expect(render("/")).toContain("focus-visible:ring-white");
    expect(render("/about")).toContain("focus-visible:ring-white");
  });
});
