import type { Metadata } from "next";
import Link from "next/link";
import { draftMode } from "next/headers";
import PostRow, { ROWS_PANEL } from "../post-row";
import WidePage from "../wide-page";
import { type Crumb } from "../breadcrumb";
import { getAllPosts, getGermanPostSlugs } from "@/lib/api";
import { groupPostsByTag, MIN_POSTS_PER_TAG } from "@/lib/tags";
import { browsePageMetadata } from "@/lib/page-metadata";

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

  const [posts, germanSlugs] = await Promise.all([
    getAllPosts(isEnabled),
    getGermanPostSlugs(isEnabled),
  ]);
  const groups = groupPostsByTag(posts);
  // Translated posts, for the rows' DE marker. [→ `locale`]
  const german = new Set(germanSlugs);

  const crumbs: Crumb[] = [{ label: "Home", href: "/" }, { label: "Tags" }];

  return (
    <WidePage
      crumbs={crumbs}
      heading={
        <h1 className="text-5xl leading-[0.98] font-[800] tracking-[-0.03em] md:text-6xl lg:text-7xl">
          Tags
        </h1>
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
              className="mb-12 last:mb-0"
            >
              {/* Built like the archive: the tag is the spine, the count a
                  muted label, the posts a list panel. [→ `tag-pages`] */}
              <h2 className="mb-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <Link
                  href={`/tags/${tag.slug}`}
                  className="text-4xl leading-none font-[800] tracking-[-0.02em] transition-colors duration-200 hover:text-brand-crimson md:text-5xl lg:text-[3.25rem]"
                >
                  #{tag.name}
                </Link>
                <span className="font-mono text-sm font-medium text-brand-muted">
                  <span aria-hidden="true">{"// "}</span>
                  {tagged.length} {tagged.length === 1 ? "post" : "posts"}
                </span>
              </h2>
              <ul className={`${ROWS_PANEL} mt-4`}>
                {tagged.map((post) => (
                  <PostRow
                    key={post.slug}
                    post={post}
                    german={german.has(post.slug)}
                    date="long"
                    showStrand
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </WidePage>
  );
}
