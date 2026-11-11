/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, cleanup, act } from "@testing-library/react";
import CopyButton from "./copy-button";

beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: () => Promise.resolve() },
    configurable: true,
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

async function click(button: HTMLElement) {
  await act(async () => {
    fireEvent.click(button);
  });
}

describe("CopyButton's Copied label", () => {
  it("gets a full two seconds after a second click", async () => {
    const { getByRole } = render(<CopyButton code="x" />);
    const button = getByRole("button");
    await click(button);
    act(() => vi.advanceTimersByTime(1500));
    await click(button);
    // The first click's timer would fire here and flip the label back early.
    act(() => vi.advanceTimersByTime(1000));
    expect(button.textContent).toBe("Copied");
  });

  // Known-bad control: a label that never reverted would also pass the above.
  it("reverts two seconds after the last click", async () => {
    const { getByRole } = render(<CopyButton code="x" />);
    const button = getByRole("button");
    await click(button);
    act(() => vi.advanceTimersByTime(2000));
    expect(button.textContent).toBe("Copy");
  });

  it("leaves no timer pending after unmount", async () => {
    const { getByRole, unmount } = render(<CopyButton code="x" />);
    await click(getByRole("button"));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
