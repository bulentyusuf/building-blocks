import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import {
  getAllPosts,
  getGermanPostSlugs,
  getPostAndMorePosts,
} from "@/lib/api";
import { postAuthors } from "@/lib/authors";
import PostView from "./post-view";
import {
  SITE_URL,
  SITE_TITLE,
  DEFAULT_OG_LOCALE,
  GERMAN_LOCALE,
} from "@/lib/constants";
import { postLanguageAlternates } from "@/lib/translations";

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
  // The same calls as the page, never getPost. [→ `single-entry-cache`]
  const [{ post }, germanSlugs] = await Promise.all([
    getPostAndMorePosts(slug, isEnabled),
    getGermanPostSlugs(isEnabled),
  ]);

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
    alternates: {
      canonical,
      ...(germanSlugs.includes(slug) && {
        languages: postLanguageAlternates(slug),
      }),
    },
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
  const [{ post, morePosts }, allPosts, germanSlugs] = await Promise.all([
    getPostAndMorePosts(slug, isEnabled),
    getAllPosts(isEnabled),
    getGermanPostSlugs(isEnabled),
  ]);

  if (!post) {
    notFound();
  }

  return (
    <PostView
      post={post}
      morePosts={morePosts}
      allPosts={allPosts}
      slug={slug}
      german={false}
      languageLink={
        germanSlugs.includes(slug)
          ? {
              href: `/de/posts/${slug}`,
              lang: GERMAN_LOCALE,
              label: "Auch auf Deutsch lesen",
            }
          : undefined
      }
    />
  );
}
