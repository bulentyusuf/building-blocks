import Link from "next/link";
import DateComponent from "./date";
import CoverImage from "./cover-image";
import TagPill from "./tag-pill";
import type { CardPost, CoverImage as CoverImageType, Tag } from "@/lib/types";
import { postTags } from "@/lib/tags";
import { widont } from "@/lib/typography";

type Variant = "grid" | "list";

// Below the excerpt, so titles align with their covers and the pills are not
// the first thing a reader tabs to. Named by aria-label, not a visible label.
// Shared with the home hero. [→ `tag-pills`]
export function TagRow({
  tags,
  className,
}: {
  tags: Tag[];
  className: string;
}) {
  if (tags.length === 0) return null;

  return (
    <ul aria-label="Tags" className={`flex flex-wrap gap-2 ${className}`}>
      {tags.map((tag) => (
        <li key={tag.slug}>
          <TagPill tag={tag} size="compact" />
        </li>
      ))}
    </ul>
  );
}

function PostPreview({
  title,
  coverImage,
  date,
  excerpt,
  slug,
  variant,
  priority = false,
  as = "h3",
  tags = [],
}: {
  title: string;
  coverImage?: CoverImageType;
  date: string;
  excerpt: string;
  slug: string;
  variant: Variant;
  priority?: boolean;
  as?: "h2" | "h3";
  tags?: Tag[];
}) {
  const Heading = as;

  if (variant === "list") {
    return (
      // Every item keeps this padding, the first included. [→ `listing-shell`]
      <article className="grid grid-cols-1 gap-5 py-10 md:grid-cols-[2fr_3fr] md:gap-8 md:items-start md:py-12">
        {coverImage && (
          <div>
            <CoverImage
              slug={slug}
              image={coverImage}
              priority={priority}
              hover
              // Capped where the cover track stops growing (381px).
              // [→ `priority-opaque`]
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 40vw, 381px"
            />
          </div>
        )}
        <div>
          <Heading className="text-2xl md:text-3xl mb-2 leading-snug text-pretty">
            <Link
              href={`/posts/${slug}`}
              className="hover:text-brand-crimson transition-colors duration-200"
            >
              {widont(title)}
            </Link>
          </Heading>
          <div className="text-sm text-brand-muted mb-3 tabular-nums">
            <DateComponent dateString={date} />
          </div>
          <p className="text-lg leading-relaxed text-pretty">
            {widont(excerpt)}
          </p>
          <TagRow tags={tags} className="mt-3" />
        </div>
      </article>
    );
  }

  // Full height so the tag rows in one grid row line up and the shorter card
  // leaves no dead space. Clamping the excerpt was rejected.
  return (
    <article className="flex h-full flex-col">
      {coverImage && (
        <div className="mb-4">
          {/* [→ `cover-frames`] */}
          <CoverImage
            slug={slug}
            image={coverImage}
            wide
            priority={priority}
            hover
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 450px"
          />
        </div>
      )}
      <Heading className="text-2xl md:text-3xl mb-3 leading-snug text-pretty">
        <Link
          href={`/posts/${slug}`}
          className="hover:text-brand-crimson transition-colors duration-200"
        >
          {widont(title)}
        </Link>
      </Heading>
      <div className="text-sm text-brand-muted mb-4 tabular-nums">
        <DateComponent dateString={date} />
      </div>
      <p className="text-lg leading-relaxed text-pretty">{widont(excerpt)}</p>
      {/* Auto margin aligns the pill rows; the padding keeps a gap when the
          excerpt fills the cell. */}
      <TagRow tags={tags} className="mt-auto pt-4" />
    </article>
  );
}

export default function MoreStories({
  morePosts,
  variant = "list",
  ruled = variant === "list",
  heading,
  priorityFirst = false,
  visibleTags,
  openRule = true,
}: {
  morePosts: CardPost[];
  variant?: Variant;
  // Draw the opening and closing hairlines. Home passes it for its grid,
  // because its pager expects the run above to close itself.
  ruled?: boolean;
  heading: string | null;
  // Prioritise the first cover where it is the LCP (no hero above).
  priorityFirst?: boolean;
  // A set, not a boolean, so pills cannot appear without asking which tags have
  // a page. Computed from all posts. [→ `tag-pages`]
  visibleTags?: Set<string>;
  // Drops the opening rule only; the pager relies on the closing one.
  // [→ `border-roles`]
  openRule?: boolean;
}) {
  // The list closes itself, so the pager carries no border. Item padding stays
  // with openRule off. [→ `border-roles`, `listing-shell`]
  const container =
    variant === "list"
      ? `flex flex-col divide-y divide-hairline${
          ruled ? ` border-hairline ${openRule ? "border-y" : "border-b"}` : ""
        }`
      : `grid grid-cols-1 md:grid-cols-2 md:gap-x-16 lg:gap-x-32 gap-y-20 md:gap-y-32${
          ruled
            ? ` border-hairline ${openRule ? "border-y" : "border-b"} py-10 md:py-12`
            : ""
        }`;

  // [→ `page-axis`]
  const titleAs = heading ? "h3" : "h2";

  return (
    <section className="mx-auto max-w-5xl">
      {heading && (
        <h2 className="mb-8 text-4xl md:text-5xl leading-tight text-pretty">
          {widont(heading)}
        </h2>
      )}
      <div className={container}>
        {morePosts.map((post, i) => (
          <PostPreview
            key={post.slug}
            title={post.title}
            coverImage={post.coverImage}
            date={post.date}
            slug={post.slug}
            excerpt={post.excerpt}
            variant={variant}
            priority={priorityFirst && i === 0}
            as={titleAs}
            tags={
              visibleTags
                ? postTags(post).filter((t) => visibleTags.has(t.slug))
                : []
            }
          />
        ))}
      </div>
    </section>
  );
}
