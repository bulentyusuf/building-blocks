import BrowseCard from "./browse-card";
import PostRow from "./post-row";
import type { CardPost } from "@/lib/types";
import { createCoverNamer } from "@/lib/view-transition-name";
import { postTags } from "@/lib/tags";

// The listing every taxonomy page and the index share: a 4-up card grid
// (cover, title, date-then-category, standfirst, tags) for the first
// `cardCount` posts, then a bare date-plus-title row (app/post-row.tsx,
// shared with home's "Earlier" list) for whatever is left.
//
// cardCount is the caller's decision, not this component's: app/listing-page.tsx
// passes 4 on page 1 (4 cards + 4 rows = one page) and posts.length on page
// 2+ (all 8 as cards, no rows) — see CLAUDE.md's "eight posts per page"
// entry. Passing posts.length always renders every post as a card and no
// rows at all, which is the right default for a caller with nothing to say
// about the split.
export default function MoreStories({
  morePosts,
  cardCount = morePosts.length,
  priorityFirst = false,
  coverName = createCoverNamer(),
  visibleTags,
  openRule = true,
}: {
  morePosts: CardPost[];
  /** How many of the leading posts render as cards; the rest render as rows. */
  cardCount?: number;
  // When true, the first post's cover image is fetched with priority. Use on
  // heroless listing pages (index page 2+, category pages) where that image is
  // the LCP. Leave false where a hero already owns priority (index page 1).
  priorityFirst?: boolean;
  // Per-render view-transition-name allocator. Pages with a hero pass their own
  // namer so the hero and any repeated card share one name only once (see
  // lib/view-transition-name.ts). Standalone listings get a fresh namer by
  // default, which is enough to dedupe within this list.
  coverName?: (slug: string) => string | undefined;
  // Pass to show tag pills; omit for no pills. It is the visibility set rather
  // than a boolean on purpose: a pill links to `/tags/[slug]`, and that route
  // 404s for a tag below MIN_POSTS_PER_TAG, so an unfiltered pill can point at
  // a dead URL. Requiring the set makes it impossible to switch pills on
  // without deciding that question.
  //
  // A tag page passes this set minus its own slug: every post there carries
  // that tag, so repeating it on each card says nothing.
  //
  // The set must be computed from ALL posts, via visibleTagSlugs(getAllPosts()).
  // Deriving it from the posts on one category or author page counts a subset
  // and would hide tags the glossary shows. Rows never carry tags — only the
  // card tier does, matching CLAUDE.md's tag-placement list.
  visibleTags?: Set<string>;
  // Drops the opening rule on the row list, keeping the closing one. For a
  // listing that already has an edge above it — the header's own bottom
  // margin — the top rule would draw a second boundary a few pixels under the
  // first. Meaningless (and unused) when there are no rows at all.
  openRule?: boolean;
}) {
  const cards = morePosts.slice(0, cardCount);
  const rows = morePosts.slice(cardCount);

  const tagsFor = (post: CardPost) =>
    visibleTags ? postTags(post).filter((t) => visibleTags.has(t.slug)) : [];

  return (
    <div className="mx-auto max-w-page flex flex-col gap-10 md:gap-12">
      {cards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-12">
          {cards.map((post, i) => (
            <BrowseCard
              key={post.slug}
              post={post}
              priority={priorityFirst && i === 0}
              transitionName={coverName(post.slug)}
              tags={tagsFor(post)}
            />
          ))}
        </div>
      )}
      {rows.length > 0 && (
        // Same closing-rule-only reasoning as the old ruled list (see
        // app/pagination.tsx's note): the pager below relies on this list
        // closing itself, and an opening rule would double up on whatever
        // edge already sits above this listing.
        <ul
          className={`flex flex-col divide-y divide-hairline border-hairline ${
            openRule ? "border-y" : "border-b"
          }`}
        >
          {rows.map((post) => (
            <PostRow
              key={post.slug}
              slug={post.slug}
              title={post.title}
              date={post.date}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
