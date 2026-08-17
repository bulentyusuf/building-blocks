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

  it("is plain text on home", () => {
    // A same-URL Link click in Next 16 is a leaf-segment refresh with no
    // scroll target, so an href here would be a control that does nothing.
    const html = render("/");
    expect(html).not.toContain("<a");
    expect(html).toContain("Be Useful.");
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

  it("carries a focus ring only where something can be focused", () => {
    expect(render("/about")).toContain("focus-visible:ring-white");
    expect(render("/")).not.toContain("focus-visible");
  });
});
