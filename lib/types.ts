import type { Document } from "@contentful/rich-text-types";

export interface Asset {
  sys: {
    id: string;
  };
  url: string;
  // The caption, rendered as the figure's figcaption. NOT the alt text — see
  // `title` below. One field cannot serve both: 21 of the 24 cover assets are
  // also embedded as figures, so a shared field would have to be empty and
  // populated at once.
  description: string;
  // The asset's Contentful `title`, rendered as the image's alt text. Optional
  // and nullable: Contentful returns null when no title is set, and a payload
  // cached before this field was queried carries neither.
  title?: string | null;
  // Read only by the build-time placeholder check in lib/placeholder-title.ts,
  // which compares the title against it — a title that is just the filename is
  // the defect that shipped. Nothing renders this.
  fileName?: string | null;
  // Optional and nullable on purpose. Contentful returns null for both on a
  // non-image asset, and a payload cached before these were queried carries
  // neither, so every consumer falls back rather than assuming a shape.
  width?: number | null;
  height?: number | null;
}

export interface AssetLink {
  block: Asset[];
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
  image?: { url: string; description?: string }; // linked asset; absent on text-only prompts
}

export interface Sidenote {
  __typename: "Sidenote";
  sys: { id: string };
  note: Content; // rich text — reuses the Content shape (json + links)
}

export interface EntryLink {
  // Block-level embeds (CodeBlock, PromptBlock) sit between paragraphs.
  block: (CodeBlock | PromptBlock)[];
  // Inline embeds (Sidenote) sit inside a paragraph, referenced by an
  // INLINES.EMBEDDED_ENTRY node. Optional: only POST_GRAPHQL_FIELDS fetches it.
  inline?: Sidenote[];
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
  };
}

// A secondary editorial credit on a post. Deliberately narrower than Author,
// two fields rather than five. Nothing renders a contributor's portrait or
// bio, so fetching either would put weight in the post query for pixels that
// never appear. Contributors are author entries, so the full record is one
// getAuthorBySlug away if that ever changes.
export type Contributor = Pick<Author, "name"> & { slug?: string };

export interface AuthorCollectionResponse {
  data?: {
    authorCollection?: {
      items: Author[];
    };
  };
}

export interface CoverImage {
  url: string;
  // The asset's Contentful `title`, used as the image's alt text. Optional and
  // nullable on purpose: Contentful returns null when no title is set, and a
  // payload cached before this field was queried carries neither. Every
  // consumer falls back to "" rather than assuming a string.
  title?: string | null;
  // Not rendered. It is here so isPlaceholderTitle can compare the title
  // against the filename stem, which is the only way to tell a description
  // from a filing label — see app/cover-image.tsx, which is the one place that
  // reads it. Without it the alt-text guard could not run on a cover at all,
  // and for a long time it did not.
  fileName?: string | null;
}

export interface Category {
  name: string;
  slug: string;
  description?: string;
  thumbnail?: CoverImage; // optional 4:3 category tile; absent on categories without one
}

// A cross-cutting topic, up to three per post. No thumbnail: the /tags glossary
// is a text index, not a card grid, so `description` is the only decoration.
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

// Editable copy at the top of a browse page, one entry per route. Both text
// fields are optional to READ even though standfirst is required in the CMS: a
// fork with an empty space has no entry at all, and the pages degrade rather
// than break. See getBrowseIntro in lib/api.ts.
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
  coverImage?: CoverImage;
  date: string;
  updatedDate?: string; // optional, only set when post has been updated
  author?: Author;
  excerpt: string;
  content: Content;
  category?: Category; // single reference; optional so untagged posts don't break
  // Nested rather than a flat array because that is what Contentful's GraphQL
  // returns for a multi-reference field, and this file types responses as they
  // arrive rather than reshaping them. `category` is flat only because it is a
  // single link. Read it through postTags() in lib/tags.ts rather than reaching
  // in, so the empty and absent cases stay in one place.
  tagsCollection?: { items: Tag[] };
  // Nested for the same reason tagsCollection is, this file types Contentful
  // responses as they arrive rather than reshaping them. Read through
  // postContributors() in lib/contributors.ts so the empty case, the absent
  // case and the deduplication against the primary author stay in one place.
  contributorsCollection?: { items: Contributor[] };
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

// A post as returned by the sitewide listing query (getAllPosts / LIST_GRAPHQL_FIELDS).
// It carries the card and byline fields the home page, feed, and sitemap render,
// but omits the heavy `content` body and the author `bio` — those are absent, so
// don't read them. Use getPostAndMorePosts / getPostsByCategory for a full Post.
export type ListPost = Omit<Post, "content" | "author"> & {
  author?: Omit<Author, "bio">;
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
