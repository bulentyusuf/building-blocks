import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import Container from "../../container";
import Breadcrumb, { type Crumb } from "../../breadcrumb";
import MoreStories from "../../more-stories";
import Avatar from "../../avatar";
import Date from "../../date";
import CoverImage from "../../cover-image";
import { RichText } from "@/lib/rich-text";
import { getAllPosts, getPostAndMorePosts, getPostsByAuthor } from "@/lib/api";
import { postTags, visibleTagSlugs } from "@/lib/tags";
import { extractHeadings } from "@/lib/headings";
import { highlightCodeBlocks } from "@/lib/highlight";
import TableOfContents from "../../table-of-contents";
import ExploreWithAI from "../../explore-with-ai";
import AuthorBioCard from "../../author-bio-card";
import {
  SITE_URL,
  SITE_AUTHOR,
  SITE_TITLE,
  DEFAULT_OG_LOCALE,
} from "@/lib/constants";
import { jsonLdHtml } from "@/lib/json-ld";
import { createCoverNamer } from "@/lib/view-transition-name";
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
      authors: post.author?.slug
        ? [`${SITE_URL}/authors/${post.author.slug}`]
        : undefined,
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

  // For the author card's "All N posts" link. A second request, but a slim
  // one (the card fragment, not full bodies), and the author bio card is the
  // one place on the site that needs a total rather than a capped teaser.
  const authorPostCount = post.author?.slug
    ? (await getPostsByAuthor(post.author.slug, isEnabled)).length
    : 0;

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
    author: {
      "@type": "Person",
      name: post.author?.name || SITE_AUTHOR,
      ...(post.author?.slug
        ? { url: `${SITE_URL}/authors/${post.author.slug}` }
        : {}),
    },
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

  // Byline sub-line: lead with the published date, flag the revision on
  // mobile, show the full updated date on desktop. This is the sidebar's
  // static byline, read once and never sticky — see the note below.
  const showUpdated = post.updatedDate && post.updatedDate !== post.date;
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
    </span>
  );

  const headings = extractHeadings(post.content.json);
  const highlighted = await highlightCodeBlocks(post.content);

  // One name allocator for the whole page. The cover below and the "Read
  // Next" cards draw from it, so a duplicate cover-{slug} — which invalidates
  // the entire view transition — is impossible by construction.
  const coverName = createCoverNamer();

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
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }}
      />
      {/* Full bleed, directly under the sticky bar — no band, no inset. The
          cover sets the header's height now rather than the header making
          room for it, so the article begins immediately below. */}
      {post.coverImage && (
        <CoverImage
          url={post.coverImage.url}
          alt={post.coverImage.title ?? ""}
          priority
          transitionName={coverName(post.slug)}
          sizes="100vw"
        />
      )}
      <Container>
        <Breadcrumb items={crumbs} />
        {/* data-pagefind-body a second time, because the h1 sits outside the
            <article> below and Pagefind indexes only what sits inside a body
            region. meta.title survives without this, since Pagefind reads
            the page's first h1 wherever it is, so the regression is invisible
            in the results list. What is lost is the title's WORDS, which drop
            out of the searchable text and take every title-only term with
            them. Pagefind concatenates multiple body regions into one
            fragment, so this restores the index to exactly what it held
            before. */}
        <h1
          data-pagefind-body
          className="mt-6 text-[72px] leading-none tracking-[-0.032em] font-bold text-pretty"
        >
          {widont(post.title)}
        </h1>
        {/* A listing standfirst describes a collection to someone deciding
            whether to enter it; a post excerpt introduces an article to a
            reader who has already arrived. Narrower than the h1's column on
            purpose — a measure this wide reads badly at three lines. */}
        <p className="mt-4 max-w-[780px] text-[23px] leading-[1.45] text-brand-muted text-pretty">
          {post.excerpt}
        </p>
        <div className="mt-10 border-t border-hairline" />

        {/* data-pagefind-body scopes the Pagefind index to post content only.
            Pages without this attribute are excluded from search entirely.
            data-pagefind-meta="url" records the clean, extensionless route as
            the result URL: Pagefind indexes the prerendered <slug>.html
            files, so its derived url carries a .html that 404s on Next's
            routes. The Component UI has no JS layer to rewrite it, so the fix
            lives in the index — the result template reads meta.url in
            preference to that derived url.

            items-stretch (grid's own default, asserted rather than assumed)
            is load-bearing: without it the sidebar column shrinks to its
            content height (~370px) and the sticky Contents/AI block below has
            no range to travel in as the reader scrolls the much taller
            article column beside it. */}
        <article
          data-pagefind-body
          data-pagefind-meta="url[data-url]"
          data-url={`/posts/${slug}`}
          className="mt-10 xl:grid xl:grid-cols-[210px_1fr] xl:items-stretch xl:gap-14"
        >
          <aside data-pagefind-ignore className="mb-8 xl:mb-0">
            {/* Static — an attribution stamp, read once, that scrolls away
                with the rest of the article. Deliberately not part of the
                sticky block below: the avatar here is a reading companion,
                the one on the author card at the foot of the article belongs
                to the bio, and the two are allowed to differ (see
                app/author-bio-card.tsx). */}
            {post.author && (
              <div className="mb-8 xl:mb-0">
                <Avatar
                  name={post.author.name}
                  slug={post.author.slug}
                  picture={post.author.picture}
                  meta={dateline}
                />
              </div>
            )}
            {/* Sticky — this is the part that travels. top-20 (80px) must
                equal globals.css's scroll-padding-top: 5rem, or a heading
                reached from a Contents link lands underneath this pinned
                panel. Read that one value; do not hard-code a second. TOC
                repeats every heading; excluded so headings are not
                double-weighted in search. */}
            <div className="mt-8 xl:sticky xl:top-20 xl:pb-4">
              <TableOfContents headings={headings} />
              <div className="mt-[30px] hidden xl:block">
                <ExploreWithAI slug={slug} />
              </div>
            </div>
          </aside>

          <div className="max-w-[43.75rem]">
            {/* text-pretty on the prose container inherits into every child —
                paragraphs and in-body headings alike — so line breaking just
                avoids a lone last word, without the aggressive re-balancing of
                text-wrap: balance. One class covers the whole article body.
                prose-h2 overrides the plugin's own em-scaled default with the
                absolute 34px this design calls for. */}
            <div className="prose text-pretty prose-h2:text-[34px] prose-h2:tracking-[-0.02em] prose-h3:text-[1.375em] prose-h4:text-[1.15em]">
              <RichText
                content={post.content}
                headings={headings}
                highlighted={highlighted}
              />
            </div>
            {/* Below the body, in the same 700px column. Every tag links into
                the /tags glossary, and only tags that clear the threshold are
                rendered — a hidden tag would otherwise link to an anchor that
                is not on that page. Plain text rather than the small-caps run
                every other converted tag caller uses (see more-stories.tsx):
                pills are already gone sitewide, and this is that same
                treatment, crimson names separated by a middot rather than a
                UI-face label run. */}
            {tags.length > 0 && (
              <nav
                aria-label="Tags"
                className="mt-12 border-t border-hairline pt-6"
              >
                <p className="mb-2 font-ui text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-muted">
                  Tagged
                </p>
                <p className="text-[15px]">
                  {tags.map((tag, i) => (
                    <span key={tag.slug}>
                      {i > 0 && (
                        <span className="text-separator" aria-hidden="true">
                          {" "}
                          &middot;{" "}
                        </span>
                      )}
                      <Link
                        href={`/tags/${tag.slug}`}
                        className="text-brand-crimson hover:underline"
                      >
                        {tag.name}
                      </Link>
                    </span>
                  ))}
                </p>
              </nav>
            )}
            {post.author?.bio && (
              <div
                className={`${tags.length > 0 ? "mt-6" : "mt-12"} border-t border-hairline pt-8`}
              >
                <AuthorBioCard
                  author={post.author}
                  postCount={authorPostCount}
                />
              </div>
            )}
          </div>
        </article>
      </Container>
      <div className="mt-section">
        <MoreStories
          morePosts={morePosts}
          variant="grid"
          heading="Read Next"
          coverName={coverName}
        />
      </div>
    </>
  );
}
