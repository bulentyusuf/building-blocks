# CLAUDE.md

Standing context for Claude Code working in this repo. Read before audits, so
deliberate decisions are not re-raised as findings, and before implementation
work, so house conventions are not relearned by accident.

**Entries are the short form.** Where one names a file, that file's comment
carries the full argument — read it before changing what it explains. This
document records _what_ was decided and _where the reasoning lives_; it is not a
second copy of the reasoning. An entry that grows past a few lines without a
file to point at is either genuinely homeless (the workflow and infrastructure
notes at the end) or wants moving into the code.

## Bloat is the default failure mode

Everything below is a decision someone had to defend. This governs the rest:
**solve the problem with the smallest thing that works inside the stack already
here**, and treat reaching outside it as a claim needing evidence.

That stack is Next, React, Contentful's GraphQL API, Tailwind, Shiki and
date-fns, with Pagefind at build time. `package.json` lists fifteen runtime
dependencies; before adding a sixteenth, say what it does that the fifteen
cannot. "Fewer lines in this file" is not an answer.

Four tests, in the order they usually bite:

- **Prefer the platform.** The view transitions are CSS with no library, the
  sidenote toggle is a hidden checkbox and a sibling selector with no client JS,
  the scroll offset is one `scroll-padding-top` rather than per-heading margins
  plus a listener. Each replaced something heavier, and each is why the
  equivalent JavaScript is not here to maintain.
- **Count the duplication before abstracting it.** Six near-identical routes
  were worth one shell; the `<header>` inside them was not, because folding it
  in cost a conditional per difference — an abstraction needing a branch per
  caller is just the callers, spelled worse. One refactor held both answers.
- **A helper earns its place by removing a decision, not lines.**
  `lib/paginate.ts` earns it: eight copies of the same arithmetic each had to be
  right on their own. A wrapper that renames a one-liner does not.
- **Do not build machinery for a problem that has not happened.** No rate
  limiting, no `X-Frame-Options`, no nonce pipeline — each argued below as a live
  decision rather than an oversight. Speculative generality costs the same as a
  speculative dependency and is harder to remove later.

When an elegant version and a thorough version both work, ship the elegant one
and write down what it does not cover. Documentation obeys this too: prose
repeating an argument the code already carries is bloat with a different file
extension.

## Accepted trade-offs and known non-issues

Intentional. Do not "fix" or re-flag without a new reason.

### CSP: `'unsafe-inline'` stays global, every relaxation is scoped to a route

Reopened August 2026 under this file's convention, prompted by PR #425, which
attempted the scoping with inverted header-rule order and was closed rather
than fixed. `'unsafe-inline'` remains global and deliberate — removing it needs
a per-request nonce, which forces dynamic rendering; revisit only if the site
starts rendering untrusted user-generated content.

**Two directives are now relaxed per route rather than sitewide, and neither
may go back on the catch-all.**

- **`'wasm-unsafe-eval'`** applies to the `/search` document alone, the one
  route whose Pagefind core compiles WebAssembly; without it there, search
  fails silently in every Chromium browser.
- **`frame-ancestors`** carries `https://app.contentful.com` on `/posts/*`
  alone. It sat on the catch-all until an audit in August 2026 asked what the
  preview surface actually is: the README configures the Post type's preview
  URL as `/api/draft?…&slug={entry.fields.slug}`, which redirects to
  `/posts/<slug>`, so one route family is the whole of it — and every other
  published page on the site was framable by the CMS to buy preview on that
  one. `/api/draft` deliberately does **not** carry the relaxation, because
  `frame-ancestors` is enforced on a document that is DISPLAYED in a frame and
  a 302 never is. Give a Page entry its own preview URL and this list has to
  grow with it; the symptom otherwise is a framing error in Contentful naming
  nothing in this repo.

`next.config.js` carries the full argument, and one mechanic is worth knowing
before touching anything there: Next applies every matching header rule in
array order and a later match overrides the same key, so the strict catch-all
must come first and both relaxations win by following it. `/pagefind/*` also
needs the relaxed CSP because Pagefind compiles WASM inside a SharedWorker
(`pagefind-worker.js`); SharedWorkers get their CSP from the worker script's
own response headers, not from the creating document. `lib/csp-headers.test.ts`
resolves the config through those semantics and fails if the ordering
regresses, and it keeps a known-bad control — the rules reordered as PR #425
had them — so both relaxations are re-proven catchable on every run.

### Search runs on Pagefind's Component UI, and its quirks are upstream

`app/search/` mounts Pagefind's web components with a house result template
(`<script type="text/pagefind-template">`). The markup and class names are ours;
the keyboard and WAI-ARIA behaviour is upstream's and is deliberately not
reimplemented. Because the template is ours, search CSS needs no `!important` —
if a rule seems to need it, the template is the wrong shape, so fix the
template. Keep the `pagefind` devDependency at `^1.5.2` or later; the Component
UI does not exist in 1.3.x.

