import "server-only";
import { cache } from "react";
import { visibleTagSlugs } from "./tags";
import { relatedPosts } from "./related";
import { MAX_AUTHORS } from "./constants";
import type {
  Post,
  PostCollectionResponse,
  ListPost,
  ListPostCollectionResponse,
  CardPost,
  CardPostCollectionResponse,
  Page,
  PageCollectionResponse,
  PageMeta,
  Category,
  CategoryCollectionResponse,
  Tag,
  TagCollectionResponse,
  BrowseIntro,
  BrowseIntroCollectionResponse,
  Author,
  AuthorCollectionResponse,
} from "./types";

// Every rich-text asset selection. `width` and `height` set the figure's aspect
// ratio; without them every image lays out 3:2.
const ASSET_BLOCK_FIELDS = `
  sys {
    id
  }
  url
  title
  fileName
  description
  width
  height
`;

const POST_GRAPHQL_FIELDS = `
  slug
  title
  coverImage {
    url
    title
    # fileName is not rendered. app/cover-image.tsx compares the title against
    # it to catch a filename stem standing in for alt text; see the note on
    # CoverImage in lib/types.ts.
    fileName
  }
  date
  updatedDate

  excerpt
  content {
    json
    links {
      assets {
        block {
          ${ASSET_BLOCK_FIELDS}
        }
      }
      entries {
        block {
          sys {
            id
          }
          __typename
          ... on CodeBlock {
            language
            code
            filename
          }
          ... on PromptBlock {
            prompt
            label
            image {
              url
              description
            }
          }
        }
        inline {
          sys {
            id
          }
          __typename
          ... on Sidenote {
            note {
              json
              links {
                assets {
                  block {
                    ${ASSET_BLOCK_FIELDS}
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  category {
    name
    slug
  }
  tagsCollection(limit: 3) {
    items {
      name
      slug
    }
  }
  authorsCollection(limit: ${MAX_AUTHORS}) {
    items {
      name
      slug
      picture {
        url
      }
      bio {
        json
        links {
          assets {
            block {
              ${ASSET_BLOCK_FIELDS}
            }
          }
        }
      }
    }
  }
`;

// Listing previews. Partial: `content`, `author`, `updatedDate` and `category`
// are absent.
const CARD_GRAPHQL_FIELDS = `
  slug
  title
  coverImage {
    url
    title
    # fileName is not rendered. app/cover-image.tsx compares the title against
    # it to catch a filename stem standing in for alt text; see the note on
    # CoverImage in lib/types.ts.
    fileName
  }
  date
  excerpt
  tagsCollection(limit: 3) {
    items {
      name
      slug
    }
  }
`;

// getAllPosts' fragment: POST_GRAPHQL_FIELDS without `content` and `bio`, so
// both are absent. Tags ride along because tag grouping is in memory.
// [→ `tag-pages`] These strings are GraphQL: a `//` comment inside one fails
// every post query, so use `#`.
const LIST_GRAPHQL_FIELDS = `
  slug
  title
  coverImage {
    url
    title
    # fileName is not rendered. app/cover-image.tsx compares the title against
    # it to catch a filename stem standing in for alt text; see the note on
    # CoverImage in lib/types.ts.
    fileName
  }
  date
  updatedDate

  excerpt
  category {
    name
    slug
  }
  tagsCollection(limit: 3) {
    items {
      name
      slug
    }
  }
  authorsCollection(limit: ${MAX_AUTHORS}) {
    items {
      name
      slug
      picture {
        url
      }
    }
  }
`;

const PAGE_GRAPHQL_FIELDS = `
  slug
  title
  sys {
    publishedAt
    firstPublishedAt
  }
  body {
    json
    links {
      assets {
        block {
          ${ASSET_BLOCK_FIELDS}
        }
      }
    }
  }
`;

const GRAPHQL_MAX_ATTEMPTS = 3;
const GRAPHQL_RETRY_BASE_MS = 500;

type RetryDelay = (ms: number) => Promise<void>;

const realRetryDelay: RetryDelay = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

let retryDelay: RetryDelay = realRetryDelay;

// Test seam for the retry delay. Replace the delay, never the base constant,
// which is what production waits. No argument restores the real one.
export function setRetryDelayForTests(next: RetryDelay = realRetryDelay): void {
  // Callable from app code too, where it would turn retries into hammering.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "setRetryDelayForTests must not be called in production. It exists only so the test suite can skip the real backoff.",
    );
  }
  retryDelay = next;
}

// Transient Contentful failures. Any other 4xx is a real error.
const GRAPHQL_RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);

type GraphQLVariables = Record<string, unknown>;

