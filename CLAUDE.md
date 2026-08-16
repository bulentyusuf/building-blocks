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

### Both CSP loosenings in `script-src` are deliberate

`'unsafe-inline'` (removing it needs a per-request nonce, which forces dynamic
rendering) and `'wasm-unsafe-eval'` (Pagefind's search core; removing it
silently breaks search in every Chromium browser) — `next.config.js` carries
both arguments inline. Revisit `'unsafe-inline'` only if the site starts
rendering untrusted user-generated content.

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

### Two border roles, and they are not interchangeable

Both are defined and argued in `app/globals.css`.

- **`--color-hairline`** — every rule between list items, cards and panels, and
  the edges a listing draws around itself. It inverts on its own, so never add a
  `dark:` variant to an element using it, and never reintroduce bare `gray-200`
  borders. **`app/pagination.tsx` deliberately has no top border**: the listing
  above it closes itself, so a rule here would land in the same row and print a
  double line. Both files carry the note; the pager looking unattached is not a
  missing border. The listing's **closing** rule is the load-bearing half —
  banded pages drop the opening one via `openRule={false}`, never the other.
- **The `border-2` image frames** in `lib/rich-text.tsx` and
  `lib/lightbox-image.tsx` are a heavier role with their own pairing. Leave them.

`--color-control-edge` was a third role, the closed boundary around the tag
pill's outline. Retired along with the pill itself — see "Tags have their own
pages" below for the small-caps text that replaced it.

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
- **Footer column labels are `<p>`, not `<h4>`** — as headings they skipped a
  level on every page whose deepest heading is an `h2` (axe `heading-order`),
  and promoting them to `h2` would flip them to the display face. Both navs
  carry `aria-label`, so the landmarks stay named.
- **An embedded figure's `alt` is empty whenever a caption renders** —
  Contentful's `description` is one field doing two jobs. `lib/lightbox-image.tsx`
  derives this from `caption` being present. The build-time warning for a
  missing description still fires.

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
- **Position is carried separately** by `app/page-context.tsx`, a muted "Page N
  of M" captioning the list — which is why paginated category, tag and author
  chains stop at the section. Do not add page numbers to those chains.
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

### Cross-document view transitions are CSS-only, and names must stay unique

`@view-transition { navigation: auto }` in `app/globals.css` opts in.
Navigations here are full document loads, which is exactly what this animates —
no JS, no library, and browsers without support navigate instantly.

The spec requires unique names per page, so `createCoverNamer()` in
`lib/view-transition-name.ts` hands out `cover-{slug}` at most once per render
pass: a post appearing twice, hero plus list, would otherwise name the same
cover twice, and a duplicate invalidates the entire transition. Reset per
request, do not memoise across requests. The 0.35s group and 0.2s root durations
are tuned, and the `prefers-reduced-motion` block disables the animation.

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
- **`MoreStories` takes `visibleTags?: Set<string>`, not a boolean**, so tags
  cannot be switched on without answering which tags have a live page. Compute
  the set from **all** posts — category and author pages fetch only their own
  slice, and counting across a slice hides tags the glossary shows.
  `getVisibleTagSlugs` in `lib/api.ts` does that fetch for those pages; the home
  pages already hold `getAllPosts` and pass `visibleTagSlugs(allPosts)`
  directly. A tag page passes the set **minus its own slug**.
- The glossary is `data-pagefind-ignore`: it repeats every post title once per
  tag, so Pagefind would weight the repeats above the posts themselves — same
  reasoning as the table of contents.
- Tags sit below the article body, not in the `xl`-and-up sidebar where they
  would vanish on the viewports most people read on. They also appear on listing
  cards on the home index and its pages and on category, author and tag pages,
  and on the home hero, which is a listing item in everything but its component
  — **not** on the "Read Next" block at the foot of a post, which sits directly
  under that post's own tags and would say the same thing twice in one viewport.
  `/search` renders Pagefind's client-side templates and holds no tag data.
  There is one `TagRow`, exported from `app/more-stories.tsx`; the hero imports
  it rather than carrying a second implementation. Rendered as small-caps text
  rather than an outlined pill — the former tag-pill component and its
  dedicated `--color-control-edge` border token are retired, and every caller
  converted, because the outline added weight without hierarchy at low
  contrast on every card, every post and every archive row. It sits **last** on
  the hero and
  below the excerpt on a card, which is the same rule and not the same
  position: a ragged tag count belongs at the foot, and the hero's byline is
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
  MIME-scoped).
- No `X-Frame-Options`. `frame-ancestors` covers every current browser, so the
  legacy header is low-value, not a gap.
- No rate limiting on the API routes. Secrets are compared with
  `timingSafeEqual`, so brute force is infeasible provided they are long and
  random — confirm the configured secrets are high-entropy.
- `dangerouslySetInnerHTML` for Shiki output in `lib/rich-text.tsx`: trusted CMS
  input, and the renderer allowlists URL schemes.
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
  the two header nav links and the header tagline; the footer column labels,
  links and legal line; the two table-of-contents labels; the "Explore with AI"
  label; the tag links; the count spans in `app/archive/page.tsx` and
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
`h1` ramp, and the band. A route is wide or narrow and everything follows.
There is no second question and no route that can sit half in each.

