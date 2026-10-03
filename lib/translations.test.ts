import { describe, it, expect } from "vitest";
import { postLanguageAlternates } from "./translations";
import { SITE_URL } from "./constants";

describe("postLanguageAlternates", () => {
  it("pairs the two versions and makes English the default", () => {
    expect(postLanguageAlternates("a-post")).toEqual({
      "en-GB": `${SITE_URL}/posts/a-post`,
      "de-DE": `${SITE_URL}/de/posts/a-post`,
      "x-default": `${SITE_URL}/posts/a-post`,
    });
  });
});
