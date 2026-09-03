import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";
import { CACHE_TAGS } from "@/lib/api";

// What a Contentful webhook firing actually purges.
//
// This is untestable from the outside — the effect is a call into Next's cache
// layer, and CI issues no requests — so the calls are recorded through a mock
// and asserted directly. The value is in the mapping, not the mechanism: a
// content type landing in the wrong bucket either re-renders the whole site for
// an /about edit (the defect this replaced) or, far worse, leaves a published
// post invisible with nothing anywhere reporting it.

const revalidateTag = vi.fn();
const revalidatePath = vi.fn();

vi.mock("next/cache", () => ({
  revalidateTag: (...args: unknown[]) => revalidateTag(...args),
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
}));

const { POST } = await import("./route");

const SECRET = "a-long-random-revalidate-secret";

function fire(body: unknown, secret: string = SECRET) {
  return new Request("https://example.com/api/revalidate", {
    method: "POST",
    headers: { "x-vercel-reval-key": secret },
    body: typeof body === "string" ? body : JSON.stringify(body),
    // The route reads only headers and json(), both of which a plain Request
    // has. Casting beats constructing a NextRequest, which drags in the whole
    // server runtime for two methods.
  }) as unknown as NextRequest;
}

const entry = (contentTypeId: string) => ({
  sys: { contentType: { sys: { id: contentTypeId } } },
});

const tagsPurged = () => revalidateTag.mock.calls.map(([tag]) => tag).sort();

beforeEach(() => {
  vi.stubEnv("CONTENTFUL_REVALIDATE_SECRET", SECRET);
  revalidateTag.mockClear();
  revalidatePath.mockClear();
});

describe("the revalidation webhook", () => {
  it("refuses a wrong secret without purging anything", async () => {
    const response = await POST(fire(entry("post"), "not-the-secret"));
    expect(response.status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("purges only the pages tag for a CMS Page", async () => {
    await POST(fire(entry("page")));
    expect(tagsPurged()).toEqual([CACHE_TAGS.PAGES]);
    // The known-bad control for the defect this replaced: before the split,
    // editing /about purged the posts tag and re-rendered every post page.
    expect(tagsPurged()).not.toContain(CACHE_TAGS.POSTS);
    // And the feed cannot have changed, so it is not refreshed either.
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("purges only the browse-intro tag for a Browse Intro", async () => {
    await POST(fire(entry("browseIntro")));
    expect(tagsPurged()).toEqual([CACHE_TAGS.BROWSE_INTROS]);
    expect(tagsPurged()).not.toContain(CACHE_TAGS.POSTS);
  });

  it("purges everything for the types that genuinely reach everywhere", async () => {
    // A renamed tag shows on every card and pill, a new author name appears in
    // bylines across the archive, and a published post changes the Read Next
    // backfill and the tag-visibility threshold on every other post page. The
    // broad purge is correct for these, not merely cautious.
    for (const contentType of ["post", "author", "category", "tag"]) {
      revalidateTag.mockClear();
      await POST(fire(entry(contentType)));
      expect(tagsPurged(), contentType).toEqual(
        Object.values(CACHE_TAGS).sort(),
      );
    }
  });

  it("purges everything when the body names no content type", async () => {
    // Asset firings carry no sys.contentType, and the README configures the
    // webhook for Asset publish and unpublish as well as Entry. A replaced
    // image can appear on any page.
    for (const body of [{ sys: {} }, {}, "not json at all", ""]) {
      revalidateTag.mockClear();
      await POST(fire(body));
      expect(tagsPurged()).toEqual(Object.values(CACHE_TAGS).sort());
    }
  });

  it("expires immediately rather than serving stale", async () => {
    // A deliberate freshness choice, asserted so it cannot be softened into
    // stale-while-revalidate by accident: the first visitor after a publish is
    // usually the author checking their own post, and the listing without it
    // is the one thing this webhook exists to prevent.
    await POST(fire(entry("post")));
    for (const [, profile] of revalidateTag.mock.calls) {
      expect(profile).toEqual({ expire: 0 });
    }
  });

  it("refreshes the feed only when posts were purged", async () => {
    await POST(fire(entry("post")));
    expect(revalidatePath).toHaveBeenCalledWith("/feed.xml");
  });
});
