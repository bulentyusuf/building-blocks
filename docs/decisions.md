# Decisions

The reasoning behind `CLAUDE.md`. `CLAUDE.md` carries the rules; this file
carries the arguments, so an audit does not re-raise a decision and a change
does not re-derive it. Read the entry before changing anything it names, and
before an audit of any kind.

Each `###` heading carries a stable key on the line beneath it, which `CLAUDE.md`
cites. `lib/docs-consistency.test.ts` fails on a citation naming a missing key.
Entries follow the length rule under `reopening-decisions`.

## Index

Every entry below, by the `CLAUDE.md` section whose rules cite it. `lib/docs-consistency.test.ts` holds the two files to each other in both directions, so a key here always has a rule and a rule always has a key.

**Page shape**

- `band-retirement` — The masthead band was retired in favour of a 3px rule
- `breadcrumbs` — Breadcrumbs, and the one page without them
- `page-axis` — One axis, and it is the header measure
- `wide-page-shell` — How the wide-page header is built

**Headers and home**

- `split-masthead` — The masthead splits into heading and standfirst, right-anchored
- `home-hero` — The home hero splits 50/50, synced with the card grid beneath it, with Avatar kept whole
- `cover-frames` — Covers take one of two frames, chosen by `wide`
- `posts-per-page` — `POSTS_PER_PAGE` is five, and changing it is a design pass
- `card-meta` — A card's meta line is the date alone, above the excerpt
- `listing-shell` — The taxonomy listings and the index listing share one shell
- `page-counter` — The page counter moves inline, into the heading
- `heading-widont` — The post `h1` renders its title directly, without `widont()`

**Type and styling**

- `pagefind-ui` — Search runs on Pagefind's Component UI, and its quirks are upstream
- `pagefind-index-scope` — What the Pagefind index deliberately excludes
- `search-emblem` — The search emblem's dark-mode ground
- `brand-colour-duplication` — Brand colour exists in two places on purpose
- `chrome-aubergine` — Chrome is aubergine, one token for the bar and the footer
- `tag-pills` — Tags render as pills, in one implementation
- `border-roles` — Three border roles, and they are not interchangeable
- `focus-indicator` — One focus indicator, set in `@layer base`
- `scroll-offset` — One scroll offset, `scroll-padding-top` on `html`
- `sidenotes` — Sidenotes carry several load-bearing constraints
- `view-transitions` — Cross-document view transitions were removed, and why they never ran
- `tag-pages` — Tags have their own pages, and `/tags` is the index
- `type-roles` — Two faces, three roles, and no family named directly
- `font-subsets` — Font preloading is `subsets: ["latin"]` only
- `prose-measure` — The prose column is never measured in `ch`
- `prose-overflow` — Prose breaks an unbreakable string rather than scrolling the page
- `shiki-fine-grained` — Shiki grammars are imported one by one, never from the meta-package
- `shiki-comment-contrast` — The highlighter replaces min-dark's comment colour
- `tailwind-scanning` — Documentation is excluded from Tailwind's source scanning

**Accessibility**

- `skip-link` — The skip link's target is focusable
- `lightbox-mounted` — The lightbox trigger is gated on `mounted`, deliberately
- `announced-links` — One announced link per card, and one description per figure
- `scroll-region-names` — A scroll region's name carries its position, not its contents

**Data and Contentful**

- `csp-scoping` — CSP: `'unsafe-inline'` stays global, every relaxation is scoped to a route
- `image-loader` — Image loader passes only `w`, `q`, `fm=webp` by design
- `priority-opaque` — Every image is opaque in the server HTML, and that is the LCP fix
- `browse-copy` — Browse-page copy is editable, site identity is not
- `authors-array` — Posts carry `authors`, an ordered array capped at three
- `rich-text-links` — Every rich-text hyperlink goes through `lib/rich-text-link.tsx`
- `json-ld` — Every structured-data block goes through `jsonLdHtml`
- `locale` — The site's locale is en-GB, everywhere
- `single-entry-cache` — Single-entry fetchers are `cache()`-wrapped on purpose
- `og-card-on-demand` — The post OG card renders on demand, not at build
- `fetcher-cache` — Every fetcher in `lib/api.ts` is `cache()`-wrapped
- `cache-tags` — Three cache tags, and the webhook picks between them
- `post-scheduling` — Scheduling is Contentful's job, and `date` is not a gate
- `collection-paging` — Every unbounded collection query pages, and must keep selecting `total`
- `fixtures` — Contentful export/seed files are load-bearing and brittle
- `node-pin` — One Node version pin, in `engines.node`
- `rich-text-types-dupe` — Two copies of `@contentful/rich-text-types`, and only one ships
- `schema-changes` — A schema change reaches the live space before the code that queries it

**Testing**

- `og-font-guard` — The OG card's font is guarded by a real render, not a hash
- `guard-limits` — What the guards catch, and what they cannot
- `known-bad-controls` — Every pattern-matching guard needs a known-bad control

**Workflow constants**

- `reopening-decisions` — A settled design call is reopened in writing, not in a branch
- `preview-on-request` — Vercel previews build on request, and production skips documentation-only changes

**Bloat is the default failure mode**

- `reviewed-items` — Other reviewed items, intentionally left as-is

## Accepted trade-offs and known non-issues

Intentional. Do not "fix" or re-flag without a new reason.

### CSP: `'unsafe-inline'` stays global, every relaxation is scoped to a route

<!-- key: csp-scoping -->

`'unsafe-inline'` stays sitewide. Removing it needs a per-request nonce, which
forces dynamic rendering; revisit only if the site starts rendering untrusted
user content.

Two directives are relaxed per route and never on the catch-all.
`'wasm-unsafe-eval'` applies to `/search` and `/pagefind/*` only, because
Pagefind compiles WebAssembly there, including inside a SharedWorker that takes
its CSP from the worker script's own response. `frame-ancestors` admits
`https://app.contentful.com` on `/posts/*` only, because the Post preview URL
redirects there and that is the only document Contentful frames. `/api/draft`
does not need it: a 302 is never displayed in a frame. Give a Page entry its own
preview URL and that list has to grow.

