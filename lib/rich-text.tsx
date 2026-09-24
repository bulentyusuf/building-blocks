import LightboxImage from "./lightbox-image";
import Sidenote from "./sidenote";
import { renderHyperlink } from "./rich-text-link";
import { isPlaceholderTitle } from "./placeholder-title";
import CopyButton from "./copy-button";
import ContentfulImage from "./contentful-image";
import { documentToReactComponents } from "@contentful/rich-text-react-renderer";
import { BLOCKS, INLINES } from "@contentful/rich-text-types";
import type { Block, Inline } from "@contentful/rich-text-types";
import { Children, cloneElement, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
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

// A short value takes the narrowest column instead of an equal share of the
// table's width. A column mixing short and long values falls back to normal.
function isShortValue(node: Block | Inline): boolean {
  const text = headingText(node).trim();
  return text !== "" && /^\d+(\.\d+)?$/.test(text);
}

// A column is numeric when every body cell is a number or a placeholder dash,
// and at least one is a number. Numeric columns right-align in tabular figures,
// header included. Per column, because alignment is a column property.
const NUMERIC_CELL = /^[#£$€]?\d[\d,]*(\.\d+)?%?$/;
const PLACEHOLDER_CELL = /^[-–—]?$/;

export function numericColumns(table: Block | Inline): boolean[] {
  const columns: string[][] = [];
  for (const row of table.content ?? []) {
    const cells = (row as Block).content ?? [];
    cells.forEach((cell, i) => {
      if (cell.nodeType !== BLOCKS.TABLE_CELL) return;
      (columns[i] ??= []).push(headingText(cell as Block).trim());
    });
  }
  return columns.map(
    (values = []) =>
      values.some((v) => NUMERIC_CELL.test(v)) &&
      values.every((v) => NUMERIC_CELL.test(v) || PLACEHOLDER_CELL.test(v)),
  );
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

  // `title` is the alt text, so a filing label there reaches screen readers.
  // No warning for a missing description: that only means no caption.
  if (isPlaceholderTitle(asset.title, asset.fileName)) {
    console.warn(
      `[rich-text] Embedded asset ${asset.sys.id} has no usable title (${JSON.stringify(asset.title ?? null)}), so its alt text does not describe the image.`,
    );
  }

  return (
    // not-prose: the plugin's own figure margins would swamp the caption gap.
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
          // "" with a build warning above, never a filename or a guess.
          alt={asset.title ?? ""}
          // 3:2 fallback, as in lightbox-image.tsx.
          width={asset.width ?? 1200}
          height={asset.height ?? 800}
          priority={priority}
          sizes="(max-width: 768px) 100vw, 672px"
          // Never wider than the asset, as in lightbox-image.tsx.
          className="mx-auto w-full h-auto border-2 border-gray-300 dark:border-brand-dark/15"
          style={{ maxWidth: asset.width ?? 1200 }}
        />
      )}
      {asset.description && (
        // Italic tells a caption from a sidenote body, which shares its size
        // and colour. Sized in em to match .sidenote-body.
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
  coverPromptId,
}: {
  content: Content;
  headings: Heading[];
  highlighted?: Map<string, string>;
  lightbox?: boolean;
  prioritizeFirstImage?: boolean;
  // The prompt block that made the cover gets the id the hero's pill links to.
  coverPromptId?: string;
}) {
  // One index per non-empty H2, pairing each with extractHeadings()' slug. The
  // empty-heading skip must mirror extractHeadings(); a test holds them.
  let headingIndex = 0;
  // Pages prioritise their first image; on posts the cover is the LCP.
  let assetIndex = 0;
  // Pairs with the CSS counter in globals.css. [→ `sidenotes`]
  let sidenoteIndex = 1;
  // [→ `scroll-region-names`]
  let tableIndex = 0;
  // [→ `scroll-region-names`]
  let codeBlockIndex = 0;

  // The post title is the only h1, so body h1s become h2s. H3 to H6 keep their
  // levels and stay out of the ToC.
  const coalesceToH2 = (_node: Block | Inline, children: ReactNode) => (
    <h2>{children}</h2>
  );

  return documentToReactComponents(content.json, {
    renderNode: {
      [BLOCKS.HEADING_2]: (node: Block | Inline, children: ReactNode) => {
        const text = headingText(node).trim();
        if (!text) return <h2>{children}</h2>;
        const slug = headings[headingIndex++]?.slug;
        // widont only on a single plain run, so inline marks survive.
        const isPlainRun =
          node.content?.length === 1 && node.content[0]?.nodeType === "text";
        return (
          // No scroll margin here. [→ `scroll-offset`]
          <h2 id={slug} className="group/heading">
            {isPlainRun ? widont(text) : children}
            {slug ? (
              <a
                href={`#${slug}`}
                // Keeps the glyph out of the excerpt. [→ `pagefind-index-scope`]
                data-pagefind-ignore
                // Just "Permalink": inside the h2, a longer name would repeat
                // the heading's own text.
                aria-label="Permalink"
                // The negative right margin stops the marker wrapping onto a
                // line of its own. 0.75em, not 1em: at 1em it overhung a 20px
                // gutter and scrolled the page sideways. Not clipped, because
                // the glyph is also the link's focus indicator.
                className="ml-2 -mr-[0.75em] inline-block align-middle text-brand-muted no-underline opacity-0 transition-opacity duration-200 group-hover/heading:opacity-100 focus-visible:opacity-100 hover:text-brand-crimson"
              >
                {/* Generated content, never a text node. [→ `pagefind-index-scope`] */}
                <span aria-hidden="true" className="after:content-['#']" />
              </a>
            ) : null}
          </h2>
        );
      },
      [BLOCKS.HEADING_1]: coalesceToH2,
      [BLOCKS.PARAGRAPH]: (node: Block | Inline, children: ReactNode) => {
        // widont only on a single plain run, as for headings.
        const isPlainRun =
          node.content?.length === 1 && node.content[0]?.nodeType === "text";
        const text = isPlainRun
          ? (node.content[0] as { value?: string })?.value?.trim()
          : undefined;
        return <p>{isPlainRun && text ? widont(text) : children}</p>;
      },
      [BLOCKS.QUOTE]: (_node: Block | Inline, children: ReactNode) => (
        // Pull quote. not-prose so the plugin's blockquote styles stay out.
        <blockquote className="not-prose my-9 border-l-4 border-brand-crimson pl-5 font-display text-2xl font-normal leading-snug text-brand-dark md:text-[1.75rem] [&_p]:m-0 [&_p+p]:mt-4">
          {children}
        </blockquote>
      ),
      [BLOCKS.TABLE]: (node: Block | Inline, children: ReactNode) => {
        // A focusable, named scroll region: Contentful gives no column hints to
        // reflow from. Two wrappers because one element cannot both clip to
        // the radius and scroll. [→ `scroll-region-names`]
        const position = ++tableIndex;
        // Cells render before their table, so the column flag is added here.
        const numeric = numericColumns(node);
        const rows = Children.map(children, (row) => {
          if (!isValidElement<{ children?: ReactNode }>(row)) return row;
          return cloneElement(row, {
            children: Children.map(row.props.children, (cell, i) =>
              numeric[i] && isValidElement(cell)
                ? cloneElement(
                    cell as ReactElement<{ "data-numeric"?: string }>,
                    {
                      "data-numeric": "",
                    },
                  )
                : cell,
            ),
          });
        });
        return (
          <div className="not-prose my-8 overflow-hidden rounded-lg border border-table-edge">
            <div
              className="overflow-x-auto"
              tabIndex={0}
              role="region"
              aria-label={`Table ${position}`}
            >
              <table className="w-full border-collapse text-[0.9em]">
                <tbody>{rows}</tbody>
              </table>
            </div>
          </div>
        );
      },
      [BLOCKS.TABLE_ROW]: (_node: Block | Inline, children: ReactNode) => (
        // The last row drops its rule so it cannot double the container edge.
        <tr className="border-b border-table-rule last:border-b-0">
          {children}
        </tr>
      ),
      [BLOCKS.TABLE_HEADER_CELL]: (
        node: Block | Inline,
        children: ReactNode,
      ) => (
        // Contentful puts header cells only in the first row, so col is right.
        <th
          scope="col"
          className={`border-b border-table-edge bg-table-header px-3 py-3 text-start font-semibold data-numeric:text-end ${
            isShortValue(node) ? "w-[1%] whitespace-nowrap" : ""
          }`}
        >
          {children}
        </th>
      ),
      [BLOCKS.TABLE_CELL]: (node: Block | Inline, children: ReactNode) => (
        <td
          className={`px-3 py-3 text-start align-top data-numeric:text-end data-numeric:tabular-nums ${
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
          // A filename names the region better than a number.
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
            <figure
              // A fixed id: the hero pill links to this literal.
              id={entry.sys.id === coverPromptId ? "cover-prompt" : undefined}
              data-pagefind-weight="0.1"
              className="not-prose mt-10 mb-6 last:mb-0 overflow-hidden rounded-lg border border-hairline"
            >
              {/* Indexed at a low weight so a prompt match does not anchor the
                  excerpt. Dark ink in dark mode, because white fails AA on the
                  lifted crimson. Not mono: thin stems read worse than contrast
                  predicts. */}
              <figcaption className="flex items-center justify-between bg-brand-crimson px-4 py-2 text-[0.78em] font-semibold text-white dark:text-surface-dark">
                <span className="min-w-0 flex-1">
                  {entry.label || "Prompt"}
                </span>
                <CopyButton code={entry.prompt} label="prompt" variant="dark" />
              </figcaption>
              <div className="flow-root whitespace-pre-wrap break-words bg-gray-50 p-4 font-mono text-[0.78em] text-gray-800 dark:bg-white/5 dark:text-brand-dark">
                {entry.image?.url && (
                  /* Decorative. Floats beside the prompt from 480px up; below
                     that the text beside it would be about 17 characters. */
                  <span
                    aria-hidden="true"
                    className="relative mb-3 block h-[52px] w-[78px] overflow-hidden rounded-md shadow-md ring-1 ring-black/10 min-[480px]:float-left min-[480px]:mt-2 min-[480px]:mr-3 min-[480px]:mb-1"
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
        // Same defensive shape as the block case. [→ `sidenotes`]
        if (!entry || entry.__typename !== "Sidenote") return null;

        return <Sidenote content={entry.note} number={sidenoteIndex++} />;
      },
      [INLINES.HYPERLINK]: renderHyperlink,
    },
  });
}