/** [→ `cache-tags`] */
export const CACHE_TAGS = {
  /** Posts and everything a post renders: authors, categories, tags. */
  POSTS: "posts",
  /** CMS `Page` entries — /about, /privacy — and the sitemap that lists them. */
  PAGES: "pages",
  /** `BrowseIntro` entries: the standfirst and meta description on a front. */
  BROWSE_INTROS: "browseIntros",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

// `data` and `errors` can both be present.
type GraphQLEnvelope = { data?: unknown; errors?: unknown[] };

// Trimmed: a pasted trailing newline would otherwise reach the request URL.
function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing ${name}. Set it in .env.local locally and in your host's environment variables.`,
    );
  }
  return value;
}

// preview keeps its default: this is private and never a cache() key.
// [→ `fetcher-cache`]
async function fetchGraphQL<T>(
  query: string,
  preview = false,
  variables: GraphQLVariables = {},
  tag: CacheTag = CACHE_TAGS.POSTS,
): Promise<T> {
  const spaceId = requireEnv("CONTENTFUL_SPACE_ID");
  const token = requireEnv(
    preview ? "CONTENTFUL_PREVIEW_ACCESS_TOKEN" : "CONTENTFUL_ACCESS_TOKEN",
  );
  const url = `https://graphql.contentful.com/content/v1/spaces/${spaceId}`;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= GRAPHQL_MAX_ATTEMPTS; attempt++) {
    if (attempt > 1) {
      await retryDelay(GRAPHQL_RETRY_BASE_MS * 2 ** (attempt - 2));
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query, variables }),
        // [→ `cache-tags`]
        next: { tags: [tag] },
      });
    } catch (cause) {
      // Socket-level failure. `cause` keeps the stack that tells DNS from TLS.
      lastError = new Error(
        `Contentful GraphQL request failed: ${String(cause)}`,
        {
          cause,
        },
      );
      continue;
    }

    if (!response.ok) {
      const detail = await response.text();
      lastError = new Error(
        `Contentful GraphQL request failed: ${response.status} ${response.statusText} ${detail}`,
      );
      if (GRAPHQL_RETRY_STATUSES.has(response.status)) continue;
      throw lastError;
    }

    // Parsed separately so a parse failure can quote the body and status.
    const raw = await response.text();
    let body: GraphQLEnvelope;
    try {
      body = JSON.parse(raw) as GraphQLEnvelope;
    } catch (cause) {
      // Non-JSON on a 200 is usually a proxy error page, so it is retried.
      lastError = new Error(
        `Contentful GraphQL returned an unparseable response: ${response.status} ${response.statusText} ${raw.slice(0, 200)}`,
        { cause },
      );
      continue;
    }

    if (Array.isArray(body.errors) && body.errors.length > 0) {
      const detail = JSON.stringify(body.errors);
      // No `data` means the query never ran; with `data` it is usually a link
      // to an unpublished entry, which warns rather than failing the build.
      if (!body.data) {
        throw new Error(`Contentful GraphQL returned errors: ${detail}`);
      }
      console.warn(`Contentful GraphQL partial response: ${detail}`);
    }

    return body as T;
  }

  throw lastError ?? new Error("Contentful GraphQL request failed");
}

// Contentful's collection ceiling. [→ `collection-paging`]
const COLLECTION_PAGE_SIZE = 100;

// The query must take `$limit: Int!` and `$skip: Int!` and select `total`.
// [→ `collection-paging`]
async function fetchAllCollectionItems<T>(
  collection: string,
  query: string,
  preview: boolean,
  variables: GraphQLVariables = {},
  tag: CacheTag = CACHE_TAGS.POSTS,
): Promise<T[]> {
  const items: T[] = [];

  for (let skip = 0; ; skip += COLLECTION_PAGE_SIZE) {
    const response = await fetchGraphQL<{
      data?: Record<string, { total?: number; items?: T[] } | undefined>;
    }>(
      query,
      preview,
      {
        ...variables,
        limit: COLLECTION_PAGE_SIZE,
        skip,
      },
      tag,
    );

    const page = response?.data?.[collection];
    const batch = page?.items ?? [];
    items.push(...batch);

    // An empty page always ends the loop, so a missing `total` cannot spin.
    if (batch.length === 0 || items.length >= (page?.total ?? items.length)) {
      return items;
    }
  }
}

function extractPost(fetchResponse: PostCollectionResponse): Post | undefined {
  return fetchResponse?.data?.postCollection?.items?.[0];
}

// For the category routes, whose held posts are already filtered by category
// and cannot count tags sitewide. Not redundant with visibleTagSlugs.
// [→ `tag-pages`]
export const getVisibleTagSlugs = cache(
  async (isDraftMode: boolean): Promise<Set<string>> => {
    return visibleTagSlugs(await getAllPosts(isDraftMode));
  },
);

