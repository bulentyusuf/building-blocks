import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import DateComponent from "./date";

describe("DateComponent", () => {
  it("formats en-GB by default", () => {
    expect(
      renderToStaticMarkup(<DateComponent dateString="2025-02-03" />),
    ).toContain(">3 February 2025<");
  });

  it("formats de-DE on German posts", () => {
    // Non-vacuous: the English test above proves the default differs.
    expect(
      renderToStaticMarkup(<DateComponent dateString="2025-02-03" german />),
    ).toContain(">3. Februar 2025<");
  });
});
