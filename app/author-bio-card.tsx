import Link from "next/link";
import ContentfulImage from "@/lib/contentful-image";
import { RichText } from "@/lib/rich-text";
import type { Author } from "@/lib/types";

// A compact author card for the foot of a post: avatar, name, bio, and a link
// to the author's landing page. Renders nothing when the author has no bio —
// the caller must also gate its border/spacing on the same condition so an
// author without a bio leaves no empty shell.
export default function AuthorBioCard({ author }: { author: Author }) {
  if (!author.bio) return null;

  return (
    <aside className="flex gap-5">
      {author.picture?.url && (
        <ContentfulImage
          alt=""
          className="rounded-full object-cover h-18 w-18 shrink-0"
          width={72}
          height={72}
          src={author.picture.url}
        />
      )}
      <div>
        <p className="text-xl font-bold text-brand-dark">{author.name}</p>
        {/* text-base rather than text-sm. RichText returns bare elements with
            no prose wrapper of its own and this card sits outside the post's
            prose container, so the size set here is the size the bio's
            paragraphs render at. */}
        <div className="mt-2 text-base text-brand-muted">
          <RichText content={author.bio} headings={[]} />
        </div>
        {author.slug && (
          <Link
            href={`/authors/${author.slug}`}
            className="mt-3 inline-block text-sm text-brand-crimson hover:underline"
          >
            More posts by {author.name} →
          </Link>
        )}
      </div>
    </aside>
  );
}

// The foot-of-post author bio section. Renders nothing when no author carries a
// bio, ensuring no empty hairline shell or orphan margin is left behind.
export function AuthorBioSection({
  authors,
  hasTags = false,
}: {
  authors: Author[];
  hasTags?: boolean;
}) {
  const authorsWithBio = authors.filter((a) => a.bio);
  if (authorsWithBio.length === 0) return null;

  // When tags precede the bio, the single hairline divider already opened
  // the post-footer zone above the tag row, so this block separates from the
  // tags with a clean mt-8 margin rather than stacking a redundant second
  // hairline border. When there are no tags, this block opens the zone itself
  // with a hairline border and matching pt-8.
  return (
    // Excluded from the search index. The bio comes from the Author entry, so
    // it is identical on every post that author wrote — indexed as prose it
    // matches a query a dozen times over and hands back the bio as the excerpt
    // instead of anything about the post. /authors/[slug] carries no
    // data-pagefind-body of its own, so this makes the bio unsearchable
    // sitewide rather than searchable in one place — see the PR description.
    <div
      data-pagefind-ignore
      className={hasTags ? "mt-8" : "mt-8 border-t border-hairline pt-8"}
    >
      <p className="mb-6 font-ui text-xs font-bold uppercase tracking-widest text-brand-muted">
        {authorsWithBio.length > 1 ? "About the authors" : "About the author"}
      </p>
      <div className="space-y-10">
        {authorsWithBio.map((author) => (
          <AuthorBioCard key={author.slug ?? author.name} author={author} />
        ))}
      </div>
    </div>
  );
}
