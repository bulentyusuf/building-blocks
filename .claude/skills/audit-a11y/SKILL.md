---
name: audit-a11y
description: Run an accessibility regression audit on beuseful.net. Checks the specific defects this repo has already fixed, so they cannot come back silently. Use on "audit a11y", "accessibility audit", or before a release.
disable-model-invocation: true
context: fork
background: false
argument-hint: "[paths to narrow the audit, optional]"
---

# Accessibility audit

A regression checklist, not a general sweep. Every item below is a defect that
has already shipped in this repo and been fixed. The value is in catching the
return, not in restating WCAG.

## Read first, before checking anything

1. `docs/decisions.md`. It is the reasoning layer and it records what has
   already been argued. A finding that re-raises a settled entry is noise, and
   several entries exist precisely because an audit raised them once already.
2. `CLAUDE.md`, sections **Accessibility**, **Type and styling** and
   **Testing**. Each rule carries a `[→ key]` marker pointing at the entry in
   `docs/decisions.md` that says why.
3. Every file named in a check below, in full, before reporting on it.

If `$1` is given, narrow to those paths but still read the two documents.

## What this audit cannot do

`app/a11y.test.tsx` runs axe in jsdom, which computes no boxes and applies no
stylesheet. So **axe here cannot check colour contrast or target size**, and a
green suite is not evidence about either. Anything needing real layout needs a
browser. Say so in the report rather than implying coverage that does not
exist.

Contrast is instead covered arithmetically by `lib/palette-contrast.test.ts`
and `lib/tag-pill.test.ts`, which recompute ratios from the stylesheet. Check
those rather than asserting a ratio yourself.

## Checklist

### 1. Doubled announcements

Three doubled labels each look like a missing one, and all three came out of an
earlier audit. Restoring any is a regression.

- `app/cover-image.tsx` — a linked cover carries `aria-hidden` and
  `tabIndex={-1}` together, and has **no** `title` prop. If one of the pair is
  present without the other, that is the finding.
- `app/layout.tsx` — the two footer column labels are paragraphs, not headings.
  As headings they skipped a level on every page whose deepest heading is level
  two, and promoting them to level two would flip them to the display face.
  Both footer navs keep their `aria-label`, so the landmarks stay named.
- `lib/lightbox-image.tsx` — an embedded figure's `alt` is empty whenever a
  caption renders, derived from `caption` being present. Contentful's
  `description` is one field doing two jobs.

`app/a11y.test.tsx` carries a duplicate-announcement check axe does not
implement: two links inside `<main>` sharing a destination and an accessible
name. It is scoped to `<main>` because the header and footer both link to
`/categories` as "Categories". Two allowances are keyed to a URL pattern per
route, and **each allowance asserts the duplication still occurs**, so it
cannot outlive the design it was written for. If an allowance now passes
vacuously, report it.

### 2. Named scroll regions

The table and code-block wrappers in `lib/rich-text.tsx` are focusable scroll
regions. Each name is its **position in document order** — "Table 2", "Code
block 2" — never a summary of contents, because a header row is announced again
the moment the reader enters the table. A code block with a filename is named
by it.

The fixture in `app/a11y.test.tsx` renders **two** tables. One table cannot
tell a working name from a broken one, and the old single-table assertion named
the literal "Table" and so held the defect in place. If that fixture is ever
reduced to one, the check stops working.

### 3. Controls that lie

- `lib/lightbox-image.tsx` renders the image bare until `mounted`, then wraps
  it in the enlarge button. Rendered unconditionally the button was focusable,
  announced "Enlarge image" and did nothing with scripts off. A test asserts
  the server HTML carries no button element. A pull request "simplifying" the
  conditional away is the regression.
- `app/layout.tsx` — the skip link's target carries `tabIndex={-1}`. A fragment
  moves the sequential-focus starting point in some browsers and not others,
  and `-1` adds no tab stop. It is not redundant.

### 4. Focus

`app/globals.css` defines a single `:focus-visible` rule in the base layer.
Components must not add their own focus ring or outline utilities. Focus
looking wrong usually means a missing outline reset before a local override,
not a missing ring.

Three documented exceptions, each with its reasoning in the stylesheet: the
coloured header and footer bands, where the reset is required rather than
decorative; the code-block scroll regions in `lib/rich-text.tsx`, which draw
inward because their clipping parent would hide anything outside; and the two
fixed controls, `app/back-to-top.tsx` and `app/exit-preview-button.tsx`. The
last was "simplified" once and reverted. A fourth exception is a finding.

Anything sitting on chrome overrides the sitewide crimson focus ring with a
white one, because the accent on aubergine is 2.04:1. If the chrome is ever
lightened, that override becomes the bug rather than the fix.

### 5. Scroll offset

One offset, `scroll-padding-top` on the `html` element in `app/globals.css`,
set on the scroll container rather than the target. It **replaced** the
per-heading scroll-margin utilities rather than joining them, and the two are
additive so they cannot coexist. It also covers the browser scrolling a
_focused_ element into view, which is WCAG 2.2's Focus Not Obscured and which
scroll-margin does not reach.