The legacy `@pagefind/default-ui` and a bespoke React UI on the JS API were both
tried and abandoned. Do not propose either again — which also settles the
ranking quirks, since every fix for them means owning the result pipeline. Both
are search-core behaviour, not UI faults, and both are accepted until a
supported fix lands (Pagefind/pagefind#1246):

- A term matching nothing is truncated and retried, so "musk" returns posts
  containing "music" and "Munich" with no highlighted term.
- The over-broad case can outrank the literal match — "contentful" surfacing
  pages containing only "content" — because `ranking.termSimilarity` exists on
  the raw JS API and the Component UI does not expose it.
- A client-side filter dropping results whose excerpt has no `<mark>` removes
  the ghosts only by owning that pipeline. Do not reintroduce it.

Three more accepted properties:

- **The empty state is coupled to the input's placeholder.** `.search-empty` in
  `app/globals.css` hides the emblem via `:placeholder-shown`, so the
  placeholder must stay non-empty, and if the component's input ever moves into
  a shadow root the selector stops matching and the emblem never hides — drive
  the toggle from the instance's `results` event if that happens. Check after
  any Pagefind bump.
- **Index staleness between deploys.** The index is built by `postbuild`, so a
  post published through the webhook is live via ISR but absent from search
  until the next deploy. v1 trade-off; the fix is a Vercel deploy hook on the
  publish webhook, a workflow decision for Bulent, not an unprompted code
  change. `postbuild` writing to `public/` after `next build` works because
  Vercel packages the deployment once the build command finishes — not a broken
  pattern.
- **`/search` is `noindex`.** A search page is thin content and crawlers should
  reach posts directly. Not an SEO gap.

### The search emblem's dark-mode ground

`app/search/search-emblem-art.ts` holds the artwork and the argument;
`app/search/search-emblem.tsx` is the rendering. The knockout figure sits on a
cream underlay sliced from the art, and that ground stays cream in both schemes
while every brand token flips, so **anything rendered on it uses literal hex in
dark mode, never brand tokens** — including a border, caption or hover state
added later. Hence `.search-lens-ground` at `#FAF5F1` and the figure's
`dark:text-[#A4243B]`.

`LENS` is sliced from `PATH1` so it cannot drift from the art — not a tuning
knob. `p-8` may be nudged by eye. Tried and rejected: a rounded plate behind the
figure, a hand-tuned tilted ellipse, inverting the ink to cream, stripping the
face to keep only the glass. The paths live apart from the component because
they are 36 KB of coordinates and nothing else; do not inline them again.

### Brand colour exists in two places on purpose

The header colour is a CSS token in `app/globals.css` **and**
`BRAND_HEADER_COLOR` / `BRAND_HEADER_COLOR_DARK` in `lib/constants.ts`. Not a
DRY violation: the viewport `themeColor` and the web manifest are generated in
JS and cannot read CSS custom properties. Any change touches both files.

### A settled design call is reopened in writing, not in a branch

Each of the six entries below was answered twice during 2026, once here and
once inside PR #398, and the second answer went unrecorded until twenty-two
commits had built on top of it. Changing any of them starts with an edit to
this file, in its own commit, before the implementing branch opens.

A branch that edits this file and the code it governs in the same push has
removed the only check on itself. PR #398 is the worked example. It carried
three different values for `POSTS_PER_PAGE`, rebuilt the authors and categories
indexes then reverted them then rebuilt them, and its final commit had to
correct sections of this file that had gone stale describing a home page the
same branch had already replaced.

### The masthead band was retired in favour of a 3px rule

Retiring it sitewide was proposed and rejected once — the entry directly
above this one used to say so. CLAUDE.md's own convention is that a settled
call is reopened in writing before a branch touches it, so this rewrite is
that reopening, landing in the same commit as the code it governs: Phase 1 of
the PR #398 salvage plan.

`app/wide-page.tsx` is the shell every wide route renders through, and it now
carries the full argument for what replaced the band in its own docstring: a
`<header>` closed by a 3px `border-brand-dark` rule standing in for the colour
boundary the band drew for free. Read that docstring before touching either
piece.

**The band's inset stays two numbers, one on each side of the rule.** It was
two because it was two colours — `pb-8` of navy below the header, then
`Container`'s `pt-6` of cream below the band's edge — and one surface does not
merge them, because the rule now sits where the colour step used to and which
side each number falls on is the whole point. Folding both into the header's
bottom margin preserves the total and puts all of it above the boundary, which
leaves the first content element flush against a 3px line on home, the post
page and the four section fronts. The ruled listings hide it, because their
items carry `py-10 md:py-12` of their own, so a green suite is not evidence
either way — `lib/listing-rhythm.test.ts` asserts both halves separately.

`contentOwnsLeading` therefore suppresses the gap **below** the rule, never
the header's margin above it. A prop meaning "the content below supplies its
own space" cannot be spent on the space above the boundary. Only
`app/listing-page.tsx` sets it. Home and the post page set it before the
retirement, because their covers pulled up across the band's edge and supplied
their own leading that way; the pull-ups went with the band and the flag had
to follow.

What went with the band: the `bleed` prop and the `-mt-16` cover pull-up on
home and the post page — covers are contained now, like every other cover on
the site (see "Covers take one of two frames" below); the `tone` prop on
`app/breadcrumb.tsx` — one surface now takes one style, and the accent link
colour that could not clear contrast on navy is back on every trail; and
`.band-prose` in `app/globals.css` — ordinary crimson links read fine on
cream and need no underline substitute. The unbuilt cover-tint feature
assumed the band's deepened inset; it never shipped, so nothing live depended
on it, but it needs re-deriving against a contained cover if it is ever
picked up.

`--color-brand-band` and its dark-mode lift were left in `app/globals.css`
through Phase 1, unreferenced, and Phase 2 removed them along with
`--color-footer-bg`.

### The masthead splits into heading and standfirst, right-anchored

Every wide route's header used to stack its heading and standfirst. It now
lays them out on one row from `md` up, standfirst pinned to the container's
right edge, and stacks them below `md`, where a 60px heading has no room
beside one. `app/wide-page.tsx` carries the full argument.

**This is M5 from a five-option mockup, and it replaced a left-flowing row
that shipped first and was rejected on sight.** The left-flowing version put
a fixed `gap-10` between the heading and a standfirst that started wherever
the heading ended; in review, a short heading left the standfirst stranded in
the empty middle of the row with nothing anchoring it. The fix has two parts
that ship together, not one:

- **`justify-between`** pins the standfirst's right edge to the container's,
  constant on every route.
- **The standfirst's own `max-w-[20rem]`** (320px) forces most standfirsts to
  wrap to two lines rather than trail off as one short line at the far
  margin. `justify-between` alone reintroduces the original objection to
  right-anchoring — a one-line standfirst beside a short heading still leaves
  a large empty gap — and the two-line wrap is what closes it. Do not ship
  `justify-between` without the width cap, or the reverse.

`items-baseline-last` matters more here than plain `items-baseline` would:
with a two-line standfirst, first-baseline alignment hangs the second line
below the heading, and last-baseline closes both blocks at the bottom
instead.

`WidePage` took one opaque `header: ReactNode` before this; it now takes
`heading`, an optional `standfirst`, and `splitHeader` (default true). The
row only renders when both `splitHeader` and `standfirst` are truthy, so a
route with no standfirst — the post page's `h1` — falls back to the plain
stack automatically, and `app/listing-page.tsx` passes both props straight
through from its own `heading`/`standfirst` API.

**Every standfirst carries `md:max-w-[20rem] text-lg leading-relaxed
md:text-right text-brand-muted`.** `text-right` sets both block edges flush
against the container, chosen over ragged-right knowing that ragged-left text
reads worse — an accepted, small cost at two lines and 18px.
`lib/palette-contrast.test.ts`'s Standfirst-role guard requires all four
classes in its pattern, not just `text-brand-muted`: a standfirst that loses
`max-w-[20rem]` or `text-right` stops matching the guard rather than failing a
later assertion, so both have to be part of the anchor itself.

**`max-w-[20rem]` and `text-right` carry `md:`, and shipped without it once.**
Both classes exist to close the gap `justify-between` leaves in the ROW — see
above — and the row is a `md:flex-row` construct that does not exist below
that breakpoint, where `WidePage` stacks with `flex-col` instead. Unprefixed,
the two classes still applied on their own: a phone-width standfirst shrank to
a 320px box and had its text right-aligned inside that box, landing its right
edge short of the actual page edge — under a left-aligned `h1`, above a
left-aligned hero. It read as a typesetting mistake because it was one:
aligned to a boundary nothing else on the page drew.

**The shortfall scaled with the viewport, which is why it went unreported for
so long.** `max-w-[20rem]` only binds once the content column exceeds 320px,
so there was no shortfall at all at 375px and it grew from there. Measured on
the pre-fix markup: 15px at a 390px viewport, 55px at 430px, 265px at 640px,
and 392px at 767px, one pixel below the breakpoint that hid it. It was mildest
on the narrow phone it was first noticed on and worst on a large phone or a
portrait tablet, so a screenshot from the narrowest device understates it. Do
not judge an unprefixed `md:`-shaped class from a single viewport width.

`md:` on both classes turns them on at the same breakpoint the row itself
appears at, so mobile gets a full-width, left-aligned standfirst instead.
`justify-between` and `items-baseline-last` needed no such fix: they already
carry `md:`, which is what makes them no-ops below it. The flex container
itself renders at every width and only changes direction, `flex-col` to
`md:flex-row`. Fixed August 2026; the guard's pattern requires both `md:`
prefixes now, not just the two classes.

**The 320px cap sets a hard copy budget: roughly 37 characters a line, 74 for
two.** Every standfirst on the site — the four browse intros and the twelve
tag descriptions — was measured and rewritten to fit it as of 19 August 2026,
published and verified against the CMS rather than taken on report. Ten tag
descriptions and four browse entries were rewritten; ranges moved from 46–134
characters to 46–74. `Design`, the tag description, sits at exactly 74 with no
headroom — a word added to it pushes to three lines, which is the entry to
watch rather than a defect to fix. There is no width that fits both this copy
and the old, much longer tag descriptions at once; normalising the copy is
what removed the conflict, not a more generous cap. A note on the tag
`description` field in the content model should record this budget for
editors, the same way `browseIntro.standfirst` already carries guidance —
outstanding as of this writing.

**The author routes are the one exception**, via `splitHeader={false}`: their
`h1` already sits in a flex row beside a 112px portrait, and a third element
across that line is one too many. They render exactly as they did before this
change — bio included, `max-w-3xl`, no `text-right` — because the stacked
fallback `WidePage` takes when `splitHeader` is false is the same markup
shape the author routes always used, and they were never brought into M5 at
all. `app/wide-page.test.tsx` asserts only the two author route files set the
prop, anchored on the JSX form at line start so a comment explaining the
exception cannot be mistaken for the prop itself; `lib/palette-contrast.test.ts`
checks those two files against the old, pre-M5 signature specifically, since a
pattern loose enough to match both signatures could not tell a route that
correctly kept the old style from one that regressed out of the new one.

The position counter no longer rides in the `standfirst` slot at all — see
"The page counter moves inline, into the heading" below. It once did, folded
in after the standfirst as a fragment, and that fragment is exactly what
broke the two-children invariant `app/wide-page.tsx`'s wrapper div now
guards against on every future caller, not just the one that caused it.

### The home hero takes the split too, asymmetric, with Avatar kept whole

`HeroPost` in `app/page.tsx` used to stack headline, excerpt, byline and tags
in one column under the cover. It now splits into two from `md` up:
`md:grid-cols-[3fr_2fr]` at a flat `gap-x-16` (no `lg:` step). Left carries
the headline and the byline; right carries the standfirst and the tag row.

**The container is a base-level `grid`, not `md:grid`.** It shipped as
`md:grid md:grid-cols-[3fr_2fr] md:gap-x-16` with no grid at all below `md`,
so the two columns fell back to plain stacked block divs with nothing between
them — `gap-x-16` is a horizontal gap, which does nothing to a stack, so the
byline block and the excerpt sat flush against each other on mobile, a 0px
join on the largest element on the page. It is `grid gap-y-6
md:grid-cols-[3fr_2fr] md:gap-x-16 md:gap-y-0` now: a single-column grid with
its own gap at the base, widened to two columns at `md`, matching every other
two-column grid on the site (`app/categories/page.tsx`, `app/authors/page.tsx`,
`app/more-stories.tsx`'s two variants, the footer) — the hero was the one
component on that list built the other way round. `gap-y-6` (24px) is a
judgement call, not a measurement: it has to read as a clear step above the
`h2`'s own `mb-4` (16px) to the byline directly above it, so the mobile stack
reads as two groups of two rather than four equally-weighted lines: `gap-5`
(20px), the nearest sibling precedent, is not quite that step.

**`md:gap-y-0` is defensive, not load-bearing, and the entry said otherwise
once.** Two children in a two-column grid make exactly one row, so `row-gap`
has nothing to act on and `gap-y-6` is already invisible at `md` and up
without it — verified by computed style, `grid-template-rows: 168px`, a single
track. It is there so that a third child added to this grid later inherits the
two-column layout's intent rather than the mobile stack's, which is worth one
class. Do not describe it as required, and do not remove it on the grounds
that it does nothing today.

Fixed August 2026, alongside the standfirst `md:` fix above — same root cause,
a class describing the split row applied below the breakpoint where that row
does not exist. `lib/listing-rhythm.test.ts` asserts the base-level `grid` and
both gap classes.

**This replaced an equal-column version that shipped first and ran to four
lines on a real headline.** The first cut measured wrap against the seed's
placeholder titles (17–31 characters) and capped the headline at 48px on an
even `md:grid-cols-2 md:gap-x-16 lg:gap-x-32` split, which resolves to a
428px column. Measured instead against the six most recently published post
titles (38–57 characters), 48px in a 428px column runs to four lines on the
longest of them. **The fix has two parts, and both matter:** the asymmetric
`3fr_2fr` split at a flat `gap-x-16` (no widening `lg:` step, unlike
`more-stories.tsx`'s own two-column grids — this column cannot spare the
gutter width those can) measures a 566px left column, wider than the even
split's 428px; and the headline caps at 40px (`lg:text-[2.5rem]`, off
Tailwind's scale on purpose — `lg:text-4xl` at 36px is the on-scale fallback
if the arbitrary value is ever found objectionable) rather than 48px. Do not
go back to 48px in a split column at this container width, and do not widen
the gutter at `lg`.

**Avatar stays whole.** The first cut also pulled the date out of `Avatar`'s
`meta` prop to mirror the index card's element order (headline, date,
standfirst, tags) field-by-field, rendering it as a standalone line the way a
card does. That was reverted: `Avatar` already takes `name`, `picture` and
`meta`, and the date was already doing the right job inside `meta`, so
pulling it out cost a working component to chase a sequence no card actually
needs matched exactly — no card carries a byline at all, so there was nothing
to mirror there in the first place. The byline renders through
`<Avatar meta={dateline} />` in the left column, under the headline, exactly
as it did before the split; `Avatar` itself is untouched. `lib/listing-rhythm.test.ts`
asserts both the presence of `meta={dateline}` and the absence of a
standalone date line, so a later refactor cannot pull the two apart again
without a test noticing.

The date sitting inside the byline rather than on its own line is a stated
deviation from the card's element order, not an oversight: keeping `Avatar`
whole was judged worth more than an exact field-by-field mirror. The tag row
stays at `mt-3`, not the pre-split `mt-6` — that value was tuned against a
40px avatar block sitting directly above the pills in the same column, and
the avatar is in the left column now, so what sits above the pills on the
right is a text baseline (the excerpt), exactly as it is on a card.

### Chrome is aubergine, one token for the bar and the footer

`#2B1C3F` light, `#3B2A52` dark, carried by `--color-brand-header` and by its
literal twins `BRAND_HEADER_COLOR` / `BRAND_HEADER_COLOR_DARK` in
`lib/constants.ts`. See "Brand colour exists in two places on purpose" above
for why it lives in both files, and note that the literals now feed the
manifest's `theme_color` as well as the viewport `themeColor` — a drift there
paints the mobile address bar and the installed app in the old colour, which
no desktop review surfaces. `lib/palette-contrast.test.ts` holds each literal
against its own scheme's token.

**This reopens a call recorded here as settled.** The previous entry said
chrome was navy and that a move to dark aubergine had been rejected — not on
contrast, which was sound, but because the unbuilt cover-tint design derives
its per-post hue against a navy bar. That objection no longer stands on its
own: Phase 1 already broke the cover-tint's other assumption, the band's
deepened inset, so the feature needs re-deriving whether or not the chrome
moves. A blocker that is already blocked cannot also block this.

