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
import { extractHeadings, hasTableOfContents } from "@/lib/headings";
import { readingTimeMinutes } from "@/lib/reading-time";
import { coverPromptId } from "@/lib/cover-prompt";
import { highlightCodeBlocks } from "@/lib/highlight";
import TableOfContents from "../../table-of-contents";
import ExploreWithAI from "../../explore-with-ai";
import { AuthorBioSection } from "../../author-bio-card";
import TagPill from "../../tag-pill";
import SidenoteEnterKey from "../../sidenote-enter-key";
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
  // The same call as the page, never getPost. [→ `single-entry-cache`]
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
    // No images: the colocated opengraph-image route supplies the card.
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.date,
      modifiedTime: post.updatedDate ?? post.date,
      url: canonical,
      siteName: SITE_TITLE,
      locale: DEFAULT_OG_LOCALE,
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
  // All posts too: a pill shows only if its tag clears the sitewide threshold.
  // [→ `post-scheduling`, `fetcher-cache`]
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

  // Published date, the revision flag (short on mobile), then reading time.
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

  const promptId = coverPromptId(post);
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
    // The excerpt stays in the body column. No contentOwnsLeading.
    // [→ `band-retirement`]
    <WidePage
      crumbs={crumbs}
      heading={
        // Its own body region: the h1 sits outside the article.
        // [→ `pagefind-index-scope`]
        <h1
          data-pagefind-body
          className="text-4xl leading-tight md:text-5xl lg:text-6xl text-balance"
        >
          {/* Never widont(). [→ `heading-widont`] */}
          {post.title}
        </h1>
      }
    >
      <SidenoteEnterKey />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }}
      />
      {/* The indexed region. meta url gives results the extensionless route,
          since Pagefind indexes the .html files. [→ `pagefind-index-scope`] */}
      <article
        data-pagefind-body
        data-pagefind-meta="url[data-url]"
        data-url={`/posts/${slug}`}
        className="mx-auto max-w-5xl"
      >
        {post.coverImage && (
          <div className="relative mb-10">
            <CoverImage
              image={post.coverImage}
              wide
              priority
              sizes="(max-width: 768px) calc(100vw - 2.5rem), 1024px"
            />
            {promptId && (
              // Over the image so the page keeps its position. Near-black and a
              // white inner ring, because it sits on images of any tone, not on
              // a scheme colour. 44px tall at every width.
              <a
                href="#cover-prompt"
                data-pagefind-ignore
                className="absolute bottom-2 right-2 inline-flex h-11 items-center gap-1.5 rounded-full bg-black/85 px-3.5 font-ui text-sm font-semibold text-white no-underline shadow-md hover:bg-black md:bottom-3.5 md:right-3.5 focus-visible:outline-white focus-visible:-outline-offset-4"
              >
                {/* Lucide 'brush' icon, ISC licence. */}
                <svg
                  aria-hidden="true"
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m11 10 3 3" />
                  <path d="M6.5 21A3.5 3.5 0 1 0 3 17.5a2.62 2.62 0 0 1-.708 1.792A1 1 0 0 0 3 21z" />
                  <path d="M9.969 17.031 21.378 5.624a1 1 0 0 0-3.002-3.002L6.967 14.031" />
                </svg>
                Prompt<span className="sr-only"> for this cover image</span>
              </a>
            )}
          </div>
        )}
        {/* Below xl one column ordered Head, Aside, Body; at xl the aside
            spans both rows of the left track. */}
        <div className="flex flex-col xl:grid xl:grid-cols-[1fr_3fr] xl:gap-x-10">
          <div className="order-1 mx-auto w-full max-w-2xl xl:order-none xl:col-start-2 xl:row-start-1 xl:mx-0">
            <p className="mb-8 text-xl leading-relaxed text-brand-muted text-pretty">
              {widont(post.excerpt)}
            </p>
            <div className="mb-10">
              <Avatar authors={authors} meta={dateline} />
            </div>
          </div>

          {/* The aside spans both rows so its sticky wrapper has room.
              [→ `pagefind-index-scope`] */}
          <aside
            data-pagefind-ignore
            className={`order-2 mx-auto w-full max-w-2xl xl:order-none xl:col-start-1 xl:row-start-1 xl:row-span-2 xl:mx-0 xl:max-w-none xl:mb-0${hasTableOfContents(headings) ? " mb-9" : ""}`}
          >
            <div className="xl:sticky xl:top-20 xl:space-y-8 xl:pb-4">
              <TableOfContents headings={headings} />
              <div className="hidden xl:block">
                <ExploreWithAI slug={slug} />
              </div>
            </div>
          </aside>

          <div className="order-3 mx-auto w-full max-w-2xl xl:order-none xl:col-start-2 xl:row-start-2 xl:mx-0">
            {/* Heading sizes are em, tracking the prose base; the plugin keys
                heading margins to the heading's own size. */}
            <div className="prose text-pretty prose-h2:text-[1.6em] prose-h3:text-[1.375em] prose-h3:font-[600] prose-h4:text-[1.15em]">
              <RichText
                content={post.content}
                headings={headings}
                highlighted={highlighted}
                coverPromptId={promptId}
              />
            </div>
            {/* Below the body, since the sidebar is xl-only. The gap under
                the pills is the author block's margin; change both together. */}
            {tags.length > 0 && (
              <nav
                aria-label="Tags"
                className="mt-8 border-t border-hairline pt-6"
              >
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
