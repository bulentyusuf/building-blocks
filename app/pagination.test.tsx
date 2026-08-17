/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import Pagination from "./pagination";

afterEach(cleanup);

describe("Pagination", () => {
  it("renders nothing for a single-page listing", () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={1} basePath="/" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("on page 1, renders only the Older link, with no Newer link or count", () => {
    render(<Pagination currentPage={1} totalPages={3} basePath="/" />);
    expect(screen.getByRole("link", { name: /older posts/i })).toBeDefined();
    expect(screen.queryByRole("link", { name: /newer posts/i })).toBeNull();
    expect(screen.queryByText(/page \d+ of \d+/i)).toBeNull();
  });

  it("on a middle page, renders Newer, the count, and Older, all linked", () => {
    render(<Pagination currentPage={2} totalPages={3} basePath="/" />);
    expect(screen.getByRole("link", { name: /newer posts/i })).toBeDefined();
    expect(screen.getByRole("link", { name: /older posts/i })).toBeDefined();
    expect(screen.getByText("Page 2 of 3")).toBeDefined();
  });

  it("on the last page, Older stays in place but is unlinked", () => {
    render(<Pagination currentPage={3} totalPages={3} basePath="/" />);
    expect(screen.getByRole("link", { name: /newer posts/i })).toBeDefined();
    expect(screen.queryByRole("link", { name: /older posts/i })).toBeNull();
    expect(screen.getByText(/older posts/i)).toBeDefined();
  });

  it("builds category hrefs under the category's own basePath", () => {
    render(
      <Pagination
        currentPage={2}
        totalPages={3}
        basePath="/categories/design"
      />,
    );
    expect(
      screen.getByRole("link", { name: /older posts/i }).getAttribute("href"),
    ).toBe("/categories/design/page/3");
    expect(
      screen.getByRole("link", { name: /newer posts/i }).getAttribute("href"),
    ).toBe("/categories/design");
  });
});