What the change buys: the bar was `#1E3A8A` and the footer `#241B1D`, 1.62
apart and in different hue families, so the top and bottom of every page read
as two unrelated surfaces. Three chrome tokens across two families collapse to
one.

- **The band had to go first, and that ordering is not a preference.** The
  repo's chrome ramp is a 1.60:1 step between bar and band, band darker.
  `#2B1C3F` is dark enough that pure black beneath it reaches only 1.34:1, so
  no band value fits under it at any hue. In dark it fails from the other side:
  `#3B2A52` clears the 1.4 block-visibility floor by 0.06, and a band a 1.55
  step under that would sit below the page and invert. Making room for one
  means lifting the bar to roughly 2.18 against the page, a markedly louder
  violet. The alternative — keeping the band and inverting the assignment, with
  `#2B1C3F` as the band and a lifted `#503872` bar — was costed and rejected:
  the footer then matches either the bar (and its small print fails AAA) or the
  band (and the header-to-footer split reopens one surface over).
- **The footer's faintest tint is `white/72`, and this is not a rider.** It was
  `white/65` against the old `#2E2420` dark footer, where it gave 7.21. The
  footer shares the bar's `#3B2A52` now, which is lighter, and `white/65` there
  is 6.37 — under the 7:1 floor the test enforces on footer small print. The
  light surface alone would not have needed the change (`white/65` on `#2B1C3F`
  is 7.35), which is exactly how it gets missed: the scheme that fails is the
  one nobody has open. The Phase 2 briefing called this bump unnecessary on
  light-mode arithmetic and was wrong; the guard caught it.
- **The accent still cannot be used on chrome.** `brand-crimson` on the
  aubergine is 2.04:1, so the trail, the nav and the footer identify links by
  weight and underline rather than colour, and anything sitting on chrome
  overrides the sitewide crimson focus ring with a white one. Asserted, so the
  exception is not silently dropped if the chrome is ever lightened — at which
  point the override becomes the bug rather than the fix.

### Covers take one of two frames, chosen by `wide`

`app/cover-image.tsx`. With `wide`, the frame is 3:2 on mobile and 16:9 from md
up, which is the treatment for any cover off the 1920x1080 source, meaning
every post cover. Without it the frame is 3:2 at every width.

The mobile 3:2 is deliberate and is the single item most often re-raised as a
finding, so read the prop's own comment before changing it. Two replacements
have been proposed and both rejected, a 4:3 crop on cards and a uniform
uncropped 16:9 everywhere.

### `POSTS_PER_PAGE` is five, and changing it is a design pass

`lib/constants.ts`. Home's hero counts toward the budget, so page 1 is a hero
plus four cards and every later page holds five. Values of eight and ten have
both been tried and reverted.

The constant is not the whole change. Home's shape, the `/page/[page]` slice
and every taxonomy listing read it, so a new number needs all four looked at
in one pass rather than a constant bump.

### A card's meta line is the date alone, above the excerpt

`app/more-stories.tsx`, in `PostPreview`. Both variants carry it in that
position.

No category on cards. The reason is in `app/page.tsx`'s `HeroPost` comment.
The site has two categories, so the label carries about one bit, and putting it
on cards would need a per-route exception on `/categories/[slug]` and its
paginated pages, where the category names the page the reader is already on.
Adding `category` to `CardPost` was proposed and rejected, which also leaves
`CARD_GRAPHQL_FIELDS` in `lib/api.ts` unchanged.

### Tags render as pills, in one implementation

`app/tag-pill.tsx`, wrapped by `TagRow` in `app/more-stories.tsx` and used
directly on the post page. Pills sit below the excerpt on a card and below the
body on a post, and `TagRow`'s comment carries the reason for both positions.

Converting them to small-caps text links was proposed and rejected. If it is
revisited, it is one change reaching both call sites, not a card change plus a
post-page exception. The rejected version shipped exactly that split and left
the site with two tag treatments.

The distinction is what the tag is DOING on the page, not where it sits. A pill
is for a tag as metadata, attached to something else — a card, a post. A link
is for a tag as a destination, where the tag is the subject: the `/tags`
glossary renders tag names as sized links rather than pills, and the search
page's empty state does the same for the same reason. Neither is a third
treatment. Adding a fourth would be.

### Image loader passes only `w`, `q`, `fm=webp` by design

Cropping is CSS-side (`object-cover`). The absence of Contentful's
crop/focus/height params is a decision, not an omission.

### A `priority` image is opaque in the server HTML, and that is the LCP fix

`lib/contentful-image.tsx` starts its reveal state at `instant` when `priority`
is set, so the LCP candidate never waits on hydration; the file carries the
argument. Chromium's LCP algorithm skips fully transparent elements, so the
`opacity-0` every image once shipped with meant the measured paint was the React
commit rather than the (preloaded) bitmap's arrival, and `@media (scripting:
none)` does not cover the pre-hydration window. Lazy body images keep the full
pending → instant/fade machine, and `lib/contentful-image.test.tsx` asserts both
halves. Do not collapse the branch back to one initial state.

**A `sizes` value must stop growing where its container does.** `Container` is
`max-w-5xl` with `px-5`, so content tops out at 984px, and a bare `vw` clause
past that point buys a derivative one or two steps larger than anything on
screen — the listing covers in `app/more-stories.tsx` and the thumbnails in
`app/categories/page.tsx` each carry the arithmetic for their own track. The
home and post hero covers are already capped in px and need nothing.

### Three border roles, and they are not interchangeable

All three are defined and argued in `app/globals.css`.

- **`--color-hairline`** — every rule between list items, cards and panels, and
  the edges a listing draws around itself. It inverts on its own, so never add a
  `dark:` variant to an element using it, and never reintroduce bare `gray-200`
  borders. **`app/pagination.tsx` deliberately has no top border**: the listing
  above it closes itself, so a rule here would land in the same row and print a
  double line. Both files carry the note; the pager looking unattached is not a
  missing border. The listing's **closing** rule is the load-bearing half —
  a listing under a wide-page header drops the opening one via
  `openRule={false}`, never the other (see "How the wide-page header is
  built").
- **`--color-control-edge`** — `app/tag-pill.tsx` only, and **not** a divider
  despite having borrowed the divider token for a long time. It carries a
  contrast floor (WCAG 1.4.11), which is why it is two literal values rather
  than a `color-mix()`. `lib/tag-pill.test.ts` recomputes both ratios from the
  stylesheet and asserts the tokens stay distinct, so "deduplicating" them fails
  loudly.
- **The `border-2` image frames** in `lib/rich-text.tsx` and
  `lib/lightbox-image.tsx` are a heavier role with their own pairing. Leave them.

### One focus indicator, set in `@layer base`

`app/globals.css` defines a single `:focus-visible` rule. Do not add
`focus-visible:ring-*` or `focus-visible:outline-*` to components — focus
looking wrong usually means a missing `focus-visible:outline-hidden` before a
local override. Three exceptions, each with its contrast reasoning in the file:
the coloured header and footer bands (where the `outline-hidden` is required,
not decorative); the code-block scroll regions in `lib/rich-text.tsx`, which
draw inward because their `overflow-hidden` parent clips anything outside, so a
`ring-*` is not an alternative; and the two fixed controls, `app/back-to-top.tsx`
and `app/exit-preview-button.tsx`. The last was once "simplified" and reverted;
do not propose it again.

### One scroll offset, `scroll-padding-top` on `html`

`app/globals.css` sets it on the scroll container, not the target, and it
**replaced** the per-heading `scroll-mt-*` utilities rather than joining them —
they are additive, so the two cannot coexist. The file explains why the
container wins (it also covers the browser scrolling a _focused_ element into
view, WCAG 2.2's 2.4.11, which `scroll-margin` does not).

`app/table-of-contents.tsx` reads this offset to place its activation line;
`lib/toc-active.ts` carries the derivation, and `lib/toc-active.test.ts` fails
on any `className` carrying that utility and asserts the fallback constant still
matches the stylesheet.

Recompute the 5rem — and the skip link's `focus:top-2`, which centres a 36px
link in the 52px band rather than being a nudge — if the header's `py-3` or the
masthead's `text-lg` changes.

### The skip link's target is focusable

`<main id="main" tabIndex={-1}>` in `app/layout.tsx`, which explains why: a
fragment moves the sequential-focus starting point in some browsers and not
others, and `-1` adds no tab stop. Not redundant; it is the half the browsers
disagree on.

### The lightbox trigger is gated on `mounted`, deliberately

`lib/lightbox-image.tsx` renders the image bare until mount, then wraps it in
the enlarge button. Rendered unconditionally that button was focusable,
announced "Enlarge image" and did nothing with scripts off — a control that
lies. `mounted` gates the affordance, not the content, and a test asserts the
server HTML carries no `<button>`. Do not "simplify" the conditional away.

### One announced link per card, and one description per figure

Three doubled labels that each look like a missing one. All came out of the
accessibility audit; do not restore any. Each file carries its reasoning.

- **A linked cover is hidden from assistive tech** — `app/cover-image.tsx`, whose
  `aria-hidden` and `tabIndex={-1}` move together and which explains why it has
  **no `title` prop**. Focus can no longer land inside the cover, so the
  focus-within zoom went with it; the hover zoom stays.

**`CoverImage` takes the whole asset, and that is what makes the alt-text guard
reachable.** It took a `url` and an `alt` string until August 2026, which is
precisely what let every call site hand the CMS `title` through unchecked:
`isPlaceholderTitle` had one call site, `lib/rich-text.tsx`, so a cover
carrying a filename stem announced the filename. It could not have been checked
either — the cover selections asked for `url` and `title` alone and the
comparison needs `fileName` — so the fix is a query change and a prop change
together. A component cannot guard a decision it is only shown the answer to.

Two consequences worth knowing. `fileName` is now selected on every cover and
on the category thumbnail and is **never rendered**; it exists for the
comparison. And a cover with no usable title falls back to `""` with a build
warning, exactly as an embedded figure does — **`description` is deliberately
not consulted as a fallback**, because on a figure that field is the caption,
and the note below about one field doing two jobs is a warning rather than a
pattern to extend.

- **Footer column labels are `<p>`, not `<h4>`** — as headings they skipped a
  level on every page whose deepest heading is an `h2` (axe `heading-order`),
  and promoting them to `h2` would flip them to the display face. Both navs
  carry `aria-label`, so the landmarks stay named.
- **An embedded figure's `alt` is empty whenever a caption renders** —
  Contentful's `description` is one field doing two jobs. `lib/lightbox-image.tsx`
  derives this from `caption` being present. The build-time warning for a
  missing description still fires.

### A scroll region's name carries its position, not its contents

The table and code-block wrappers in `lib/rich-text.tsx` are focusable scroll
regions, so each needs an accessible name. Every table was named the literal
`"Table"` and every filename-less code block `"Code block"`, which made two of
either in one post indistinguishable in the list a screen reader keeps of
regions — the list that exists to tell them apart. Both now count in document
order and name themselves `Table 2`, `Code block 2`; a code block with a
filename is still named by it, which is better than a number.

**The name is a position on purpose, not a summary of the table.** Deriving it
from the header row was the obvious alternative and is wrong here: those cells
are announced again the moment the reader enters the table, so the region would
duplicate them — the same defect the rest of the accessibility work in this repo
removed. Contentful's table model carries no caption field to use instead.

`app/a11y.test.tsx` renders **two** tables for this, which is the smallest
fixture that can tell a working name from a broken one — the old assertion
named the literal `"Table"` and so held the defect in place rather than
catching it. With two present, axe's own duplicate-name rule fails as well.

### Breadcrumbs, and the one page without them

- **Constrained to their page's own measure.** `Container` is `max-w-5xl`. Pages
  whose content is also `max-w-5xl` render `<Breadcrumb>` unwrapped; pages in a
  `max-w-2xl` column wrap it in `<div className="mx-auto max-w-2xl">`, or it
  starts 176px left of the heading it labels. Any new narrow page needs the
  wrapper — same split as "One axis, and it is the header measure" below, which
  is where the assignment lives.
- **On `/search` the wrapper sits before the `<section>`**, not inside it:
  `.search-empty` must stay the immediate next sibling of `.pagefind-scope` for
  the emblem's `:has()` rule to fire.
- **`/page/[page]` carries Home / Latest Posts, and the argument against it was
  wrong.** It shipped trail-less on the reasoning that a trail would point both
  crumbs at `/`, since the pagination sets `basePath="/"` and page 1 of this
  listing _is_ the home page. That assumed a linked final crumb, which is not
  the convention here: the last crumb is never a link, exactly as
  `/categories/side-quests/page/2` renders Home / Categories / Side Quests with
  only the first two linked. So the trail is one link and the objection was to a
  shape this site does not build. What still holds is that the page number stays
  out of the trail — position is a state rather than a level, which is why the
  crumb says Latest Posts and not Page 2. "Latest Posts" is the `h1` from page
  2 onward and appears nowhere on `/`, whose listing renders no heading at all.
  `/about`,
  `/privacy`, `/search` and `/archive` carry the same two-crumb minimum.
- **Position is carried separately**, inline in the `h1` (`app/page-counter.tsx`,
  "The page counter moves inline, into the heading") rather than in the
  breadcrumb — which is why paginated category, tag and author chains stop at
  the section. Do not add page numbers to those chains.
- Known and accepted: on `/categories/[slug]/page/[page]`, `aria-current="page"`
  sits on the section crumb, whose URL differs from the current one.
- Archive rows carry two tab stops each, title and category, because the
  category links to its category page as it does on the home hero.

### Sidenotes carry several load-bearing constraints

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

### Cross-document view transitions were removed, and why they never ran

The site opted in with `@view-transition { navigation: auto }` in
`app/globals.css`, plus `view-transition-name` on every cover and on the
wordmark, and a deleted `view-transition-name.ts` in `lib/` allocating unique
names per page. None of it ever animated anything.

`@view-transition` is the CROSS-document API. It fires only when one document
replaces another. Every link here is a Next `<Link>`, which intercepts the
click and navigates client-side, so no document is ever replaced and the
transition never starts. The mechanism and the router were never compatible.
It shipped dead and stayed dead, unnoticed, for months.

The App Router's own mechanism is React's `<ViewTransition>` component, which
does SAME-document transitions and is activated by React Transitions, which
Next route navigations are. Migrating to it is a real option and was declined
in August 2026 on the grounds that a feature nobody missed for months is not
one worth rebuilding. If it is ever revisited: wrap the listing card's cover
and the post hero's cover in `<ViewTransition name={...}>` with `share="morph"`
and `default="none"` on both, drop `default="none"` at your peril since the
pair silently stops morphing without an explicit `share`, and note the morph
only plays when the destination is prefetched and renders in the same commit
as the navigation.

Nothing in the codebase should now name a view transition. If a
`view-transition-name`, a `viewTransitionName` or a `transitionName` prop
reappears without this entry being rewritten first, it is dead code again.

### Tags have their own pages, and `/tags` is the index

`/tags` lists every tag with its posts grouped beneath it; each tag name links
to `/tags/[slug]`, a landing page with a breadcrumb, an `h1`, the tag
description as standfirst and the paginated post list — the same relationship
`/categories` has with a category page.

**Do not propose going back** to pills linking to `#slug` anchors on `/tags`.
Thin content and SEO risk were both raised and settled: a tag page is no more
guilty than a category page, and Google consolidates duplicate listings rather
than penalising them. What decided it was orientation — an anchor drops the
reader past the breadcrumb, the `h1` and the standfirst with nothing saying what
page they are on. Section `id`s survive on the glossary so old anchors still
land, but nothing generates them.

