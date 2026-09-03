import { NextRequest, NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";
import { safeCompare } from "@/lib/secret";
import { CACHE_TAGS, type CacheTag } from "@/lib/api";

// Which cache tags a webhook firing should purge, from the entry that fired it.
//
// Every firing used to purge CACHE_TAGS.POSTS, which every query in lib/api.ts
// carried — so editing /about or a browse standfirst re-rendered every post
// page on the site, which nothing about those entries can affect.
//
// Only two content types narrow. The rest stay broad because they genuinely
// ARE broad: a renamed Tag or Category shows on every card and pill, a new
// Author name appears in bylines across the archive, and a published Post
// changes the "Read Next" backfill and the sitewide tag-visibility threshold on
// every other post page. Those are not conservative guesses, they are the
// actual reach of the data.
//
// Anything unrecognised — an Asset firing, a content type added later, a body
// this cannot parse — purges everything. Over-invalidating costs a render;
// under-invalidating serves stale content with nothing anywhere to say so, so
// the default has to fall on the expensive side.
const NARROW_TAGS: Record<string, CacheTag> = {
  page: CACHE_TAGS.PAGES,
  browseIntro: CACHE_TAGS.BROWSE_INTROS,
};

const ALL_TAGS: CacheTag[] = Object.values(CACHE_TAGS);

async function tagsToRevalidate(request: NextRequest): Promise<CacheTag[]> {
  try {
    const body = await request.json();
    const contentType = body?.sys?.contentType?.sys?.id;
    if (typeof contentType !== "string") return ALL_TAGS;
    const narrow = NARROW_TAGS[contentType];
    return narrow ? [narrow] : ALL_TAGS;
  } catch {
    // An empty or non-JSON body is a misconfigured webhook, not a signal that
    // nothing changed.
    return ALL_TAGS;
  }
}

export async function POST(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const secret = requestHeaders.get("x-vercel-reval-key");
  const expected = process.env.CONTENTFUL_REVALIDATE_SECRET;

  if (!safeCompare(secret, expected)) {
    return NextResponse.json({ message: "Invalid secret" }, { status: 401 });
  }

  const tags = await tagsToRevalidate(request);

  // expire: 0 stays, and it is a freshness choice rather than an oversight.
  // A cacheLife profile with a non-zero expire would let the entry be served
  // stale while it regenerated, sparing the first visitor a cold render — but
  // that visitor is usually the author refreshing after publishing, and
  // showing them the listing without their new post on it is the one thing
  // this webhook exists to prevent. One slow request per purged page is the
  // price of the page being right on the first look.
  for (const tag of tags) {
    revalidateTag(tag, { expire: 0 });
  }

  // /feed.xml is an ordinary ISR route handler. The posts tag busts it along
  // with the home and listing pages, since they all render with that tag. The
  // path revalidation is the instant on-demand refresh for feed. The sitemap is
  // served from /sitemap-xml and is busted by the tags above — by POSTS for a
  // post, and by PAGES for a CMS Page, which is the other thing it lists.
  if (tags.includes(CACHE_TAGS.POSTS)) {
    revalidatePath("/feed.xml");
  }

  return NextResponse.json({ revalidated: true, tags, now: Date.now() });
}
