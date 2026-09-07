import { documentToReactComponents } from "@contentful/rich-text-react-renderer";
import { BLOCKS, INLINES } from "@contentful/rich-text-types";
import type { ReactNode } from "react";
import { renderHyperlink } from "./rich-text-link";
import type { Content } from "./types";

// The note body is rich text and needs both of these overrides.
//
// PARAGRAPH: its paragraphs would render as <p>, and a <p> start tag closes an
// open paragraph in the parser exactly as <details> did, so the default renderer
// would reintroduce that bug from inside the note. Render them as spans blocked
// out in CSS instead. The content type enables only bold, italic and hyperlink,
// so paragraphs are the only block node a note can carry.
//
// HYPERLINK: the shared renderer, so a link in a note gets the same URL-scheme
// allowlisting, external-link treatment and new-window hint as a link in the
// post body. The default renderer emits data.uri as-is, which would let a
// javascript: href through here while the body rejected it.
const bodyOptions = {
  renderNode: {
    [BLOCKS.PARAGRAPH]: (_node: unknown, children: ReactNode) => (
      <span className="sidenote-para">{children}</span>
    ),
    [INLINES.HYPERLINK]: renderHyperlink,
  },
} as Parameters<typeof documentToReactComponents>[1];

// A Tufte-style sidenote, rendered inline at its reference point.
//
// Two constraints shape this markup, and both are easy to undo by accident.
//
// 1. Every element is phrasing content: <span>, <sup>, <input>, <label>. An
//    earlier <details> version was not, and the HTML parser implicitly closes an
//    open paragraph on a <details> start tag, which split sentences mid-line and
//    desynced React's tree from the parsed DOM. Do not introduce <details>,
//    <summary> or <p> here; `display: inline` cannot undo a parse-time split.
//
// 2. Below 2xl the note opens with no JavaScript. The toggle is a visually
//    hidden checkbox driving `:checked ~ .sidenote-body` in CSS, not a button
//    driving React state, so a note is readable with scripts off and before
//    hydration — notes are content, and content should not need JS. That is
//    also why this is a server component with no "use client": the feature
//    ships zero client JavaScript. The cost, accepted deliberately, is that the
//    control announces as a checkbox rather than carrying aria-expanded.
//
// The note is DOM-adjacent to its reference, so a screen reader reads it where
// it is referenced at every viewport; CSS float never reorders the tree.
//
// Responsive behaviour lives entirely in the .sidenote-* rules in globals.css.
// Do not add Tailwind display utilities to these elements. Those rules are
// unlayered and outrank anything in the utilities layer, so a `2xl:hidden` here
// silently loses — that is what previously left both markers visible at 2xl.
//
// The visible reference number here (`number`, a document-order index computed
// in rich-text.tsx) and the "N. " prefix on the floated note (a CSS counter in
// globals.css) are two views of the same count. Both advance once per sidenote
// in document order, so they always agree; keep them in step if either moves.
export default function Sidenote({
  content,
  number,
}: {
  content: Content;
  number: number;
}) {
  const body = documentToReactComponents(content.json, bodyOptions);
  // Document-order index, so this is unique per page without useId — which
  // would have forced this back into a client component.
  const toggleId = `sidenote-${number}`;
  const bodyId = `sidenote-body-${number}`;

  return (
    <span className="sidenote-wrap">
      {/* In-text marker, shown at 2xl+ where the note floats into the margin.
          Decorative: the note text itself is the accessible content, read here
          in DOM order. Pagefind indexes built HTML with no CSS and no
          accessibility tree, so aria-hidden does not keep this out of the
          index; without data-pagefind-ignore the bare number lands inside
          excerpts as noise. */}
      <sup className="sidenote-ref" aria-hidden="true" data-pagefind-ignore>
        {number}
      </sup>
      {/* The checkbox is the state. It is visually hidden rather than
          display:none below 2xl, because a display:none control is not
          focusable; at 2xl+ CSS does remove it, where there is nothing to
          operate. */}
      <input
        type="checkbox"
        id={toggleId}
        className="sidenote-checkbox"
        aria-controls={bodyId}
      />
      {/* Tap target, shown below 2xl. The <sup> is decorative, so the label's
          accessible name comes from the visually hidden text beside it. Both
          children are navigational furniture, not content someone would
          search for: Pagefind reads the sr-only text same as any visible
          text, so without data-pagefind-ignore on the label "Note N" and the
          bare number would both land in the index and corrupt excerpts. The
          attribute covers both children, so it does not need repeating on
          either. */}
      <label
        htmlFor={toggleId}
        className="sidenote-toggle"
        data-pagefind-ignore
      >
        <span className="sr-only">Note {number}</span>
        <sup aria-hidden="true">{number}</sup>
      </label>
      {/* not-prose: the note sits inside the post's .prose container, but its
          compact type, spacing and link colour are owned by .sidenote-body. */}
      <span id={bodyId} className="sidenote-body not-prose">
        {body}
      </span>
    </span>
  );
}
