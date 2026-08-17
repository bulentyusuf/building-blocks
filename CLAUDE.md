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
`max-w-page` (75rem/1200px) with `px-5`, so content tops out at 1160px, and a
bare `vw` clause past that point buys a derivative one or two steps larger than
anything on screen — the listing covers in `app/more-stories.tsx`, the 4:3
cards in `app/story-card.tsx` and the thumbnails in `app/categories/page.tsx`
each carry the arithmetic for their own track. The home lead plate and the
post hero cover are already capped in px and need nothing.

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

- **Constrained to their page's own measure, but never centred.** `Container`
  is `max-w-page`. Pages whose content is also `max-w-page` render
  `<Breadcrumb>` unwrapped; pages in a `max-w-2xl` column wrap it in
  `<div className="max-w-2xl">` — no `mx-auto` — or it starts 264px left of the
  heading it labels. A centred wrapper (`mx-auto max-w-2xl`) shipped briefly
  and was wrong: it gave a narrow page's content a different left origin than
  every wide page's, which a reader feels on any navigation between the two.
  One horizontal origin sitewide, whatever the width cap. Any new narrow page
  needs the (uncentred) wrapper — same split as "One axis, and it is the
  header measure" below, which is where the assignment lives.
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
  would vanish on the viewports most people read on. They also appear on the
  card tier of every listing — the home index and its pages, and category,
  author and tag pages — **not** on home's own plates (`LeadPlate` and the
  grid `StoryCard`s in `app/page.tsx` carry no tags at all — there is no
  per-post tag data on that path today) and **not** on the "Read Next" block
  at the foot of a post, which sits directly under that post's own tags and
  would say the same thing twice in one viewport. `/search` renders Pagefind's
  client-side templates and holds no tag data. There is one `TagRow`
  (`app/tag-row.tsx`), imported by `app/browse-card.tsx` rather than carrying
  a second implementation — its own file rather than living inside
  `BrowseCard` or `MoreStories`, so a future caller (home's plates, should
  they ever carry tags) can reach it without a cycle. Rendered as small-caps
  text rather than an outlined pill — the former tag-pill component and its
  dedicated `--color-control-edge` border token are retired, and every caller
  converted, because the outline added weight without hierarchy at low
  contrast on every card, every post and every archive row. It sits **last**
  below the excerpt on a card, which is the site's one rule for where a tag
  row goes: a ragged tag count belongs at the foot.
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

Whether a page's breadcrumb and `h1` sit at `max-w-page` or inside a
`max-w-2xl` column decides the breadcrumb wrapper and the `h1` treatment. A
route is wide or narrow and everything follows. There is no second question
and no route that can sit half in each. The band this axis used to also
decide is gone (see above) — the axis survives it, because the measure was
always the thing that changes the shape of the page, not the colour behind it.

**Wide.** Header at `max-w-page` (75rem/1200px, `--container-page` in
`app/globals.css`), `<Breadcrumb>` unwrapped where the route has one at all.
`max-w-page` replaced a bare `max-w-5xl` (1024px) sitewide in round 3, once a
missing container size in round 2's own handoff let every wide route render
104px narrower than the design was drawn against — the type scale did not
change, only the measure it sits in.

Eleven of the thirteen wide routes share one `h1` ramp,
`text-4xl leading-tight md:text-5xl lg:text-6xl`, via `app/wide-page.tsx`: the
four section fronts, the six taxonomy `[slug]` routes (paginated and not), and
the index listing at `/page/[page]`.

`/` and `/posts/[slug]` are wide but bespoke, each sized for what it actually
is rather than the shared ramp: home's 96px masthead and the post page's
headline, `clamp(2.125rem,8vw,4rem)` (34px mobile floor, 64px desktop
ceiling — round 2 shipped a fixed 72px that simply overflowed a 390px
viewport). Both still sit at the `max-w-page` measure and neither goes through
`WidePage` — home has nothing above it to wrap in a `<Breadcrumb>`, and the
post's crumb sits above its own header, not inside the shared shell.

