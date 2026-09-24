// Built once at module scope. UTC, because a date-only value parses as UTC
// midnight and would show the previous day west of UTC.
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

// A string, for the archive standfirst.
export function formatMonthYear(dateString: string): string {
  return MONTH_YEAR.format(new Date(dateString));
}

export default function DateComponent({
  dateString,
  variant = "long",
}: {
  dateString: string;
  // "dayMonth" for archive rows, where the section heading has the year.
  variant?: "long" | "dayMonth";
}) {
  const formatter = variant === "dayMonth" ? DAY_MONTH : LONG;
  return (
    <time dateTime={dateString}>{formatter.format(new Date(dateString))}</time>
  );
}
