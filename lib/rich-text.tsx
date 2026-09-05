import LightboxImage from "./lightbox-image";
import Sidenote from "./sidenote";
import { renderHyperlink } from "./rich-text-link";
import { isPlaceholderTitle } from "./placeholder-title";
import CopyButton from "./copy-button";
import ContentfulImage from "./contentful-image";
import { documentToReactComponents } from "@contentful/rich-text-react-renderer";
import { BLOCKS, INLINES } from "@contentful/rich-text-types";
import type { Block, Inline } from "@contentful/rich-text-types";
import type { ReactNode } from "react";
import type { Asset, Content } from "./types";
import type { Heading } from "./headings";
import { widont } from "./typography";

function headingText(node: Block | Inline): string {
  if (!node?.content) return "";
  return node.content
    .map((child) =>
      child.nodeType === "text"
        ? child.value
        : headingText(child as Block | Inline),
    )
    .join("");
}

// A table's w-full stretches to the full prose measure, and content-driven
// auto layout then spreads that surplus across every column regardless of
// need — a single digit in a "Posts" column was landing in a column wide
// enough for a sentence. w-[1%] plus whitespace-nowrap is the standard fix
// for auto table layout: it tells the column "your minimum is your own
// content", freeing the surplus for columns that actually use it. This is
// safe to infer per cell, unlike the alignment case it superficially
// resembles: column width is the max across every cell in it regardless of
// which ones ask to shrink, so a column mixing short and long values just
// falls back to ordinary auto sizing — never a visible mismatch the way a
// header disagreeing with its own column's alignment was.
function isShortValue(node: Block | Inline): boolean {
  const text = headingText(node).trim();
  return text !== "" && /^\d+(\.\d+)?$/.test(text);
}

function RichTextAsset({
  id,
  assets,
  lightbox,
  priority,
}: {
  id: string;
  assets: Asset[] | undefined;
  lightbox: boolean;
  priority?: boolean;
}) {
  const asset = assets?.find((asset) => asset.sys.id === id);

  if (!asset?.url) return null;

  // `title` is the alt text, so a title that is really a filing label reaches
  // a screen reader as though it described the picture. Checking only for an
  // ABSENT title would be a guard that can never fire — Contentful requires
  // the field — which is how a whole library of filename stems and generator
  // output shipped with every check green. lib/placeholder-title.ts carries
  // the argument and the known-bad control.
  //
  // A missing `description` is NOT warned on. It means only that no caption
  // renders, which is a legitimate editorial choice and is already the case on
  // several published figures. Alt is the accessibility floor; a caption is
  // an addition.
  if (isPlaceholderTitle(asset.title, asset.fileName)) {
    console.warn(
      `[rich-text] Embedded asset ${asset.sys.id} has no usable title (${JSON.stringify(asset.title ?? null)}), so its alt text does not describe the image.`,
    );
  }

  return (
    // not-prose so the typography plugin does not inject its own margins into
    // the image (2em) and caption — those would dominate the image-to-caption
    // gap and make mt-1.5 invisible. Spacing is owned here: my-8 around the
    // figure, mt-1.5 under the caption. Matches the code/prompt blocks.
    <figure className="not-prose my-8">
      {lightbox ? (
        <LightboxImage
          src={asset.url}
          alt={asset.title ?? ""}
          caption={asset.description}
          width={asset.width}
          height={asset.height}
        />
      ) : (
        <ContentfulImage
          src={asset.url}
          // The asset's title, which is a different string from the caption
          // below and describes what is depicted rather than commenting on it.
          // These were once the same field, which is why the image had to go
          // decorative to avoid announcing one sentence twice. They are not
          // the same field any more, so it does not.
          //
          // "" when no title is set, never a filename and never a guess. The
          // build warning above is what surfaces that case.
          alt={asset.title ?? ""}
          // The asset's real shape, with 3:2 as the fallback for an asset that
          // carries no dimensions — see the same pair in lightbox-image.tsx.
          // w-full h-auto means the bitmap wins once loaded either way, so a
          // wrong ratio here is a layout shift rather than a wrong render.
          width={asset.width ?? 1200}
          height={asset.height ?? 800}
          priority={priority}
          sizes="(max-width: 768px) 100vw, 672px"
          className="w-full h-auto border-2 border-gray-300 dark:border-brand-dark/15"
        />
      )}
      {asset.description && (
        // italic: the caption shares its size and muted colour with a sidenote
        // body, so slant is what tells the two apart when a note sits level
        // with a figure. Deliberately not applied to the sidenote instead — a
        // note's own italic emphasis would then have nothing to flip to.
        // The size is em, matching .sidenote-body in globals.css, so the pair
        // keeps its ratio to the prose body when that size moves.
        <figcaption className="text-[0.875em] italic text-brand-muted mt-1.5 text-center">
          {asset.description}
        </figcaption>
      )}
    </figure>
  );
}

