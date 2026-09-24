import Link from "next/link";
import type { Tag } from "@/lib/types";

// One pill for cards and the post page. [→ `tag-pills`]
type Size = "default" | "compact";

// Both sizes use the same type as the card date, so tags do not read as a
// footnote; do not shrink compact. Horizontal padding clears the corner radius,
// which is half the height, so each size keeps its own; do not equalise them.
const SIZES: Record<Size, string> = {
  default: "px-4 py-1 text-sm",
  compact: "px-3.5 py-0.5 text-sm",
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
      // The control edge, not the divider token: the edge is all that marks the
      // pill as interactive. [→ `border-roles`]
      className={`inline-block rounded-full border border-control-edge font-ui ${SIZES[size]} text-brand-muted transition-colors duration-200 hover:border-brand-crimson hover:text-brand-crimson`}
    >
      {tag.name}
    </Link>
  );
}
