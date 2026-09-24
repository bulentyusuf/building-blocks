import { documentToReactComponents } from "@contentful/rich-text-react-renderer";
import { BLOCKS, INLINES } from "@contentful/rich-text-types";
import type { ReactNode } from "react";
import { renderHyperlink } from "./rich-text-link";
import type { Content } from "./types";

// Paragraphs render as spans, because a <p> would close the open paragraph at
// parse time. Links use the shared renderer. [→ `rich-text-links`]
const bodyOptions = {
  renderNode: {
    [BLOCKS.PARAGRAPH]: (_node: unknown, children: ReactNode) => (
      <span className="sidenote-para">{children}</span>
    ),
    [INLINES.HYPERLINK]: renderHyperlink,
  },
} as Parameters<typeof documentToReactComponents>[1];

// A Tufte-style sidenote, inline at its reference. Phrasing content only, no
// JavaScript, and responsive display only in the .sidenote-* rules.
// [→ `sidenotes`]
export default function Sidenote({
  content,
  number,
}: {
  content: Content;
  number: number;
}) {
  const body = documentToReactComponents(content.json, bodyOptions);
  // Unique per page without useId, which would force a client component.
  const toggleId = `sidenote-${number}`;
  const bodyId = `sidenote-body-${number}`;

  return (
    <span className="sidenote-wrap">
      {/* Decorative marker. [→ `pagefind-index-scope`] */}
      <sup className="sidenote-ref" aria-hidden="true" data-pagefind-ignore>
        {number}
      </sup>
      {/* The state. Visually hidden, never display:none, so it stays
          focusable. */}
      <input
        type="checkbox"
        id={toggleId}
        className="sidenote-checkbox"
        aria-controls={bodyId}
      />
      {/* Named by the sr-only text; the sup is decorative. Both are kept out
          of the index. [→ `pagefind-index-scope`] */}
      <label
        htmlFor={toggleId}
        className="sidenote-toggle"
        data-pagefind-ignore
      >
        <span className="sr-only">Note {number}</span>
        <sup aria-hidden="true">{number}</sup>
      </label>
      {/* not-prose: .sidenote-body owns the note's type and links. */}
      <span id={bodyId} className="sidenote-body not-prose">
        {body}
      </span>
    </span>
  );
}
