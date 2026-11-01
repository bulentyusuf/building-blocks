/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

// The split masthead (docs/decisions.md, "The split masthead"). WidePage lays a
// heading and a standfirst out on one row from md up and stacks them below
// it — jsdom applies no stylesheet, so this asserts the branch WidePage takes
// and the classes it emits, not that flexbox actually resolves them.

const { default: WidePage } = await import("./wide-page");

afterEach(cleanup);

const crumbs = [{ label: "Home", href: "/" }, { label: "A page" }];
const heading = <h1>A heading</h1>;
const standfirst = <p>A standfirst.</p>;

describe("WidePage's split masthead", () => {
  it("puts heading and standfirst in one row that stacks below md", () => {
    render(
      <WidePage crumbs={crumbs} heading={heading} standfirst={standfirst}>
        <p>Body</p>
      </WidePage>,
    );
    const row = screen.getByText("A heading").parentElement;
    // The mobile stack is the load-bearing half: a 60px heading has no room
    // beside a standfirst on a 390px phone. See app/wide-page.tsx.
    expect(row?.className).toMatch(/flex-col/);
    expect(row?.className).toMatch(/md:flex-row/);
  });

  it("keeps the row at two children whatever the caller passes", () => {
    // The regression this exists for. A listing once paired a standfirst with
    // the pagination caption, and passed them as a FRAGMENT. A fragment
    // generates no box, so its children became direct children of this row —
    // three, not two. justify-between then spread all three across the full
    // measure, stranding the standfirst mid-row and pushing "Page 2 of 3" to
    // the right margin.
    //
    // It shipped because it is invisible on page 1, where PageContext renders
    // null and the row genuinely has two children, and because the
    // left-flowing layout it was written against had no justify-between to
    // expose it.
    //
    // So the standfirst slot is passed a fragment here on purpose. If WidePage
    // stops wrapping it, this goes to 3 and fails.
    render(
      <WidePage
        crumbs={crumbs}
        heading={heading}
        standfirst={
          <>
            <p>A standfirst.</p>
            <p>Page 2 of 3</p>
          </>
        }
      >
        <p>Body</p>
      </WidePage>,
    );
    const row = screen.getByText("A heading").parentElement;
    expect(row?.children).toHaveLength(2);
  });

  it("falls back to the plain stack when there is no standfirst", () => {
    render(
      <WidePage crumbs={crumbs} heading={heading}>
        <p>Body</p>
      </WidePage>,
    );
    // No row wrapper: the heading's parent is <header> itself, exactly as a
    // narrow route's header renders.
    expect(screen.getByText("A heading").parentElement?.tagName).toBe("HEADER");
  });
});
