import Link from "next/link";
import type { Tag } from "@/lib/types";

// One tag for cards and the post page, written as #tag. A 2px ink edge and an
// 8px radius: the edge marks it as a control. [→ `tag-pills`]
type Size = "default" | "compact";

// Default is the post's tag row, 44px tall to tap; compact sits on cards.
const SIZES: Record<Size, string> = {
  default: "min-h-11 px-3 text-[0.9375rem]",
  compact: "px-2 py-1 text-sm",
};

export default function TagPill({
  tag,
  size = "default",
}: {
  tag: Tag;
  size?: Size;
}) {
  return (
    <Link
      href={`/tags/${tag.slug}`}
      className={`inline-flex items-center rounded-lg border-2 border-brand-dark bg-card font-ui font-semibold ${SIZES[size]} transition-colors duration-200 hover:text-brand-crimson`}
    >
      <span aria-hidden="true">#</span>
      {tag.name}
    </Link>
  );
}

// Named by aria-label, not a visible label. Cards sit it below the excerpt, so
// the pills are not the first thing a reader tabs to. [→ `tag-pills`]
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
