import Link from "next/link";
import DateComponent from "./date";
import { StrandPill } from "./post-card";
import { GERMAN_LOCALE } from "@/lib/constants";
import { strandFor } from "@/lib/strands";
import { widont } from "@/lib/typography";
import type { ListPost } from "@/lib/types";

// A list panel: read, not pressed, so the quiet edge. [→ `post-page`]
export const ROWS_PANEL =
  "overflow-hidden rounded-3xl border-2 border-edge-quiet bg-card";

/**
 * One compact row: date, title, strand. The archive shows day and month under
 * its year heading; a collection page has no year heading, so the full date.
 * Three fixed lanes from sm. Below it the title comes first, then the strand as
 * a coloured dot before the date on one line. [→ `listing-shell`]
 */
export default function PostRow({
  post,
  german,
  date,
  showStrand,
}: {
  post: ListPost;
  german: boolean;
  date: "dayMonth" | "long";
  /** Off on a strand page, where every row would repeat the page's strand. */
  showStrand: boolean;
}) {
  const strand = showStrand ? strandFor(post.category) : undefined;
  return (
    <li
      className={`grid grid-cols-[auto_1fr] items-baseline gap-x-2 gap-y-1.5 px-5 py-3.5 even:bg-brand-bg sm:gap-x-6 sm:px-7 ${date === "dayMonth" ? "sm:grid-cols-[4.75rem_1fr_auto]" : "sm:grid-cols-[9.5rem_1fr_auto]"}`}
    >
      <span className="order-3 font-ui text-[0.9375rem] font-semibold tabular-nums text-brand-muted sm:order-1">
        <DateComponent dateString={post.date} variant={date} />
        {/* The heading carries the year; restore it for link navigation. */}
        {date === "dayMonth" && (
          <span className="sr-only"> {new Date(post.date).getFullYear()}</span>
        )}
      </span>
      <span className="order-1 col-span-full sm:order-2 sm:col-span-1">
        <Link
          href={`/posts/${post.slug}`}
          className="font-ui text-xl leading-snug font-bold pointer-coarse:relative pointer-coarse:py-3 transition-colors duration-200 hover:text-brand-crimson"
        >
          {widont(post.title)}
        </Link>
        {/* Where a browsing reader learns a German version exists, on every
            row. Visible "DE" stays in the name. [→ `locale`, `tap-targets`] */}
        {german && (
          <Link
            href={`/de/posts/${post.slug}`}
            hrefLang={GERMAN_LOCALE}
            lang={GERMAN_LOCALE}
            className="tap-area -my-1 ml-1 inline-block px-1.5 py-1 whitespace-nowrap pointer-coarse:ml-2.5 font-ui text-xs font-bold tracking-[0.06em] text-brand-muted transition-colors duration-200 hover:text-brand-crimson"
          >
            <span className="sr-only">Auf Deutsch lesen, </span>
            DE
          </Link>
        )}
      </span>
      {strand && (
        // Phones: a dot, not a link, so no undersized tap target. After the
        // title in the source, so a screen reader hears it there.
        <span
          className={`order-2 size-3 self-center rounded-full border-2 border-brand-dark sm:hidden ${strand.fill}`}
        >
          <span className="sr-only">in {strand.label}</span>
        </span>
      )}
      {strand && (
        <Link
          href={`/categories/${strand.slug}`}
          className="tap-area order-3 hidden justify-self-end sm:block"
        >
          {/* Keeps the title from running into the strand. */}
          <span className="sr-only">in </span>
          <StrandPill strand={strand} />
        </Link>
      )}
    </li>
  );
}
