---
name: audit-design
description: Run a layout and typography regression audit on beuseful.net. Checks the page-shape, masthead, rhythm and type-role decisions this repo has already settled. Use on "audit design", "layout audit", or after any change to a page shell or the stylesheet.
disable-model-invocation: true
context: fork
background: false
argument-hint: "[paths to narrow the audit, optional]"
---

# Design audit

A regression checklist for layout, rhythm and type. Almost everything here
broke once, in a way that looked fine on the reviewer's screen and wrong on
someone else's. Two patterns recur and are worth carrying through the whole
audit:

- **A class describing a row applied below the breakpoint where that row does
  not exist.** Both the standfirst width cap and the home hero grid shipped this
  way, months apart.
- **A shortfall that scales with the viewport**, so a screenshot from the
  narrowest device understates it. The standfirst misalignment measured 15px at
  390px, 55px at 430px, 265px at 640px and 392px at 767px, one pixel below the
  breakpoint that hid it. **Do not judge a breakpoint-shaped class from a single
  viewport width.**

## Read first, before checking anything

1. `docs/decisions.md`, especially the entries keyed `page-axis`,
   `wide-page-shell`, `listing-shell`, `split-masthead`, `home-hero`,
   `band-retirement`, `border-roles`, `type-roles`, `cover-frames`,
   `card-meta`, `page-counter` and `prose-measure`.
2. `CLAUDE.md`, sections **Page shape**, **Headers and home** and **Type and
   styling**.
3. The docstrings in `app/wide-page.tsx` and `app/listing-page.tsx`. They carry
   arguments that are not repeated anywhere else.

If `$1` is given, narrow to those paths but still read the documents.

## Checklist

### 1. The axis

A route is **wide or narrow**, decided by the header measure, and everything
follows: the breadcrumb wrapper, the heading ramp, and whether the header
closes with the 3px rule. There is no second question and no route that sits
half in each.

Thirteen wide routes: home, the paginated index, the post page, the archive, the
three section fronts, and the six taxonomy listings. Three narrow: about,
privacy, search.

**Enumerate the routes under `app/` and place each one.** A new route picks its
treatment from its own measure, not from the nearest existing heading. Two
tells, one from each end: a top-size heading inside the narrow measure looks
enormous while carrying identical classes, and an unwrapped breadcrumb on a
narrow page starts **176px** left of the heading it labels.

The measure is the **header's**, not the prose's. A post's body narrows inside a
grid, but its breadcrumb, heading and cover sit above that grid at the full
wide measure, so a post is a wide page whose body happens to be narrow. Search
is the mirror case: it browses posts by function and is narrow by shape, and
shape decides.

### 2. One shell

Every wide route renders through `app/wide-page.tsx`, the middle seven via
`app/listing-page.tsx`. It exists because ten of those pages were previously two
implementations of one design: every tuning pass had to be applied twice and the
half that got missed drifted — the raised heading ramp and the standfirst
colour each shipped to one half only.

**Do not add a browse route that assembles a header and container itself**, and
do not give a narrow route the wide header. A measure prop letting the about
page opt in was proposed and rejected.

Two things are deliberately **not** absorbed and must stay out: the header is
passed as children, because it is where all six routes genuinely differ, and the
fetch strategy stays in the route. Do not unify either.

### 3. The split masthead

From the medium breakpoint up, heading and standfirst lay out on one row with
the standfirst pinned to the container's right edge; below it they stack, where
a 60px heading has no room beside one.

Two parts ship together, never one:

- The space-between distribution pins the standfirst's right edge to the
  container's, constant on every route.
- The standfirst's own **320px** width cap forces most standfirsts to wrap to
  two lines rather than trail off as one short line at the far margin.
  Space-between alone reintroduces the original objection to right-anchoring;
  the two-line wrap is what closes it.

Last-baseline alignment matters more than first-baseline would: with a two-line
standfirst, first-baseline hangs the second line below the heading.

**Every standfirst carries all four of the width cap, the larger size, relaxed
leading, right alignment and the muted colour — and the width cap and the
alignment both carry the breakpoint prefix.** Unprefixed they still applied on
their own: a phone-width standfirst shrank to a 320px box and had its text
right-aligned inside that box, landing its right edge short of the page edge,
under a left-aligned heading, above a left-aligned hero. It read as a
typesetting mistake because it was one — aligned to a boundary nothing else on
the page drew.

`lib/palette-contrast.test.ts` requires all of those in its pattern, not just
the colour, so a standfirst losing one **stops matching the guard** rather than
failing a later assertion.

**Copy budget: roughly 37 characters a line, 74 for two.** Every standfirst on
the site was measured and rewritten to fit. One tag description sits at exactly
74 with no headroom — a word added pushes it to three lines. That is the entry
to watch, not a defect to fix.

