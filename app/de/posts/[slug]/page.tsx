import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import {
  getAllPosts,
  getGermanPostAndMorePosts,
  getGermanPostSlugs,
} from "@/lib/api";
import { postAuthors } from "@/lib/authors";
import PostView from "../../../posts/[slug]/post-view";
import { SITE_URL, SITE_TITLE, GERMAN_OG_LOCALE } from "@/lib/constants";

// Only translated posts. Any other slug renders on demand and 404s.
// [→ `locale`]
export async function generateStaticParams() {
  const slugs = await getGermanPostSlugs(false);
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { isEnabled } = await draftMode();
  const { slug } = await params;
  // The same call as the page. [→ `single-entry-cache`]
  const { post } = await getGermanPostAndMorePosts(slug, isEnabled);

  if (!post) {
    return { title: "Post not found" };
  }

  const canonical = `${SITE_URL}/de/posts/${slug}`;
  const authorUrls = postAuthors(post)
    .filter((a) => a.slug)
    .map((a) => `${SITE_URL}/authors/${a.slug}`);

  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical },
    // No card route here, so borrow the English one. [→ `og-card-on-demand`]
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.date,
      modifiedTime: post.updatedDate ?? post.date,
      url: canonical,
      siteName: SITE_TITLE,
      locale: GERMAN_OG_LOCALE,
      authors: authorUrls.length > 0 ? authorUrls : undefined,
      images: [`${SITE_URL}/posts/${slug}/opengraph-image`],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: [`${SITE_URL}/posts/${slug}/opengraph-image`],
    },
  };
}

export default async function GermanPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { isEnabled } = await draftMode();
  const { slug } = await params;
  const [{ post, morePosts }, allPosts] = await Promise.all([
    getGermanPostAndMorePosts(slug, isEnabled),
    getAllPosts(isEnabled),
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
      german
    />
  );
}
