import { documentToReactComponents } from "@contentful/rich-text-react-renderer";
import { BLOCKS, INLINES } from "@contentful/rich-text-types";
import type { ReactNode } from "react";
import { renderHyperlink } from "./rich-text-link";
import type { Content } from "./types";

// The note body is rich text and needs both of these overrides.
//
// PARAGRAPH: a default <p> start tag closes an open paragraph in the parser,
// splitting a note mid-sentence. Render as spans blocked out in CSS instead.
// The content type enables only bold, italic and hyperlink, so paragraphs are
// the only block node a note can carry.
//
// HYPERLINK: the shared renderer, so a link in a note gets the same
// treatment as one in the post body. [→ `rich-text-links`]
const bodyOptions = {
  renderNode: {
    [BLOCKS.PARAGRAPH]: (_node: unknown, children: ReactNode) => (
      <span className="sidenote-para">{children}</span>
    ),
    [INLINES.HYPERLINK]: renderHyperlink,
  },
} as Parameters<typeof documentToReactComponents>[1];

// A Tufte-style sidenote, rendered inline at its reference point.
// [→ `sidenotes`] Two constraints, both easy to undo by accident:
//
// 1. Every element is phrasing content: <span>, <sup>, <input>, <label>. Do
//    not introduce <details>, <summary> or <p> here — each closes an open
//    paragraph in the parser, and `display: inline` cannot undo a parse-time
//    split.
// 2. Below 2xl the note opens with no JavaScript — a visually hidden checkbox
//    driving `:checked ~ .sidenote-body` in CSS, not a button driving React
//    state. Do not restore a <button>. The cost, accepted deliberately, is
//    that the control announces as a checkbox rather than carrying
//    aria-expanded.
//
// The note is DOM-adjacent to its reference, so a screen reader reads it
// where it is referenced at every viewport; CSS float never reorders the
// tree.
//
// Responsive behaviour lives entirely in the .sidenote-* rules in globals.css.
// Do not add Tailwind display utilities to these elements — those rules are
// unlayered and outrank the utilities layer, so a display utility carrying a
// `2xl` prefix here silently loses.
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
          in DOM order. aria-hidden does not keep it out of the Pagefind
          index; without data-pagefind-ignore the bare number lands inside
          excerpts as noise. [→ `pagefind-index-scope`] */}
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
