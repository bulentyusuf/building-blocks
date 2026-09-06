import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The OG card route deliberately has no generateStaticParams: 22 baked cards is
// ~19 MB of PNG in every deployment against a 10 GB store, and the card only
// changes when the post does, so an on-demand render held in the route cache is
// the cheaper trade. docs/decisions.md, "The post OG card renders on demand,
// not at build", carries the argument.
//
// The comment block that used to sit above the export is persuasive on its own
// terms — it removes a Contentful query and a Satori render from the scrape
// path — and its storage cost shows up nowhere a contributor looks. So a future
// pass re-adds the export unless something fails when it does. This is that
// something.
//
// It is a pattern match on source rather than a module import: importing
// opengraph-image.tsx pulls next/og and the module-scope WOFF read, and the
// page.tsx control pulls `server-only`, which throws outside a React Server
// Component. Per the house rule, a source-pattern guard carries a known-bad
// control — here app/posts/[slug]/page.tsx, which does export the thing, so a
// detector that quietly stopped matching would fail against it rather than pass
// vacuously.

const OG_ROUTE = join(process.cwd(), "app/posts/[slug]/opengraph-image.tsx");
const POST_PAGE = join(process.cwd(), "app/posts/[slug]/page.tsx");

function exportsGenerateStaticParams(source: string): boolean {
  return (
    /export\s+(?:async\s+)?function\s+generateStaticParams\b/.test(source) ||
    /export\s+(?:async\s+)?const\s+generateStaticParams\b/.test(source) ||
    /export\s*\{[^}]*\bgenerateStaticParams\b[^}]*\}/.test(source)
  );
}

describe("the post OG card route is not prerendered", () => {
  it("app/posts/[slug]/opengraph-image.tsx does not export generateStaticParams", () => {
    expect(exportsGenerateStaticParams(readFileSync(OG_ROUTE, "utf8"))).toBe(
      false,
    );
  });

  it("still detects the export on app/posts/[slug]/page.tsx", () => {
    // Known-bad control. The post page enumerates its own slugs at build time
    // and always will; if this assertion ever fails, the detector has gone
    // stale and the check above is passing for the wrong reason.
    expect(exportsGenerateStaticParams(readFileSync(POST_PAGE, "utf8"))).toBe(
      true,
    );
  });

  it("returns false on source that has no such export", () => {
    // Separates "the route is clean" from "the regex matches nothing anywhere".
    expect(exportsGenerateStaticParams("export const revalidate = 60;")).toBe(
      false,
    );
    expect(
      exportsGenerateStaticParams(
        "export async function generateStaticParams() { return []; }",
      ),
    ).toBe(true);
  });
});