`lib/tags.ts` argues the data model — why `postsWithTag` filters in memory
(Contentful's GraphQL cannot filter on an `Array<Link>` field, and `linkedFrom`
has no ordering), and why `MIN_POSTS_PER_TAG` is two. What that leaves for here:

- **It takes the posts, it does not fetch them.** A per-tag fetcher wrapping
  `getAllPosts` — the removed `getPostsByTag` — issued a second identical
  request per render, and `getAllPosts` is not `cache()`-wrapped, so nothing
  collapsed them. Do not reintroduce one.
- **Every surface reads the threshold through the one `visibleTagSlugs`
  helper**, and they must stay on one helper. It gates three: the glossary, the
  sitemap, and `/tags/[slug]`, which **404s** below it. A test asserts they
  agree.
- **`MoreStories` takes `visibleTags?: Set<string>`, not a boolean**, so pills
  cannot be switched on without answering which tags have a live page. Compute
  the set from **all** posts — category and author pages fetch only their own
  slice, and counting across a slice hides tags the glossary shows.
  `getVisibleTagSlugs` in `lib/api.ts` does that fetch for those pages; the home
  pages already hold `getAllPosts` and pass `visibleTagSlugs(allPosts)`
  directly. A tag page passes the set **minus its own slug**.
- The glossary is `data-pagefind-ignore`: it repeats every post title once per
  tag, so Pagefind would weight the repeats above the posts themselves — same
  reasoning as the table of contents.
- Pills sit below the article body, not in the `xl`-and-up sidebar where they
  would vanish on the viewports most people read on. They also appear on listing
  cards on the home index and its pages and on category, author and tag pages,
  and on the home hero, which is a listing item in everything but its component
  — **not** on the "Read Next" block at the foot of a post, which sits directly
  under that post's own tags and would say the same thing twice in one viewport.
  `/search` renders Pagefind's client-side templates for results and carries no
  tag data there; its empty state fetches tags separately to offer a few as
  links, not pills — the same subject-vs-metadata reason as the glossary, see
  "Tags render as pills" above. There is one `TagRow`, exported from
  `app/more-stories.tsx`; the hero imports
  it rather than carrying a second pill implementation. It sits **last** on the
  hero and below the excerpt on a card, which is the same rule and not the same
  position: a ragged pill count belongs at the foot, and the hero's byline is
  below its excerpt where a card's date is above.
- **Tag a post as part of publishing it.** The first untagged publish is the
  first ragged card.

### Browse-page copy is editable, site identity is not

The standfirst and meta description on `/tags`, `/categories`, `/authors` and
`/archive` come from a `browseIntro` entry keyed by route slug, so all four use
`generateMetadata()` rather than a static `metadata` object and share
`browsePageMetadata` in `lib/page-metadata.ts`. `getBrowseIntro` must be called
with the same slug in `generateMetadata` and in the component — see the
`cache()` section below. A missing entry degrades to a heading, not a 500.

**`/page/[page]` reads the same way, under the slug `latest-posts`**, which
names the route rather than the content type as the other four do. Its
standfirst was a constant in `lib/constants.ts` until it moved, so it was the
one browse standfirst needing a deploy to edit, and it had no meta description
at all. It does **not** share `browsePageMetadata`, because that helper builds
its canonical from the slug and this route's canonical is per page — so
`app/page/[page]/page.tsx` keeps its own metadata object and takes only the
description from the entry. The slug lives in one `INTRO_SLUG` constant there
for the `cache()` reason, the same way `/about` and `/privacy` share one `SLUG`.

**Home does not, and that asymmetry is deliberate.** `/` carries
`SITE_DESCRIPTION` under the masthead, which is site chrome rather than page
copy — the same reason `SITE_TITLE` stays in code. Do not unify the two by
giving home a `browseIntro` entry or by moving the tagline into the CMS.

The two also disagree about fallbacks on purpose. `/page/[page]`'s standfirst
has none, because hard-coded copy in the CMS's slot is how the entry stops being
the source of truth with nothing on the page saying which you are reading. Its
meta description does fall back to `SITE_DESCRIPTION`, matching the four fronts,
because an empty description is worse in a search result and chrome cannot be
mistaken for an edit nobody made.

**`/archive` is deliberately different.** Its standfirst is generated from the
data — post count and earliest month — and the `browseIntro` field there is an
_override_: leave it empty and the counter renders, which is why `standfirst` is
optional on the content type. The override is all-or-nothing and untrimmed, so
whitespace would suppress the counter and render an empty paragraph.

Site-level constants stay in code. `SITE_TITLE` alone is read by fourteen files
— the web manifest, the feed, and page metadata throughout — routes that never
touch Contentful. Moving those behind a network fetch is a much larger change
than editing a standfirst; not the obvious next step.

The four `NEXT_PUBLIC_` identity overrides are not a counterexample: build-time
config resolved once at module scope, with the live values still the defaults in
code. What this section rules out is the fetch, not the variable.

### The OG card's font is guarded by a real render, not a hash

`app/posts/[slug]/opengraph-image.font.test.tsx` renders the committed WOFF
through `next/og` and asserts a PNG comes out, and explains why that beats a
hash pin. The rule it enforces: **any font check must import from `next/og`,
never from `satori`** — the vendored Satori is older and rejects layout tables
the standalone package parses fine, which is what sank an earlier display face.

### Other reviewed items, intentionally left as-is

- `data:` in `img-src` stays — needed for next/image blur placeholders, and the
  once-suggested `data:image/*` is not valid CSP (scheme-sources cannot be
  MIME-scoped). `blob:` sat alongside it on the same line since the original
  CSP commit and was removed once audited: nothing in the codebase ever
  creates a blob URL (no `URL.createObjectURL`, no blob-based image handling
  anywhere in `app/` or `lib/`), so it was pure unused attack surface, not a
  paired necessity with `data:`.
- No `X-Frame-Options`. `frame-ancestors` covers every current browser, so the
  legacy header is low-value, not a gap.
- No rate limiting on the API routes. Secrets are compared with
  `timingSafeEqual`, so brute force is infeasible provided they are long and
  random — confirm the configured secrets are high-entropy.
