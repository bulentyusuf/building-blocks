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
    <p className="mt-1 flex items-baseline gap-2">
      {/* Mixed case in the markup, uppercased in CSS. Literal capitals get
          spelled out letter by letter by some screen readers. The label
          inherits text-brand-muted from the meta wrapper and the names carry
          text-brand-dark, the same split AuthorBioCard's "Written by" uses
          against its full-strength name below it. Dimming the label further
          instead — the first cut here — had almost no headroom to work with:
          --color-brand-muted on --color-brand-bg is already 6.04:1 light /
          7.75:1 dark, and at 12px bold this needs to clear 4.5:1 (AA), not the
          3:1 large-text floor, so the deepest safe opacity (/90) only reached
          4.79:1 and was too subtle to read as a real step. Brightening the
          names is the mechanism that actually separates the two. */}
      <span className="font-ui text-xs font-bold uppercase tracking-widest">
        {contributors.length > 1 ? "Contributors" : "Contributor"}
      </span>
      <span className="text-brand-dark">
        {contributors.map((contributor, i) => (
          <Fragment key={contributor.slug ?? contributor.name}>
            {i > 0 && (i === last ? " and " : ", ")}
            {contributor.name}
          </Fragment>
        ))}
      </span>
    </p>
  );
}
