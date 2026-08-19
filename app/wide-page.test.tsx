/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import fs from "node:fs";
import path from "node:path";

// The split masthead (CLAUDE.md, "The split masthead"). WidePage lays a
// heading and a standfirst out on one row from md up and stacks them below
// it — jsdom applies no stylesheet, so this asserts the branch WidePage takes
// and the classes it emits, not that flexbox actually resolves them.

// ListingPage renders CoverImage (via MoreStories), which imports lib/blur —
// "server-only" — so both need stubbing here even though the tests below
// never render an image. Same pattern as app/more-stories.test.tsx.
vi.mock("server-only", () => ({}));
vi.mock("@/lib/blur", () => ({ getBlurDataURL: async () => undefined }));

const { default: WidePage } = await import("./wide-page");
const { default: ListingPage } = await import("./listing-page");

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

  it("keeps the row at two children whatever the caller passes", () => {
    // The regression this exists for. app/listing-page.tsx pairs a standfirst
    // with the pagination caption, and passed them as a FRAGMENT. A fragment
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

describe("ListingPage aligns the pagination caption with the standfirst above it", () => {
  // ListingPage's own `splitHeader` destructuring had no default, unlike
  // WidePage's `= true`. Only the two author routes pass the prop explicitly,
  // so on every other listing route it arrived as `undefined` — falsy — and
  // the text-right check on the caption's wrapper div read that local value
  // rather than the `true` WidePage was actually rendering with. The caption
  // rendered left-aligned under a right-aligned standfirst on every paginated
  // category, tag and index listing from page 2 on. Fixed by giving
  // ListingPage's own `splitHeader` the same `= true` default.
  it("gives the caption text-right when splitHeader is left at its default", () => {
    render(
      <ListingPage
        posts={[]}
        currentPage={2}
        totalPages={3}
        visibleTags={new Set()}
        basePath="/categories/design"
        heading={<h1>Design</h1>}
        emptyMessage="none"
      />,
    );
    const caption = screen.getByText(/Page 2 of 3/);
    expect(caption.parentElement?.className).toContain("text-right");
  });

  it("leaves the caption left-aligned on the author routes (splitHeader=false)", () => {
    render(
      <ListingPage
        posts={[]}
        currentPage={2}
        totalPages={3}
        visibleTags={new Set()}
        basePath="/authors/jane"
        heading={<h1>Jane</h1>}
        emptyMessage="none"
        splitHeader={false}
      />,
    );
    const caption = screen.getByText(/Page 2 of 3/);
    expect(caption.parentElement?.className).not.toContain("text-right");
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
