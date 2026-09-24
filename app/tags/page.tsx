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
  // [→ `single-entry-cache`]
  const { isEnabled } = await draftMode();
  return browsePageMetadata({
    slug: "tags",
    title: "Tags",
    isDraftMode: isEnabled,
  });
}

export default async function TagsPage() {
  const { isEnabled } = await draftMode();

  // Descriptions come from their own query, joined by slug, so they stay out
  // of every other page's fragment. [→ `tag-pages`]
  const intro = await getBrowseIntro("tags", isEnabled);
  // Two elements only: a third made TypeScript infer a union and drop fields.
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
      // Not the meta description, which repeats the site name.
      standfirst={
        intro?.standfirst && (
          <p className="md:max-w-[20rem] text-lg leading-relaxed md:text-right text-brand-muted text-pretty">
            {widont(intro.standfirst)}
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
        // The glossary repeats titles once per tag. [→ `tag-pages`]
        <div data-pagefind-ignore>
          {groups.map(({ tag, posts: tagged }) => (
            <section
              key={tag.slug}
              // Kept so old /tags#slug links still land.
              id={tag.slug}
              className="mb-10 last:mb-0"
            >
              {/* Term and gloss left, posts right; one column below lg. */}
              <div className="lg:grid lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:gap-x-10">
                <div className="lg:sticky lg:top-20 lg:self-start">
                  {/* Inline, not flex, so the count follows a wrapped name.
                      Links to the tag's page. [→ `tag-pages`] */}
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
