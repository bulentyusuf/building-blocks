import { NextRequest, NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";
import { safeCompare } from "@/lib/secret";
import { CACHE_TAGS, type CacheTag } from "@/lib/api";

// Only `page` and `browseIntro` narrow; anything else purges all. [→ `cache-tags`]
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
    // A bad body is a misconfigured webhook, not "nothing changed".
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

  // [→ `cache-tags`]
  for (const tag of tags) {
    revalidateTag(tag, { expire: 0 });
  }

  // The instant refresh for the feed; the tags above cover everything else.
  if (tags.includes(CACHE_TAGS.POSTS)) {
    revalidatePath("/feed.xml");
  }

  return NextResponse.json({ revalidated: true, tags, now: Date.now() });
}