**Narrow.** Header wrapped in `max-w-2xl` (no `mx-auto` — the column's left
edge matches every wide route's, only its right edge comes in sooner), `h1` at
`mb-6 text-4xl md:text-5xl` with no `leading-tight`.

`/about`, `/privacy`, `/search`. Three routes.

A 6xl heading in a 42rem measure looks enormous despite carrying identical
classes, and that mismatch is the tell that a page took the wrong treatment. A
narrow page's `h1` deliberately stays off the wide ramp's `lg:text-6xl` step
for exactly this reason — raising it to match the wide routes would reintroduce
the oversized-heading mismatch this section warns against, not fix an
inconsistency. A _centred_ narrow column was the real inconsistency (see
"Breadcrumbs" above) and is fixed; the smaller ramp is not a bug. Any new page
picks its treatment from its own measure, not from the nearest existing h1.

**The measure is the header's, not the prose's.** A post's body narrows to
`max-w-[43.75rem]` inside an `xl:grid` (sidebar `13.75rem`/220px, gap
`3.75rem`/60px), but its breadcrumb, `h1`, standfirst and cover sit above that
grid at the article's full `max-w-page`, so a post is a wide page whose body
happens to be narrow. The cover is part of that header block now, not a
full-bleed element outside `Container` — see "The masthead band is retired"
below for why it moved. `/search` is the mirror case: it browses posts by
function and is narrow by shape, and shape decides.

**Home's masthead is its `h1`.** `SITE_TITLE` at 96px with `SITE_DESCRIPTION`
as the standfirst beneath it, so home matches the ordinary `HEADING` and
`STANDFIRST` signatures like every other route even though the sizes are its
own. It stays unlinked, because a link on `/` points at the page the reader is
already on, the same reason the last crumb is plain text elsewhere. Home is
the index whose subject is the whole site, so naming itself is what every
other index already does.

The masthead shipped first as a `<p>`, to protect an `h1` that then sat on a
hero post home no longer has. That cost a weight bug as well as an outline:
the base-layer rule in `app/globals.css` sets `font-weight: 700` on
`h1, h2, h3` only, so a `<p>` in the display face rendered at 400 against the
700 of the headlines under it. **Do not add a weight class to fix that** — the
element being a heading is the mechanism.

**`app/story-card.tsx`'s `StoryCard` takes an explicit `as` prop (`"h2"` or
`"h3"`), unlike `app/browse-card.tsx`'s `BrowseCard`.** Home's three grid
plates pass nothing (default `"h2"`, siblings of the masthead's plate list);
the post page's Read Next teaser passes `"h3"`, one level under its own "Read
Next" `h2`. The two call sites need different levels for different reasons —
home has no section heading above its plates, Read Next does — so the level
is each caller's own decision rather than something the card infers.
`BrowseCard` has no such prop and is hardcoded `h2`, because every one of its
callers (`app/more-stories.tsx`, for the six taxonomy listings and the index)
renders directly under a page's own `h1` with nothing between — see "Eight
posts per page" above.

All sixteen routes are still on the axis.

### Standfirst where the reader is deciding; date where the reader is locating

A recurring question worth settling once rather than per-surface. A
standfirst helps a reader decide whether to read something; a date only helps
them place it in a sequence once they already have. Do not fill an empty
metadata slot with a date just because something else was removed from it —
that answers a question nobody asked at that spot.

Home's plates and the post page's Read Next teaser (`app/page.tsx`,
`app/story-card.tsx`) carry a standfirst, because the reader is deciding
whether to read the post. Home's plates also carry a date, because a
reader arriving at the front page wants to know the blog is alive — the one
place both apply at once. The "Earlier" list on `/page/[page]`, and the
archive, tags and search results elsewhere, carry a date and no standfirst:
the title is the content there, the date is the index.

**Category on cards was a considered exception, now reversed on request.**
`app/page.tsx` used to carry a comment arguing against showing category on
listing cards — the site has two categories, so the label mostly repeats
itself down a page, and a per-route exception would be needed on
`/categories/[slug]`, where the category is the page you are already on. Home's
plates show it anyway now, in the meta line beside the date, at the site
owner's explicit request. The argument against it was never wrong on its own
terms; it was outweighed. Do not re-add it to any OTHER card without the same
kind of explicit call — the per-route exception problem the original argument
raised is still real everywhere but home's front page.

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
content at the same `max-w-page` measure `Container` uses everywhere, then the
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

`--color-cover-keyline` no longer describes an edge against the sticky bar.
Round 2 made it describe the post cover's edge against the bar, since that
cover was full-bleed directly under it; round 3 moved the post cover inside
`Container`, below the standfirst, so it sits on cream on all four sides like
every other cover on the site (see "The post cover is contained" below). The
token stays — every `CoverImage` still carries the border unconditionally,
regardless of ratio (see "Two cover ratios" below) — but the bar-specific
contrast pairing `lib/palette-contrast.test.ts` once held is gone with the
case it guarded; do not re-add a keyline-vs-bar test unless a cover actually
sits against the bar again.

### Two cover ratios: crops for browsing, the full frame for reading

`app/cover-image.tsx`'s `ratio` prop (`"16:9"` default, or `"4:3"`) is the
whole mechanism. Source art is authored at 16:9, so `"16:9"` is a
stretch-to-fit no-op — nothing crops it — and `"4:3"` crops the sides via
`object-cover` on the image itself, not a Contentful Images API transform (see
"Image loader passes only `w`, `q`, `fm=webp`" above, unchanged by this).

- **16:9** — the home lead plate, the post hero. The two places a cover reads
  as the subject of the page rather than a way to recognise a card in a list.
- **4:3** — every other cover on the site: home's two-up plates, the post
  page's Read Next cards (both `app/story-card.tsx`'s `StoryCard`), and every
  browse-page card (`app/more-stories.tsx`'s list-variant `PostPreview`, the
  categories index thumbnail).

