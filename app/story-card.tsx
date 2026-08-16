import Link from "next/link";
import CoverImage from "./cover-image";
import DateComponent from "./date";
import type { CardPost } from "@/lib/types";
import { widont } from "@/lib/typography";

// Date first (a reader wants to know the blog is alive before anything else
// on a card), category after if the post has one — see CLAUDE.md's
// standfirst-vs-date rule. Shared by every caller of StoryCard below, which
// is the whole point of pulling it out: home's two-up plates and the post
// page's Read Next teasers used to duplicate this markup with a one-pixel
// drift nobody had reason to notice.
export function CardMeta({
  date,
  category,
}: {
  date: string;
  category?: { name: string; slug: string };
}) {
  return (
    <p className="text-sm text-brand-muted tabular-nums">
      <DateComponent dateString={date} />
      {category && (
        <>
          <span className="text-separator" aria-hidden="true">
            {" "}
            &middot;{" "}
          </span>
          {category.name}
        </>
      )}
    </p>
  );
}

// The one 4:3 card, used by home's two-up plates (app/page.tsx) and the post
// page's Read Next (app/posts/[slug]/page.tsx) — round 3 §5 replaced two
// components that had drifted apart with this single one. Not used by the
// lead plate, which keeps its own bespoke title/standfirst split, or by a
// browse listing's row, which is a different shape entirely (see
// app/more-stories.tsx's PostPreview).
export default function StoryCard({
  post,
  as = "h2",
  priority = false,
  transitionName,
}: {
  post: CardPost;
  as?: "h2" | "h3";
  priority?: boolean;
  transitionName?: string;
}) {
  const Heading = as;

  return (
    <article>
      {post.coverImage && (
        <div className="mb-4">
          <CoverImage
            slug={post.slug}
            url={post.coverImage.url}
            alt={post.coverImage.title ?? ""}
            priority={priority}
            hover
            ratio="4:3"
            transitionName={transitionName}
            // Capped in px above the point the container stops growing.
            // Container is max-w-page with px-5, so content tops out at
            // 1160px; this grid is two columns with a 40px gap, so a card's
            // cover track is (1160 - 40) / 2 = 560px and never widens again.
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 560px"
          />
        </div>
      )}
      <Heading className="mb-2 text-[30px] leading-tight tracking-[-0.02em] font-bold text-pretty">
        <Link
          href={`/posts/${post.slug}`}
          className="hover:text-brand-crimson transition-colors duration-200"
        >
          {widont(post.title)}
        </Link>
      </Heading>
      <p className="text-[17px] leading-[1.55] text-pretty">{post.excerpt}</p>
      <div className="mt-3">
        <CardMeta date={post.date} category={post.category} />
      </div>
    </article>
  );
}
