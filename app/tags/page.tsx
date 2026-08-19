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
      heading={
        <h1 className="text-4xl leading-tight md:text-5xl lg:text-6xl">Tags</h1>
      }
      // Not the metadata description: that one is written for search
      // results and repeats the site name, which reads oddly next to the
      // h1 and collides with the full stop in "Be Useful."
      standfirst={
        intro?.standfirst && (
          <p className="md:max-w-[20rem] text-lg leading-relaxed md:text-right text-brand-muted text-pretty">
            {intro.standfirst}
          </p>
        )
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
              className="mb-10 last:mb-0"
            >
              {/* Term and gloss on the left, examples on the right — a
                  glossary rather than twelve identical full-width blocks. At
                  max-w-5xl a single column stranded each date against the far
                  edge with a gulf in the middle; splitting the width gives the
                  description a column narrow enough to read and pulls the dates
                  back in beside their titles.

                  Single column below lg, where there is no width to divide. */}
              <div className="lg:grid lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:gap-x-10">
                <div className="lg:sticky lg:top-20 lg:self-start">
                  {/* Smaller than the archive's year headings and in body ink
                      rather than muted. A year is wayfinding, so it recedes; a
                      tag name is the subject of its section. */}
                  {/* Not flex, unlike the archive's year headings. Flex makes
                      the count a second column, so a name that wraps in this
                      18rem measure — "Information architecture" — pushed it to
                      the far right and split it over two lines. Inline, it
                      simply follows the last word. whitespace-nowrap keeps
                      "3 posts" together when that word lands near the edge. */}
                  {/* The name links to the tag's own page. This is what makes
                      the glossary an index rather than the destination: it
                      teases the posts, and the full list, breadcrumb and
                      standfirst live at /tags/<slug> — the same relationship
                      /categories has with a category page. */}
                  <h2 className="mb-1 text-xl md:text-2xl">
                    <Link
                      href={`/tags/${tag.slug}`}
                      className="transition-colors duration-200 hover:text-brand-crimson"
                    >
                      {tag.name}
                    </Link>{" "}
                    <span className="font-ui text-xs font-normal uppercase tracking-wide whitespace-nowrap text-brand-muted tabular-nums">
                      {tagged.length} {tagged.length === 1 ? "post" : "posts"}
                    </span>
                  </h2>
                  {descriptions.get(tag.slug) && (
                    <p className="mb-4 leading-relaxed text-brand-muted text-pretty lg:mb-0">
                      {descriptions.get(tag.slug)}
                    </p>
                  )}
                </div>

                <ul className="space-y-3 border-t border-hairline pt-4 lg:border-t-0 lg:pt-1">
                  {tagged.map((post) => (
                    <li
                      key={post.slug}
                      className="flex flex-col gap-y-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-x-6"
                    >
                      <Link
                        href={`/posts/${post.slug}`}
                        className="hover:text-brand-crimson transition-colors duration-200"
                      >
                        {widont(post.title)}
                      </Link>
                      <span className="shrink-0 text-sm tabular-nums text-brand-muted sm:text-right">
                        <DateComponent dateString={post.date} />
                      </span>
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