// Reached twice per post render from two directions, and nothing below
// dedupes: fetchGraphQL sets no cache option, so the response is never
// persisted. [→ `post-scheduling`, `fetcher-cache`]
export const getAllPosts = cache(
  async (isDraftMode: boolean): Promise<ListPost[]> => {
    return fetchAllCollectionItems<ListPost>(
      "postCollection",
      `query GetAllPosts($preview: Boolean, $limit: Int!, $skip: Int!) {
      postCollection(where: { slug_exists: true }, order: date_DESC, preview: $preview, limit: $limit, skip: $skip) {
        total
        items {
          ${LIST_GRAPHQL_FIELDS}
        }
      }
    }`,
      isDraftMode,
      { preview: isDraftMode },
    );
  },
);

// One post, listing fragment only, with no related-posts queries. Only where
// nothing else fetches the post in the same pass. [→ `single-entry-cache`]
export const getPost = cache(
  async (slug: string, preview: boolean): Promise<ListPost | undefined> => {
    const entry = await fetchGraphQL<ListPostCollectionResponse>(
      `query GetPostMeta($slug: String!, $preview: Boolean) {
      postCollection(where: { slug: $slug }, preview: $preview, limit: 1) {
        items {
          ${LIST_GRAPHQL_FIELDS}
        }
      }
    }`,
      preview,
      { slug, preview },
    );

    return entry?.data?.postCollection?.items?.[0];
  },
);

export const getPostAndMorePosts = cache(
  async (
    slug: string,
    preview: boolean,
  ): Promise<{ post: Post | undefined; morePosts: CardPost[] }> => {
    const [entry, allPosts] = await Promise.all([
      fetchGraphQL<PostCollectionResponse>(
        `query GetPost($slug: String!, $preview: Boolean) {
        postCollection(where: { slug: $slug }, preview: $preview, limit: 1) {
          items {
            ${POST_GRAPHQL_FIELDS}
          }
        }
      }`,
        preview,
        { slug, preview },
      ),
      getAllPosts(preview),
    ]);

    const post = extractPost(entry);
    const morePosts = post ? relatedPosts(post, allPosts) : [];

    return { post, morePosts };
  },
);

// [→ `single-entry-cache`]
export const getPage = cache(
  async (slug: string, preview: boolean): Promise<Page | undefined> => {
    const entry = await fetchGraphQL<PageCollectionResponse>(
      `query GetPage($slug: String!, $preview: Boolean) {
      pageCollection(where: { slug: $slug }, preview: $preview, limit: 1) {
        items {
          ${PAGE_GRAPHQL_FIELDS}
        }
      }
    }`,
      preview,
      { slug, preview },
      CACHE_TAGS.PAGES,
    );

    return entry?.data?.pageCollection?.items?.[0];
  },
);

export const getAllPages = cache(
  async (isDraftMode: boolean): Promise<PageMeta[]> => {
    return fetchAllCollectionItems<PageMeta>(
      "pageCollection",
      `query GetAllPages($preview: Boolean, $limit: Int!, $skip: Int!) {
      pageCollection(where: { slug_exists: true }, preview: $preview, limit: $limit, skip: $skip) {
        total
        items {
          slug
          sys {
            publishedAt
            firstPublishedAt
          }
        }
      }
    }`,
      isDraftMode,
      { preview: isDraftMode },
      // The sitemap reads this too.
      CACHE_TAGS.PAGES,
    );
  },
);

// Undefined when no entry exists; callers fall back to a bare heading.
// [→ `single-entry-cache`, `browse-copy`]
export const getBrowseIntro = cache(
  async (
    slug: string,
    isDraftMode: boolean,
  ): Promise<BrowseIntro | undefined> => {
    const entries = await fetchGraphQL<BrowseIntroCollectionResponse>(
      `query GetBrowseIntro($slug: String!, $preview: Boolean) {
      browseIntroCollection(where: { slug: $slug }, preview: $preview, limit: 1) {
        items {
          title
          slug
          standfirst
          metaDescription
        }
      }
    }`,
      isDraftMode,
      { slug, preview: isDraftMode },
      CACHE_TAGS.BROWSE_INTROS,
    );

    return entries?.data?.browseIntroCollection?.items?.[0];
  },
);

// A separate query so descriptions stay out of every listing's fragment.
// [→ `single-entry-cache`]
export const getTagBySlug = cache(
  async (slug: string, isDraftMode: boolean): Promise<Tag | undefined> => {
    const entries = await fetchGraphQL<TagCollectionResponse>(
      `query GetTagBySlug($slug: String!, $preview: Boolean) {
      tagCollection(where: { slug: $slug }, preview: $preview, limit: 1) {
        items {
          name
          slug
          description
        }
      }
    }`,
      isDraftMode,
      { slug, preview: isDraftMode },
    );

    return entries?.data?.tagCollection?.items?.[0];
  },
);

