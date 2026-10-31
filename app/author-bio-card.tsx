import Link from "next/link";
import ContentfulImage from "@/lib/contentful-image";
import { RichText } from "@/lib/rich-text";
import type { Author } from "@/lib/types";

// Renders nothing without a bio; callers gate their spacing the same way.
// Read, not pressed, so the quiet edge. [→ `post-page`]
export default function AuthorBioCard({ author }: { author: Author }) {
  if (!author.bio) return null;

  return (
    <div className="flex flex-col gap-5 rounded-[20px] border-2 border-edge-quiet bg-card px-5 py-6 sm:flex-row sm:px-7">
      {author.picture?.url && (
        <ContentfulImage
          alt=""
          className="h-22 w-22 shrink-0 rounded-full border-[3px] border-brand-dark object-cover"
          width={88}
          height={88}
          src={author.picture.url}
        />
      )}
      <div className="flex flex-col gap-2.5">
        <p className="font-mono text-sm font-medium text-brand-muted">
          <span aria-hidden="true">{"// "}</span>
          written by
        </p>
        <p className="font-ui text-[1.625rem] leading-none font-[800]">
          {author.name}
        </p>
        {/* Sized here, since the card sits outside any prose container. */}
        <div className="text-[1.0625rem] leading-relaxed">
          <RichText content={author.bio} headings={[]} />
        </div>
        {author.slug && (
          <Link
            href={`/authors/${author.slug}`}
            className="self-start font-ui font-semibold text-brand-crimson underline decoration-2 underline-offset-[3px] hover:decoration-4"
          >
            More from {author.name} →
          </Link>
        )}
      </div>
    </div>
  );
}

export function AuthorBioSection({ authors }: { authors: Author[] }) {
  const authorsWithBio = authors.filter((a) => a.bio);
  if (authorsWithBio.length === 0) return null;

  return (
    // Out of the index: identical on every post by this author.
    // [→ `pagefind-index-scope`]
    <div
      data-pagefind-ignore
      role="region"
      aria-label={
        authorsWithBio.length > 1 ? "About the authors" : "About the author"
      }
      className="space-y-7"
    >
      {authorsWithBio.map((author) => (
        <AuthorBioCard key={author.slug ?? author.name} author={author} />
      ))}
    </div>
  );
}
