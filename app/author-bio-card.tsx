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

  // mt-6 after a tag row, mt-12 otherwise. This margin is the only thing
  // setting the space beneath the pills, so it has to match the nav's pt-6 or
  // the row sits off-centre in its band. Without tags there is no band and the
  // usual mt-12 applies.
  return (
    <div
      className={`${hasTags ? "mt-6" : "mt-12"} border-t border-hairline pt-8`}
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
