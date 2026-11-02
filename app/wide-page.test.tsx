/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const { default: WidePage } = await import("./wide-page");

afterEach(cleanup);

describe("WidePage's header", () => {
  it("holds the heading alone, with no standfirst row", () => {
    // Standfirsts were retired in November 2026. [→ `wide-page-shell`]
    render(
      <WidePage
        crumbs={[{ label: "Home", href: "/" }, { label: "A page" }]}
        heading={<h1>A heading</h1>}
      >
        <p>Body</p>
      </WidePage>,
    );
    expect(screen.getByText("A heading").parentElement?.tagName).toBe("HEADER");
  });
});
