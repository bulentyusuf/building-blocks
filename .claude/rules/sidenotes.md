---
paths:
  - "lib/sidenote.tsx"
  - "lib/rich-text.tsx"
  - "app/sidenote-enter-key.tsx"
  - "app/globals.css"
---

# Sidenotes carry several load-bearing constraints

A `Sidenote` entry embedded inline in a post's rich text, pulled through the
`... on Sidenote` fragment in `lib/api.ts` and rendered by `lib/sidenote.tsx`.
`lib/rich-text.tsx` returns `null` for a missing entry or any inline embed that
is not a `Sidenote`, so a deleted entry degrades to nothing. Do not replace that
guard with an error.

Four constraints. `lib/sidenote.tsx` argues the first two in full:

- **Every element stays phrasing content.** Do not introduce `<details>`,
  `<summary>` or `<p>` — each closes an open paragraph in the parser, and
  `display: inline` cannot undo a parse-time split. Hence the note's paragraphs
  rendering as `.sidenote-para` spans, and hence the toggle not being a native
  disclosure.
- **The toggle needs no JavaScript**, so `lib/sidenote.tsx` is a server
  component shipping zero client JS. Do not restore a `<button>` with React
  state. The checkbox stays visually hidden rather than `display: none` or it
  stops being focusable, and `app/sidenote-enter-key.tsx` is an enhancement,
  never a dependency.
- **All responsive display lives in the unlayered `.sidenote-*` rules** in
  `app/globals.css`, never as Tailwind utilities in the component: unlayered
  author styles outrank the `utilities` layer, so a `2xl:hidden` there silently
  loses — that is what once showed both markers at 2xl.
- **Numbering has two halves that must move together**: a document-order index
  in `lib/rich-text.tsx` and a CSS counter in `app/globals.css`. Both `<sup>`s
  are `aria-hidden` and the label takes its name from an `sr-only` "Note N" — do
  not name a `sup` (double announcement) or drop the span (the control announces
  as a bare "1").

`lib/rich-text.test.tsx` guards the phrasing-content rule, the absent `<button>`
and the numbering.
