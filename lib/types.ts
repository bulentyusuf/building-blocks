import type { Document } from "@contentful/rich-text-types";

// Link fields are nullable because Contentful returns an unpublished target as null.

export interface Asset {
  sys: {
    id: string;
  };
  url: string;
  // The caption, never the alt text; many covers are also figures, so one
  // field cannot serve both. [→ `announced-links`]
  description: string;
  // Null when unset in Contentful.
  title?: string | null;
  // Only for the placeholder check; never rendered. [→ `announced-links`]
  fileName?: string | null;
  // Null on a non-image asset, so every consumer falls back.
  width?: number | null;
  height?: number | null;
  // Set only when a body embed's alt and caption are German. [→ `locale`]
  lang?: string;
}

export interface AssetLink {
  block: (Asset | null)[];
}

export interface CodeBlock {
  __typename: "CodeBlock";
  sys: { id: string };
  language?: string;
  code: string;
  filename?: string;
}

export interface PromptBlock {
  __typename: "PromptBlock";
  sys: { id: string };
  prompt: string;
  label?: string; // optional header text; falls back to "Prompt" when absent
  image?: { url: string; description?: string } | null; // linked asset; absent on text-only prompts
}

export interface Sidenote {
  __typename: "Sidenote";
  sys: { id: string };
  note: Content; // rich text — reuses the Content shape (json + links)
  // Set only when an English note stands in on a German page. [→ `locale`]
  lang?: string;
}

export interface EntryLink {
  // Block embeds sit between paragraphs.
  block: (CodeBlock | PromptBlock | null)[];
  // Inline embeds (Sidenote). Only POST_GRAPHQL_FIELDS fetches them.
  inline?: (Sidenote | null)[];
}

export interface Content {
  json: Document;
  links: {
    assets: AssetLink;
    entries?: EntryLink;
  };
}

export interface Author {
  name: string;
  slug?: string; // optional: legacy/draft authors may predate the field
  bio?: Content; // optional: not every author has a bio, and draft-safe
  picture: {
    url: string;
  } | null;
}

export interface AuthorCollectionResponse {
  data?: {
    authorCollection?: {
      items: Author[];
    };
  };
}

export interface CoverImage {
  url: string;
  // The alt text. Null when unset; consumers fall back to "".
  title?: string | null;
  // Only for the placeholder check; never rendered. [→ `announced-links`]
  fileName?: string | null;
}

export interface Category {
  name: string;
  slug: string;
  description?: string;
  thumbnail?: CoverImage | null; // optional 4:3 category tile; absent on categories without one
}

// Up to three per post. The glossary is a text index, so no thumbnail.
export interface Tag {
  name: string;
  slug: string;
  description?: string;
}

export interface TagCollectionResponse {
  data?: {
    tagCollection?: {
      items: Tag[];
    };
  };
}

// Both fields optional to read, so an empty space degrades. [→ `browse-copy`]
export interface BrowseIntro {
  title: string;
  slug: string;
  standfirst?: string;
  metaDescription?: string;
}

export interface BrowseIntroCollectionResponse {
  data?: {
    browseIntroCollection?: {
      items: BrowseIntro[];
    };
  };
}

export interface Post {
  slug: string;
  title: string;
  coverImage?: CoverImage | null;
  date: string;
  updatedDate?: string; // optional, only set when post has been updated

  excerpt: string;
  content: Content;
  category?: Category | null; // single reference; optional so untagged posts don't break
  // Read through postTags() in lib/tags.ts.
  tagsCollection?: { items: (Tag | null)[] };
  // Ordered, lead first. Read through postAuthors() in lib/authors.ts.
  // [→ `authors-array`]
  authorsCollection?: { items: (Author | null)[] };
}

export interface CategoryCollectionResponse {
  data?: {
    categoryCollection?: {
      items: Category[];
    };
  };
}

export interface PostCollectionResponse {
  data?: {
    postCollection?: {
      items: Post[];
    };
  };
}

export type CardPost = Pick<
  Post,
  "slug" | "title" | "date" | "excerpt" | "coverImage" | "tagsCollection"
>;

export interface CardPostCollectionResponse {
  data?: {
    postCollection?: {
      items: CardPost[];
    };
  };
}

// getAllPosts' shape: no `content`, and authors typed without `bio` so a
// list-sourced post cannot silently render an empty bio.
export type ListPost = Omit<Post, "content" | "authorsCollection"> & {
  authorsCollection?: { items: (Omit<Author, "bio"> | null)[] };
};

export interface ListPostCollectionResponse {
  data?: {
    postCollection?: {
      items: ListPost[];
    };
  };
}

export interface Page {
  slug: string;
  title: string;
  body: Content;
  sys: {
    publishedAt: string | null;
    firstPublishedAt: string | null;
  };
}

export interface PageMeta {
  slug: string;
  sys: {
    publishedAt: string | null;
    firstPublishedAt: string | null;
  };
}

export interface PageCollectionResponse {
  data?: {
    pageCollection?: {
      items: Page[];
    };
  };
}