Next applies header rules in array order with later matches winning, so the
strict catch-all comes first in `next.config.js`. `lib/csp-headers.test.ts`
resolves the config that way, with the inverted order (PR #425) as its
known-bad control.

### Search runs on Pagefind's Component UI, and its quirks are upstream

<!-- key: pagefind-ui -->

`app/search/` mounts Pagefind's web components with a house result template.
The markup is ours; keyboard and ARIA behaviour is upstream's and is not
reimplemented. Search CSS needs no `!important`: if it seems to, fix the
template. Keep `pagefind` at `^1.5.2` or later, where the Component UI exists.

The legacy default UI and a bespoke React UI were both tried and abandoned. Do
not propose either, which also settles the ranking quirks (a missing term is
retried truncated, and a broad match can outrank a literal one): fixing them
means owning the result pipeline. Wait for Pagefind/pagefind#1246.

Accepted: the empty state hides the emblem via `:placeholder-shown`, so the
placeholder must stay non-empty, and a Pagefind bump that moves the input into
a shadow root breaks it. The index is built by `postbuild`, so a post published
by webhook is absent from search until the next deploy; a Vercel deploy hook on
the webhook is the fix, and it is Bulent's call. `/search` is `noindex`.

### What the Pagefind index deliberately excludes

<!-- key: pagefind-index-scope -->

Two regions carry `data-pagefind-body`: a post's `h1` and its `<article>` in
`app/posts/[slug]/page.tsx`. No other route is indexed.

Pagefind reads raw text and honours neither `aria-hidden` nor `opacity-0`, so
anything inside a body region that is not the post's own words needs
`data-pagefind-ignore` stated explicitly. Five things carry it: the table of
contents, the heading permalink, the foot-of-post author bio
(`app/author-bio-card.tsx`, identical on every post by that author), the
sidenote marker and toggle label (`lib/sidenote.tsx`), and the new-window hint
(`app/new-window-hint.tsx`).

A heading's sub-result title is read separately from the DOM text and ignores
the attribute, so the permalink glyph is CSS generated content on an empty span,
never a text node. Do not put the character back. The `Tagged` row stays
indexed, because tag names are real signal.

### The search emblem's dark-mode ground

<!-- key: search-emblem -->

`public/search-emblem.svg` is loaded as an `<img>`, so it cannot read the page's
tokens. Its cream ground stays `#FAF5F1` in both schemes via the SVG's own
`@media` rule, so anything drawn on it in dark mode uses literal hex, never a
brand token. `lib/palette-contrast.test.ts` checks it against the light
`--color-brand-bg`. The ground is sliced from the glass outline and is not a
tuning knob.

### Brand colour exists in two places on purpose

<!-- key: brand-colour-duplication -->

The header colour is a token in `app/globals.css` and `BRAND_HEADER_COLOR` /
`BRAND_HEADER_COLOR_DARK` in `lib/constants.ts`, because the viewport
`themeColor` and the web manifest are built in JS and cannot read custom
properties. Any change touches both.

### A settled design call is reopened in writing, not in a branch

<!-- key: reopening-decisions -->

Changing a decision here starts with an edit to this file, in its own commit,
before the implementing branch opens. A branch that edits this file and the code
it governs in the same push has removed the only check on itself. PR #398 is
the worked example: six settled calls were re-answered inside it and went
unrecorded until twenty-two commits had built on them.

**How an entry and a comment are written** (September 2026). An entry states
the decision, the reason, and what would reopen it, in about 20 lines. How it
got there — the PR that reversed it, the wording it replaced, the measurements
along the way — is history and lives in git; name the PR if a reader needs it.
A source comment is one or two lines and says what the code cannot: a trap, a
constraint that is not visible, or a pointer. When the argument lives here, the
comment is a clause and a `[→ key]`, not a copy of the entry. A comment that
restates the code is deleted. This caps what had grown unchecked: by September
2026 this file ran to 2,405 lines and 32% of the lines in `lib/` were comments.

### The masthead band was retired in favour of a 3px rule

<!-- key: band-retirement -->

Every wide route's header closes with a 3px `border-brand-dark` rule in
`app/wide-page.tsx`, standing in for the colour step the navy band drew.

**The band's inset stays two numbers, one each side of the rule**: the header's
bottom margin above it and a gap below it. Folding both above the rule leaves
the first content flush against a 3px line on home, the post page and the
section fronts. `contentOwnsLeading` suppresses the gap below the rule, never
the margin above, and only `app/listing-page.tsx` sets it, because a ruled
listing's items supply their own leading. `lib/listing-rhythm.test.ts` holds
both halves.

What went with the band: the `bleed` prop and cover pull-ups (covers are
contained now), the breadcrumb `tone` prop (every trail sits on cream and takes
the accent), and `.band-prose`. The unbuilt cover-tint feature assumed the band
and needs re-deriving if it is ever picked up.

### The masthead splits into heading and standfirst, right-anchored

<!-- key: split-masthead -->

From `md` up a wide header lays heading and standfirst on one row, the
standfirst pinned to the container's right edge; below `md` it stacks.
`justify-between` and the standfirst's 320px cap ship together: without the cap
a one-line standfirst strands at the far margin, without `justify-between` it
strands mid-row. `items-baseline-last` closes both blocks on their last line.
The stack below `md` is required: a 60px heading runs to 330px and a 390px
phone has 350px of content, so there is no room for a standfirst beside it.

Every standfirst carries `md:max-w-[20rem] text-lg leading-relaxed
md:text-right text-brand-muted`, and `lib/palette-contrast.test.ts` anchors on
all four. Both `md:` prefixes are mandatory: unprefixed, the cap and alignment
apply to the mobile stack, landing the text short of the page edge by an amount
that grows with the viewport (15px at 390, 392px at 767), so one screen width
cannot judge it.

The cap sets a copy budget of about 37 characters a line, 74 for two. The
`Design` tag description sits at exactly 74. The author routes are the one
exception, via `splitHeader={false}`, because their `h1` already shares a row
with a 112px portrait.

### The home hero splits 50/50, synced with the card grid beneath it, with Avatar kept whole

<!-- key: home-hero -->

`HeroPost` in `app/page.tsx` is `grid gap-y-6 md:grid-cols-2 md:gap-x-16
lg:gap-x-32 md:gap-y-0`, matching the `MoreStories` grid below so the hero's
right column lines up with the right-hand card, a 428px cell inside the 984px
content cap. It is a base-level grid: a
grid only from `md` left the byline and excerpt 0px apart on mobile.
`md:gap-y-0` is defensive (one row has no row gap to act on) and stays so a
third child inherits the two-column intent. The headline caps at
`lg:text-[2.5rem]`, off-scale on purpose.

`Avatar` stays whole, with the date in its `meta`. Pulling the date into a
standalone line to mirror a card was shipped and reverted: no card has a byline,
so there was nothing to mirror. `lib/listing-rhythm.test.ts` asserts the grid
classes and `meta={dateline}`.

### Chrome is aubergine, one token for the bar and the footer

<!-- key: chrome-aubergine -->

`#2B1C3F` light, `#3B2A52` dark, carried by `--color-brand-header` and its
literal twins in `lib/constants.ts`, which also feed the manifest's
`theme_color`. `lib/palette-contrast.test.ts` holds each twin to its token. One
colour for bar and footer replaced a navy bar over a near-black footer that read
as two unrelated surfaces.

- The band could not survive it: no band value fits under `#2B1C3F` at the
  repo's 1.6:1 chrome step, and in dark it would sit below the page.
- The footer's faintest tint is `white/72`. `white/65` falls to 6.37:1 on the
  dark footer, under the 7:1 floor the test enforces on footer small print;
  the light scheme alone hides that.
- `brand-crimson` on the aubergine is 2.04:1, so chrome links identify by
  weight and underline and chrome carries a white focus ring. Lighten the
  chrome and that override becomes the bug.

### Covers take one of two frames, chosen by `wide`

<!-- key: cover-frames -->

`app/cover-image.tsx`. With `wide`, 3:2 on mobile and 16:9 from `md`, which is
every post cover off its 1920x1080 source, which a bare 3:2 frame crops by
15.6%. Without it, 3:2 at every width. The
mobile 3:2 is the item most often re-raised as a finding. A 4:3 card crop and a
uniform uncropped 16:9 were both proposed and rejected.

### `POSTS_PER_PAGE` is five, and changing it is a design pass

<!-- key: posts-per-page -->

`lib/constants.ts`. Home's hero counts, so page 1 is a hero plus four cards and
later pages hold five. Eight and ten were both tried and reverted. Home, the
`/page/[page]` slice and every taxonomy listing read it, so a new number needs
all four looked at together.

### A card's meta line is the date alone, above the excerpt

<!-- key: card-meta -->

`PostPreview` in `app/more-stories.tsx`, both variants. No category on cards:
with two categories the label carries about one bit, and it would need a
per-route exception on the category pages, where it names the page the reader
is on. Adding `category` to `CardPost` was rejected, which leaves
`CARD_GRAPHQL_FIELDS` unchanged.

### The post `h1` renders its title directly, without `widont()`

<!-- key: heading-widont -->

Every other title calls `widont()`. At the post `h1`'s ramp the glued last two
words can be wider than the column and overflow; four posts did at a 20px root,
and dropping the glue took all four to zero. A length guard in `widont()` cannot
work, because character count does not track rendered width (a 14-character
glued pair measured 338px, a 15-character one 331px), and breaking
mid-word is worse than a widow.

`text-balance` covers the widow instead: zero widows from 768px up and one at
375px across the 23 posts measured, with no horizontal scroll, where
`text-pretty` left as many as no strategy at all. Headings still widow at 375px
with a 20px root, where the last word is most of a line; only the glue would
move those.

### Tags render as pills, in one implementation

<!-- key: tag-pills -->

`app/tag-pill.tsx`, wrapped by `TagRow` in `app/more-stories.tsx` and used
directly on the post page. A pill is a tag as metadata attached to something
else; a link is a tag as destination, as on the `/tags` glossary and the search
empty state. There is no third treatment. Small-caps text links were proposed
and rejected; if revisited, it is one change reaching both call sites.

### Image loader passes only `w`, `q`, `fm=webp` by design

<!-- key: image-loader -->

Cropping is CSS-side (`object-cover`). The absence of Contentful's crop, focus
and height parameters is a decision, not an omission.

### Every image is opaque in the server HTML, and that is the LCP fix

<!-- key: priority-opaque -->

`lib/contentful-image.tsx` holds no reveal state; `next/image` paints and clears
the blur placeholder without ever setting opacity to 0. Chromium's LCP skips
transparent elements, so an opacity-based reveal makes LCP the React commit
rather than the image. Do not reintroduce one.

The file's `"use client"` stays. The loader is a function prop, which only a
Client Component can pass to `next/image`; removing it fails the build even
though the file has no hooks.

A `sizes` value stops growing where its container does: content tops out at
984px, so a bare `vw` clause past that buys a larger file than anything on
screen.

### Three border roles, and they are not interchangeable

<!-- key: border-roles -->

Defined in `app/globals.css`.

- **`--color-hairline`**: every divider and the edges a listing draws. It
  inverts on its own, so never add a `dark:` variant. `app/pagination.tsx` has
  no top border because the listing above closes itself; a listing under a wide
  header drops its opening rule, never the closing one.
- **`--color-control-edge`**: `app/tag-pill.tsx` only. It carries a WCAG 1.4.11
  contrast floor as two literal values, and `lib/tag-pill.test.ts` recomputes
  both and asserts the tokens stay distinct.
- **The `border-2` image frames** in `lib/rich-text.tsx` and
  `lib/lightbox-image.tsx`, a heavier role with its own pairing.

### One focus indicator, set in `@layer base`

<!-- key: focus-indicator -->

One `:focus-visible` rule in `app/globals.css`. Components add no
`focus-visible:ring-*` or `focus-visible:outline-*`. Three exceptions, each
argued in its file: the aubergine header and footer, where crimson fails; the
code-block scroll regions in `lib/rich-text.tsx`, which draw inward because
their parent clips; and the controls on their own dark ground,
`app/back-to-top.tsx`, `app/exit-preview-button.tsx` and the lightbox close
button, which take a two-tone white ring: a fixed control floats over grounds
no one colour clears (crimson is 2.19:1 on the light footer), and white at
18.7:1 on the dark page pairs with a dark offset at 15.5:1 on the light one. That last group was once
"simplified" and reverted.

### One scroll offset, `scroll-padding-top` on `html`

<!-- key: scroll-offset -->

`scroll-padding-top: 5rem` on the scroll container in `app/globals.css`
replaced per-heading `scroll-mt-*`. The two add, so they cannot coexist, and the
container form also covers the browser scrolling a focused element into view
(WCAG 2.4.11). `app/table-of-contents.tsx` reads this value to place its
activation line via `lib/toc-active.ts`; `lib/toc-active.test.ts` fails on any
class carrying the old utility. Recompute the 5rem, and the skip link's
`focus:top-2`, if the header's padding or the wordmark's size changes.

### The skip link's target is focusable

<!-- key: skip-link -->

`<main id="main" tabIndex={-1}>` in `app/layout.tsx`. Some browsers do not move
the sequential-focus start on a fragment jump; `-1` fixes that and adds no tab
stop.

### The lightbox trigger is gated on `mounted`, deliberately

<!-- key: lightbox-mounted -->

`lib/lightbox-image.tsx` renders the image bare until mount, then wraps it in
the enlarge button. Rendered unconditionally the button was focusable and
announced "Enlarge image" while doing nothing with scripts off. A test asserts
the server HTML carries no `<button>`.

### One announced link per card, and one description per figure

<!-- key: announced-links -->

Three doubled labels that each look like a missing one. Do not restore any.

- **A linked cover is hidden from assistive tech**: `aria-hidden` and
  `tabIndex={-1}` move together in `app/cover-image.tsx`, with no `title`.
  `CoverImage` takes the whole asset so it can compare `title` against
  `fileName` and drop a filename-stem alt to `""` with a build warning.
  `description` is never the fallback, because on a figure it is the caption.
- **Footer column labels are `<p>`, not `<h4>`**: as headings they skipped a
  level, and as `h2` they would take the display face. Both navs carry
  `aria-label`.
- **An embedded figure's `alt` is empty whenever a caption renders**, because
  Contentful's `description` does both jobs.

### A scroll region's name carries its position, not its contents

<!-- key: scroll-region-names -->

Tables and code blocks in `lib/rich-text.tsx` are focusable scroll regions named
by document order, `Table 2`, `Code block 2`, or by filename where a code block
has one. A name derived from the header row would repeat cells announced again
on entry. `app/a11y.test.tsx` renders two tables, the smallest fixture that can
tell a working name from a broken one.

### Breadcrumbs, and the one page without them

<!-- key: breadcrumbs -->

- Pages in a `max-w-2xl` column wrap `<Breadcrumb>` in
  `<div className="mx-auto max-w-2xl">`, or it starts 176px left of the heading;
  wide pages render it unwrapped.
- On `/search` the wrapper sits before the `<section>`, so `.search-empty`
  stays the next sibling of `.pagefind-scope` for the emblem's `:has()` rule.
- `/page/[page]` carries Home / Latest Posts. The last crumb is never a link, so
  there is no double link to `/`. Home is the one route with no trail.
- Page position rides inline in the `h1` (`app/page-counter.tsx`), never in the
  trail.
- Accepted: on `/categories/[slug]/page/[page]` `aria-current="page"` sits on
  the section crumb, and archive rows carry two tab stops each.

### Sidenotes carry several load-bearing constraints

<!-- key: sidenotes -->

A `Sidenote` entry embedded inline, rendered by `lib/sidenote.tsx`. A missing
entry renders nothing; do not make it an error.

- **Every element stays phrasing content.** A `<details>`, `<summary>` or `<p>`
  closes the open paragraph at parse time, which CSS cannot undo, so the toggle
  is a hidden checkbox and paragraphs are spans.
- **The toggle needs no JavaScript.** The checkbox is visually hidden, never
  `display: none`, so it stays focusable; `app/sidenote-enter-key.tsx` is an
  enhancement, never a dependency.
- **Responsive display lives in the unlayered `.sidenote-*` rules**, never in
  utilities, which lose to unlayered styles.
- **Numbering has two halves**, a document-order index in `lib/rich-text.tsx`
  and a CSS counter; both markers are `aria-hidden` and the label is named by
  an `sr-only` "Note N".

`lib/rich-text.test.tsx` guards the phrasing rule, the absent `<button>` and the
numbering.

### Cross-document view transitions were removed, and why they never ran

<!-- key: view-transitions -->

`@view-transition` fires only when one document replaces another. Every link
here is a Next `<Link>`, which navigates client-side, so it never ran; it was
removed. React's same-document `<ViewTransition>` is the working option and was
declined in August 2026, since nobody missed the effect. If revisited, it needs
an explicit `share="morph"` on both ends and a prefetched destination. A
`view-transition-name`, `viewTransitionName` or `transitionName` reappearing
without this entry rewritten first is dead code.

### Tags have their own pages, and `/tags` is the index

<!-- key: tag-pages -->

`/tags` lists every tag with its posts; each links to `/tags/[slug]`, a landing
page with a trail, an `h1`, the description as standfirst and a paginated list.
Do not go back to `#slug` anchors: an anchor drops the reader past everything
that says where they are. Old anchors still land.

- `postsWithTag` in `lib/tags.ts` filters in memory, because Contentful's
  GraphQL cannot filter on an `Array<Link>` field. Callers pass the posts in.
- Every surface reads the threshold through `visibleTagSlugs`: the glossary,
  the sitemap and `/tags/[slug]`, which 404s below it. A test asserts they agree.
- `MoreStories` takes `visibleTags?: Set<string>`, computed from all posts, so a
  pill never links to a 404. Category and author pages get it from
  `getVisibleTagSlugs`; a tag page passes the set minus its own slug.
- The glossary is `data-pagefind-ignore`. Pills sit below the body, never in the
  xl-only sidebar, and not on "Read Next".

### Browse-page copy is editable, site identity is not

<!-- key: browse-copy -->

The standfirst and meta description on `/tags`, `/categories`, `/authors`,
`/archive` and `/page/[page]` come from a `browseIntro` entry keyed by slug
(`latest-posts` for the last), through `browsePageMetadata` in
`lib/page-metadata.ts` except on `/page/[page]`, whose canonical is per page.
`generateMetadata` and the page pass the same slug constant (see
`single-entry-cache`). A missing entry degrades to a heading.

Home is the deliberate exception: `SITE_DESCRIPTION` is site chrome, like
`SITE_TITLE`. Do not move either into the CMS; they are read across many routes
that never touch Contentful. `/archive`'s standfirst is generated from the data,
and its `browseIntro` field is an all-or-nothing override.

### The OG card's font is guarded by a real render, not a hash

<!-- key: og-font-guard -->

`app/posts/[slug]/opengraph-image.font.test.tsx` renders the committed WOFF
through `next/og` and asserts a PNG comes out. Any font check imports from
`next/og`, never `satori`: the vendored Satori is older and rejects tables the
standalone package parses, which is what sank an earlier face.

### Other reviewed items, intentionally left as-is

<!-- key: reviewed-items -->

- `data:` in `img-src` stays for blur placeholders; `data:image/*` is not valid
  CSP. `blob:` was removed, since nothing creates a blob URL.
- No `X-Frame-Options`: `frame-ancestors` covers every current browser.
- No rate limiting on the API routes. Secrets are compared with
  `timingSafeEqual`; keep them long and random.
- `dangerouslySetInnerHTML` for Shiki output in `lib/rich-text.tsx`, and
  Pagefind's unescaped `{{+ excerpt +}}` in `app/search/search-client.tsx`:
  both trusted CMS content. The JSON-LD blocks are the third sink and escape
  instead (`json-ld`).
- The sitemap filters Page entries through `ROUTED_PAGE_SLUGS` in
  `app/sitemap-xml/route.ts`; add any new routed slug there.
- Dependabot ignores majors; security updates still cover them. CI actions are
  pinned to major tags, accepted as first-party.
- `package.json` overrides pin **postcss**, **sharp** and **uuid** to clear
  advisories in copies `next` and `contentful-import` do not update. They are
  why `npm audit` shows no highs; re-check them on every `next` bump. Forcing
  sharp is safe because the custom image loader means Next never calls it.
  Do not swap in `contentful-cli`, which drags the same uuid chain.

### Posts carry `authors`, an ordered array capped at three

<!-- key: authors-array -->

Co-authors, with `authors[0]` the lead: front of the portrait stack, first in
the byline and OG card, and the RSS `<author>` when `AUTHOR_EMAIL` is set. The
Contentful size validation and the GraphQL `limit` are both 3 and move
together. Names join with an ampersand and no serial comma; in RSS each author
gets a `<dc:creator>`.

Three things share the name. The `author` content type is alive and is what
`authors` links to. The `authors` field is the array. The singular `author`
field on Post is gone from the live space (3 September 2026). Say which one you
mean. This replaced a one-author-plus-contributors model, closed unmerged as
PR 437.

There is no `getPostsByAuthor`: Contentful cannot filter on `Array<Link>`, so
author pages filter `getAllPosts` with `postsByAuthor` in `lib/authors.ts`, as
tag pages do. Drift between the template fixtures and the live space is
invisible to CI (`guard-limits`).

## House conventions

### Two faces, three roles, and no family named directly

<!-- key: type-roles -->

`app/globals.css` defines `--font-display` (Bricolage Grotesque), `--font-body`
(Literata) and `--font-ui`, and points `--default-font-family` at the body face.
Nothing in a component names a family, which is what kept the last three face
swaps to a few lines. `--font-ui` resolves to the display family but keeps its
own token; do not merge them. There is no `font-sans` utility.

- **Display**: `h1` to `h3` and the mastheads, via the base-layer rule. Do not
  add `font-display` to a heading.
- **Body**: prose and the meta around it, dates, bylines, breadcrumbs, captions.
  A stray `font-ui` on a date is a regression.
- **UI**: nav, footer, the table-of-contents and "Explore with AI" labels, the
  tag pill, the archive and tag count spans, and every small uppercase
  letterspaced label. Uppercase plus letterspacing is the tell. A new surface
  that seems to want UI stays on the body face until raised.

`app/global-error.tsx` is excluded; it renders its own `<html>` without the font
variables. A replacement display face must contrast with the serif, carry an
`opsz` axis reaching about 45pt, and leave the body face its true italic.

### Font preloading is `subsets: ["latin"]` only

<!-- key: font-subsets -->

`subsets` in `next/font/google` chooses what is preloaded, not what is covered:
every subset still ships as `@font-face` with a `unicode-range` and loads on
demand. Adding `latin-ext` put six files (about 501 KB) into `<head>` at high
priority and delayed LCP. Do not re-add it for `de-DE`.
`app/layout.font-subsets.test.ts` holds this, with the two-subset configuration
as its known-bad control.

### The prose column is never measured in `ch`

<!-- key: prose-measure -->

`@utility prose` neutralises the typography plugin's `max-width`; the measure
lives on the `max-w-2xl` parents. The plugin's `ch` tracks the current font's
zero glyph, so a body-face swap silently resized the column by 8%.
`app/globals.measure.test.ts` guards it.

### Prose breaks an unbreakable string rather than scrolling the page

<!-- key: prose-overflow -->

A bare URL or command with no break opportunity widens the whole document, so a
phone reader loses the left margin of every line (WCAG 1.4.10).
`scripts/audit-a11y.mjs` found seven on the deployed site. `overflow-wrap:
break-word` sits on `@utility prose`, not a child selector, because one case is
a command in a plain paragraph. `break-word` breaks only when nothing else fits
and inserts no character, so copied text is unchanged; code blocks keep
scrolling because `white-space: pre` wins. `app/globals.measure.test.ts` guards
it, with a commented-out declaration as its control.

### One axis, and it is the header measure

<!-- key: page-axis -->

Whether a page's header sits at `max-w-5xl` or inside `max-w-2xl` decides the
breadcrumb wrapper, the `h1` ramp and whether the header closes with the 3px
rule. A route is wide or narrow; none sits half in each. The tell of a wrong
choice is a 6xl heading in a 42rem measure. The measure is the
header's, not the prose's: a post is wide with a narrow body, and `/search` is
narrow. The route lists are in `CLAUDE.md`.

**Home's masthead is its `h1`**: `SITE_TITLE` at a raised ramp, unlinked, with
`SITE_DESCRIPTION` as standfirst. As a `<p>` it rendered at weight 400 against
700 headlines; the element being a heading is the fix, not a weight class. The
hero below is an `h2`, and the two move together.

**`MoreStories` sets card titles to `h3` when it renders a section heading and
`h2` when it does not**, so adding or removing a heading re-levels every card.
`app/a11y.test.tsx` asserts home's headings by text as well as level.

### How the wide-page header is built

<!-- key: wide-page-shell -->

`app/wide-page.tsx` is the one shell every wide route renders through, the
middle seven via `app/listing-page.tsx`. It owns the header, the container and
the vertical rhythm. It exists because ten pages were two implementations of one
design and every tuning pass landed on one half only. Do not assemble a header
and `Container` in a route, and do not give a narrow route the wide header.

- A post's `h1` carries its own `data-pagefind-body`, since it sits outside the
  `<article>`; without it every title-only term drops out of search.
- The bar's wordmark hides on home through a `:has()` rule while the masthead is
  on screen, so the site is not named twice within 100px, and fades back in once it scrolls away (`app/wordmark-fade.tsx`).
  It is a button that scrolls to top on home and a link elsewhere
  (`app/site-wordmark.tsx`), because a same-URL `Link` in Next 16 neither
  navigates nor scrolls. The exit from this machinery, weighed and declined in
  August 2026: let home's header name the route rather than the site.
- `crumbs` is optional, used only by `/`.
- A listing under a header drops its opening rule and nothing else. Items keep
  `py-10 md:py-12`, the page adds no gap of its own, the closing rule stays.

### The taxonomy listings and the index listing share one shell

<!-- key: listing-shell -->

Category, tag and author pages, paginated or not, and `/page/[page]` render
through `app/listing-page.tsx`. `lib/paginate.ts` owns the page arithmetic and
`parsePageParam`, which both the component and `generateMetadata` read, so they
cannot disagree about a segment like `/page/abc`. `listingMetadata` in
`lib/page-metadata.ts` owns the social blocks.

Two things stay out of the shell on purpose: the `<header>` content, where the
routes genuinely differ, and the fetch strategy. The header is identical on page
1 and later pages, apart from the inline page counter. `emptyMessage` is omitted
where empty is unreachable. `lib/paginate.ts` stays free of `next/navigation`,
so 404s and redirects are visible in the route.

### The page counter moves inline, into the heading

<!-- key: page-counter -->

`PageCounter` (`app/page-counter.tsx`) renders inline inside each route's own
`<h1>` and returns `null` on page 1, so every paginated route renders it
unconditionally. As a separate block in the standfirst slot it became the row's
last baseline and shoved the standfirst upward; inline, it cannot split the
header or land under a portrait. Seven call sites instead of one is deliberate,
the same trade as the header being children. Author routes take it too.

Copy budget: the counter and its leading space take 42px. Desktop leaves 566px
of heading text beside it; a phone leaves 298px, where a long tag name pushes
the counter onto its own line. Accepted: hiding it on mobile was rejected,
because that is where a reader is least likely to reach the pager.
"Information Architecture" (691px) overflowed before the counter existed; do
not shrink or hide the counter to compensate.

### Every rich-text hyperlink goes through `lib/rich-text-link.tsx`

<!-- key: rich-text-links -->

`renderHyperlink` allowlists `http`, `https` and `mailto`, degrading anything
else (including `javascript:` and protocol-relative forms) to text, and gives
external links `target="_blank"`, `rel="noopener noreferrer"` and the new-window
hint. Any rich-text surface passes it as the `INLINES.HYPERLINK` override;
`documentToReactComponents`' default emits `data.uri` as-is. Sidenotes once used
the default and let a `javascript:` href through. Do not copy the renderer.

### Every structured-data block goes through `jsonLdHtml`

<!-- key: json-ld -->

`jsonLdHtml` in `lib/json-ld.ts` escapes `<`, `>` and `&` before the string
reaches `dangerouslySetInnerHTML`, so a value cannot close the script early.
Three call sites: `app/breadcrumb.tsx`, `app/listing-page.tsx` and
`app/posts/[slug]/page.tsx`. It is defence in depth over trusted CMS data, and
the one raw-HTML sink that escapes rather than relying on trust.
`lib/json-ld.test.ts` covers the escaping. No guard scans for an inline block;
three call sites are cheap to read. A fourth makes the guard worth writing.

### The site's locale is en-GB, everywhere

<!-- key: locale -->

The Contentful default locale, `Intl.DateTimeFormat("en-GB")`, the html `lang`,
the OG locale and the feed all say `en-GB`. Any `en-US`, `en_US` or American
date format is a regression. `de-DE` is in progress; add no locale plumbing
ahead of it. `contentful/export.json` ships `en-US` because it is the template
forks import, not a mirror of the live space. Do not "correct" it.

### Single-entry fetchers are `cache()`-wrapped on purpose

<!-- key: single-entry-cache -->

Every single-entry fetcher in `lib/api.ts` is `cache()`-wrapped, because
`fetchGraphQL` issues `POST` and Next memoises only `GET`. `generateMetadata`
must call the same function as the page with the same arguments; `cache()`
dedupes identical calls, not equivalent ones. On `/posts/[slug]` both call
`getPostAndMorePosts`, and switching metadata to the slimmer `getPost`
reintroduces the second request. `/about` and `/privacy` share one `SLUG`
constant for the same reason. `getPost` is right only where nothing else
fetches the post in the same pass, as in the OG image route.

### The post OG card renders on demand, not at build

<!-- key: og-card-on-demand -->

`app/posts/[slug]/opengraph-image.tsx` has no `generateStaticParams`. Each card
is a PNG of about 900 KB, so prerendering put roughly 19 MB into every
deployment against Hobby's storage allowance, for images a scraper fetches once.
Without it the route is fully dynamic (the uncached `POST` rules out the static
path), and its `Cache-Control` carries `s-maxage=31536000`, so Vercel's CDN
renders each card about once per deployment.

Verify with `x-vercel-cache` and `age`, not `cache-control`, which Vercel's
proxy rewrites. If scrape latency is ever a problem, reach for
`dynamic = "force-static"`, which is its own decision, not the prerender.
`next/og` emits PNG only, so there is no size lever worth pulling.

### The highlighter replaces min-dark's comment colour

<!-- key: shiki-comment-contrast -->

min-dark's comments are `#6B737C` on `#1F1F1F`, 3.43:1 against the 4.5:1 floor.
`lib/highlight.ts` swaps them for `#858F9A` (5.02:1) with Shiki's
`colorReplacements`, because the colours are inline styles and a CSS override
would need a specificity fight. It stays the dimmest token, so comments still
read as secondary; the next dimmest is `#F97583` at 6.20:1. Four other theme
colours fail and no sample on the site renders them: `#800080` 1.75:1
(debug-token), `#CD3131` 3.20:1 (error-token), `#316BCD` 3.23:1 (info-token)
and `#1976D2` 3.58:1 (markdown link). One that renders is a new finding. `lib/highlight.contrast.test.ts`
recomputes every rendered colour over one sample per grammar.

### Shiki grammars are imported one by one, never from the meta-package

<!-- key: shiki-fine-grained -->

Importing from `"shiki"` made Next's file tracer pull 260 grammars (about 8.7 MB)
into the post route for the ten it uses. `lib/highlight.ts` uses
`createHighlighterCore`, the oniguruma engine, one theme and one
`@shikijs/langs/<name>` import per language, with `@shikijs/langs` and
`@shikijs/themes` as direct dependencies. The deployment shrank by about 7.7 MB.

Adding a language is a `LANGS` entry and its import together. Forget the import
and the block silently renders unhighlighted. `lib/highlight.langs.test.ts` runs
every `LANGS` entry and holds the export's Code Block dropdown against `LANGS`;
only a dropdown language missing from `LANGS` is a defect. `"text"` needs no
import, and `bash` and `yml` are alias modules. Keep the oniguruma engine and
the theme.

### Every fetcher in `lib/api.ts` is `cache()`-wrapped

<!-- key: fetcher-cache -->

No exceptions, including `getVisibleTagSlugs`. `lib/api.cache-invariant.test.ts`
holds it, with the unwrapped form as its control. Rules telling call sites to
fetch once failed because a call site cannot see composition: `PostPage` fetched
once and `getPostAndMorePosts` fetched the same list internally. Passing a held
list down is still house style, for legibility. No fetcher declares a defaulted
or optional parameter, since `cache()` keys on the arguments as passed; `tsc`
then holds every call site.

### Three cache tags, and the webhook picks between them

<!-- key: cache-tags -->

`CACHE_TAGS` in `lib/api.ts`: `posts`, `pages`, `browseIntros`. `getPage`,
`getAllPages` and `getBrowseIntro` carry the narrow two, so editing `/about` no
longer re-renders every post. Everything else stays on `posts`, because tags,
categories, authors and posts genuinely reach every page. A new fetcher passing
no tag gets `posts`. `app/api/revalidate/route.ts` maps the webhook's content
type onto tags, and anything unrecognised purges everything.

`expire: 0` stays. The first visitor after a publish is usually the author, and
a listing without their new post is what the webhook exists to prevent.
`app/api/revalidate/route.test.ts` asserts it.

### Scheduling is Contentful's job, and `date` is not a gate

<!-- key: post-scheduling -->

`getAllPosts` has no bound on `date`, so a published future-dated post is live.
Use Contentful's scheduled publishing, which fires the webhook at the moment. A
`date_lte` filter would make things worse three ways: nothing purges the cache
when a date passes, so the post never appears; five queries fetch posts and
filtering one leaves `/posts/[slug]` rendering what listings hide; and a `$now`
argument splits the `cache()` dedupe. `date` is display metadata. Date-gated
publishing reopens `expire: 0` and needs this entry rewritten first.

### Every unbounded collection query pages, and must keep selecting `total`

<!-- key: collection-paging -->

`fetchAllCollectionItems` in `lib/api.ts` pages through Contentful's 100-item
ceiling for `getAllPosts`, `getAllPages`, `getAllTags`, `getAllCategories`,
`getAllAuthors` and `getPostsByCategory`. A query handed to it accepts
`$limit: Int!` and `$skip: Int!` and selects `total` beside `items`; without
`total` the first page silently becomes the whole result. Raise the page size
only against a measurement. `getRecentPostsByCategory` and the `limit: 1`
fetchers are deliberately not paged.

### Contentful export/seed files are load-bearing and brittle

<!-- key: fixtures -->

`contentful/export.json` and `contentful/seed.json` back the forkable template.
Types and entries need `sys.publishedVersion` or they import as invisible
drafts; seed assets use `file.url`, never `file.upload`, which aborts the
import; retry a failed import into a new empty space. A new content type is not
done until it is in the export, because a `... on X` fragment on a missing type
fails every post query; `lib/contentful-fixtures.test.ts` guards that. Both
files are exactly `JSON.stringify(value, null, 2)` plus a newline, so a JSON
round-trip edit is byte-safe.

### One Node version pin, in `engines.node`

<!-- key: node-pin -->

`engines.node` is the only place the Node major is written. Vercel reads it and
overrides Project Settings, npm warns on it, and both workflows read it through
`node-version-file`, which prefers `volta.node` and `devEngines.runtime`, so
adding either silently wins. Keep an exact major (`24.x`), since a range
upgrades production silently. nvm cannot read it; switch by hand.
`@types/node` follows the runtime major, not latest. Keep the Vercel setting
current as a dormant fallback.

### Two copies of `@contentful/rich-text-types`, and only one ships

<!-- key: rich-text-types-dupe -->

The app resolves `17.x`; `contentful-management`, a dev dependency of the import
scripts, nests `^16.6.1`, and no released version accepts 17. `npm ls
--omit=dev` shows one copy. Do not force a resolution, which breaks the import
scripts, and do not restore `legacy-peer-deps`, which hid every conflict.

### A schema change reaches the live space before the code that queries it

<!-- key: schema-changes -->

`rczsnwq9z69e` is the live space. A field queried in `lib/api.ts` but missing
from the space fails the whole query and every page, so the order is the space
first, then merge, with the fixtures updated in the same pass.
`public/llms.txt` describes the content model; `.github/workflows/llms-link-check.yml`
checks only its links, so review its claims by hand. Content type IDs are
immutable. Treat the Contentful MCP connector as read-only: activating a type,
publishing, deleting and asset updates are web-UI jobs. A second demo space was
retired in September 2026; reinstating one reopens this entry.

### Vercel previews build on request, and production skips documentation-only changes

<!-- key: preview-on-request -->

`scripts/vercel-ignore-build.sh` is the Ignored Build Step, set in the Vercel
dashboard rather than `vercel.json`. A preview builds only when the commit
message contains `[preview]`. Production builds unless every change since the
last deployment sits in `CLAUDE.md`, `README.md`, `docs/` or `.claude/`. Every
doubtful case builds, because a wrong skip leaves the site behind while a wrong
build only costs storage. `lib/vercel-ignore-build.test.ts` covers every branch.
The reason is storage: previews for every push had pushed Functions Storage past
Hobby's 10 GB. For an empty preview commit, use
`git commit --allow-empty -m "chore: request a preview [preview]"`.

### What the guards catch, and what they cannot

<!-- key: guard-limits -->

Every check here has caught a real defect; do not weaken one to make a change
pass. What they cannot do:

- **`lib/contentful-fixtures.test.ts`** cannot compare against the live space,
  because CI has no Contentful credentials. A green run says the template agrees
  with the code, never that the space does.
- **`app/a11y.test.tsx`** cannot check `color-contrast` or `target-size`, since
  jsdom has no layout; `lib/tag-pill.test.ts` recomputes contrast instead. It
  adds a duplicate-announcement check scoped to `<main>`. It covers six page
  shapes, not routes, so **a new route goes in `app/routes.a11y.test.tsx`** or
  it has no axe run. Both assert the page rendered something. The archive's
  repeated category links and the glossary's repeated titles are allowances that
  assert their own duplication still occurs.
- **`lib/paginate.test.ts`** covers the arithmetic, not what pages render.
- **`lib/docs-consistency.test.ts`** checks names, not claims. A sentence can
  name a real file and describe it wrongly.

### Every pattern-matching guard needs a known-bad control

<!-- key: known-bad-controls -->

A guard asserting the absence of a string passes both when the defect is gone
and when the pattern stopped matching. So it is trustworthy only once someone
has watched it fail, and what made it fail stays in the repo.
`app/posts/[slug]/opengraph-image.font.test.tsx` is the pattern, keeping a
rejected face as a permanent control. Where that is impractical, assert a
non-empty match first. Four guards here passed while broken, each for want of
one: a contrast check reading the wrong colour, an inset regex reading a number
that no longer described the bottom, a slice that matched nothing after a
refactor, and a pattern anchored on the first attribute.

### Documentation is excluded from Tailwind's source scanning

<!-- key: tailwind-scanning -->

Tailwind generates a rule for any class-name candidate in a scanned file, prose
included. `app/globals.css` carries `@source not` for `CLAUDE.md`,
`docs/decisions.md`, `README.md` and `.claude`. `app/` and `lib/` are scanned,
so never name a literal utility in a source comment there; a variant prefix does
not stop it. `app/globals.css` itself is not scanned. Ordinary English words
that happen to be utilities are left alone.

`lib/tailwind-comment-scanning.test.ts` compiles the stylesheet with and without
comments and requires the same rules, with a planted candidate as its control. Widening its English allowlist
reopens this entry.
A clean run is necessary, not sufficient: its scan root is narrower than
`next build`'s, and the deployed bundle settles it.
