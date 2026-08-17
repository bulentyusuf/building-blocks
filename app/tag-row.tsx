import Link from "next/link";
import type { Tag } from "@/lib/types";

// Pills sit below the excerpt, not above the title. Above it they would be the
// first interactive thing in the card and would route the reader away from the
// listing before they reached the headline; worse, the count varies from one to
// three and wraps at three, so they would push each title down by a different
// amount and titles would stop aligning with the top of their cover images.
// Below the excerpt that variability lands at the foot of the card, where
// nothing depends on it.
//
// aria-label rather than a visible "Tagged" label. The post page carries one
// because it appears once there; repeated down a listing it is several
// identical labels of pure noise, and the small-caps treatment already reads
// as a tag. Screen readers still need the row named, hence the label —
// without it this is an unexplained list of links on every card.
//
// Its own file rather than living inside app/browse-card.tsx: app/page.tsx's
// LeadPlate could reasonably want it too, and more-stories.tsx importing from
// browse-card.tsx (for the card grid) while browse-card.tsx imported TagRow
// back from more-stories.tsx would be a cycle.
export default function TagRow({
  tags,
  className,
}: {
  tags: Tag[];
  className: string;
}) {
  if (tags.length === 0) return null;

  return (
    <ul
      aria-label="Tags"
      className={`flex flex-wrap gap-x-4 gap-y-1.5 ${className}`}
    >
      {tags.map((tag) => (
        <li key={tag.slug}>
          <Link
            href={`/tags/${tag.slug}`}
            className="font-ui text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-muted transition-colors duration-200 hover:text-brand-crimson"
          >
            {tag.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}
