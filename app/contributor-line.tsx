import { Fragment } from "react";
import type { Contributor } from "@/lib/types";

/**
 * The secondary credit line, under the byline.
 *
 * Plain text weight, no portrait and no bio card, because the visual demotion
 * IS the status distinction. A contributor styled like an author is a
 * co-author, and this field exists precisely because that is not what it means.
 *
 * AMENDED 2 September. The names do NOT link. An earlier draft linked them on
 * the grounds that an unlinked name beside a linked byline reads as an
 * oversight. That held only while a "contributed to" section on the author
 * page was planned. With that cancelled, a link would promise the reader
 * evidence of the contribution on a page that will never carry it.
 */
export default function ContributorLine({
  contributors,
}: {
  contributors: Contributor[];
}) {
  if (contributors.length === 0) return null;

  const last = contributors.length - 1;

  return (
    <p className="mt-3 text-sm text-brand-muted">
      With{" "}
      {contributors.map((contributor, i) => (
        <Fragment key={contributor.slug ?? contributor.name}>
          {/* The separator goes BEFORE each name rather than after it, so the
              final item needs no special case and no trailing comma can escape
              on a list of one. */}
          {i > 0 && (i === last ? " and " : ", ")}
          {contributor.name}
        </Fragment>
      ))}
    </p>
  );
}
