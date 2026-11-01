import Container from "../../container";
import PostCard from "../../post-card";
import { Label } from "../../post-stream";
import Avatar from "../../avatar";
import Date from "../../date";
import CoverImage from "../../cover-image";
import { RichText } from "@/lib/rich-text";
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
import LanguageLink from "../../language-link";
import { SITE_URL, SITE_AUTHOR, GERMAN_LOCALE } from "@/lib/constants";
import { jsonLdHtml, postAuthorsNode } from "@/lib/json-ld";
import { widont } from "@/lib/typography";
import { strandFor } from "@/lib/strands";
import type { ListPost, Post } from "@/lib/types";

// The post body for both routes. German posts are kept out of the search index.
// Only the German parts carry de-DE; bio, tags and asides stay en-GB. [→ `locale`]
export default async function PostView({
  post,
  morePosts,
  allPosts,
  slug,
  german,
  languageLink,
}: {
  post: Post;
  morePosts: ListPost[];
  allPosts: ListPost[];
  slug: string;
  german: boolean;
  /** The other language version, when there is one. */
  languageLink?: { href: string; lang: string; label: string };
}) {
  const path = german ? `/de/posts/${slug}` : `/posts/${slug}`;
  const lang = german ? GERMAN_LOCALE : undefined;
  const visible = visibleTagSlugs(allPosts);
  const tags = postTags(post).filter((t) => visible.has(t.slug));
  const authors = postAuthors(post);
  const strand = strandFor(post.category);

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
      "@id": `${SITE_URL}${path}`,
    },
    ...(german && { inLanguage: GERMAN_LOCALE }),
  };

  const showUpdated = post.updatedDate && post.updatedDate !== post.date;
  const minutes = readingTimeMinutes(post.content.json);

  // Date and reading time in muted type, then the Updated stamp when the post
  // has been revised. In German with the post. Reading time never breaks.
  const dateline = (
    <>
      <span className="tabular-nums text-brand-muted" lang={lang}>
        <Date dateString={post.date} german={german} />
        {" · "}
        {german
          ? `${minutes}\u00a0Min.\u00a0Lesezeit`
          : `${minutes}\u00a0min\u00a0read`}
      </span>
      {showUpdated && (
        // A double-ruled stamp: border plus an offset outline. Straight.
        <span
          lang={lang}
          className="inline-flex min-h-7.5 items-center rounded-md border-2 border-brand-dark px-2.5 font-mono text-xs font-medium tracking-[0.06em] uppercase tabular-nums outline-1 outline-offset-2 outline-brand-dark"
        >
          {german ? "Aktualisiert am\u00a0" : "Updated\u00a0"}
          <Date dateString={post.updatedDate!} german={german} />
        </span>
      )}
    </>
  );

  const promptId = coverPromptId(post);
  const headings = extractHeadings(post.content.json);
  const highlighted = await highlightCodeBlocks(post.content);

  const hasToc = hasTableOfContents(headings);

  return (
    // No trail: the header presses the post's strand. A short header group,
    // the cover, then the sidebar beside a quiet reading panel. [→ `post-page`]
    <Container>
      <header>
        {/* Its own body region: the h1 sits outside the article.
            [→ `pagefind-index-scope`] */}
        <h1
          data-pagefind-body={german ? undefined : true}
          lang={lang}
          // German compounds outrun a phone line, so hyphenate below md only.
          // Wider, text-balance narrows the box and hyphens split words that fit.
          className={`max-w-[62.5rem] text-4xl leading-[0.98] font-[800] tracking-[-0.03em] text-balance wrap-break-word md:text-6xl lg:text-[4.75rem]${german ? " hyphens-auto md:hyphens-manual" : ""}`}
        >
          {/* Never widont(). [→ `heading-widont`] */}
          {post.title}
        </h1>
        <p
          lang={lang}
          className="mt-5 max-w-[51.25rem] text-xl leading-[1.45] text-pretty md:text-2xl"
        >
          {widont(post.excerpt)}
        </p>
        <div className="mt-7">
          <Avatar
            authors={authors}
            meta={
              <>
                {dateline}
                {languageLink && <LanguageLink {...languageLink} />}
              </>
            }
          />
        </div>
      </header>
      <SidenoteEnterKey />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }}
      />
      {/* The indexed region. meta url gives results the extensionless route,
          since Pagefind indexes the .html files; the strand feeds the result
          pill. [→ `pagefind-index-scope`, `pagefind-ui`] */}
      <article
        {...(!german && {
          "data-pagefind-body": true,
          "data-pagefind-meta": strand
            ? "url[data-url], strand[data-strand], strandfill[data-strand-fill]"
            : "url[data-url]",
          "data-url": path,
          ...(strand && {
            "data-strand": strand.label,
            "data-strand-fill": strand.fill,
          }),
        })}
        className="mt-11"
      >
        {post.coverImage && (
          // A picture frame on the page: ink, never a shadow. [→ `post-page`]
          <div className="relative overflow-hidden rounded-3xl border-[3px] border-brand-dark">
            <CoverImage
              image={post.coverImage}
              wide
              bare
              priority
              sizes="(max-width: 768px) calc(100vw - 2rem), 1120px"
            />
            {promptId && (
              // Over the image so the page keeps its position. Cream on any
              // cover tone, 44px tall at every width.
              <a
                href="#cover-prompt"
                data-pagefind-ignore
                className="absolute top-3 right-3 inline-flex h-11 items-center rounded-full border-2 border-brand-dark bg-brand-bg px-3.5 font-mono text-[0.8125rem] font-medium text-brand-dark no-underline md:top-4 md:right-4"
              >
                prompt <span aria-hidden="true">↓</span>
                <span className="sr-only"> for this cover image</span>
              </a>
            )}
          </div>
        )}
        <div className="mt-12 flex flex-col gap-10 md:mt-16 xl:grid xl:grid-cols-[minmax(15rem,1fr)_minmax(0,49.25rem)] xl:gap-12">
          {/* Stretches the row so the sticky wrapper has room. Below xl it
              holds only the ToC disclosure. [→ `pagefind-index-scope`] */}
          <aside
            data-pagefind-ignore
            className={`mx-auto w-full max-w-[49.25rem] xl:mx-0 xl:max-w-none${hasToc ? "" : " hidden xl:block"}`}
          >
            <div className="xl:sticky xl:top-20 xl:space-y-7 xl:pb-4">
              <TableOfContents headings={headings} lang={lang} />
              <div className="hidden xl:block">
                <ExploreWithAI slug={slug} german={german} />
              </div>
            </div>
          </aside>

          <div className="mx-auto w-full max-w-[49.25rem] xl:mx-0">
            {/* 49.25rem is the 42rem measure plus this padding and edge.
                [→ `prose-measure`] */}
            <div className="rounded-3xl border-2 border-edge-quiet bg-card px-5 py-8 md:px-14 md:py-12">
              {/* Heading sizes are em, tracking the prose base; the plugin
                  keys heading margins to the heading's own size. */}
              <div
                lang={lang}
                className="prose text-pretty prose-h2:text-[1.6em] prose-h3:text-[1.375em] prose-h3:font-[600] prose-h4:text-[1.15em]"
              >
                <RichText
                  content={post.content}
                  headings={headings}
                  highlighted={highlighted}
                  coverPromptId={promptId}
                />
              </div>
            </div>
            {tags.length > 0 && (
              <nav
                aria-label="Tags"
                className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-2"
              >
                <span className="font-mono text-sm font-medium text-brand-muted">
                  <span aria-hidden="true">{"// "}</span>
                  tags
                </span>
                <ul className="flex flex-wrap items-center gap-2">
                  {tags.map((tag) => (
                    <li key={tag.slug}>
                      <TagPill tag={tag} />
                    </li>
                  ))}
                </ul>
              </nav>
            )}
            <div className="mt-10">
              <AuthorBioSection authors={authors} />
            </div>
          </div>
        </div>
      </article>
      {morePosts.length > 0 && (
        <section className="mt-20">
          <Label>more like this</Label>
          <ul className="grid gap-8 md:grid-cols-2 md:gap-9">
            {morePosts.map((card) => (
              <li key={card.slug} className="flex">
                <PostCard post={card} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </Container>
  );
}