The author routes are the one exception, via the split-header flag. Their
heading already sits in a flex row beside a 112px portrait and a third element
across that line is one too many. `app/wide-page.test.tsx` asserts only those
two files set the prop, anchored on the JSX form at line start so a comment
explaining the exception cannot be mistaken for the prop itself.

### 4. The home hero

The container is a **base-level grid**, not a grid that starts at the medium
breakpoint. It shipped the second way, with no grid at all below that point, so
the two columns fell back to stacked blocks with nothing between them — the
horizontal gap does nothing to a stack, so the byline block and the excerpt sat
flush, **a 0px join on the largest element on the page**.

It is a single-column grid with its own vertical gap at the base, widened to two
columns higher up, matching every other two-column grid on the site. The base
gap is 24px and is a judgement call: it has to read as a clear step above the
heading's own 16px bottom margin, so the mobile stack reads as two groups of two
rather than four equally-weighted lines. The nearest sibling precedent at 20px
is not quite that step.

The zero row-gap at the breakpoint is **defensive, not load-bearing** — two
children in a two-column grid make one row, verified by computed style as a
single track. It is there so a third child added later inherits the two-column
intent. Do not describe it as required, and do not remove it on the grounds that
it does nothing today.

The hero's headline is capped at 40px off the scale on purpose. The byline
renders through the avatar component's meta slot; **do not pull the date out
into a standalone line.** That was tried, to mirror a card's element order
field-by-field, and reverted: no card carries a byline at all, so there was
nothing to mirror. `lib/listing-rhythm.test.ts` asserts both the presence of the
meta prop and the absence of a standalone date line.

### 5. Rhythm around the rule

The retired masthead band's inset stays **two numbers, one on each side of the
rule**. It was two because it was two colours, and one surface does not merge
them: the rule now sits where the colour step used to and which side each number
falls on is the whole point. Folding both into the header's bottom margin
preserves the total and puts all of it above the boundary, leaving the first
content element flush against a 3px line on home, the post page and the four
section fronts.

**The ruled listings hide this**, because their items carry their own vertical
padding, so a green suite is not evidence either way.
`lib/listing-rhythm.test.ts` asserts both halves separately.

The content-owns-leading flag suppresses the gap **below** the rule, never the
header's margin above it. A prop meaning "the content below supplies its own
space" cannot be spent on the space above the boundary. Only
`app/listing-page.tsx` sets it.

A listing under a header **drops its opening rule and nothing else**. Item
padding stays, the page adds no gap of its own, the closing rule stays — the
closing rule is the load-bearing half — and `app/pagination.tsx` has **no top
border**: the listing above closes itself, so a rule here lands in the same row
and prints a double line. The pager looking unattached is not a missing border.

Zeroing the item padding made the first post hug the rule while every post after
it breathed. Adding a page-level gap on top made rule-to-first-post disagree
with post-to-post. One or the other, never both.

### 6. Covers and cards

Covers take one of two frames, chosen by the wide flag: **3:2 on mobile and
16:9 from the medium breakpoint up** with it, fixed 3:2 without. The mobile 3:2
is deliberate. Two replacements have been proposed and both rejected.

A card's meta line is the **date alone, above the excerpt**, and carries no
category. The site has two categories, so the label carries about one bit, and
putting it on cards would need a per-route exception on the category pages where
the category names the page the reader is already on.

Tags are pills, in **one** implementation, wrapped by the shared row component
and used directly on the post page. There is exactly one pill implementation;
the rejected alternative shipped a card change plus a post-page exception and
left the site with two treatments. The distinction is what the tag is **doing**:
a pill for a tag as metadata attached to something else, a link for a tag as a
destination, where the tag is the subject. Neither the glossary nor the search
empty state is a third treatment. A fourth would be.

Posts per page is **five**, and changing it is a four-route design pass, not a
constant bump: home's hero counts toward the budget, so page one is a hero plus
four cards. Eight and ten have both been tried and reverted.

### 7. The page counter

Inline text inside each route's own heading, rendered by all seven paginated
routes, returning nothing on page one. It is seven call sites where there was
one — a deliberate trade, because the heading is the one thing every route
builds differently.

It is **not** a block element, and the entry it replaced said it was. Two
objections died with that: it cannot split the heading from its standfirst, and
it cannot land under an author portrait, because it is part of the same line as
the name. It was also forced by more than tidiness — the space-between row took
the old caption's last line as its baseline anchor, so last-baseline alignment
closed the heading against the _caption_ rather than the standfirst, visibly
shoving the standfirst upward.

**A paginated listing's header is identical on page 1 and later pages** apart
from that counter: same heading ramp, same portrait size, and the standfirst on
every page rather than page one only. Author pages drifted here once, carrying a
112px portrait and a bio on page one against an 80px portrait and no bio later,
so a reader arriving on page three from a search result got a thinner page than
the same listing's first.

### 8. Type

**Three roles, two faces, and nothing in a component names a family.** That is
what kept the last three face swaps to a handful of lines. The UI role resolves
to the same family as the display role by choice and keeps its own token, so
handing UI back to a face of its own stays one line. Do not deduplicate them.

