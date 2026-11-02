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
 * Three fixed lanes from sm, title first below it. [→ `listing-shell`]
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
      className={`grid grid-cols-1 items-baseline gap-x-6 gap-y-1.5 px-5 py-3.5 even:bg-brand-bg sm:px-7 ${date === "dayMonth" ? "sm:grid-cols-[4.75rem_1fr_auto]" : "sm:grid-cols-[9.5rem_1fr_auto]"}`}
    >
      <span className="order-2 font-ui text-[0.9375rem] font-semibold tabular-nums text-brand-muted sm:order-1">
        <DateComponent dateString={post.date} variant={date} />
        {/* The heading carries the year; restore it for link navigation. */}
        {date === "dayMonth" && (
          <span className="sr-only"> {new Date(post.date).getFullYear()}</span>
        )}
      </span>
      <span className="order-1 sm:order-2">
        <Link
          href={`/posts/${post.slug}`}
          className="font-ui text-xl leading-snug font-bold transition-colors duration-200 hover:text-brand-crimson"
        >
          {widont(post.title)}
        </Link>
        {/* The one place a browsing reader learns a German version exists.
            Visible "DE" stays in the name. Padded to a 24px target. [→ `locale`] */}
        {german && (
          <Link
            href={`/de/posts/${post.slug}`}
            hrefLang={GERMAN_LOCALE}
            lang={GERMAN_LOCALE}
            className="-my-1 ml-1 inline-block px-1.5 py-1 whitespace-nowrap font-ui text-xs font-bold tracking-[0.06em] text-brand-muted transition-colors duration-200 hover:text-brand-crimson"
          >
            <span className="sr-only">Auf Deutsch lesen, </span>
            DE
          </Link>
        )}
      </span>
      {strand && (
        <Link
          href={`/categories/${strand.slug}`}
          className="order-3 justify-self-start sm:justify-self-end"
        >
          {/* Keeps the title from running into the strand. */}
          <span className="sr-only">in </span>
          <StrandPill strand={strand} />
        </Link>
      )}
    </li>
  );
}
