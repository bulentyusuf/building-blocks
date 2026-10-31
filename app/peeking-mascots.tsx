import Link from "next/link";
import ContentfulImage from "@/lib/contentful-image";
import type { Author } from "@/lib/types";

type Mascot = Pick<Author, "name" | "slug"> & {
  picture?: { url?: string } | null;
};

// Staggered so the three heads do not sit on one line.
const OFFSETS = ["mt-2", "mt-0", "mt-[3px]"];

// The writers' avatars, cropped by the footer's top rule. Decoration with a
// purpose: each is the way to that writer's page.
export default function PeekingMascots({ authors }: { authors: Mascot[] }) {
  const mascots = authors.filter((a) => a.slug && a.picture?.url);
  if (mascots.length === 0) return null;
  return (
    <nav
      aria-label="Writers"
      className="flex h-[50px] items-start gap-3 overflow-hidden pt-2.5 md:h-[66px] md:gap-[18px] md:pt-3"
    >
      {mascots.map((author, i) => (
        <Link
          key={author.slug}
          href={`/authors/${author.slug}`}
          aria-label={`Posts by ${author.name}`}
          className={`${OFFSETS[i % OFFSETS.length]} block shrink-0 rounded-full transition-transform duration-150 hover:-translate-y-2.5 focus-visible:-translate-y-2.5 motion-reduce:transition-none`}
        >
          <ContentfulImage
            src={author.picture!.url!}
            alt=""
            width={92}
            height={92}
            className="size-[68px] rounded-full border-[3px] border-brand-dark bg-brand-bg object-cover md:size-[92px]"
          />
        </Link>
      ))}
    </nav>
  );
}