- `dangerouslySetInnerHTML` for Shiki output in `lib/rich-text.tsx`: trusted CMS
  input, and the renderer allowlists URL schemes.
- **Pagefind's `{{+ excerpt +}}`** in `app/search/search-client.tsx` is the
  site's other raw HTML sink, and belongs on this list rather than being left
  implied by a code comment. The `{{+ +}}` form is Pagefind's unescaped
  interpolation and is what preserves the `<mark>` highlights; the content
  reaches it from post bodies through the build-time index, so it inherits the
  same trusted-CMS model as the Shiki output above. The template around it is
  ours and static — the `{{ }}` interpolations in it, `meta.title` and the
  hrefs, are escaped and `safeUrl`-filtered by Pagefind.
- The sitemap filters CMS `Page` entries through `ROUTED_PAGE_SLUGS` in
  `app/sitemap-xml/route.ts`, so a newly published Page cannot inject a URL with
  no route. Only `/about` and `/privacy` are routed today, both hardcoded; add
  any new routed slug to that set. A root catch-all `[slug]` route was the
  alternative and needs collision care with `/posts`, `/categories` and
  `/authors`, so it was not taken.
- Dependabot ignores major version updates, to avoid breaking-change churn for a
  solo maintainer. Advisory-driven security updates are a separate mechanism and
  still cover security-flagged majors. Not a gap.
- CI actions are pinned to major tags (`@v4`), not commit SHAs — accepted as low
  risk because they are first-party.
- `package.json` pins **postcss** `^8.5.23` and **sharp** `^0.35.3` through
  `overrides`, clearing advisories in copies `next` bundles and does not update.
  With the uuid override below they are the only reason `npm audit` has no high
  findings — do not remove them to "let next manage its own deps", and re-check
  them on every `next` bump, since an override silently pins a dependency the
  parent may have moved past. Forcing sharp is safe because `next.config.js`
  sets `images.loader: "custom"`, so Next's optimiser never invokes sharp —
  which is also why the image optimisation advisories never applied.
- **uuid is held at `^11.1.1` by an override** (GHSA-w5hq-g745-h8pq), because
  `contentful-import` pins `contentful-batch-libs ^9.7.0` and never picks up the
  11.x line that already declares a safe uuid. Do not remove it, and do not
  reach for `contentful-cli` instead — it depends on `contentful-import` and
  drags the same 9.x chain in nested. Safe across the majors because
  `contentful-batch-libs` touches uuid in one place, `add-sequence-header.js`,
  so re-check that call site if the override is ever bumped.

### Posts carry `authors`, an ordered array capped at three

Authors share the byline as co-authors, but the order carries meaning: the
first entry is the lead. It sits in front in the 14px-overlapped portrait
stack, reads first in the name line, and fills the two surfaces that take
one value, the RSS `<author>` element and the OG image byline. Reordering
the array in Contentful changes both. The Contentful size validation and the
GraphQL `limit` are both 3 and must move together.

Names join with an ampersand, no serial comma before it, separators outside
the anchors. The ampersand is presentation only and never reaches XML or
JSON-LD.

`author`, singular, is not deleted, and it has not been omitted either —
that is phase 4, and phase 4 has not happened. It stays present, populated
and queryable until phase 3 is verified in production; that is the point of
an additive migration, that a post never lacks an author and rollback is
"revert the code," not "restore the data." `AuthorBioCard` still reads it
today. Do not query it in new code, and do not read this entry as saying
the retirement is done.

There is no `getPostsByAuthor`. Contentful GraphQL cannot filter a collection
on `Array<Link>`, so author pages fetch `getAllPosts` once and filter with
`postsByAuthor`, exactly as tag pages do. `getAllPosts` is not
`cache()`-wrapped, so fetch once per route and read twice.

Reversal, 3 September 2026. This replaces the contributor credits model, in
which a post had one author plus optional secondary contributors. That was
built and closed unmerged as PR 437. Co-authorship was judged neater than a
two-tier byline, and expressing hierarchy through field membership was judged
not worth the second field. `authors[0]` is the residue of that decision and
is the thing most likely to be misread later.

## House conventions

### Two faces, three roles, and no family named directly

`app/globals.css` defines `--font-display` (Bricolage Grotesque), `--font-body`
(Literata) and `--font-ui`, and points `--default-font-family` at the body face
so Preflight puts it on `<body>`; Tailwind generates the three utilities from
those tokens. **Nothing in a component names a family** — that is what kept the
last three swaps to a handful of lines. `--font-ui` resolves to the same family
as `--font-display` by choice and keeps its own token, so handing UI back to a
face of its own stays one line; do not deduplicate them. There is no `font-sans`
utility any more — that class now silently does nothing.

- **Display** — headings and the two mastheads, applied by the base-layer rule.
  Do not add `font-display` to an h1, h2 or h3.
- **Body** — the default: prose and all the meta around it, dates, bylines,
  breadcrumbs, excerpts, captions, figure text. Meta in the reading face is
  ordinary editorial practice and is what makes a page cohere; a stray `font-ui`
  on a date is a regression, not a tidy.
- **UI** — chrome that must not compete with prose, and this is the whole list:
  the header nav links and the mobile nav disclosure's summary; the footer column labels,
  links and legal line; the two table-of-contents labels; the "Explore with AI"
  label; the tag pill; the count spans in `app/archive/page.tsx` and
  `app/tags/page.tsx`; and every small uppercase letterspaced label — the error
  eyebrows in `app/error.tsx` and `app/not-found.tsx`, the one in
  `app/author-bio-card.tsx`, the "read more" links on the category and author
  indexes, and the category links on archive rows. **Uppercase plus
  letterspacing is the tell**, and those surfaces were missed when the roles
  first split because the list was written from the header, footer and sidebar.
  If a new surface seems to want UI, leave it on the body face and raise it
  rather than extending the list quietly.

`app/global-error.tsx` is deliberately excluded: it replaces the root layout and
renders its own `<html>` without the font variables, so `font-ui` there would
resolve to an undefined custom property. The two sidebar labels, table of
contents and "Explore with AI", must stay identical in face, size and tracking —
they sit one above the other in the same column.

**A replacement display face has to clear three bars**, and this is the only
place they are written down:

- **Grotesque-against-serif contrast.** The face before this one was a
  transitional serif like Literata, so at heading sizes an h2 dissolved into the
  paragraph under it.
- **An `opsz` axis reaching roughly 45pt**, what headings hit at `lg:text-6xl`,
  or it clamps and the browser scales a text master, which reads flat —
  Bricolage runs 12–96, Literata 7–72.
- **A body face keeping a true italic**, which is why the `italic` classes on
  `<em>` and the figure captions in `lib/rich-text.tsx` and
  `lib/lightbox-image.tsx` stay; Bricolage is roman only.

Bricolage's `wdth` axis (75–100) is deliberately not requested — it costs bytes
and nothing reaches for it, but it is why this face suits the de-DE work, where
a long compound can narrow instead of dropping a size step.

### The prose column is never measured in `ch`

`@utility prose` in `app/globals.css` neutralises the typography plugin's
`max-width`; the measure lives on the `max-w-2xl` parents instead. The plugin
measures in `ch`, keyed to the current font's zero glyph, so the column silently
resizes on any body-face swap — Inter's zero is 0.6309em against Literata's
0.5790em, an 8% narrowing with no width anywhere in the diff.
`app/globals.measure.test.ts` guards the override and the absence of any
`ch`-measured column.

### One axis, and it is the header measure

Whether a page's breadcrumb and `h1` sit at `max-w-5xl` or inside a
`max-w-2xl` column decides three things at once: the breadcrumb wrapper, the
`h1` ramp, and whether the header closes with `app/wide-page.tsx`'s 3px rule.
A route is wide or narrow and everything follows. There is no second question
and no route that can sit half in each.

**Wide.** Header at `max-w-5xl`, `<Breadcrumb>` unwrapped, `h1` at
`text-4xl leading-tight md:text-5xl lg:text-6xl` (home's is larger still —
see below), closed by the 3px rule.

`/`, `/page/[page]`, `/posts/[slug]`, `/archive`, `/categories`, `/tags`,
`/authors`, and the six taxonomy listings. Thirteen routes.

**Narrow.** Header wrapped in `mx-auto max-w-2xl`, `h1` at
`mb-6 text-4xl md:text-5xl` with no `leading-tight`, no rule.

`/about`, `/privacy`, `/search`. Three routes.

A 6xl heading in a 42rem measure looks enormous despite carrying identical
classes, and that mismatch is the tell that a page took the wrong treatment. An
unwrapped breadcrumb on a narrow page starts 176px left of the heading it
labels, which is the same tell from the other end. Any new page picks its
treatment from its own measure, not from the nearest existing h1.

**The measure is the header's, not the prose's.** A post's body narrows to
`max-w-2xl` inside an `xl:grid`, but its breadcrumb, `h1` and cover sit above
that grid at the article's full `max-w-5xl`, so a post is a wide page whose
body happens to be narrow. `/search` is the mirror case: it browses posts by
function and is narrow by shape, and shape decides.

**Home's header carries the site masthead, and that masthead is its `h1`.**
`SITE_TITLE` at a raised ramp (`text-5xl md:text-6xl lg:text-7xl`, its trailing
full stop in crimson when the title ends in one) with `SITE_DESCRIPTION` as
the standfirst beneath it, so home carries the same heading-plus-standfirst
shape as every other route's header. It stays unlinked, because a link on `/`
points at the page the reader is already on, the same reason the last crumb is
plain text. Home is the index whose subject is the whole site, so naming
itself is what every other index already does.

The masthead shipped first as a `<p>`, to protect an `h1` that then sat on the
hero post. That cost a weight bug as well as an outline: the base-layer rule in
`app/globals.css` sets `font-weight: 700` on `h1, h2, h3` only, so a `<p>` in
the display face rendered at 400 against the 700 of the headlines under it.
**Do not add a weight class to fix that** — the element being a heading is the
mechanism. The hero below is an `h2`, so the two halves must move together, and
`app/a11y.test.tsx` fails if either is reverted on its own.

**Home and `/page/[page]` now render the same listing shape and differ only in
what the header says.** Home passes no listing heading, so its outline is the
site name at `h1` and then the hero and every card at `h2`, one flat list of
siblings rather than a section above a section. That is the claim the axis has
been making since `/page/[page]` joined the shared header shell, and it is
finally true.

The mechanism to know about: **`MoreStories` sets its card titles to `h3` when
it renders a section heading and `h2` when it does not.** So adding a heading
back to any route silently re-levels every card on it, and removing one does
the same in reverse. `app/a11y.test.tsx` asserts home's headings by _text_ as
well as by level, because a reinstated heading is a perfectly contiguous `h2`
and a level-only check sails past it.

All sixteen routes are now on the axis.

### How the wide-page header is built

