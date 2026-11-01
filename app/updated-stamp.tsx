import Date from "./date";
import { GERMAN_LOCALE } from "@/lib/constants";

// "Updated 24 May 2026" as a double-ruled stamp: a border plus an offset
// outline. Straight, not tilted. Posts, About and Privacy. [→ `post-page`]
export default function UpdatedStamp({
  dateString,
  german = false,
}: {
  dateString: string;
  german?: boolean;
}) {
  return (
    <span
      lang={german ? GERMAN_LOCALE : undefined}
      className="inline-flex min-h-7.5 items-center rounded-md border-2 border-brand-dark px-2.5 font-mono text-xs font-medium tracking-[0.06em] uppercase tabular-nums outline-1 outline-offset-2 outline-brand-dark"
    >
      {german ? "Aktualisiert am\u00a0" : "Updated\u00a0"}
      <Date dateString={dateString} german={german} />
    </span>
  );
}