// No per-tag query: postsWithTag filters in memory. [→ `tag-pages`]

export const getAllTags = cache(
  async (isDraftMode: boolean): Promise<Tag[]> => {
    return fetchAllCollectionItems<Tag>(
      "tagCollection",
      `query GetAllTags($preview: Boolean, $limit: Int!, $skip: Int!) {
      tagCollection(where: { slug_exists: true }, order: name_ASC, preview: $preview, limit: $limit, skip: $skip) {
        total
        items {
          name
          slug
          description
        }
      }
    }`,
      isDraftMode,
      { preview: isDraftMode },
    );
  },
);

export const getAllCategories = cache(
  async (isDraftMode: boolean): Promise<Category[]> => {
    return fetchAllCollectionItems<Category>(
      "categoryCollection",
      `query GetAllCategories($preview: Boolean, $limit: Int!, $skip: Int!) {
      categoryCollection(where: { slug_exists: true }, order: name_ASC, preview: $preview, limit: $limit, skip: $skip) {
        total
        items {
          name
          slug
          description
          thumbnail {
            url
            title
            fileName
          }
        }
      }
    }`,
      isDraftMode,
      { preview: isDraftMode },
    );
  },
);

export const getCategoryBySlug = cache(
  async (slug: string, isDraftMode: boolean): Promise<Category | undefined> => {
    const entries = await fetchGraphQL<CategoryCollectionResponse>(
      `query GetCategory($slug: String!, $preview: Boolean) {
      categoryCollection(where: { slug: $slug }, preview: $preview, limit: 1) {
        items {
          name
          slug
          description
        }
      }
    }`,
      isDraftMode,
      { slug, preview: isDraftMode },
    );

    return entries?.data?.categoryCollection?.items?.[0];
  },
);

// Uncapped, because the category index paginates in memory. Card fragment,
// since both consumers render MoreStories.
export const getPostsByCategory = cache(
  async (slug: string, isDraftMode: boolean): Promise<CardPost[]> => {
    return fetchAllCollectionItems<CardPost>(
      "postCollection",
      `query GetPostsByCategory($slug: String!, $preview: Boolean, $limit: Int!, $skip: Int!) {
      postCollection(where: { category: { slug: $slug } }, order: date_DESC, preview: $preview, limit: $limit, skip: $skip) {
        total
        items {
          ${CARD_GRAPHQL_FIELDS}
        }
      }
    }`,
      isDraftMode,
      { slug, preview: isDraftMode },
    );
  },
);

// Capped, for the teaser on /categories.
export const getRecentPostsByCategory = cache(
  async (
    slug: string,
    limit: number,
    isDraftMode: boolean,
  ): Promise<CardPost[]> => {
    const entries = await fetchGraphQL<CardPostCollectionResponse>(
      `query GetRecentPostsByCategory($slug: String!, $limit: Int!, $preview: Boolean) {
      postCollection(where: { category: { slug: $slug } }, order: date_DESC, preview: $preview, limit: $limit) {
        items {
          ${CARD_GRAPHQL_FIELDS}
        }
      }
    }`,
      isDraftMode,
      { slug, limit, preview: isDraftMode },
    );

    return entries?.data?.postCollection?.items ?? [];
  },
);

export const getAuthorBySlug = cache(
  async (slug: string, isDraftMode: boolean): Promise<Author | undefined> => {
    const entries = await fetchGraphQL<AuthorCollectionResponse>(
      `query GetAuthor($slug: String!, $preview: Boolean) {
      authorCollection(where: { slug: $slug }, preview: $preview, limit: 1) {
        items {
          name
          slug
          bio {
            json
            links {
              assets {
                block {
                  ${ASSET_BLOCK_FIELDS}
                }
              }
            }
          }
          picture { url }
        }
      }
    }`,
      isDraftMode,
      { slug, preview: isDraftMode },
    );

    return entries?.data?.authorCollection?.items?.[0];
  },
);

// No getPostsByAuthor: author pages filter getAllPosts. [→ `authors-array`]

export const getAllAuthors = cache(
  async (isDraftMode: boolean): Promise<Author[]> => {
    return fetchAllCollectionItems<Author>(
      "authorCollection",
      `query GetAllAuthors($preview: Boolean, $limit: Int!, $skip: Int!) {
      authorCollection(where: { slug_exists: true }, order: name_ASC, preview: $preview, limit: $limit, skip: $skip) {
        total
        items {
          name
          slug
          picture { url }
        }
      }
    }`,
      isDraftMode,
      { preview: isDraftMode },
    );
  },
);
