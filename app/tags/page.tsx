import type { Metadata } from "next";
import Link from "next/link";
import { draftMode } from "next/headers";
import DateComponent from "../date";
import WidePage from "../wide-page";
import { type Crumb } from "../breadcrumb";
import { getAllPosts, getAllTags, getBrowseIntro } from "@/lib/api";
import { groupPostsByTag, MIN_POSTS_PER_TAG } from "@/lib/tags";
import { browsePageMetadata } from "@/lib/page-metadata";
import { widont } from "@/lib/typography";

export async function generateMetadata(): Promise<Metadata> {
  // Same slug the component passes to getBrowseIntro below. getBrowseIntro is
  // cache()-wrapped, so the two calls collapse into one request per render
  // — but only while the arguments match.
  const { isEnabled } = await draftMode();
  return browsePageMetadata({
    slug: "tags",
    title: "Tags",
    isDraftMode: isEnabled,
  });
}

export default async function TagsPage() {
  const { isEnabled } = await draftMode();

  // Posts grouped in memory. Contentful's GraphQL cannot filter on an
  // Array<Link> field, and the linkedFrom workaround has no ordering, so a
  // per-tag query could not preserve date_DESC. getAllPosts already sorts.
  //
  // Descriptions come from a second query rather than riding on every post's
  // tagsCollection, which would weigh down the home page, feed and sitemap for
  // one page's benefit. Joined by slug below.
  // Same arguments generateMetadata passes, so cache() collapses the two.
  const intro = await getBrowseIntro("tags", isEnabled);
  // Kept to two elements: adding a third with a different return shape made
  // TypeScript infer a union instead of a tuple, and posts silently lost every
  // field but tagsCollection.
  const [posts, allTags] = await Promise.all([
    getAllPosts(isEnabled),
    getAllTags(isEnabled),
  ]);
  const groups = groupPostsByTag(posts);
  const descriptions = new Map(
    allTags.map((tag) => [tag.slug, tag.description]),
  );

  const crumbs: Crumb[] = [{ label: "Home", href: "/" }, { label: "Tags" }];

  return (
    <WidePage
      crumbs={crumbs}
      header={
        <>
          <h1 className="mb-3 text-4xl leading-tight md:text-5xl lg:text-6xl">
            Tags
          </h1>
          {/* Not the metadata description: that one is written for search
            results and repeats the site name, which reads oddly next to the
            h1 and collides with the full stop in "Be Useful." */}
          {intro?.standfirst && (
            <p className="max-w-3xl text-lg leading-relaxed text-pretty">
              {intro.standfirst}
            </p>
          )}
        </>
      }
    >
      {groups.length === 0 ? (
        <p className="text-lg text-brand-muted">
          No tags yet. A tag appears here once {MIN_POSTS_PER_TAG} posts carry
          it.
        </p>
      ) : (
        // The glossary repeats every post title up to three times, once per tag
        // it carries. Pagefind indexes whatever it is given, so without this the
        // same titles would be weighted several times over and outrank the posts
        // themselves. Same reasoning as the table of contents on a post page.
        <div data-pagefind-ignore>
          {/* No jump list. It was compensating for a page with nothing to read
              on it: twelve anchors is not much to scroll past, and it repeated
              the counts each section states anyway. */}
          {groups.map(({ tag, posts: tagged }) => (
            <section
              key={tag.slug}
              // The id stays, so any /tags#slug link shared before per-tag
              // pages existed still lands somewhere sensible. Nothing on the
              // site generates those links any more. The offset that keeps the
              // landing point clear of the sticky header is now
              // `scroll-padding-top` on <html> (globals.css) rather than a
              // scroll-mt here — the two are additive, so keeping both would
              // overshoot.
              id={tag.slug}
              // A rule marks a section boundary, never a row boundary (round
              // 3 §9) — one 2px brand-dark rule above each tag name, not a
              // hairline below the group (which read as a break between
              // POSTS, since the eye met it right after the last post row
              // rather than before the next tag name) and not a hairline at
              // all (a divider weight would not read as a heavier boundary
              // than the row spacing it sits beside). 44px above every group
              // but the first, whose gap above already comes from WidePage's
              // own header margin.
              className="border-t-2 border-brand-dark pt-4 mt-11 first:mt-0"
            >
              {/* Term and gloss on the left, examples on the right — a
                  glossary rather than twelve identical full-width blocks. At
                  max-w-page a single column stranded each date against the far
                  edge with a gulf in the middle; splitting the width gives the
                  description a column narrow enough to read and pulls the dates
                  back in beside their titles.

                  Single column below lg, where there is no width to divide. */}
              <div className="lg:grid lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-x-14">
                <div className="lg:sticky lg:top-20 lg:self-start">
                  {/* Display size now — the tag name is the subject of its
                      section, on the same footing as a post title on a
                      listing, not a subordinate label the way a year number
                      is on the archive. */}
                  {/* Not flex, unlike the archive's year headings. Flex makes
                      the count a second column, so a name that wraps in this
                      340px measure — "Information architecture" — pushed it to
                      the far right and split it over two lines. Inline, it
                      simply follows the last word. whitespace-nowrap keeps
                      "3 posts" together when that word lands near the edge. */}
                  {/* The name links to the tag's own page. This is what makes
                      the glossary an index rather than the destination: it
                      teases the posts, and the full list, breadcrumb and
                      standfirst live at /tags/<slug> — the same relationship
                      /categories has with a category page. */}
                  <h2 className="mb-2 text-[26px] font-bold tracking-[-0.018em]">
                    <Link
                      href={`/tags/${tag.slug}`}
                      className="transition-colors duration-200 hover:text-brand-crimson"
                    >
                      {tag.name}
                    </Link>{" "}
                    <span className="font-ui text-[10px] font-semibold uppercase tracking-[0.14em] whitespace-nowrap text-brand-muted">
                      {tagged.length} {tagged.length === 1 ? "post" : "posts"}
                    </span>
                  </h2>
                  {descriptions.get(tag.slug) && (
                    <p className="mb-4 text-base leading-[1.55] text-brand-muted text-pretty lg:mb-0">
                      {descriptions.get(tag.slug)}
                    </p>
                  )}
                </div>

                {/* space-y-[14px], not a divider — see the note on the
                    section's own top rule above for why no rule ever falls
                    between rows here. */}
                <ul className="space-y-[14px] pt-4 lg:pt-1.5">
                  {tagged.map((post) => (
                    <li
                      key={post.slug}
                      // Date-led, so date stays first in both DOM and visual
                      // order rather than reordering like the archive's
                      // title-led mobile rows. Stacked below sm, where a fixed
                      // 96px column would not leave the title room to breathe.
                      className="flex flex-col gap-y-1 sm:grid sm:grid-cols-[96px_1fr] sm:items-baseline sm:gap-x-5"
                    >
                      <span className="text-[13px] tabular-nums text-brand-muted">
                        <DateComponent dateString={post.date} />
                      </span>
                      <Link
                        href={`/posts/${post.slug}`}
                        className="text-[18px] leading-[1.3] font-semibold text-pretty hover:text-brand-crimson transition-colors duration-200"
                      >
                        {widont(post.title)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ))}
        </div>
      )}
    </WidePage>
  );
}
