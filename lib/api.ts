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

// Every rich-text asset selection, in one place — five queries embed this, and
// a field added to one and not the others is a silent inconsistency. `width`
// and `height` feed the figure's aspect ratio; drop either and every image
// lays out 3:2.
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

// Slim fragment for listing previews. Posts returned with this fragment are
// partial: `content`, `author`, `updatedDate`, `category` are absent. Don't
// read them.
//
// `tagsCollection` is here despite that: two short strings per tag, capped at
// 3, is not the weight this fragment exists to avoid — the rich-text body, its
// embedded code blocks and assets, and the author bio are.
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

// Listing fragment for getAllPosts — everything in POST_GRAPHQL_FIELDS minus
// the two heavy branches none of its consumers read: the full rich-text
// `content` and the author `bio`. Posts returned with this fragment are
// partial: `content` and `author.bio` are absent. The per-post detail page
// uses POST_GRAPHQL_FIELDS.
//
// tagsCollection rides along because grouping by tag happens in memory rather
// than per-tag query — Contentful's GraphQL cannot filter on an Array<Link>
// field. [→ `tag-pages`]
//
// These template literals are GraphQL, not JavaScript. A `//` comment inside
// one is a syntax error the API rejects with 400, which fails every post query
// rather than the field it sits next to. Use `#` for a note that must sit
// inline.
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

// A test seam, the only supported way to make the retry loop fast in a test.
// Replace the delay, never GRAPHQL_RETRY_BASE_MS itself — shrinking the
// constant changes how long production actually waits on Contentful to suit a
// test. Called with no argument, restores the real one.
export function setRetryDelayForTests(next: RetryDelay = realRetryDelay): void {
  // Exported so the tests can reach it, which also makes it callable from
  // application code — where disabling the backoff would quietly turn three
  // retries into three immediate hammers on Contentful. Refused in production.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "setRetryDelayForTests must not be called in production. It exists only so the test suite can skip the real backoff.",
    );
  }
  retryDelay = next;
}

// Contentful 5xx and rate-limit responses are usually transient. A 4xx other
// than 429 is a real client error and retrying it only slows the build down.
const GRAPHQL_RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);

type GraphQLVariables = Record<string, unknown>;

/**
 * The cache tags this module attaches, and the whole set of them.
 * [→ `cache-tags`]
 */
export const CACHE_TAGS = {
  /** Posts and everything a post renders: authors, categories, tags. */
  POSTS: "posts",
  /** CMS `Page` entries — /about, /privacy — and the sitemap that lists them. */
  PAGES: "pages",
  /** `BrowseIntro` entries: the standfirst and meta description on a front. */
  BROWSE_INTROS: "browseIntros",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

// The shape every Contentful GraphQL response shares, regardless of query.
// `data` and `errors` can both be present at once.
type GraphQLEnvelope = { data?: unknown; errors?: unknown[] };

// Trimmed because a trailing newline pasted into a host's environment variable
// UI is a common failure otherwise silently passed through to the request URL.
function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing ${name}. Set it in .env.local locally and in your host's environment variables.`,
    );
  }
  return value;
}

// preview keeps its default here on purpose: fetchGraphQL is module-private
// and never a cache() memo key, so the no-defaults rule covering the exported
// fetchers below [→ `fetcher-cache`] does not reach it.
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
        // Defaults to POSTS, deliberately the safe direction to be wrong in.
        // [→ `cache-tags`]
        next: { tags: [tag] },
      });
    } catch (cause) {
      // Socket-level failure rather than an HTTP response. Worth another go.
      // `cause` is attached rather than stringified — the underlying stack is
      // what distinguishes a DNS failure from a reset connection from a TLS
      // error once this surfaces in a build log.
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

    // Read as text and parse separately. `response.json()` consumes the body,
    // so a parse failure would otherwise leave nothing to quote back, and the
    // raw SyntaxError names neither Contentful nor the status it arrived with.
    const raw = await response.text();
    let body: GraphQLEnvelope;
    try {
      body = JSON.parse(raw) as GraphQLEnvelope;
    } catch (cause) {
      // A 200 carrying something that is not JSON is a transport fault, not a
      // GraphQL error. It is usually an HTML error page from a proxy or edge
      // node, so it belongs in the retry path rather than thrown outright.
      lastError = new Error(
        `Contentful GraphQL returned an unparseable response: ${response.status} ${response.statusText} ${raw.slice(0, 200)}`,
        { cause },
      );
      continue;
    }

    if (Array.isArray(body.errors) && body.errors.length > 0) {
      const detail = JSON.stringify(body.errors);
      // No `data` at all means the query never ran, so the caller would get
      // undefined and render an empty page with no signal. With `data` present
      // this is almost always an unresolvable link to an unpublished entry,
      // which should warn rather than take a build down.
      if (!body.data) {
        throw new Error(`Contentful GraphQL returned errors: ${detail}`);
      }
      console.warn(`Contentful GraphQL partial response: ${detail}`);
    }

    return body as T;
  }

  throw lastError ?? new Error("Contentful GraphQL request failed");
}

