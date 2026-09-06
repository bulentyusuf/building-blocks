/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import NavDisclosure from "./nav-disclosure";

// Set per test, same pattern as site-wordmark.test.tsx. NavDisclosure only
// reads the pathname to detect a change, so a single mutable ref is enough.
const pathname = vi.hoisted(() => ({ current: "/" }));
vi.mock("next/navigation", () => ({
  usePathname: () => pathname.current,
}));

function renderMenu() {
  return render(
    <NavDisclosure>
      <summary data-testid="summary">Menu</summary>
      <a href="/archive">Archive</a>
    </NavDisclosure>,
  );
}

beforeEach(() => {
  pathname.current = "/";
});

afterEach(() => {
  cleanup();
});

describe("dismissing the mobile nav", () => {
  it("closes on Escape while open and returns focus to the summary", () => {
    const { getByTestId, container } = renderMenu();
    const details = container.querySelector("details")!;
    details.open = true;

    fireEvent.keyDown(document, { key: "Escape" });

    expect(details.open).toBe(false);
    expect(document.activeElement).toBe(getByTestId("summary"));
  });

  it("does nothing on Escape while already closed", () => {
    const { container } = renderMenu();
    const details = container.querySelector("details")!;
    details.open = false;
    const previousActive = document.activeElement;

    fireEvent.keyDown(document, { key: "Escape" });

    expect(details.open).toBe(false);
    expect(document.activeElement).toBe(previousActive);
  });

  it("leaves the menu open on a pointerdown inside it", () => {
    const { container, getByText } = renderMenu();
    const details = container.querySelector("details")!;
    details.open = true;

    fireEvent.pointerDown(getByText("Archive"));

    expect(details.open).toBe(true);
  });

  it("closes on a pointerdown outside the menu", () => {
    const { container } = renderMenu();
    const details = container.querySelector("details")!;
    details.open = true;

    fireEvent.pointerDown(document.body);

    expect(details.open).toBe(false);
  });

  it("still closes when the pathname changes while open", () => {
    const { container, rerender } = renderMenu();
    const details = container.querySelector("details")!;
    details.open = true;

    pathname.current = "/archive";
    rerender(
      <NavDisclosure>
        <summary data-testid="summary">Menu</summary>
        <a href="/archive">Archive</a>
      </NavDisclosure>,
    );

    expect(details.open).toBe(false);
  });
});