**`app/wide-page.tsx` is the one shell every wide route renders
through** — the four section fronts, the six taxonomy listings, the index
listing at `/page/[page]`, the post page and home, the middle seven via
`app/listing-page.tsx`. It owns the header, the container and the whole
vertical rhythm, and it exists because ten of those pages were previously two
implementations of one design: every tuning pass had to be applied twice, and
the half that got missed drifted. The raised `h1` ramp and the standfirst
colour each shipped to one half only. Do not add a browse route that
assembles a header and `Container` itself.

Which routes render through it is settled by "One axis, and it is the header
measure" above, not here.

That axis replaced an earlier one, browsing versus reading, and the reason is
worth keeping — it is also why the masthead band did not survive it once the
band itself was reopened for removal. The browsing-reading distinction is
real, but the reader does not need a 200px colour field to perceive it because
the content says it on arrival. What colour could usefully mark was the
measure, because the measure is the thing that changes the shape of the page.
Under the axis-plus-band era a navy-to-cream step meant either the column
narrowed or the reader crossed from a list into an article, two things that
correlate on most navigations but not all — an inconsistency a reader feels
before they can name it. Retiring the band removes the step entirely rather
than fixing its meaning, which is the simpler resolution once the band's own
palette stopped being viable (see "The masthead band was retired" above).

Do not reintroduce a second axis, and **do not give a narrow route the wide
header**. A `measure` prop letting `/about` opt into `app/wide-page.tsx` was
proposed and rejected before the band retired and the reasoning still holds
after it: doing so would apply the wide column to a page whose whole point is
the narrow one. `WidePage`'s inner column is always `max-w-5xl`, matching
`Container` on every page it appears on, which is what makes the trail and
heading land at identical coordinates sitewide.

- **A post's `h1` carries `data-pagefind-body` of its own.** It sits in
  `WidePage`'s header now, outside the `<article>` that scopes the index, and
  Pagefind indexes only what a body region contains. `meta.title` survives
  regardless, since Pagefind reads the page's first `h1` wherever it is, so a
  results list looks perfectly correct while every title-only term has
  silently dropped out of the searchable text. Pagefind concatenates multiple
  body regions into one fragment, so the second tag restores exactly what the
  index held before. This held true through the band's retirement — the h1
  never moved relative to `<article>`, only the surface under it changed.
