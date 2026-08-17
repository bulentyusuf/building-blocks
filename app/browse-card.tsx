import Link from "next/link";
import CoverImage from "./cover-image";
import TagRow from "./tag-row";
import { CardMeta } from "./story-card";
import type { CardPost, Tag } from "@/lib/types";
import { widont } from "@/lib/typography";

// The card tier of a browse listing (category, tag, author and the index
// pages) — cover, title, date-then-category, standfirst, in that order. Not
// StoryCard: StoryCard's meta line sits AFTER its excerpt (home's plates, the
// post page's Read Next), and changing that order there would touch two
// callers this change has no reason to touch. CardMeta is shared regardless,
// since the date-then-category line itself is identical.
//
// Its own component rather than a MoreStories "variant" — see CLAUDE.md's
// "StoryCard is the one 4:3 card": MoreStories lost its grid variant on
// purpose and the guidance is to build a future grid caller as its own
// component, which is what this and app/more-stories.tsx's card/row split do.
export default function BrowseCard({
  post,
  priority = false,
  transitionName,
  tags = [],
}: {
  post: CardPost;
  priority?: boolean;
  transitionName?: string;
  tags?: Tag[];
}) {
  return (
    <article>
      {post.coverImage && (
        <div className="mb-4">
          <CoverImage
            slug={post.slug}
            url={post.coverImage.url}
            alt={post.coverImage.title ?? ""}
            priority={priority}
            hover
            ratio="4:3"
            transitionName={transitionName}
            // Capped in px above the point the container stops growing, same
            // arithmetic as app/story-card.tsx: Container tops out at 1160px,
            // and a four-up row's narrowest track is a quarter of that less
            // three 32px gaps: (1160 - 96) / 4 = 266px.
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 266px"
          />
        </div>
      )}
      {/* h2: every caller today is ListingPage's card grid, which sits
          directly under the page's own h1 with no section heading between —
          same rule app/more-stories.tsx used for its list titles. */}
      <h2 className="mb-2 text-[30px] sm:text-[24px] leading-tight tracking-[-0.02em] sm:tracking-[-0.018em] font-bold text-pretty">
        <Link
          href={`/posts/${post.slug}`}
          className="hover:text-brand-crimson transition-colors duration-200"
        >
          {widont(post.title)}
        </Link>
      </h2>
      <div className="mb-3">
        <CardMeta date={post.date} category={post.category} />
      </div>
      <p className="text-[17px] leading-[1.55] text-pretty">{post.excerpt}</p>
      <TagRow tags={tags} className="mt-3" />
    </article>
  );
}