// Contentful returns at most 100 items from a collection and reports the real
// count only in `total`. Under 100 items this is exactly one request; the loop
// exits on the first pass because `total` is already satisfied.
// [→ `collection-paging`]
const COLLECTION_PAGE_SIZE = 100;

// The query must accept `$limit: Int!` and `$skip: Int!`, pass both to the
// collection, and select `total` alongside `items` — without `total` there is
// nothing to page against and the first response is all you get.
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

    // An empty page always terminates, so a missing or understated `total`
    // costs one wasted request rather than spinning forever.
    if (batch.length === 0 || items.length >= (page?.total ?? items.length)) {
      return items;
    }
  }
}

function extractPost(fetchResponse: PostCollectionResponse): Post | undefined {
  return fetchResponse?.data?.postCollection?.items?.[0];
}

// Tag slugs that clear MIN_POSTS_PER_TAG across the whole site, for pages that
// render tag pills but only fetch a slice of posts.
//
// Exists for the two category routes specifically, whose held post list is
// already filtered by category — a tag only shows if it clears
// MIN_POSTS_PER_TAG across the whole site, which they cannot derive from a
// filtered subset. [→ `tag-pages`] Every other listing holds `allPosts` and
// calls the pure `visibleTagSlugs(allPosts)` directly instead. Do not delete
// this as redundant with that.
export const getVisibleTagSlugs = cache(
  async (isDraftMode: boolean): Promise<Set<string>> => {
    return visibleTagSlugs(await getAllPosts(isDraftMode));
  },
);

// cache()-wrapped because the post page reaches this twice per render from two
// directions that cannot see each other. [→ `post-scheduling`, `fetcher-cache`]
//
// It has to be cache(), because nothing below it dedupes on its own. Checked
// against the installed Next 16.3.3 source,
// node_modules/next/dist/server/lib/patch-fetch.js: the Data Cache is gated on
// a fetch setting an explicit `cache` or `next.revalidate` option, not on the
// HTTP method. fetchGraphQL sets neither, only `next: { tags }`, so
// autoNoCache applies and the response is never persisted. The tag still
// attaches to the enclosing page's Full Route Cache entry, which is what makes
// revalidateTag work, but that is a different mechanism from the response
// being reused — the response is not "ISR-cached".
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

// A single post, listing fragment only — no related/backfill queries and no
// heavy `content`/`bio`. For a consumer that needs just the post's own fields,
// where fetching morePosts via getPostAndMorePosts would fire 1–2 extra
// GraphQL round-trips whose result is then discarded. `getPost` stays correct
// only where nothing else fetches the post in the same pass. [→ `single-entry-cache`]
// Returns a partial post: `content` and `author.bio` are absent (see ListPost).
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

// A CMS Page (about, privacy), body included. cache()-wrapped for the same
// reason getBrowseIntro is, below. [→ `single-entry-cache`]
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
      // The sitemap is this query's other consumer, so PAGES busts it too.
      CACHE_TAGS.PAGES,
    );
  },
);

// The editable standfirst and meta description for a browse page.
// cache()-wrapped for the same reason as the others above. [→ `single-entry-cache`, `browse-copy`]
//
// Returns undefined when no entry exists. Callers fall back rather than throw,
// so a fork with an empty space renders a page with just its heading instead of
// a 500.
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

// Tags with their descriptions, for the /tags glossary. Deliberately a
// separate query rather than adding `description` to LIST_GRAPHQL_FIELDS'
// tagsCollection — that fragment exists to keep weight out of the ISR entries
// it feeds, and a gloss on every listing would undo that. cache()-wrapped
// because generateMetadata and the page component both need it.
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

// Posts carrying a tag are filtered in memory by postsWithTag in lib/tags.ts,
// not fetched here — there is no per-tag query to write. [→ `tag-pages`]

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

// Every post in a category, newest first and uncapped — the category index
// paginates this in memory with .slice(), so it needs the whole set to know
// how many pages there are.
//
// Uses the card fragment, not POST_GRAPHQL_FIELDS: both consumers pass the
// result straight to <MoreStories morePosts={...}>, which takes CardPost[].
// The full fragment's rich-text body, embedded assets and author bio would
// otherwise sit unused in this route's ISR cache entry too. If a caller ever
// needs `category`, `author` or `updatedDate` here, add LIST_GRAPHQL_FIELDS
// rather than reaching back for the full one.
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

// Recent posts in a category, capped server-side. Same card fragment as
// getPostsByCategory above; the difference is the limit — this one teases a
// few posts on the categories landing page, that one returns the whole
// category so the index can paginate it.
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

// There is no getPostsByAuthor. `authors` is an Array<Link>, the same wall
// postsWithTag hit. [→ `tag-pages`] Author pages fetch getAllPosts once and
// filter in memory with postsByAuthor, in lib/authors.ts.

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
