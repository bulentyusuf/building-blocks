/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import fs from "node:fs";
import path from "node:path";

// The split masthead (CLAUDE.md, "The split masthead"). WidePage lays a
// heading and a standfirst out on one row from md up and stacks them below
// it — jsdom applies no stylesheet, so this asserts the branch WidePage takes
// and the classes it emits, not that flexbox actually resolves them.

const { default: WidePage } = await import("./wide-page");

afterEach(cleanup);

const heading = <h1>A heading</h1>;
const standfirst = <p>A standfirst.</p>;

describe("WidePage's split masthead", () => {
  it("puts heading and standfirst in one row that stacks below md", () => {
    render(
      <WidePage heading={heading} standfirst={standfirst}>
        <p>Body</p>
      </WidePage>,
    );
    const row = screen.getByText("A heading").parentElement;
    // The mobile stack is the load-bearing half: a 60px heading has no room
    // beside a standfirst on a 390px phone. See app/wide-page.tsx.
    expect(row?.className).toMatch(/flex-col/);
    expect(row?.className).toMatch(/md:flex-row/);
  });

  it("carries the fixed gap, the one distance that repeats across routes", () => {
    render(
      <WidePage heading={heading} standfirst={standfirst}>
        <p>Body</p>
      </WidePage>,
    );
    const row = screen.getByText("A heading").parentElement;
    expect(row?.className).toMatch(/gap-3/);
    expect(row?.className).toMatch(/md:gap-10/);
  });

  it("pins the standfirst to the container's right edge (M5)", () => {
    // The row shipped left-flowing first and was rejected on sight for
    // stranding a short standfirst in the middle of the row — see
    // CLAUDE.md, "The masthead splits into heading and standfirst".
    // justify-between is what anchors the standfirst's right edge instead;
    // the standfirst's own max-w-[20rem] (checked per route, not here) is
    // what stops that anchor reintroducing the empty-middle problem.
    render(
      <WidePage heading={heading} standfirst={standfirst}>
        <p>Body</p>
      </WidePage>,
    );
    const row = screen.getByText("A heading").parentElement;
    expect(row?.className).toMatch(/md:justify-between/);
  });

  it("falls back to the plain stack when there is no standfirst", () => {
    render(
      <WidePage heading={heading}>
        <p>Body</p>
      </WidePage>,
    );
    // No row wrapper: the heading's parent is <header> itself, exactly as a
    // narrow route's header renders.
    expect(screen.getByText("A heading").parentElement?.tagName).toBe("HEADER");
  });

  it("falls back to the plain stack when splitHeader is false", () => {
    render(
      <WidePage heading={heading} standfirst={standfirst} splitHeader={false}>
        <p>Body</p>
      </WidePage>,
    );
    expect(screen.getByText("A heading").parentElement?.tagName).toBe("HEADER");
  });
});

describe("only the author routes opt out of the split masthead", () => {
  const ROOT = path.join(__dirname, "..");
  const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

  // Anchored on the JSX prop form at line start, so a comment explaining the
  // exception (every route that keeps it carries one) cannot be mistaken for
  // the prop itself.
  const PASSED = /^\s*splitHeader=/m;

  it.each([
    "app/authors/[slug]/page.tsx",
    "app/authors/[slug]/page/[page]/page.tsx",
  ])("%s sets it", (file) => {
    expect(read(file)).toMatch(PASSED);
  });

  it.each([
    "app/page.tsx",
    "app/page/[page]/page.tsx",
    "app/posts/[slug]/page.tsx",
    "app/archive/page.tsx",
    "app/categories/page.tsx",
    "app/categories/[slug]/page.tsx",
    "app/categories/[slug]/page/[page]/page.tsx",
    "app/tags/page.tsx",
    "app/tags/[slug]/page.tsx",
    "app/tags/[slug]/page/[page]/page.tsx",
    "app/authors/page.tsx",
  ])("%s does not", (file) => {
    expect(read(file)).not.toMatch(PASSED);
  });
});