Passing neither prop keeps a caller written before this existed rendering
exactly as it did — `ratio` defaults to `"16:9"`, the site's original and only
ratio before round 3. A new caller should pass `ratio="4:3"` explicitly if it
is a card in a list; the default favours not silently cropping art nobody
asked to have cropped.

### The post cover is contained, not full-bleed

Round 2 shipped the post hero full-bleed, directly under the sticky bar,
above the breadcrumb — the cover set the header's own height. Round 3 found it
too dominant there and moved it inside `Container`, at the article's own
`max-w-page` measure, below the title and standfirst rather than above the
breadcrumb. Order at the top of `app/posts/[slug]/page.tsx` now: breadcrumb,
`h1`, standfirst, cover, then the hairline into the article grid. Do not move
it back above the breadcrumb — that reintroduces the case
`--color-cover-keyline`'s bar-contrast test used to guard, which round 3
deliberately retired (see above).

### `StoryCard` is the one 4:3 card, shared by two callers

`app/story-card.tsx` exports `StoryCard` (cover, 30px title, 17px Literata
standfirst, `CardMeta`'s date-then-category line) and `CardMeta` itself,
factored out because home's two-up plates and the post page's Read Next used
to be two components that had quietly drifted apart — a 32px title on one, a
27px title with no meta at all on the other. Round 3 §5 replaced both with
this one card:

- `app/page.tsx`'s `Page` renders it directly for the three non-lead plates
  (the lead is `LeadPlate`, its own component in the same file — the one
  size distinction the design keeps, see "One axis" above).
- `app/posts/[slug]/page.tsx`'s Read Next section renders it directly too, in
  its own `Container` rather than through `MoreStories`.

`CardPost` (`lib/types.ts`) gained a `category` field for this — `CardMeta`
needs it and `CARD_GRAPHQL_FIELDS` (`lib/api.ts`) now selects it, a single
linked name and slug, as cheap as the `tagsCollection` already riding along.
Every `CardPost`-typed fetch carries it now; nothing reads it except
`StoryCard` and `BrowseCard` (below).

**`MoreStories` lost its grid variant in round 3, then gained a different one
back in round 4 — deliberately not the same thing.** Round 3's `variant` prop
was one component switching between two unrelated shapes for two different
callers (Read Next's grid vs. every other caller's list), and the guidance
that replaced it was to build a future grid caller as its own component
rather than resurrect that switch. Round 4's card/row split is not that: every
remaining caller of `MoreStories` (the six taxonomy listings and the index,
via `app/listing-page.tsx`) now wants the SAME two-tier composition — a card
grid for the leading posts, a row list for the rest — so there is no longer a
per-caller choice to encode as a prop. `app/more-stories.tsx` takes a
`cardCount` (how many of the leading posts render as cards; the remainder
render as rows) and renders both tiers itself: `app/browse-card.tsx`'s
`BrowseCard` for the grid, `app/post-row.tsx`'s `PostRow` for the rows — two
small components built the way this section originally asked for, not a
variant switch inside `MoreStories`. See "Eight posts per page, and the card
grid" below.

**`BrowseCard` is not `StoryCard` reused, on purpose.** Both are 4:3 cards
with a `CardMeta` date-then-category line, but the order differs:
`StoryCard`'s excerpt sits BEFORE its meta line (home's plates, Read Next),
while a browse listing's card model puts the meta line immediately under the
title and the excerpt last (cover → title → date-then-category → standfirst).
Reusing `StoryCard` for both would mean threading that order through a prop
into a component that has had exactly one order since round 3; building
`BrowseCard` as its own small component (sharing `CardMeta`, not the whole
card) touches neither `StoryCard` nor its other two callers. `BrowseCard`'s
title also steps down at the grid's narrower tracks — 30px at one column,
24px from `sm` up, where the grid always shows at least two — which
`StoryCard` does not need, since its own callers never render narrower than
two columns.

