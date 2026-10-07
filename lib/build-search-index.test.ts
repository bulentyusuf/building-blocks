import { getRouteCacheKey } from "next/dist/server/lib/route-cache-key";
import { describe, expect, it } from "vitest";
import { sourcePathFor } from "../scripts/build-search-index.mjs";

// Keys come from Next itself, so a layout change in a Next bump fails here
// rather than shipping an empty search index. [→ `pagefind-ui`]
const scoped = (route: string, sourceRoute: string) =>
  `.next/server${getRouteCacheKey(route, { kind: "APP_PAGE", sourceRoute } as never)}.html`;

describe("sourcePathFor", () => {
  it("maps the adapter's route-cache layout to the old site path", () => {
    expect(sourcePathFor(scoped("/posts/hello", "/posts/[slug]/page"))).toBe(
      "posts/hello.html",
    );
    expect(sourcePathFor(scoped("/", "/page"))).toBe("index.html");
  });

  it("maps the plain build layout unchanged", () => {
    expect(sourcePathFor(".next/server/app/posts/hello.html")).toBe(
      "posts/hello.html",
    );
  });

  it("refuses a path it does not recognise (known-bad control)", () => {
    expect(() =>
      sourcePathFor(".next/server/route-cache/APP_PAGE/abc/posts/hello.html"),
    ).toThrow();
    expect(() => sourcePathFor(".next/server/pages/404.html")).toThrow();
  });
});