`lib/toc-active.test.ts` fails on any class name carrying that utility and
asserts the fallback constant still matches the stylesheet. Recompute the
offset if the header's vertical padding or the masthead's size changes, along
with the skip link's focused offset, which centres a 36px link in the 52px band
rather than being a nudge.

### 6. Sidenotes

Four constraints, all load-bearing, argued in `lib/sidenote.tsx`:

- Every element stays phrasing content. No `<details>`, `<summary>` or `<p>` —
  each closes an open paragraph in the parser, and an inline display value
  cannot undo a parse-time split.
- Zero client JS. The toggle is a hidden checkbox and a sibling selector. The
  checkbox stays **visually** hidden rather than removed from the box model, or
  it stops being focusable. `app/sidenote-enter-key.tsx` is an enhancement,
  never a dependency.
- All responsive display lives in the unlayered stylesheet rules, never as
  utilities in the component: unlayered author styles outrank the utilities
  layer, so a breakpoint utility there silently loses. That is what once showed
  both markers at the widest breakpoint.
- Numbering has two halves that move together, a document-order index in
  `lib/rich-text.tsx` and a CSS counter. Both superscripts are `aria-hidden`
  and the label takes its name from a screen-reader-only "Note N". Naming a
  superscript double-announces; dropping the span announces a bare number.

### 7. Heading levels

- `MoreStories` sets card titles to level three when it renders a section
  heading and level two when it does not. **Adding or removing a heading
  re-levels every card on the route.** `app/a11y.test.tsx` asserts home's
  headings by _text_ as well as by level, because a reinstated heading is a
  perfectly contiguous level two and a level-only check sails past it.
- Home's masthead is its `h1` and the hero below is an `h2`. The two move
  together and the test fails if either is reverted alone. The masthead shipped
  as a paragraph once, which cost a weight bug as well as an outline: the base
  layer sets bold on `h1, h2, h3` only. **Do not fix that with a weight class.**
  The element being a heading is the mechanism.

### 8. Route coverage

`app/a11y.test.tsx` covers six page **shapes**, not routes — home,
`/page/[page]`, the post page and the six taxonomy listings, nine of sixteen.
`app/routes.a11y.test.tsx` is the other half and carries the list of the
remaining seven: `/archive`, `/categories`, `/tags`, `/authors`, `/about`,
`/privacy`, `/search`.

**Enumerate the routes under `app/` and diff them against those two lists.** A
route in neither has no axe run anywhere and nothing in CI reports the gap.
Both halves also assert the page rendered something, because an empty render
passes every rule and a fixture drifting out of step with a route's data shape
is the quiet way that happens.

### 9. Links out of rich text

`lib/rich-text-link.tsx` is the only hyperlink renderer on the site. It
allowlists schemes and gives cross-origin links a new-tab relationship and the
screen-reader new-window hint. Any new rich-text surface must pass it as the
hyperlink override rather than relying on the renderer's default, which emits
the raw URI. Sidenote bodies relied on the default once, which let a scripting
URL through in a note while the post body rejected the same one.

Grep for a second call to `documentToReactComponents` and check its overrides.

### 10. Guards with no known-bad control

Every pattern-matching guard asserts the absence of a string, and absence
passes for two reasons: the defect is gone, or the pattern stopped matching.
Four guards in this repo have passed while the thing they guarded was broken.

List the test files that read source from disk and check each one either keeps
a permanent known-bad control or asserts non-vacuously — that it matched
something — before asserting what the match contains:

```bash
grep -rln "readFileSync" app lib --include='*.test.ts' --include='*.test.tsx' | sort
```

`app/posts/[slug]/opengraph-image.font.test.tsx` is the pattern to copy; it
keeps a rejected display face as a permanent control. A guard that recomputes a
value rather than matching a pattern, as the contrast guards do, needs no
control — say which kind each one is rather than reporting the absence of a
phrase.

## Reporting

- Report measured values, never class names. "48px became 16px", not the
  utilities that did it.
- Validate mobile layout at a root font size of around **20px** as well as at
  the 16px default. The author browses at a raised scale, so rem-based budgets
  that pass at 16px still overflow on his device.
- Cite the `docs/decisions.md` key for anything that touches a recorded
  decision.
- Separate **regressions** (a listed item has come back) from **gaps** (a new
  surface no listed item covers). They get different responses.
- Verify every mechanism claim by grep. Do not derive behaviour from what the
  code appears to do.

## Do not raise

Settled, argued, and recorded. Read the entry before disagreeing with it.

- The mobile 3:2 cover frame. It is the single item most often re-raised.
- Pagefind's keyboard and ARIA behaviour, which is upstream's and deliberately
  not reimplemented.
- `aria-current` on the section crumb of a paginated taxonomy page, whose URL
  differs from the current one. Known and accepted.
- Two tab stops per archive row, title and category.
- The archive linking its category on every row, and the glossary listing each
  post once per tag. Both are designs, and both carry allowances that assert
  the duplication still occurs.
- The absence of a wordmark in the bar on home, past the masthead.

End the report at the findings. No summary and no encouragement.