**Wide.** Header at `max-w-5xl`, `<Breadcrumb>` unwrapped, `h1` at
`text-4xl leading-tight md:text-5xl lg:text-6xl`, navy band.

`/`, `/page/[page]`, `/posts/[slug]`, `/archive`, `/categories`, `/tags`,
`/authors`, and the six taxonomy listings. Thirteen routes.

**Narrow.** Header wrapped in `mx-auto max-w-2xl`, `h1` at
`mb-6 text-4xl md:text-5xl` with no `leading-tight`, no band.

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

**Home's band carries the site masthead, and that masthead is its `h1`.**
`SITE_TITLE` at the display ramp with `SITE_DESCRIPTION` as the standfirst
beneath it, so home matches the ordinary `HEADING` and `STANDFIRST` signatures
like every other route. It stays unlinked, because a link on `/` points at the
page the reader is already on, the same reason the last crumb is plain text.
Home is the index whose subject is the whole site, so naming itself is what
every other index already does.

The masthead shipped first as a `<p>`, to protect an `h1` that then sat on the
hero post. That cost a weight bug as well as an outline: the base-layer rule in
`app/globals.css` sets `font-weight: 700` on `h1, h2, h3` only, so a `<p>` in
the display face rendered at 400 against the 700 of the headlines under it.
**Do not add a weight class to fix that** — the element being a heading is the
mechanism. The hero below is an `h2`, so the two halves must move together, and
`app/a11y.test.tsx` fails if either is reverted on its own.

**Home and `/page/[page]` now render the same listing shape and differ only in
what the band says.** Home passes no listing heading, so its outline is the
site name at `h1` and then the hero and every card at `h2`, one flat list of
siblings rather than a section above a section. That is the claim the axis has
been making since `/page/[page]` was banded, and it is finally true.

The mechanism to know about: **`MoreStories` sets its card titles to `h3` when
it renders a section heading and `h2` when it does not.** So adding a heading
back to any route silently re-levels every card on it, and removing one does
the same in reverse. `app/a11y.test.tsx` asserts home's headings by _text_ as
well as by level, because a reinstated heading is a perfectly contiguous `h2`
and a level-only check sails past it.

All sixteen routes are now on the axis.

### The masthead band is retired; `app/wide-page.tsx` collapses to a header on cream

Chrome is the sticky bar and the footer only, both `--color-brand-header`
(aubergine). Every route sits on cream underneath it — the 200px navy block
that used to run behind a wide route's breadcrumb, `h1` and standfirst is
gone (it was a component of its own, page-band.tsx), along with the two-tone
`Breadcrumb` it needed.

**`app/wide-page.tsx` is still the one shell the six taxonomy listings and the
index listing at `/page/[page]` render through** — the middle five via
`app/listing-page.tsx`. Home and the post page no longer go through it: both
now have a bespoke header (a full-width masthead with its own rule; a
full-bleed cover setting the header's height) that the generic
breadcrumb-plus-`h1` shape does not fit. Do not route either back through
`WidePage` to "unify" them — the two were two implementations of one design
for exactly the pages that ARE one design, and home and the post page were
never that.

What `WidePage` does now: a breadcrumb (`app/breadcrumb.tsx`, one tone, since
there is no second surface to vary it for), then the route's own header
content at the same `max-w-5xl` measure `Container` uses everywhere, then the
route's content. `contentOwnsLeading` still decides how much gap sits between
the header and the first thing below it — `mb-8` for a ruled listing (whose
own item padding, `py-10 md:py-12`, does the rest of the job) and `mb-14` for
a section front, which owns none of its own. That is the same asymmetry the
band used to produce by composing a navy `pb-8` with a cream `pt-6`/`pt-0`; it
is one number now because it is one surface.

Two mechanisms carried over unchanged and still matter:

- **The listing under a header drops its opening rule and nothing else**
  (`openRule={false}` on `MoreStories`). The item padding stays. Zeroing it
  made the first post hug the header while every post after it breathed. The
  closing rule stays, and `app/pagination.tsx` still has no top border of its
  own.
- **`Container`'s `className` appends rather than merges** — a spacing
  override can only ever _increase_ a value, which is why its top inset is the
  `topPad` prop and not a class. `WidePage` takes the default.

`--color-cover-keyline` and the palette guards it fed now describe the post
cover's edge against the sticky bar rather than a band it used to cross — see
the post page section below and `lib/palette-contrast.test.ts`.

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
written down.

**Page position captions the list, not the heading.** `app/page-context.tsx`
renders between the header and the posts, and `app/listing-page.tsx` renders
it rather than any route passing it in — the component already holds both
numbers, and PageContext returns `null` on page 1, so no route decides whether
its own page counts as paginated. Do not move it back into the header: position
describes the list, and in the header it split the heading from its standfirst
and landed under the portrait on author pages instead of under the heading it
referred to.

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

A fast-forward inside one repo, so it cannot conflict. **Do not automate this on
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
  instead by `lib/palette-contrast.test.ts` recomputing ratios from the
  stylesheet. A finding that needs real layout needs a browser. Note it runs
  axe over the real
  components inside the real `RootLayout`, and adds a **duplicate
  announcement** check axe does not implement — two links inside `<main>`
  sharing a destination and an accessible name — scoped to `<main>` because the
  header and footer both link to `/categories` as "Categories".
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