### Wordmark fade-in, once the masthead scrolls out of view

`app/wordmark-fade.tsx` is the one client component this design needed.
Round 2 hid the bar's wordmark on home outright, for the whole visit, via the
`body:has(.site-masthead) .site-wordmark` rule in `app/globals.css`. Round 3
keeps that rule as the no-JS / pre-hydration fallback and layers a fade on top
of it: an `IntersectionObserver` on the masthead marks `<body>`
`.js-wordmark-observed` once it mounts (swapping the fallback's `display: none`
for an opacity transition) and toggles `.wordmark-visible` as the masthead
crosses the bar.

**The fallback rule also sets `view-transition-name: none` on the wordmark
while it lives on home.** This is load-bearing, not incidental: the spec
requires a `view-transition-name` to be carried by at most one generated box
per document, `opacity: 0` still generates a box the same as `display: none`
does not, and the masthead already claims `site-wordmark` on home (see "Cross
document view transitions" above). Without the override, the moment the
observer gives the wordmark a real box to fade, it would collide with the
masthead's name and the pairing that mechanism was built to guarantee would
break exactly on the page it matters most. Off home, the general
`.site-wordmark` rule keeps the name, unaffected.

Do not reach for a scroll listener or a second observer to replace this — one
`IntersectionObserver`, `rootMargin` accounting for the bar's height, is the
whole mechanism, and `prefers-reduced-motion` is handled in CSS (the
transition itself is removed; the state change still happens instantly).

### Mobile fixes: fluid headline clamps, a responsive prose base, a disclosure nav

Four round-3 fixes, all at the same `md` breakpoint the rest of the responsive
chrome uses:

- **The post `h1` and in-body `h2` are `clamp()`, not fixed sizes.** Round 2's
  fixed 72px `h1` overflowed a 390px viewport outright. Both clamps
  (`clamp(2.125rem,8vw,4rem)` on the `h1`, `clamp(1.625rem,6vw,2.125rem)` on
  `prose-h2`) express their floor and ceiling in rem — the same
  user-font-scaling reason every fixed size on this site is in rem, not px —
  with `vw` carrying only the fluid middle, which a rem value alone cannot do.
  Both also carry `break-words` (`overflow-wrap`) alongside the existing
  `text-pretty` (`text-wrap`): a single long word can still overflow a narrow
  viewport regardless of font size, which the wrap properties catch and the
  clamp alone does not.
- **`.prose`'s base size is responsive**: 1.125rem (18px) below `md`,
  1.1875rem (19px) at `md` and up, the second declared in an unlayered
  `@media (min-width: 48rem) { .prose { … } }` block right after the
  `@utility prose` definition in `app/globals.css` — unlayered so it outranks
  `@utility`'s own generated (layered) declaration regardless of source order,
  the same mechanism the `.sidenote-*` responsive rules use. Every size inside
  `.prose` is `em`-based off this, so the whole column (including inline and
  block code, both pinned in `em` against the prose base) scales with it
  automatically; nothing else needed touching.
- **The sticky bar has a mobile-only nav disclosure.** Below `md`, the four
  section links (`app/layout.tsx`) collapse from a row into a native
  `<details>`/`<summary>` hamburger — no client JS, same pattern
  `app/table-of-contents.tsx`'s `.toc-details` already uses for its own mobile
  collapse. The search icon and the hamburger's touch targets are both 44px
  (`p-3 -m-3`: the padding grows the hit area, the matching negative margin
  cancels its footprint in the row's own height calculation) — WCAG 2.2
  2.5.8, previously unmet at `p-2 -m-2` (36px) and invisible to
  `app/a11y.test.tsx`, which cannot check `target-size` (see "What the guards
  catch" below).
- **The bar itself is two heights**: 48px below `sm`, 52px at `sm` and up
  (`py-2.5 sm:py-3 min-h-12 sm:min-h-13`), each still derived the same way the
  original single height was — that breakpoint's `py` plus the wordmark's
  fixed 28px `leading-7` line box. Recompute both pairs, not one, if either
  `py` or the line box changes.

Avatars are responsive on the same axis: `app/avatar.tsx`'s sidebar byline is
34px below `md`, 38px at `md` and up (a single inline "Name · Date" row below
`md`, the existing two-line stacked name-then-date layout above it — `flex …
md:block` on the wrapper, the mobile row's own middot separator hidden at
`md` since the stacked layout needs none); `app/author-bio-card.tsx`'s portrait
is 48px below `md`, 56px at `md` and up. Both keep their `width`/`height`
props at the larger, desktop figure regardless of breakpoint — those size
Next/Image's request, not the rendered box, which each wrapper's own
`h-`/`w-` utilities control.

### Tags glossary: a rule marks a section boundary, never a row boundary

`/tags` used to close each tag's section with a hairline below it
(`border-b`), which read as a break between POSTS — the eye met the rule
right after the last post row of a group, not before the next tag name, so
the page looked divided in the wrong places. Round 3 §9 moved the rule: one
2px `border-brand-dark` rule sits **above** each tag name instead, `mt-11`
(44px) between groups except the first (whose gap above already comes from
`WidePage`'s own header margin), and post rows within a group are separated by
plain 14px space (`space-y-[14px]`) with no rule at all, including the mobile
`border-t` that used to sit above the post list itself. The same principle
generalises: **a rule belongs at a section boundary, and a listing that wants
to mark one should reach for the section's own edge, not a divider between the
rows inside it.** `/tags` is the only glossary-style listing on the site
today; apply this the next time one exists rather than reusing the row-hairline
pattern `app/archive/page.tsx` and the taxonomy listings use, which is correct
for THEM — a chronological or filtered list, not a glossary of terms.

### Eight posts per page, and the card grid a listing's cards sit in

`POSTS_PER_PAGE` (`lib/constants.ts`) is 8 — round 3 had it at 10 (previously
5), round 4 moved it again — because round 4 gave every listing page a fixed
composition instead of a bare count:

- **Home, page 1**: a lead plate plus three `StoryCard` plates
  (`PLATE_COUNT` in `app/page.tsx`, 4), then four "Earlier" rows.
- **Every other listing page** — page 2+ of the index, and every page of a
  category, tag or author listing — renders all 8 as cards, no rows. That
  includes page 1 of a category/tag/author listing too: `app/listing-page.tsx`
  passes `MoreStories` a `cardCount` of 4 only when `currentPage === 1`
  **on the index** (home has its own bespoke composition and does not use
  `MoreStories` at all); every other page passes the full slice length, which
  is `MoreStories`' own default and renders nothing but cards.

`4 + 4 = 8` is what page 1 needs to hold for `/page/[page]`'s own slicing
(`lib/paginate.ts`'s `pageItems`) to stay in step with it — the same constant
sizes every taxonomy listing's pages too, by the comment's own original
design ("every page holds the same number of posts").

**The card tier is a 4-up grid**, `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
xl:grid-cols-4 gap-x-8 gap-y-12`, used identically by `app/more-stories.tsx`
(the card portion of a taxonomy/index listing), `app/page.tsx`'s three grid
plates (capped at `lg:grid-cols-3`, since there are only ever three of them —
see "One axis" above for why the lead plate itself is not in this grid), and
the `app/categories/page.tsx` / `app/authors/page.tsx` indexes. A short list
not filling the last row is normal and not a special case — 14 posts is 8
cards then 6, not 8 then a padded 8. Keep the literal class string identical
at every call site rather than centralising it behind a constant: Tailwind's
content scanner needs the literal utilities to appear in scanned files, and a
shared string constant is one more indirection for the same handful of
characters.

**The row tier (`app/post-row.tsx`) is date-then-title only** — no cover, no
excerpt, no category, no tags — shared between `MoreStories`' row list and
home's "Earlier" list, which used the identical markup inline before round 4
factored it out. See "Standfirst where the reader is deciding" above for why
a row carries no standfirst: it is for locating a post in a sequence, not for
deciding whether to read it. Rows carry no heading markup at all (a bare
`<Link>`, not wrapped in an `h2`/`h3`), matching what home's "Earlier" list
already shipped — `app/browse-card.tsx`'s `BrowseCard` titles are `h2`, since
every remaining caller renders directly under a page's own `h1` with no
section heading between (the same rule `app/more-stories.tsx` used to encode
as `heading ? "h3" : "h2"`, now hardcoded rather than threaded through, since
nothing has passed a truthy `heading` since round 3 retired `MoreStories`'
section-label feature along with its grid variant).

### Identity is stated once, on page 1

A category, tag or author listing's description (or bio) renders on page 1
only — `app/categories/[slug]/page.tsx`, `app/tags/[slug]/page.tsx` and
`app/authors/[slug]/page.tsx` render it; their paginated siblings, each one
route segment deeper at its own `page/[page]` (for instance
`app/categories/[slug]/page/[page]/page.tsx`), do not. `/page/[page]` never
renders the `latest-posts` standfirst at
all, for the same reason: that route only ever exists for page 2 and up, page
1 living at `/` and redirecting there, so it has no page 1 of its own to
state anything on. A later page keeps its heading (so a reader landing there
from a search result still knows what they are looking at) and
`app/page-context.tsx`'s "Page N of M" caption, and drops only the prose.

This does not extend to the breadcrumb trail: a later page's crumb is still
just the section name, with no page number appended to it. See "Breadcrumbs"
above — `app/page-context.tsx` already captions the list with its position,
and adding it a second time to the trail is exactly what that section's "do
not add page numbers to those chains" already rules out.

### Pagination is one shape everywhere: Newer, a count, Older

`app/pagination.tsx` no longer has a `variant` prop — round 3's numbered
page-jump list and home's link-only "simple" variant are both gone, replaced
by one component every listing (home and the six taxonomy pages) renders the
same way. Two states, not three slots unconditionally:

- **Page 1** has nothing before it and nothing to caption (a reader on page 1
  does not need to be told they are on page 1), so it renders a single
  left-aligned "Older posts →" link and nothing else — no Newer slot, no
  count.
- **Every later page** renders all three: "← Newer posts" on the left, a
  muted "Page N of M" in the centre, "Older posts →" on the right.

**The exhausted direction on the last page stays in its slot rather than
disappearing.** Collapsing it would shift the count off-centre and reflow the
row exactly on the page where a reader is most likely to stop; instead it
renders unlinked, in `--color-separator` (the same "faint" token
`text-separator` already uses for hairlines and the breadcrumb slash) rather
than the link colour. `app/pagination.test.tsx` covers all four shapes:
single-page (renders nothing), page 1, a middle page, and the last page.

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
