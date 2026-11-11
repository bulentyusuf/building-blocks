import Link from "next/link";
import ContentfulImage from "@/lib/contentful-image";
import DateComponent from "./date";
import { TagRow } from "./tag-pill";
import { coverAltText } from "./cover-image";
import { getBlurDataURL } from "@/lib/blur";
import { STRANDS, strandFor, type Strand } from "@/lib/strands";
import { formatAuthorsByline, postAuthors } from "@/lib/authors";
import { widont } from "@/lib/typography";
import type { ListPost, Tag } from "@/lib/types";

// The whole card presses, but the title is its only link: the link's ::after
// covers the card, so a reader tabs to and hears one link per post. Anything
// else clickable sits above it with `relative z-10`. Ink edge because it
// presses; the cover runs to that edge, full bleed. [→ `strands`]
const press =
  "relative border-[3px] border-outline bg-card transition-[translate,box-shadow] duration-150 hover:shadow-none motion-reduce:transition-none";
const stretched =
  "after:absolute after:inset-0 after:content-[''] hover:text-brand-crimson transition-colors duration-200";

export function StrandPill({ strand }: { strand: Strand }) {
  return (
    <span
      className={`${strand.fill} rounded-full border-2 border-brand-dark px-2 py-0.5 font-ui text-xs font-bold uppercase tracking-[0.06em] text-on-strand`}
    >
      {strand.label}
    </span>
  );
}

function Meta({
  post,
  className,
  showStrand,
  bylineClassName = "",
}: {
  post: ListPost;
  className: string;
  /** Off on a strand page, where every card would repeat its strand. */
  showStrand: boolean;
  bylineClassName?: string;
}) {
  const strand = showStrand ? strandFor(post.category) : undefined;
  return (
    <p className={`flex flex-wrap items-center gap-2.5 ${className}`}>
      {strand && (
        <span className="shrink-0">
          <StrandPill strand={strand} />
        </span>
      )}
      <span className={`font-ui font-semibold tabular-nums ${bylineClassName}`}>
        {formatAuthorsByline(postAuthors(post))} ·{" "}
        <DateComponent dateString={post.date} />
      </span>
    </p>
  );
}

async function Cover({
  post,
  sizes,
  priority,
  className,
}: {
  post: ListPost;
  sizes: string;
  priority: boolean;
  className: string;
}) {
  if (!post.coverImage) return null;
  const blurDataURL = await getBlurDataURL(post.coverImage.url);
  return (
    <div className={`relative overflow-hidden bg-brand-dark/5 ${className}`}>
      <ContentfulImage
        src={post.coverImage.url}
        alt={coverAltText(post.coverImage)}
        fill
        sizes={sizes}
        priority={priority}
        fetchPriority={priority ? "high" : undefined}
        placeholder={blurDataURL ? "blur" : "empty"}
        blurDataURL={blurDataURL}
        className="object-cover"
      />
    </div>
  );
}

/**
 * The latest post, wide. Its cover is home's LCP. [→ `priority-opaque`]
 * From xl the text sits beside a 4:3 cover and is clamped to fit beside it,
 * so the card is one height on every page. [→ `strands`]
 */
export async function FeatureCard({
  post,
  tags,
  showStrand,
}: {
  post: ListPost;
  /** Already filtered to tags with a live page. */
  tags: Tag[];
  showStrand: boolean;
}) {
  const strand = strandFor(post.category);
  return (
    <article
      className={`${press} grid gap-6 overflow-hidden rounded-container hover:translate-[3px] md:gap-8 xl:grid-cols-12 xl:gap-0 md:hover:translate-[6px] ${(strand ?? STRANDS[0]).featureShadow}`}
    >
      <Cover
        post={post}
        priority
        // Stacked, then the frame less its edge until it stops growing, then
        // beside the text from xl. [→ `priority-opaque`]
        sizes="(width < 48rem) calc(100vw - 2.375rem), (width < 75rem) calc(100vw - 5.375rem), (width < 80rem) 1114px, 557px"
        className="aspect-3/2 xl:col-span-6"
      />
      <div className="flex flex-col gap-4 px-4 pb-5 md:px-6 md:pb-7 xl:col-span-6 xl:self-center xl:px-8 xl:py-4">
        <Meta
          post={post}
          className="text-base xl:flex-nowrap"
          showStrand={showStrand}
          bylineClassName="xl:min-w-0 xl:truncate"
        />
        <h3 className="text-3xl xl:line-clamp-3 font-[800] leading-none tracking-[-0.02em] text-pretty md:text-4xl lg:text-[2.875rem]">
          <Link href={`/posts/${post.slug}`} className={stretched}>
            {widont(post.title)}
          </Link>
        </h3>
        <p className="text-lg leading-relaxed text-pretty xl:line-clamp-2">
          {widont(post.excerpt)}
        </p>
        {/* Phones drop them: two wrapped lines of pills, and the post and
            /tags carry them anyway. [→ `strands`] */}
        <TagRow tags={tags} className="relative z-10 max-md:hidden" />
      </div>
    </article>
  );
}

export default async function PostCard({
  post,
  showStrand,
  across,
}: {
  post: ListPost;
  showStrand: boolean;
  /** Columns from xl: 2 or 3. "closing" is 3 from xl, and below it the full
   *  row with cover and text side by side, sized as one card of two. */
  across: 2 | 3 | "closing";
}) {
  const strand = strandFor(post.category);
  // Whole class strings: Tailwind cannot read a class glued to ${...}.
  const shape =
    across === "closing"
      ? "flex w-full flex-col gap-4 overflow-hidden rounded-container pb-5 md:max-xl:grid md:max-xl:grid-cols-2 md:max-xl:gap-x-9 md:max-xl:pb-0"
      : "flex w-full flex-col gap-4 overflow-hidden rounded-container pb-5";
  return (
    <article
      className={`${press} ${shape} hover:translate-[3px] md:hover:translate-[4px] ${(strand ?? STRANDS[0]).cardShadow}`}
    >
      <Cover
        post={post}
        priority={false}
        // One column to md, then two (a closing card's half row is the same),
        // then `across` from xl. [→ `priority-opaque`]
        sizes={`(width < 48rem) calc(100vw - 2.375rem), (width < 75rem) calc(50vw - 4rem), ${across === 2 ? "540px" : "(width < 80rem) 540px, 343px"}`}
        className="aspect-3/2"
      />
      <div
        className={
          across === "closing"
            ? "flex flex-col gap-3.5 px-4.5 md:max-xl:self-center md:max-xl:py-5 md:max-xl:pl-0"
            : "flex flex-col gap-3.5 px-4.5"
        }
      >
        <Meta post={post} className="text-sm" showStrand={showStrand} />
        <h3
          className={
            across !== 2
              ? "text-2xl font-[800] leading-[1.05] text-balance md:text-[1.875rem] xl:text-2xl"
              : "text-2xl font-[800] leading-[1.05] text-balance md:text-[1.875rem]"
          }
        >
          <Link href={`/posts/${post.slug}`} className={stretched}>
            {widont(post.title)}
          </Link>
        </h3>
        <p className="text-base leading-relaxed text-pretty md:text-[1.0625rem]">
          {widont(post.excerpt)}
        </p>
      </div>
    </article>
  );
}
