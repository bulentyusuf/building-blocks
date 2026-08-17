import Link from "next/link";
import DateComponent from "./date";
import { widont } from "@/lib/typography";

// Date-then-title, nothing else. For locating something in a sequence rather
// than deciding whether to read it — see CLAUDE.md's "Standfirst where the
// reader is deciding; date where the reader is locating". Home's "Earlier"
// list and the row tier of a browse listing (app/more-stories.tsx) both used
// to carry this markup separately; one component means the row treatment
// changes in one place.
export default function PostRow({
  slug,
  title,
  date,
}: {
  slug: string;
  title: string;
  date: string;
}) {
  return (
    <li className="grid grid-cols-[132px_1fr] items-baseline gap-5 py-[18px]">
      <span className="text-sm text-brand-muted tabular-nums">
        <DateComponent dateString={date} />
      </span>
      <Link
        href={`/posts/${slug}`}
        className="text-[21px] leading-[1.3] font-semibold text-pretty hover:text-brand-crimson transition-colors duration-200"
      >
        {widont(title)}
      </Link>
    </li>
  );
}
