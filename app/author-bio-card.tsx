import Link from "next/link";
import ContentfulImage from "@/lib/contentful-image";
import { RichText } from "@/lib/rich-text";
import type { Author } from "@/lib/types";

// Renders nothing without a bio; callers gate their spacing the same way.
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
        {/* Sized here, since the card sits outside any prose container. */}
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

export function AuthorBioSection({
  authors,
  hasTags = false,
}: {
  authors: Author[];
  hasTags?: boolean;
}) {
  const authorsWithBio = authors.filter((a) => a.bio);
  if (authorsWithBio.length === 0) return null;

  // With tags above, the tag row's hairline already opened this zone.
  return (
    // Out of the index: identical on every post by this author.
    // [→ `pagefind-index-scope`]
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
