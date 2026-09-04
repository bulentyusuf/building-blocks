import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import WidePage from "../../wide-page";
import MoreStories from "../../more-stories";
import Avatar from "../../avatar";
import Date from "../../date";
import CoverImage from "../../cover-image";
import { RichText } from "@/lib/rich-text";
import { getAllPosts, getPostAndMorePosts } from "@/lib/api";
import { postTags, visibleTagSlugs } from "@/lib/tags";
import { postAuthors } from "@/lib/authors";
import { extractHeadings } from "@/lib/headings";
import { readingTimeMinutes } from "@/lib/reading-time";
import { highlightCodeBlocks } from "@/lib/highlight";
import TableOfContents from "../../table-of-contents";
import ExploreWithAI from "../../explore-with-ai";
import { AuthorBioSection } from "../../author-bio-card";
import TagPill from "../../tag-pill";
import { type Crumb } from "../../breadcrumb";
import {
  SITE_URL,
  SITE_AUTHOR,
  SITE_TITLE,
  DEFAULT_OG_LOCALE,
} from "@/lib/constants";
import { jsonLdHtml, postAuthorsNode } from "@/lib/json-ld";
import { widont } from "@/lib/typography";

export async function generateStaticParams() {
  const allPosts = await getAllPosts(false);
  return allPosts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { isEnabled } = await draftMode();
  const { slug } = await params;
  // Deliberately the same call the page component makes below, not the slimmer
  // getPost. Both are wrapped in React's cache(), so the two run once per
  // request and the page reuses this result instead of refetching. Calling
  // getPost here would be a smaller query but a second one, since cache() only
  // dedupes identical calls — which is how this page ended up issuing two
  // requests for one post. getPost is still the right helper where nothing else
  // fetches the post in the same pass, as in opengraph-image.tsx.
  const { post } = await getPostAndMorePosts(slug, isEnabled);

  if (!post) {
    return { title: "Post not found" };
  }

  const canonical = `${SITE_URL}/posts/${slug}`;
  const authorUrls = postAuthors(post)
    .filter((a) => a.slug)
    .map((a) => `${SITE_URL}/authors/${a.slug}`);

  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical },
    // The og:image (and the Twitter image Next derives from it) now comes from
    // the colocated opengraph-image route, which generates a branded card and
    // takes precedence over config-based metadata — so no images are set here.
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.date,
      modifiedTime: post.updatedDate ?? post.date,
      url: canonical,
      siteName: SITE_TITLE,
      locale: DEFAULT_OG_LOCALE,
      // Every author's URL, not just the lead's — openGraph.authors is
      // already an array, so it needed no fixed-slot compromise the way the
      // RSS <author> and the OG image byline did.
      authors: authorUrls.length > 0 ? authorUrls : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
    },
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { isEnabled } = await draftMode();
  const { slug } = await params;
  // getAllPosts alongside the post itself, because a pill may only render if
  // its tag clears the threshold across the whole site, and that count cannot
  // be derived from one post. The list fragment omits every post body, and the
  // response is ISR-cached under the same "posts" tag as everything else, so
  // this costs one slim cached query rather than a second body fetch.
  const [{ post, morePosts }, allPosts] = await Promise.all([
    getPostAndMorePosts(slug, isEnabled),
    getAllPosts(isEnabled),
  ]);

  if (!post) {
    notFound();
  }

  const visible = visibleTagSlugs(allPosts);
  const tags = postTags(post).filter((t) => visible.has(t.slug));
  const authors = postAuthors(post);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    image: post.coverImage
      ? `${post.coverImage.url}?w=1200&h=630&fit=fill&fm=jpg&q=80`
      : `${SITE_URL}/be_useful.jpg`,
    datePublished: post.date,
    dateModified: post.updatedDate ?? post.date,
    author: postAuthorsNode(authors),
    publisher: {
      "@type": "Person",
      name: SITE_AUTHOR,
      url: SITE_URL,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}/posts/${slug}`,
    },
  };

  const showUpdated = post.updatedDate && post.updatedDate !== post.date;
  const minutes = readingTimeMinutes(post.content.json);

  // Byline sub-line: lead with the published date (matches the index cards),
  // flag the revision on mobile, show the full updated date on desktop, then
  // the estimated reading time.
  const dateline = (
    <span className="tabular-nums">
      <Date dateString={post.date} />
      {showUpdated && (
        <>
          <span className="md:hidden"> (updated)</span>
          <span className="hidden md:inline">
            {" · "}Updated <Date dateString={post.updatedDate!} />
          </span>
        </>
      )}
      {" · "}
      {minutes} min read
    </span>
  );

  const headings = extractHeadings(post.content.json);
  const highlighted = await highlightCodeBlocks(post.content);

  const crumbs: Crumb[] = post.category
    ? [
        { label: "Home", href: "/" },
        { label: "Categories", href: "/categories" },
        {
          label: post.category.name,
          href: `/categories/${post.category.slug}`,
        },
        { label: post.title },
      ]
    : [{ label: "Home", href: "/" }, { label: post.title }];

  return (
    // The masthead's contents are the trail and the title; the excerpt stays
    // where it is, in the body column below. A listing standfirst describes a
    // collection to someone deciding whether to enter it, whereas a post
    // excerpt introduces an article to a reader who has already arrived.
    // No contentOwnsLeading, for the same reason home dropped it: the cover
    // used to pull up 64px across the band's bottom edge and supply its own
    // leading, and the pull-up went with the band. The article opens with a
    // bare cover carrying no top margin, so it takes the shell's gap.
    <WidePage
      crumbs={crumbs}
      // No standfirst prop — see the comment above. With none, the split
      // masthead has nothing to split against, so the heading falls back to
      // the plain stack every narrow route uses too.
      heading={
        // data-pagefind-body a second time, because the h1 has left the
        // article and Pagefind indexes only what sits inside a body region.
        // meta.title survives without this, since Pagefind reads the page's
        // first h1 wherever it is, so the regression is invisible in the
        // results list. What is lost is the title's WORDS, which drop out of
        // the searchable text and take every title-only term with them.
        // Pagefind concatenates multiple body regions into one fragment, so
        // this restores the index to exactly what it held before the move.
        <h1
          data-pagefind-body
          className="text-4xl leading-tight md:text-5xl lg:text-6xl text-pretty"
        >
          {widont(post.title)}
        </h1>
      }
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }}
      />
      {/* data-pagefind-body scopes the Pagefind index to post content only.
          Pages without this attribute are excluded from search entirely.
          data-pagefind-meta="url" records the clean, extensionless route as the
          result URL: Pagefind indexes the prerendered `<slug>.html` files, so
          its derived url carries a `.html` that 404s on Next's routes. The
          Component UI has no JS layer to rewrite it, so the fix lives in the
          index — the result template reads `meta.url` in preference to that
          derived url. */}
      <article
        data-pagefind-body
        data-pagefind-meta="url[data-url]"
        data-url={`/posts/${slug}`}
        className="mx-auto max-w-5xl"
      >
        {post.coverImage && (
          <div className="mb-10">
            <CoverImage
              image={post.coverImage}
              wide
              priority
              sizes="(max-width: 768px) calc(100vw - 2.5rem), 1024px"
            />
          </div>
        )}
        {/*
          Grid begins AFTER the cover image. The header block above
          (category, title, image) is full-width.
          Below xl: single column — standfirst, then byline (with date), then body.
          At xl+: sidebar (TOC + AI) in the left track, content in the right.
        */}
        <div className="xl:grid xl:grid-cols-[1fr_3fr] xl:gap-x-10">
          {/* Sidebar zone — TOC always rendered (collapsed disclosure on
              mobile, sticky open panel at xl+). ExploreWithAI stays xl-only
              per the separate mobile-AI decision. */}
          {/* TOC repeats every heading; excluded so headings are not
              double-weighted in search. */}
          <aside data-pagefind-ignore className="mb-4 xl:mb-0">
            <div className="xl:sticky xl:top-20 space-y-8 xl:pb-4">
              <TableOfContents headings={headings} />
              <div className="hidden xl:block">
                <ExploreWithAI slug={slug} />
              </div>
            </div>
          </aside>

          <div className="mx-auto max-w-2xl xl:mx-0">
            <p className="mb-8 text-xl leading-relaxed text-brand-muted text-pretty">
              {widont(post.excerpt)}
            </p>
            <div className="mb-10">
              <Avatar authors={authors} meta={dateline} />
            </div>
            {/* text-pretty on the prose container inherits into every child —
                paragraphs and in-body headings alike — so line breaking just
                avoids a lone last word, without the aggressive re-balancing of
                text-wrap: balance. One class covers the whole article body.

                The heading sizes are em, so they track the prose base. h2 sits
                at 1.6em rather than the 1.75em it carried before the base moved
                to 1.125rem: the plugin keys a heading's margins to its own
                font-size (2em above, 1em below), so an oversized h2 inflates
                the space around it as well as the type. At 1.6em the gap above
                lands at 57.6px, near where it sat before the bump, and the
                h1-to-h2 step widens back out. */}
            <div className="prose text-pretty prose-h2:text-[1.6em] prose-h3:text-[1.375em] prose-h4:text-[1.15em]">
              <RichText
                content={post.content}
                headings={headings}
                highlighted={highlighted}
              />
            </div>
            {/* Below the body rather than in the sidebar: the sidebar is
                xl-and-up only, so tags placed there would vanish on the
                viewports most people read on. Every pill links into the /tags
                glossary, and only tags that clear the threshold are rendered —
                a hidden tag would otherwise link to an anchor that is not on
                that page.

                The gap below the pills is not set here — it comes from the
                author block's top margin, which drops to mt-6 when tags are
                present so both sides of the band are 24px. Changing pt-6 here
                without changing that leaves the row lopsided. */}
            {tags.length > 0 && (
              <nav
                aria-label="Tags"
                className="mt-8 border-t border-hairline pt-6"
              >
                {/* Single-line layout: the uppercase tracking-widest eyebrow
                    matches "About the author" in family and weight without
                    competing with the pill buttons beside it. */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className="font-ui text-xs font-bold uppercase tracking-widest text-brand-muted shrink-0">
                    Tagged
                  </span>
                  <ul className="flex flex-wrap items-center gap-2">
                    {tags.map((tag) => (
                      <li key={tag.slug}>
                        <TagPill tag={tag} />
                      </li>
                    ))}
                  </ul>
                </div>
              </nav>
            )}
            <AuthorBioSection authors={authors} hasTags={tags.length > 0} />
          </div>
        </div>
      </article>
      <div className="mt-section">
        <MoreStories morePosts={morePosts} variant="grid" heading="Read Next" />
      </div>
    </WidePage>
  );
}
