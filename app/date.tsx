// Formatters are constructed once at module scope. Intl.DateTimeFormat
// construction is the expensive part and re-formatting is cheap, so building
// one per render on a listing of twenty cards is the only way to make this
// slower than the library it replaces.
//
// timeZone: "UTC" is load-bearing rather than defensive. Contentful hands back
// ISO strings, and a date-only value ("2026-09-06") parses as UTC midnight.
// Without an explicit zone, Intl formats in the runtime zone, so a reader west
// of UTC sees the previous day. The date-fns call this replaces had the same
// defect and nobody noticed because the author and the build both sit at or
// east of UTC. This fixes it rather than porting it.
const LONG = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const DAY_MONTH = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const MONTH_YEAR = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

// Exported for the archive standfirst, which needs the string rather than a
// <time> element because it is interpolated mid-sentence.
export function formatMonthYear(dateString: string): string {
  return MONTH_YEAR.format(new Date(dateString));
}

export default function DateComponent({
  dateString,
  variant = "long",
}: {
  dateString: string;
  // "long" is the sitewide form ("6 September 2026"). The archive passes
  // "dayMonth" ("6 Sept") because the year already lives in the section
  // heading, so repeating it per row is noise.
  //
  // This used to be a date-fns token string. A named variant is the honest
  // shape: there were only ever two call patterns, and a free-text token
  // string invited a third that nothing would have reviewed.
  variant?: "long" | "dayMonth";
}) {
  const formatter = variant === "dayMonth" ? DAY_MONTH : LONG;
  return (
    <time dateTime={dateString}>{formatter.format(new Date(dateString))}</time>
  );
}