export function RichText({
  content,
  headings,
  highlighted,
  lightbox = true,
  prioritizeFirstImage = false,
}: {
  content: Content;
  headings: Heading[];
  highlighted?: Map<string, string>;
  lightbox?: boolean;
  prioritizeFirstImage?: boolean;
}) {
  // Single source of truth for heading ids. `headings` comes from
  // extractHeadings() on the page. documentToReactComponents walks in document
  // order, so advancing one index per non-empty H2 pairs each heading with its
  // precomputed slug. The empty-heading skip below mirrors extractHeadings()
  // exactly. rich-text.test.tsx asserts the two never drift.
  let headingIndex = 0;
  // Pages prioritise their first embedded image (the lead image is the LCP).
  // Posts leave this false: the LCP is the cover, body images stay lazy.
  let assetIndex = 0;
  // Document-order number for inline sidenotes, feeding each note's aria-label
  // and its in-text marker. The floated note's own "N." prefix comes from a CSS
  // counter (globals.css); both count once per note in order, so they agree.
  let sidenoteIndex = 1;
  // Document-order number for tables, feeding each scroll region's accessible
  // name. Every table on the site was named the literal "Table", so two in one
  // post were indistinguishable in the list a screen reader keeps of regions —
  // which is the list that exists to tell them apart.
  //
  // An ordinal rather than a name derived from the header row, and that is the
  // considered choice rather than the lazy one: those header cells are
  // announced again the moment the reader enters the table, so naming the
  // region after them is a duplicate announcement of exactly the kind the rest
  // of this file exists to remove. Contentful's table model carries no caption
  // field to use instead. A position is the one thing the region can say that
  // the table itself does not.
  let tableIndex = 0;
  // The same, for code blocks. A block with a filename is already named by it;
  // one without fell back to the literal "Code block", so a post with two
  // unnamed snippets had two identically named regions for the same reason the
  // tables did.
  let codeBlockIndex = 0;

  // The post title is the page's only h1, so a stray h1 in body content would
  // duplicate it. Coalesce body h1 to h2. H3 to H6 are intentional sub-structure
  // in long-form posts and pass through to the renderer defaults (prose styles
  // them), so they keep their real levels. They carry no id and are not in the
  // ToC, which stays H2-only by design.
  const coalesceToH2 = (_node: Block | Inline, children: ReactNode) => (
    <h2>{children}</h2>
  );

  return documentToReactComponents(content.json, {
    renderNode: {
      [BLOCKS.HEADING_2]: (node: Block | Inline, children: ReactNode) => {
        const text = headingText(node).trim();
        if (!text) return <h2>{children}</h2>;
        const slug = headings[headingIndex++]?.slug;
        // Apply widont only when the heading is a single plain-text run, so a
        // trailing token (e.g. a parenthesised year) can't widow. Headings that
        // carry inline marks (links, italics) keep their original children so
        // the formatting survives — widont() takes a plain string and would
        // otherwise flatten them.
        const isPlainRun =
          node.content?.length === 1 && node.content[0]?.nodeType === "text";
        return (
          // No scroll-mt here. The offset that parks a fragment-linked
          // heading below the sticky header is `scroll-padding-top` on <html>
          // (globals.css), which covers keyboard focus too. The two are
          // additive, so a scroll-margin here would push the landing point
          // past the line app/table-of-contents.tsx activates on.
          <h2 id={slug} className="group/heading">
            {isPlainRun ? widont(text) : children}
            {slug ? (
              <a
                href={`#${slug}`}
                // Pagefind indexes raw text content, and honours neither
                // aria-hidden nor opacity-0 — so without this the glyph is
                // concatenated onto the heading in the index and surfaces as a
                // trailing "#" in both the sub-result title and the excerpt.
                // The h2's own id is untouched, so Pagefind still builds a
                // sub-result anchor for the heading; only the marker drops out.
                data-pagefind-ignore
                // The visible glyph is decorative, so it is hidden from the
                // accessibility tree and the link carries a real name instead.
                // Without this every permalink announces as "number sign".
                // The name is deliberately just "Permalink", not "Permalink to
                // <heading>": the anchor sits inside the <h2>, so accessible-
                // name-from-content folds this label into the heading's own
                // name. A descriptive label would make every heading announce
                // its title twice. Per-section descriptive links live in the
                // ToC, which is where AT users reach for them anyway.
                aria-label="Permalink"
                // The negative right margin cancels the anchor's own advance,
                // so it consumes no width when the line is measured and can
                // never be pushed onto a line of its own. Without it the marker
                // wraps whenever a heading's last line is nearly full, and
                // because it is opacity-0 rather than hidden that line still
                // takes its height — an empty band under the heading, on a
                // heading that looks like it had room to spare. Measured in
                // Chromium across 201 column widths: 15 of them orphaned the
                // marker before, none after.
                //
                // Deliberately not zero-width, which fixes the wrap equally
                // well and collapses the focus ring to a 2px bar beside the
                // glyph instead of tracing it. The cost is that the marker can
                // overhang the measure by up to about 22px when the last line
                // is completely full, which is inside the gutter it sits in.
                className="ml-2 -mr-[1em] inline-block align-middle text-brand-muted no-underline opacity-0 transition-opacity duration-200 group-hover/heading:opacity-100 focus-visible:opacity-100 hover:text-brand-crimson"
              >
                <span aria-hidden="true">#</span>
              </a>
            ) : null}
          </h2>
        );
      },
      [BLOCKS.HEADING_1]: coalesceToH2,
      [BLOCKS.PARAGRAPH]: (node: Block | Inline, children: ReactNode) => {
        // Apply widont only when the paragraph is a single plain-text run,
        // matching the heading guard above. Paragraphs carrying inline marks
        // (links, bold, code) keep their original children so the formatting
        // survives — widont() takes a plain string and would otherwise flatten
        // them. This covers author bios, browse standfirsts, and any other
        // plain-text rich-text field where a widow word is visible.
        const isPlainRun =
          node.content?.length === 1 && node.content[0]?.nodeType === "text";
        const text = isPlainRun
          ? (node.content[0] as { value?: string })?.value?.trim()
          : undefined;
        return <p>{isPlainRun && text ? widont(text) : children}</p>;
      },
      [BLOCKS.QUOTE]: (_node: Block | Inline, children: ReactNode) => (
        // Pull quote: crimson rule, display face. not-prose so the typography
        // plugin's blockquote styling doesn't fight ours; inner paragraphs are
        // de-margined ([&_p]:m-0) with a gap only between multiple paragraphs.
        <blockquote className="not-prose my-9 border-l-4 border-brand-crimson pl-5 font-display text-2xl font-normal leading-snug text-brand-dark md:text-[1.75rem] [&_p]:m-0 [&_p+p]:mt-4">
          {children}
        </blockquote>
      ),
      [BLOCKS.TABLE]: (_node: Block | Inline, children: ReactNode) => {
        // Horizontal scroll rather than reflow: a table narrower than its
        // content is unreadable, and Contentful gives no column hints to
        // restructure from. tabIndex makes the scroll container reachable by
        // keyboard (2.1.1); a focusable scroll region needs a role and an
        // accessible name or a screen reader announces an unlabelled stop.
        // Two nested wrappers: overflow-hidden on the outer element clips the
        // header fill to the rounded corners, overflow-x-auto on the inner one
        // scrolls — one element can't do both without losing the radius.
        //
        // The name carries the table's position, so a post with several of
        // them gives the reader something to tell the regions apart by. See
        // tableIndex above for why it is a number rather than the header row.
        const position = ++tableIndex;
        return (
          <div className="not-prose my-8 overflow-hidden rounded-lg border border-table-edge">
            <div
              className="overflow-x-auto"
              tabIndex={0}
              role="region"
              aria-label={`Table ${position}`}
            >
              <table className="w-full border-collapse text-[0.9em]">
                <tbody>{children}</tbody>
              </table>
            </div>
          </div>
        );
      },
      [BLOCKS.TABLE_ROW]: (_node: Block | Inline, children: ReactNode) => (
        // last:border-b-0 so the final row's rule does not sit a hair inside
        // the container's own bottom edge and read as a double line. The
        // header row's own <tr> picks this rule up too, but border-collapse
        // resolves a shared edge in favour of the cell-level border, so the
        // header's stronger border-table-edge wins there, not a doubled line.
        <tr className="border-b border-table-rule last:border-b-0">
          {children}
        </tr>
      ),
      [BLOCKS.TABLE_HEADER_CELL]: (
        node: Block | Inline,
        children: ReactNode,
      ) => (
        // scope="col" is not emitted by the default renderer. Contentful's
        // table model only produces header cells in the first row, so col is
        // always correct here.
        <th
          scope="col"
          className={`border-b border-table-edge bg-table-header px-3 py-3 text-start font-semibold ${
            isShortValue(node) ? "w-[1%] whitespace-nowrap" : ""
          }`}
        >
          {children}
        </th>
      ),
      [BLOCKS.TABLE_CELL]: (node: Block | Inline, children: ReactNode) => (
        <td
          className={`px-3 py-3 text-start align-top ${
            isShortValue(node) ? "w-[1%] whitespace-nowrap" : ""
          }`}
        >
          {children}
        </td>
      ),
      [BLOCKS.EMBEDDED_ASSET]: (node: Block | Inline) => (
        <RichTextAsset
          id={(node as Block).data.target.sys.id}
          assets={content.links.assets.block}
          lightbox={lightbox}
          priority={prioritizeFirstImage && assetIndex++ === 0}
        />
      ),
      [BLOCKS.EMBEDDED_ENTRY]: (node: Block | Inline) => {
        const id = (node as Block).data.target.sys.id;
        const entry = content.links.entries?.block?.find(
          (e) => e.sys.id === id,
        );
        if (!entry) return null;

        if (entry.__typename === "CodeBlock") {
          const html = highlighted?.get(id);
          // A filename is a better name than a number whenever there is one.
          const position = ++codeBlockIndex;
          const label = entry.filename || `Code block ${position}`;

          return (
            <div className="not-prose relative my-8 overflow-hidden rounded-lg border border-hairline">
              {entry.filename ? (
                <div className="flex items-center justify-between border-b border-hairline bg-gray-50 px-4 py-2 font-mono text-[0.67em] text-brand-muted dark:bg-white/5">
                  <span>{entry.filename}</span>
                  <CopyButton code={entry.code} />
                </div>
              ) : (
                <div className="absolute right-2 top-2">
                  <CopyButton code={entry.code} />
                </div>
              )}
              {html ? (
                <div
                  tabIndex={0}
                  role="region"
                  aria-label={label}
                  className="overflow-x-auto text-[0.78em] [&_pre]:m-0 [&_pre]:p-4 [&_pre]:w-max [&_pre]:min-w-full focus-visible:outline-offset-[-2px]"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              ) : (
                <pre
                  tabIndex={0}
                  role="region"
                  aria-label={label}
                  className="overflow-x-auto p-4 text-[0.78em] focus-visible:outline-offset-[-2px]"
                >
                  <code>{entry.code}</code>
                </pre>
              )}
            </div>
          );
        }

        if (entry.__typename === "PromptBlock") {
          return (
            <figure className="not-prose mt-10 mb-6 last:mb-0 overflow-hidden rounded-lg border border-hairline">
              {/* figcaption as figure's first child names the whole block
                  natively — no role or aria-labelledby needed. In dark mode
                  brand-crimson lifts (for link legibility); white text on the
                  lifted hue fails AA at 2.53:1, so the header ink goes dark
                  (6.64:1). The label is not mono: at this size a fixed-advance
                  face draws stems thin enough that measured contrast stops
                  predicting legibility, and the label is a caption rather than a
                  verbatim string. It also sits at the body's size rather than
                  below it — a label smaller than the content it names had
                  nothing to justify it. */}
              <figcaption className="flex items-center justify-between bg-brand-crimson px-4 py-2 text-[0.78em] font-semibold text-white dark:text-surface-dark">
                <span className="min-w-0 flex-1">
                  {entry.label || "Prompt"}
                </span>
                <CopyButton code={entry.prompt} label="prompt" variant="dark" />
              </figcaption>
              <div className="flow-root whitespace-pre-wrap break-words bg-gray-50 p-4 font-mono text-[0.78em] text-gray-800 dark:bg-white/5 dark:text-brand-dark">
                {entry.image?.url && (
                  /* Decorative thumbnail: floats only from sm up, so text
                     wraps around it rather than sitting in a fixed column for
                     the whole prompt. Hidden below sm, where a fixed 78px
                     column would leave too narrow a strip beside it to read
                     (WCAG 1.4.10); the image carries no information, so
                     hiding it there costs nothing. mt-2 corrects for the
                     text's half-leading, which the image box has none of —
                     the exact gap depends on which font in the font-mono
                     stack the browser actually resolves, so treat this as a
                     nudge tuned by eye rather than a computed constant. */
                  <span
                    aria-hidden="true"
                    className="relative mt-2 mb-1 mr-3 hidden h-[52px] w-[78px] overflow-hidden rounded-md shadow-md ring-1 ring-black/10 sm:float-left sm:block"
                  >
                    <ContentfulImage
                      src={entry.image.url}
                      alt=""
                      fill
                      sizes="78px"
                      className="object-cover"
                    />
                  </span>
                )}
                <code>{entry.prompt}</code>
              </div>
            </figure>
          );
        }

        return null;
      },
      [INLINES.EMBEDDED_ENTRY]: (node: Block | Inline) => {
        const id = (node as Inline).data.target.sys.id;
        const entry = content.links.entries?.inline?.find(
          (e) => e.sys.id === id,
        );
        // Same defensive shape as the block case: an unresolved id (draft or
        // deleted entry) or a non-Sidenote inline embed renders nothing rather
        // than throwing.
        if (!entry || entry.__typename !== "Sidenote") return null;

        return <Sidenote content={entry.note} number={sidenoteIndex++} />;
      },
      [INLINES.HYPERLINK]: renderHyperlink,
    },
  });
}