- **The bar's wordmark hides itself on home, through a `:has()` rule** in
  `app/globals.css`, so the site is named once rather than twice within 100px.
  A rule rather than `usePathname` keeps the header a server component and
  ships no JS, the same trade the view transitions take. **It must be
  `display: none`, never `visibility: hidden`** — a hidden element still
  carries its `view-transition-name`, so it would collide with the masthead's
  and invalidate the transition, whereas a `display: none` element does not
  participate in one at all. The two share a name deliberately and never
  coexist, which is what keeps it unique per document. **The consequence is
  deliberate**: past the masthead, home's sticky bar is nav and search with no
  site name in it. The wordmark is wayfinding for a reader deep in the site,
  and on home they are not; it returns on the next navigation. The wordmark
  returns once the masthead scrolls out of view (app/wordmark-fade.tsx),
  which reverses an earlier position that the gap be left alone. Do not
  reach for a mark, because none exists in `public/`.
  `app/a11y.test.tsx` asserts the rule in two halves, because jsdom applies no
  stylesheet and cannot evaluate `:has()` itself.

  The bar carried a tagline alongside the wordmark through this point, hiding
  and fading with it the same way. It was later retired outright in favour of
  the expanded nav links (`app/layout.tsx`'s `Header`), which carry the same
  wayfinding on every route rather than only past the masthead — so nothing
  else in this section should be read as still describing a second element.

- **The bar's wordmark is a link everywhere except home** (`app/site-wordmark.tsx`),
  where it is a button that scrolls the reader to the top. Next 16 treats a
  same-URL `Link` click as a leaf-segment refresh rather than a route change,
  and only a route change is assigned a scroll target, so an `href` on home
  neither navigated nor scrolled. It is the one element in the header that
  knows its own route, which is why it is a client component and `Header` is
  not. Removing the `href` on every route instead was tried on the way here
  and it cost the site its "go home" control on twenty pages to fix one.
  Rendering it as plain text on home was tried next and left the control dead
  rather than simply absent, at exactly the scroll position where "back to
  top" is the one thing a reader might want from it.
- **The bar's wordmark machinery is a known local optimum, not an ideal.** Four
  mechanisms manage the visibility and behaviour of one word: the `:has()`
  hide, the opacity fade, a `visibility` pair keeping the faded box out of hit
  testing and the tab order, and a `usePathname` re-attach for client-side
  navigation. Plus `app/wordmark-fade.tsx`, `app/site-wordmark.tsx` and about a
  dozen assertions in `app/a11y.test.tsx`.

  All of it exists because home's header carries `SITE_TITLE` while the bar
  carries it too, 100px apart. That is one editorial decision, and it is the
  only reason any of this is here. Every mechanism above is downstream of it,
  and none of it depended on the masthead sitting on navy — the class it keys
  off, `.site-masthead`, moved with the heading into the retired band's
  replacement unchanged, and every rule in `app/globals.css` and assertion in
  `app/a11y.test.tsx` reads that class rather than anything about the band.

  The exit, if it is ever wanted: give home's header the same job every other
  header has, naming the route rather than the site — `Latest` plus the
  existing `latest-posts` browseIntro standfirst, which `/page/[page]` already
  reads. The bar then carries the wordmark everywhere with no rule at all and
  all six mechanisms come out together, along with both components and the
  tests. The cost is that home stops saying its own name at display size and
  reads more like page 1 of a listing, which is what it is.

  Recorded so this is a decision a future session can take deliberately rather
  than a shape it has to reverse-engineer. It was weighed in August 2026 and
  declined because the fade was already merged and working.

- **`crumbs` is optional on `WidePage`**, and `/` is the only route using
  that. Home is the root and has nothing above it, so without a trail its `h1`
  starts at the top of the header rather than below a nav carrying `mb-4`,
  which is the honest position rather than a regression. `app/a11y.test.tsx`
  asserts a trail-less header emits no breadcrumb landmark. Keep the prop
  optional; `/page/[page]` carries a trail again, but that is the route
  changing its mind, not the prop losing its reason.
- **The listing under a header drops its opening rule and nothing else**
  (`openRule={false}` on `MoreStories`). The item padding stays, and the page
  contributes no gap of its own instead (`contentOwnsLeading` on
  `WidePage`) — every item is `py-10 md:py-12`, which is how far a hairline
  sits from the cover below it, and `WidePage`'s own 3px rule plays a
  hairline's part now, exactly as the retired band's bottom edge did before
  it. Zeroing that item padding made the first post hug the rule while every
  post after it breathed; adding a page-level gap on top made rule-to-first-post
  disagree with post-to-post. One or the other, never both. The closing rule
  stays, and `app/pagination.tsx` still has no top border of its own.

### The taxonomy listings and the index listing share one shell

Category, tag and author pages — each paginated and not — and the index listing
at `/page/[page]` render through `app/listing-page.tsx`, which owns the
container, breadcrumb, listing, pager and empty state. What the index does not
bring is a trail, which is why
`crumbs` is optional. `lib/paginate.ts` owns the page arithmetic and `listingMetadata`
in `lib/page-metadata.ts` owns the Open Graph and Twitter blocks, which ten
pages each carried a copy of.

`lib/paginate.ts` also owns `parsePageParam`, and **both** halves of a paginated
route read the `[page]` segment through it — the component, which 404s on null,
and `generateMetadata`, which returns a not-found title. They were allowed to
disagree once: the component 404'd on `/page/abc` while the metadata pass built
a title and a canonical out of the raw segment. It stays deliberately as loose
as the guard it replaced, so `/page/2.0` still resolves; tightening that is a
duplicate-URL decision nobody has taken.

Two things are deliberately **not** absorbed into the shell, both argued in
`app/listing-page.tsx`: the `<header>` is `children` (it is where all six
genuinely differ, and reassembling it centrally costs a conditional per
difference), and the fetch strategy stays in the route (category and author
pages issue `Promise.all([posts, visibleTags])`; tag pages read `getAllPosts`
once and derive everything from it). Do not unify either.

**The header is identical on page 1 and on later pages**, and carries nothing
navigational: the same heading ramp, the same portrait size on an author page,
and the standfirst — a category or tag description, an author bio — on every
page rather than page 1 only. Author pages had drifted here, carrying a 112px
portrait and a bio on page 1 against an 80px portrait and no bio on later ones;
a reader arriving on page 3 from a search result got a thinner page than the
same listing's first. Do not reintroduce a per-page variation without a reason
written down. The one difference the header is allowed — the page counter
inline in the heading text on page 2 and later, absent on page 1 — is content
the heading itself carries, not a shape difference in the header around it;
see below.

### The page counter moves inline, into the heading

**This reverses the entry that used to sit here, "Page position captions the
list, not the heading."** That entry said the caption — `PageContext`, then —
rendered as its own block, appended after the standfirst, and that moving it
into the header would split the heading from its standfirst and land it
under the portrait on author pages instead of under the heading it referred
to. Both of those were objections to the caption being a separate BLOCK
element. It no longer is one: `PageCounter` (the renamed, rewritten
component; see `app/page-counter.tsx` for the full argument) renders as
inline text inside each route's own `<h1>` — `{heading} <PageCounter
currentPage totalPages />` — so it cannot split anything, because nothing
about it is a block, and it cannot land under a portrait, because it is part
of the same line as the name. The objection is answered, not overridden.

Two things about the entry this replaces, recorded so the reversal is
legible rather than a silent overwrite. First, that entry had already gone
stale before this reversal touched it: it claimed `PageContext` "renders
between the header and the posts," which stopped being true the moment the
split masthead folded the caption into the `standfirst` slot — it rendered
_inside_ the header, after the standfirst, which is what `PageContext`'s own
comment said in the opposite direction. Code and doc had already disagreed
for one PR's worth of history before this one reconciled them.
Second, the reversal was forced by more than tidiness: M5's `justify-between`
row (see above) took the caption's own last line as the row's baseline
anchor, so `items-baseline-last` closed the heading against the CAPTION
rather than against the standfirst, visibly shoving the standfirst upward.
Clutter was never the real complaint with the caption sharing a column with
the standfirst — misalignment was, and moving the counter inline removes the
second baseline that caused it rather than working around it.

`ListingPage` renders none of this any more. Each of the seven paginated
routes (the index listing and the paginated/unpaginated halves of category,
tag and author) renders `PageCounter` itself, which is seven call sites where
there was one — a deliberate trade, and the same one `app/listing-page.tsx`
already makes for the header being `children` rather than props: the `h1` is
the one thing every route genuinely builds differently, so centralising the
one piece that must live inside it costs a conditional per route for no
buyback. The invariant survives the move intact: `PageCounter` still returns
`null` on page 1, so every route drops the element in unconditionally and
none of them decides for itself when its own page counts as paginated.

The author routes take the counter too, on consistency, even though they are
the one route family exempted from M5 itself (`splitHeader={false}`,
CLAUDE.md above). The old objection to the caption living in an author
header — that it landed under the 112px portrait rather than under the name —
cannot recur once the counter is inline text on the same line as the name.
`splitHeader={false}` already exists as the documented shape for "the author
routes are different" if this is ever found to read badly beside the
portrait; one more exception on that prop is cheaper than a conditional in
`PageCounter` itself.

`emptyMessage` is omitted by the routes where empty is unreachable, so leaving
it out asserts that rather than quietly rendering an empty list. `lib/paginate.ts`
also backs the home index and is free of `next/navigation` on purpose: a route's
404 and redirect decisions are control flow and belong visible in the route.

### Every rich-text hyperlink goes through `lib/rich-text-link.tsx`

`renderHyperlink` is the only hyperlink renderer on the site. It allowlists URL
schemes (`http`, `https`, `mailto` — anything else degrades to plain text,
including `javascript:` and the protocol-relative forms) and gives cross-origin
links `target="_blank"`, `rel="noopener noreferrer"` and the screen-reader
new-window hint.

Any new rich-text surface must pass it as the `INLINES.HYPERLINK` override
rather than relying on `documentToReactComponents`' default, which emits
`data.uri` as-is. Sidenote bodies did rely on the default, which let a
`javascript:` href through in a note while the post body rejected the same href.
Do not copy the renderer to a second location — that drift caused the gap.

### The site's locale is en-GB, everywhere

The Contentful default locale is `en-GB`, dates format via date-fns `enGB`, and
the html `lang`, OG locale and feed metadata follow. Any `en-US`, `en_US` or
American date formatting in code or metadata is a regression, not a style choice
— a previous PR existed solely to purge these. German (`de-DE`) localisation is
in progress; until it lands, do not add locale plumbing speculatively.

`contentful/export.json` is the deliberate exception and ships `en-US` as its
default locale. It is the **template's** content model, imported by people
forking this repo into their own space, not a mirror of the live space. Do not
"correct" it.

**Demo Site inherits that exception.** `18c3oqmr28q0` was imported from
`export.json`, so its only locale is `en-US` while the live space is `en-GB`.
The code never notices, because no query passes a locale and each space returns
its own default — but a direct write to Demo Site, by MCP or by script, must key
its fields `en-US`. The connector refuses `list_locales` there, so a rejected
write is what tells you. This is the one place an `en-US` is not a regression.

### Single-entry fetchers are `cache()`-wrapped on purpose

**Every** single-entry fetcher in `lib/api.ts` is wrapped in React's `cache()`:
`getPost`, `getPostAndMorePosts`, `getPage`, `getBrowseIntro`, `getTagBySlug`,
`getCategoryBySlug` and `getAuthorBySlug`. Next only memoises `GET` and
`fetchGraphQL` issues `POST`; the file explains the rest. `getPage` was the one
exception for a long time and it was not a decision — `/about` and `/privacy`
each issued two identical requests for the whole page body. A new single-entry
fetcher joins the list; there is no case here for staying out of it.

The rule that is easy to break from outside those functions:
**`generateMetadata` must call the same function the page calls, with the same
arguments** — `cache()` dedupes identical calls, not equivalent ones. On
`/posts/[slug]` both call `getPostAndMorePosts`, and switching the metadata pass
back to the slimmer `getPost` looks like an optimisation while being the exact
change that reintroduces the second request. The four browse pages carry the
same requirement for `getBrowseIntro`, and `/about` and `/privacy` for `getPage`
— both pass the same `SLUG` constant for exactly this reason. Do not re-flag the
duplicate fetch as a finding; it is fixed. Do not "simplify" a metadata call
back to a narrower helper.

`getPost` stays correct where nothing else fetches the post in the same pass, as
in `app/posts/[slug]/opengraph-image.tsx`, which renders in its own request and
carries its own `generateStaticParams` — colocated metadata routes do not
inherit the page's. The duplicate `getAllPosts` across those two files is the
accepted cost. Leave `dynamicParams` at its default `true`, so a post published
through the webhook still gets a card on demand.

### Three cache tags, and the webhook picks between them

`CACHE_TAGS` in `lib/api.ts` carries the whole set, and that file argues the
split. Every query used to carry `posts`, which meant one tag on the site and
no lever to invalidate anything narrowly: editing `/about` re-rendered every
post page. `getPage`, `getAllPages` and `getBrowseIntro` now carry `pages` and
`browseIntros` instead.

**Only those two split off, and the rest staying broad is a finding rather than
timidity.** A renamed Tag or Category shows on every card and pill, a new
Author name appears in bylines across the archive, and a published Post changes
the "Read Next" backfill and the sitewide tag-visibility threshold on every
other post page. Those content types genuinely reach everywhere, so a broad
purge is the correct one. `app/api/revalidate/route.ts` maps a webhook's
`sys.contentType.sys.id` onto tags, and **anything unrecognised purges
everything** — an Asset firing, a content type added later, an unparseable
body. Over-invalidating costs a render; under-invalidating serves stale content
with nothing anywhere to say so.

**`expire: 0` stays, and it is a freshness choice rather than an oversight.**
A profile with a non-zero expire would serve the entry stale while it
regenerated, sparing the first visitor a cold render — but that visitor is
usually the author refreshing after publishing, and a listing without their new
post on it is the one thing this webhook exists to prevent. One slow request
per purged page buys the page being right on the first look. Asserted in
`app/api/revalidate/route.test.ts` so it cannot be softened by accident.

A new fetcher that passes no tag gets `posts`, deliberately: the safe direction
to be wrong in is the expensive one.

### Every unbounded collection query pages, and must keep selecting `total`

`fetchAllCollectionItems` in `lib/api.ts` pages through Contentful's 100-item
ceiling, and argues why a query asking for neither a limit nor `total` is the
worst shape a limit can have. Seven unbounded fetchers go through it:
`getAllPosts`, `getAllPages`, `getAllTags`, `getAllCategories`, `getAllAuthors`,
`getPostsByCategory`, `getPostsByAuthor`.

**A query handed to it must accept `$limit: Int!` and `$skip: Int!`, pass both
to the collection, and select `total` beside `items`.** Drop `total` and the
first response silently becomes the whole result — the bug this replaced. A new
list query belongs here too.

The page size stays at Contentful's own 100 rather than the documented 1000
maximum; raise it only against a real measurement. Deliberately **not** paged:
`getRecentPostsByCategory`, capped on purpose to tease a few posts, and every
single-entry fetcher on `limit: 1`.

### Contentful export/seed files are load-bearing and brittle

`contentful/export.json` and `contentful/seed.json` back the forkable-template
story. Hard-won rules: content types and seed entries must carry
`sys.publishedVersion` or they import as inactive drafts GraphQL cannot see;
seed assets must use `file.url`, never `file.upload` (upload aborts the entire
import); a failed or partial import must be retried into a brand-new empty
space, never re-run over a partially-activated one. Do not "tidy" these files.

A new content type in the space is not done until it is in `export.json` too.
`lib/api.ts` queries embedded types through `... on X` fragments, and an inline
fragment on a type the schema lacks is a GraphQL error that fails _every_ post
query, not just the field it names — so a fork importing an export one type
behind gets a site that renders nothing. `Sidenote` shipped that way for two
days; `lib/contentful-fixtures.test.ts` now guards it.

Both files are exactly `JSON.stringify(value, null, 2)` plus a trailing newline
(equivalently Python's `json.dumps(indent=2, ensure_ascii=False)`), so editing
them via a JSON round-trip is byte-safe and reformats nothing you did not touch.

### One Node version pin, in `engines.node`

`engines.node` in `package.json` is the only place the Node major is written,
and three consumers read it: Vercel selects the deployed runtime from it,
**overriding** the Node.js Version in Project Settings; npm checks it on
install; both workflows resolve it through `actions/setup-node`'s
`node-version-file: package.json`, which reads `volta.node`, then
`devEngines.runtime`, then `engines.node` — so adding either of the first two
silently takes precedence.

Do not add a second copy. A `.nvmrc` existed and was deleted for exactly that
reason, and hardcoding `node-version:` back into a workflow is the drift that
once left CI on Node 20 while local development ran 23. The cost is that nvm
cannot read `package.json`, so local switching is manual — `nvm use 24`. Keep it
an exact major (`24.x`), never a range: a range resolves to the newest available
major and upgrades production silently. `.npmrc` sets no `engine-strict`, so a
mismatch warns and never blocks an install.

Two things sit outside the pin and move by hand:

- **`@types/node`** follows the **runtime** major, not latest. Its majors track
  Node's and latest runs ahead — 26.x while the runtime is 24 — so taking latest
  would typecheck against APIs that do not exist at runtime. Same
  coupled-version trap as the postcss and sharp overrides.
- **Vercel Project Settings** still holds a version, but `engines` overrides it,
  so it is a dormant fallback. Keep it current regardless: deleting `engines`
  would silently drop the build back to it.

The major is not arbitrary: Node 20 reached end-of-life on 30 April 2026, and
Vercel was warning that deployments created on or after 2026-10-01 would fail to
build on it.

### Two copies of `@contentful/rich-text-types`, and only one ships

The app resolves `17.x`. `contentful-management`, pulled in by the
`contentful-import` devDependency for the CMS import scripts, requires
`^16.6.1` and nests its own copy, marked `dev` in the lockfile. Checked
August 2026: no released `contentful-management` accepts `17.x`, so this
cannot be deduped. `npm ls --omit=dev` shows one copy, which is the check
that matters. Do not force a resolution to tidy it — that breaks the import
scripts.

The repo carried `legacy-peer-deps=true` in a committed `.npmrc` until the
same change, which suppressed every peer conflict rather than just this one.
Vercel reads that file too, so installs and deployments now fail loudly on an
incompatible dependency instead of accepting it silently. That is the point.
Resolve the conflict; do not restore the file.

### The content model lives in two spaces, and a schema change must reach both

`rczsnwq9z69e` is the live space. `18c3oqmr28q0` is **Demo Site**, which the
`demo-site` Vercel project builds from this same repo. A field or type added to
the live space and queried in `lib/api.ts` but absent from Demo Site fails that
build with `Cannot query field "x"`, and because a GraphQL error rejects the
whole query rather than the one selection, every page dies — adding
`tagsCollection` took the demo down exactly this way.

So the order for any schema change is: **both spaces first, then merge, then
sync `demo`.** The repo's fixtures are a third copy, making three places to keep
in step. That last step matters more than it looks: `demo-site` no longer builds
on merges to `main`, so nothing checks the demo space against the queries until
`demo` moves. `.github/workflows/sync-demo.yml` runs the same push weekly, so a
forgotten step surfaces within seven days rather than on an unrelated future
sync.

**Content type IDs are immutable.** The display name can be changed by an editor
at any time; the ID cannot. Renaming means deleting and recreating the type —
trivial while nothing is published, a content migration afterwards. Get the ID
right before the first publish; `pageIntro` became `browseIntro` on exactly this
deadline.

**Treat the Contentful MCP connector as read-only until proved otherwise.** Its
write permissions come from the MCP app installation in each space, not from
this repo, so what it can do is a property of that space's configuration and can
be narrower than the tool list suggests — `update_asset` on `rczsnwq9z69e:master`
is refused outright, so adding a description to an existing asset is a web-UI
job. Publishing, unpublishing and deleting are unavailable regardless;
activating a type, publishing entries and deleting anything are manual steps in
the web UI. Entries cannot be created against a type that has not been
activated, so a new type is always two trips: activate, then populate.

### `demo-site` builds from this repo, off the `demo` branch

One repo, two Vercel projects running **identical code**, differing only in
environment variables — a different Contentful space, tokens,
`NEXT_PUBLIC_SITE_URL`, and the four identity overrides below. There is no
source divergence to manage, so do not fork the repo to separate them; one repo
feeding several projects is the designed path (Vercel allows 25 per repository).

**The demo names itself through four `NEXT_PUBLIC_` overrides** — `SITE_TITLE`,
`SITE_DESCRIPTION`, `SITE_FOOTER_BLURB` and `SITE_REPO_URL`, each prefixed —
set on `demo-site` only; `lib/constants.ts` carries the argument. They exist
because identical code is the whole design, so renaming the demo in source would
rename the live site too, and renaming it on `demo` would end the fast-forward
sync. All four are dashboard settings, so they share the fragility of the three
below — unset, the demo silently answers to the live site's name and links to
its repository. Title and description move together, because home renders them
as masthead and standfirst. `SITE_AUTHOR` is deliberately not among them.

Three dashboard settings keep `demo-site` off `main`'s critical path. None is
expressible in this repo and all are easy to lose, since a dashboard setting
leaves no trace in the codebase and survives no project rebuild:

- **Production Branch is `demo`**, not `main`, so merging a PR no longer
  triggers a demo production build. Settings → **Environments** →
  **Production** → **Branch Tracking**, not Settings → Git.
- **Ignored Build Step is "Only build production"** (Settings → **Build and
  Deployment**), so PR pushes report as cancelled rather than building. Leave
  it: it guards the production path and costs nothing.
- **Preview → Branch Tracking is disabled** (Settings → **Environments** →
  **Preview**). Off rather than narrowed, because Preview cannot be scoped to a
  branch: with `demo` taken by Production its selector is greyed out at "All
  unassigned branches", so the toggle is the only lever. Left enabled it created
  a `demo-site` deployment for every push to `main` and every PR branch — those
  burn no build minutes but are real deployment objects, and the cap is on
  deployments. Nothing was lost; a one-off preview is still reachable with
  `vercel deploy`. **A missing `Preview – demo-site` check is the expected
  state.**

`demo` is protected by its own GitHub ruleset, `demo branch protection`
(id 20204826), with exactly two rules: `deletion` and `non_fast_forward`.
**Deliberately not `pull_request`** — both routes onto this branch push directly
(the manual push below and `.github/workflows/sync-demo.yml`), so requiring a PR
would protect the branch by making it unmaintainable; copying `main`'s ruleset
across is the obvious wrong move. The two rules close the two ways it can
actually be damaged: deleting it breaks demo-site's Production branch tracking,
and `non_fast_forward` moves an invariant the sync workflow can only assert in a
shell script onto the server.

Refresh the demo deliberately, when the template has changed in a way worth
showing:

```
git push origin main:demo
```

A fast-forward inside one repo, so it cannot conflict when main's history is
linear. A non-squash PR merge adds a merge commit that makes `main:demo` a
non-fast-forward update; the demo branch's `non_fast_forward` protection rule
blocks it. In that case, open a PR from `main` to `demo` and merge it on
GitHub — the UI merge creates a merge commit on demo that advances it without
triggering the non-fast-forward rule. **Do not automate this on
push to `main`** — that reinstates the per-merge build these settings exist to
remove; a scheduled workflow is the middle ground if the demo goes stale.
Vercel's deployment caps are scoped to the **account**, not the project, and the
hourly cap on Hobby (100) equals the daily one, so a burst of merges can exhaust
a day's worth inside an hour.

### What the guards catch, and what they cannot

Four suites carry the invariants above, and each file's header explains what it
checks and why. Every check has already caught a real defect: do not weaken one
to make a change pass. What matters here is what they **cannot** do, because
each gap has already let a defect through:

- **`lib/contentful-fixtures.test.ts`** cannot compare a field's _validations_
  against the live space — CI has no Contentful credentials. A language added to
  the live Code Block took a fortnight to reach the export with every test
  passing throughout. Keeping the export in step after a schema edit is manual.
- **`app/a11y.test.tsx`** cannot check `color-contrast` or `target-size`, and
  cannot be made to: both need a layout engine, and jsdom computes no boxes and
  applies no stylesheet, so axe would report a false pass. Contrast is covered
  instead by `lib/tag-pill.test.ts` recomputing ratios from the stylesheet. A
  finding that needs real layout needs a browser. Note it runs axe over the real
  components inside the real `RootLayout`, and adds a **duplicate
  announcement** check axe does not implement — two links inside `<main>`
  sharing a destination and an accessible name — scoped to `<main>` because the
  header and footer both link to `/categories` as "Categories".

  **It covers six page SHAPES, not routes**, which is right for a shape many
  routes share: between them they account for home, `/page/[page]`, the post
  page and the six taxonomy listings, nine of the sixteen. It left the other
  seven — `/archive`, `/categories`, `/tags`, `/authors`, `/about`,
  `/privacy`, `/search` — with no axe run at all.
  `app/routes.a11y.test.tsx` is the other half: it renders the REAL route
  components with only the CMS mocked, and carries the list of routes it is
  responsible for. **A new route goes in that list**, or it has no axe run
  anywhere and nothing in CI reports the gap. Both halves also assert the page
  rendered something — an empty render passes every rule, and a fixture
  drifting out of step with a route's data shape is the quiet way that happens.

  Its duplicate-announcement check found two repetitions that are **designs
  rather than defects**: the archive links its category on every row, and the
  glossary lists each post once per tag. Both are allowances keyed to a URL
  pattern per route rather than a skip, so a duplicate of any other shape still
  fails there — and each allowance asserts the duplication still occurs, so it
  cannot outlive the design it was written for.

- **`lib/paginate.test.ts`** covers the page arithmetic the six taxonomy routes
  and the home index share, including that every item lands on exactly one page.
  It says nothing about what those pages then render.
- **`lib/docs-consistency.test.ts`** checks only the **names** of things —
  scripts, paths, the CI-gate sentence, the repo URL. It **cannot verify a
  claim**: a sentence can name a real file and describe it wrongly, and only a
  reader catches that. This document's accuracy is unguarded.

### Every pattern-matching guard needs a known-bad control

A test that greps source for a class, a token or an element is asserting the
absence of a string, and absence passes for two reasons. Either the defect is
gone, or the pattern stopped matching. Nothing in the passing result tells the
two apart. So a guard of this kind is only trustworthy once someone has watched
it fail, and whatever made it fail has to stay in the repo.

`app/posts/[slug]/opengraph-image.font.test.tsx` is the pattern to copy. It
keeps Piazzolla as a permanent known-bad control, so the render guard is
re-proven on every run rather than on the day it was written.

Where a permanent control is impractical, the fallback is a non-vacuous
assertion, meaning the guard asserts it matched something before it asserts what
the match contains. That is weaker, because it proves the pattern found a file
rather than that it would catch the defect, but it beats nothing.

Four guards here failed exactly this way, each passing while the thing it
guarded was broken:

- A palette contrast check passed while the band's `h1` rendered at 1.01:1,
  because it asserted what white does on the band rather than what colour the
  heading actually inherits.
- The band inset assertion matched `px-5` followed by a `py-` value, which would
  have kept passing against a split inset while reading a number that no longer
  described the bottom.
- The ink guard sliced the `<PageBand>` block and stopped covering anything the
  moment the routes began composing through a shared shell. It passed on an
  empty match for an unknown period.
- The ink guard's heading pattern was anchored on `<h1 className=` and failed
  open on any `h1` carrying an earlier attribute.

### Documentation is excluded from Tailwind's source scanning

`app/globals.css` carries `@source not "../CLAUDE.md"` and the same for
`README.md`, and explains why: a utility merely **named** in prose is generated
as though a component used it.

The exclusions work and do not solve the whole problem, because `app/` and
`lib/` are scanned and cannot be excluded. Two categories remain, and only one
is worth acting on:

- **Never name a literal utility in a source comment** — it regenerates the
  rule. Hence the notes in `app/globals.css` and `lib/toc-active.test.ts` saying
  "the utility" instead of spelling it, and the test there asserting the literal
  appears nowhere under `app/` or `lib/`, assembling its needle at runtime so
  the assertion is not itself the offence.
- **Leave ordinary English alone.** `.collapse`, `.invisible`, `.static` and
  `.text-wrap` ship because comments contain those words; `.resize` ships
  because `app/table-of-contents.tsx` calls `addEventListener("resize", …)`.
  Contorting code to avoid English is a far worse trade than a few dozen bytes.

**A caution on verifying this.** Compiling `app/globals.css` locally through
`@tailwindcss/postcss` reports every one of these as absent, including the two
that demonstrably ship — its scan root is narrower than `next build`'s. That
false negative is how an incomplete fix was once reported as complete. The only
trustworthy check is the deployed bundle:

```
curl -s https://beuseful.net | grep -oE '/_next/static/chunks/[a-z0-9]+\.css'
```

### Workflow constants

Protected main, squash merges only, one concern per PR, conventional commit
messages, descriptive branch names.

The CI gate is exactly three steps, in this order: `npm run format:check`,
`npm test`, `npm run build` — see `.github/workflows/ci.yml`, which
`lib/docs-consistency.test.ts` holds this sentence against. Note what that means
locally: **there is no separate typecheck step in CI**, so typechecking happens
inside `npm run build`, and a change that satisfies `tsc --noEmit` and the
vitest suite has still not met the gate. Running `tsc --noEmit` is a fast local
proxy, not the thing itself.

There is no lint script — `next lint` was removed in Next 16 — so do not add or
invoke one. Prettier is formatting only, not linting: run `npm run format`
before pushing. `contentful/export.json` and `contentful/seed.json` are in
`.prettierignore` on purpose, because the generator writes the seed with
`JSON.stringify(payload, null, 2)` and a formatter reflowing it would put the
committed file permanently at odds with `npm run build:seed`.
