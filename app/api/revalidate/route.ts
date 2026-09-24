import { NextRequest, NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";
import { safeCompare } from "@/lib/secret";
import { CACHE_TAGS, type CacheTag } from "@/lib/api";

// Which cache tags a webhook firing should purge, from the entry that fired it.
// Only `page` and `browseIntro` narrow. Everything else, including anything
// unrecognised, purges the full set. [→ `cache-tags`]
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
  const secret = request.headers.get("x-vercel-reval-key");
  const expected = process.env.CONTENTFUL_REVALIDATE_SECRET;

  if (!safeCompare(secret, expected)) {
    return NextResponse.json({ message: "Invalid secret" }, { status: 401 });
  }

  const tags = await tagsToRevalidate(request);

  // expire: 0 is a freshness choice, not an oversight, and is asserted in
  // app/api/revalidate/route.test.ts. [→ `cache-tags`]
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
