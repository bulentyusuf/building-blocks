import Link from "next/link";
import ContentfulImage from "@/lib/contentful-image";
import { RichText } from "@/lib/rich-text";
import type { Author } from "@/lib/types";

// A compact author card for the foot of a post: avatar, name, bio, and a link
// to the author's landing page. Renders nothing when the author has no bio —
// the caller must also gate its border/spacing on the same condition so an
// author without a bio leaves no empty shell.
//
// Its own 56px portrait, deliberately not app/avatar.tsx's 38px: the avatar
// appears twice on a post, once in the sidebar as a reading companion and
// once here as part of the bio, and the two components are allowed to differ
// because the two appearances are not the same thing repeated.
export default function AuthorBioCard({
  author,
  postCount,
}: {
  author: Author;
  /** Total posts by this author, for the "All N posts" link. */
  postCount: number;
}) {
  if (!author.bio) return null;

  return (
    <aside className="flex gap-5">
      {author.picture?.url && (
        // 48px below md, 56px at md and up. width/height stay the larger
        // figure regardless of breakpoint — see the same note on
        // app/avatar.tsx, which renders this same author elsewhere on the
        // page at its own, smaller, separately-responsive size.
        <ContentfulImage
          alt=""
          className="rounded-full object-cover h-12 w-12 md:h-14 md:w-14 shrink-0"
          width={56}
          height={56}
          src={author.picture.url}
        />
      )}
      <div>
        <p className="text-[22px] font-bold text-brand-dark">{author.name}</p>
        {/* text-base rather than text-sm. RichText returns bare elements with
            no prose wrapper of its own and this card sits outside the post's
            prose container, so the size set here is the size the bio's
            paragraphs render at. */}
        <div className="mt-2 text-base leading-[1.6] text-brand-muted">
          <RichText content={author.bio} headings={[]} />
        </div>
        {author.slug && postCount > 0 && (
          <Link
            href={`/authors/${author.slug}`}
            className="mt-3 inline-block font-ui text-xs font-semibold uppercase tracking-[0.14em] text-brand-crimson hover:underline"
          >
            All {postCount} {postCount === 1 ? "post" : "posts"} &rarr;
          </Link>
        )}
      </div>
    </aside>
  );
}