There is **no sans utility any more** — that class silently does nothing. Grep
for it.

The UI role has a closed list, and **uppercase plus letterspacing is the tell**.
Those surfaces were missed when the roles first split because the list was
written from the header, footer and sidebar. If a new surface seems to want UI,
leave it on the body face and raise it rather than extending the list quietly.
Meta in the reading face is ordinary editorial practice and is what makes a page
cohere: a stray UI class on a date is a regression, not a tidy.

`app/global-error.tsx` is deliberately excluded — it replaces the root layout
and renders its own document without the font variables, so a UI class there
resolves to an undefined custom property.

**The prose column is never measured in character units.** The typography
plugin's max-width is neutralised and the measure lives on the narrow parents
instead. The plugin measures in `ch`, keyed to the current font's zero glyph, so
the column silently resizes on any body-face swap — an 8% narrowing with no
width anywhere in the diff. `app/globals.measure.test.ts` guards both the
override and the absence of any character-measured column.

A replacement display face has to clear three bars, and this is the only place
they are written down: grotesque-against-serif contrast, an optical-size axis
reaching roughly 45pt, and a body face keeping a true italic. **Check the
optical-size axis maximum before proposing any display face.**

### 9. Borders

Three roles, not interchangeable, all defined and argued in the stylesheet.

- The **hairline** — every rule between list items, cards and panels, and the
  edges a listing draws around itself. It inverts on its own, so never add a
  dark-mode variant to an element using it, and never reintroduce a bare grey
  border.
- The **control edge** — one component only, and **not** a divider despite
  having borrowed the divider token for a long time. It carries a WCAG 1.4.11
  contrast floor, which is why it is two literal values rather than a computed
  mix. `lib/tag-pill.test.ts` recomputes both ratios from the stylesheet and
  asserts the tokens stay distinct, so deduplicating them fails loudly.
- The **image frames**, a heavier role with their own pairing. Leave them.

**Do not deduplicate the first two.**

### 10. Utility names in prose

Never write a literal utility name in a source comment under `app/` or `lib/` —
Tailwind treats every source file as plain text, so a utility merely **named**
in prose is generated as though a component used it. **A variant prefix is not a
fix**: a comment carrying prefixed classes still generated the bare rules.
Removing the name is the only reliable answer. Fifteen utilities were shipping
this way, each named by a sentence describing markup that had been removed.

The stylesheet hosting the Tailwind import is **not** scanned, so the utility
named in its own scroll-offset note is inert and may stay. The rule applies to
TypeScript under `app/` and `lib/`, and to any other tracked, non-ignored text
file in the repo.

`lib/tailwind-comment-scanning.test.ts` compiles the stylesheet twice, once
against the scanned tree and once against a comment-stripped mirror, and asserts
the two produce the same rules. It is a **differential** check, which is what
makes it usable: both passes share the same narrow scan root, so it cannot
invent a finding, and anything it surfaces is real. **It can still under-report
relative to a real build, and it cannot see a non-comment file at all. A clean
run is necessary, not sufficient.**

The deployed bundle is the arbiter:

```bash
css=$(curl -s https://beuseful.net | grep -oE '/_next/static/[^"]+\.css' | head -1)
curl -s "https://beuseful.net$css" | grep -o 'scroll-margin-top[^;}]*'
```

Compiling the stylesheet locally and grepping for one class reports every one of
these as absent, **including the two that demonstrably ship** — its scan root is
narrower than a real build's. That false negative is how an incomplete fix was
once reported as complete.

## Reporting

- **Report measured pixel values, never class names.** "48px became 16px", not
  the utilities that did it. A finding stated in class names cannot be checked
  against a screenshot.
- **Validate mobile layout at a root font size of around 20px as well as at the
  16px default.** The author browses at a raised scale, measured around 20 to
  21px, so rem-based budgets that pass at 16px still overflow on his device.
- Check any breakpoint-shaped class at **several** widths across the breakpoint,
  not one.
- Cite the `docs/decisions.md` key for anything touching a recorded decision.
- Separate **regressions** from **gaps**.

## Do not raise

- The mobile 3:2 cover frame. The single item most often re-raised.
- Reintroducing the masthead band, or a second axis, or a measure prop letting
  a narrow route take the wide header.
- Converting tag pills to small-caps text links.
- Adding a category to cards.
- Adding page numbers to breadcrumb chains. Position is a state, not a level,
  and it rides inline in the heading.
- A top border on the pager.
- Reintroducing cross-document view transitions, or any view-transition name.
- Restoring the per-heading scroll-margin utilities.
- Deduplicating the hairline and control-edge tokens, or the display and UI
  font tokens.
- Changing the display face's font-loading strategy from swap to optional, or
  removing the table of contents pinning code.

End the report at the findings. No summary and no encouragement.
