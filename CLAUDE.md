# CLAUDE.md

Standing context for Claude Code in this repo. Read before implementation work,
so house conventions are not relearned by accident.

**This file is the rules. `docs/decisions.md` is the arguments.** An entry here
tells you what to do. A `[→ key]` marker points at the entry in
`docs/decisions.md` that says why, and that entry is what an audit needs.
Read `docs/decisions.md` before an audit of any kind, and before changing
anything an entry here names. Do not re-raise a decision as a finding without
reading its entry first.

**This file has a line budget of 260 and `lib/docs-consistency.test.ts`
enforces it.** An entry that cannot be stated in a few lines belongs in
`docs/decisions.md` with a marker here, not expanded in place. The budget is
the mechanism; growing the number instead of moving the prose defeats it.

## Bloat is the default failure mode

Everything in `docs/decisions.md` is a decision someone had to defend. This
governs the rest: **solve the problem with the smallest thing that works inside
the stack already here**, and treat reaching outside it as a claim needing
evidence.

That stack is Next, React, Contentful's GraphQL API, Tailwind, Shiki and
date-fns, with Pagefind at build time. `package.json` lists fifteen runtime
dependencies; before adding a sixteenth, say what it does that the fifteen
cannot. "Fewer lines in this file" is not an answer.

Four tests, in the order they usually bite:

- **Prefer the platform.** The sidenote toggle is a hidden checkbox and a
  sibling selector with no client JS; the scroll offset is one
  `scroll-padding-top` rather than per-heading margins plus a listener. Each
  replaced something heavier.
- **Count the duplication before abstracting it.** An abstraction needing a
  branch per caller is just the callers, spelled worse.
- **A helper earns its place by removing a decision, not lines.**
  `lib/paginate.ts` earns it. A wrapper that renames a one-liner does not.
- **Do not build machinery for a problem that has not happened.** No rate
  limiting, no `X-Frame-Options`, no nonce pipeline — each a live decision
  rather than an oversight. [→ `reviewed-items`]

When an elegant version and a thorough version both work, ship the elegant one
and write down what it does not cover. Documentation obeys this too.

## Page shape

- **A route is wide or narrow, decided by the header measure, and everything
  follows.** No route sits half in each. [→ `page-axis`]
- **Wide**: header at `max-w-5xl`, `<Breadcrumb>` unwrapped, `h1` at `text-4xl
leading-tight md:text-5xl lg:text-6xl`, closed by a 3px `border-brand-dark`
  rule. Thirteen routes: `/`, `/page/[page]`, `/posts/[slug]`, `/archive`,
  `/categories`, `/tags`, `/authors`, and the six taxonomy listings.
- **Narrow**: header wrapped in `mx-auto max-w-2xl`, `h1` at `mb-6 text-4xl
md:text-5xl` with no `leading-tight`, no rule. Three routes: `/about`,
  `/privacy`, `/search`.
- **Every wide route renders through `app/wide-page.tsx`**, the middle seven via
  `app/listing-page.tsx`. Do not assemble a bespoke wide header or `Container`,
  and do not give a narrow route the wide header. [→ `wide-page-shell`]
- **`contentOwnsLeading` suppresses the gap below the 3px rule, never the
  header's margin above it.** Only `app/listing-page.tsx` sets it.
  [→ `band-retirement`]
- **A listing under a header drops its opening rule and nothing else**
  (`openRule={false}`). Item padding stays `py-10 md:py-12`, the page adds no
  gap of its own, the closing rule stays, and `app/pagination.tsx` has no top
  border. [→ `wide-page-shell`, `border-roles`]
- **Breadcrumbs wrap in `mx-auto max-w-2xl` on narrow pages**, sit before
  `<section>` on `/search`, and never carry page position — that rides inline
  in the heading instead. [→ `breadcrumbs`]

## Headers and home

- **The split header is `justify-between md:flex-row items-baseline-last`,** and
  every standfirst carries all four of `md:max-w-[20rem] text-lg leading-relaxed
md:text-right text-brand-muted`. Both `md:` prefixes are mandatory or mobile
  aligns to a boundary nothing else draws. [→ `split-masthead`]
- **Standfirst copy budget is roughly 37 characters a line, 74 for two.**
- **Author routes are the one exception**, via `splitHeader={false}`.
- **Home's masthead is its `h1`** — `SITE_TITLE` plus `SITE_DESCRIPTION`,
  unlinked — and the hero below is an `h2`. The two move together.
  [→ `page-axis`]
- **`MoreStories` sets card titles to `h3` when it renders a section heading and
  `h2` when it does not.** Adding or removing a heading re-levels every card on
  the route. [→ `page-axis`]
- **The home hero is `grid gap-y-6 md:grid-cols-2 md:gap-x-16 lg:gap-x-32
md:gap-y-0`,** a base-level grid, headline capped at `lg:text-[2.5rem]`.
  `Avatar` stays whole with `meta={dateline}`; do not pull the date out into a
  standalone line. [→ `home-hero`]
- **The page counter is inline text inside each route's own `<h1>`**
  (`app/page-counter.tsx`), rendered by all seven paginated routes, returning
  `null` on page 1. [→ `page-counter`]
- **A paginated listing's header is identical on page 1 and later pages** apart
  from that counter. [→ `listing-shell`]
- **A card's meta line is the date alone, above the excerpt, and carries no
  category.** [→ `card-meta`]
- **Covers take one of two frames, chosen by `wide`**: 3:2 mobile and 16:9 from
  `md` with it, fixed 3:2 without. The mobile 3:2 is the single item most often
  re-raised as a finding. [→ `cover-frames`]
- **`POSTS_PER_PAGE` is five** and changing it is a four-route design pass, not
  a constant bump. [→ `posts-per-page`]

## Type and styling

- **Three roles, two faces, and nothing in a component names a family.**
  `--font-display` (Bricolage Grotesque), `--font-body` (Literata), `--font-ui`.
  There is no `font-sans` utility; that class silently does nothing.
  [→ `type-roles`]
- **`subsets: ["latin"]` only in `app/layout.tsx`.** Do not re-add `latin-ext`,
  including for `de-DE` work. [→ `font-subsets`]
- **Never measure a prose column in `ch`.** The measure lives on `max-w-2xl`
  parents. [→ `prose-measure`]
- **Chrome is aubergine**, `#2B1C3F` light and `#3B2A52` dark, declared in both
  `app/globals.css` and `lib/constants.ts` because the manifest and viewport
  `themeColor` cannot read CSS custom properties. Any change touches both.
  [→ `chrome-aubergine`, `brand-colour-duplication`]
- **`brand-crimson` cannot be used on chrome** (2.04:1). Chrome links identify
  by weight and underline, and chrome overrides the sitewide focus ring with a
  white one. The footer's faintest tint is `white/72`. [→ `chrome-aubergine`]
- **The search emblem's ground stays cream `#FAF5F1` in both schemes**, so
  anything rendered on it uses literal hex in dark mode, never brand tokens.
  [→ `search-emblem`]
- **Three border roles, not interchangeable**: `--color-hairline` (dividers,
  inverts on its own, never add a `dark:` variant), `--color-control-edge`
  (`app/tag-pill.tsx` only, carries a WCAG 1.4.11 contrast floor), and the
  `border-2` image frames. Do not deduplicate the first two. [→ `border-roles`]
- **One focus indicator, in `@layer base`.** Do not add `focus-visible:ring-*`
  or `focus-visible:outline-*` to components. [→ `focus-indicator`]
- **One scroll offset, `scroll-padding-top: 5rem` on `html`.** Never
  `scroll-mt-*`; they are additive and cannot coexist. [→ `scroll-offset`]
- **Sidenote elements stay phrasing content**, ship zero client JS, and keep all
  responsive display in the unlayered `.sidenote-*` rules rather than utilities
  in the component. [→ `sidenotes`]
- **Tags are pills via `app/tag-pill.tsx`.** A tag as metadata is a pill; a tag
  as destination is a link. There is no third treatment.
  [→ `tag-pills`, `tag-pages`]
- **Cross-document view transitions are gone.** Do not reintroduce a
  `view-transition-name`, `viewTransitionName` or `transitionName` prop.
  [→ `view-transitions`]
- **Search runs on Pagefind's Component UI**; its keyboard/ARIA behaviour is
  upstream's, deliberately not reimplemented. Keep `pagefind` `^1.5.2`+. [→ `pagefind-ui`]
- **Never write a literal Tailwind utility name in a source comment** under
  `app/` or `lib/` — it regenerates the rule. Verify only against the deployed
  bundle; a local `@tailwindcss/postcss` compile reports false negatives.
  [→ `tailwind-scanning`]

## Accessibility

- **One announced link per card, one description per figure.** A linked cover
  is `aria-hidden`/`tabIndex={-1}` with no `title`, footer labels are `<p>`
  not `<h4>`, and a figure's `alt` is empty when its caption renders.
  [→ `announced-links`]
- **A scroll region's accessible name is its position** (`Table 2`, `Code
block 2`), never a summary of its contents. [→ `scroll-region-names`]
- **The skip link's target (`<main id="main">`) carries `tabIndex={-1}`**,
  needed in browsers that don't move focus on a fragment jump. [→ `skip-link`]
- **The lightbox's enlarge button renders only after `mounted`**, never
  unconditionally — an unmounted trigger would announce an affordance that
  does nothing with scripts off. [→ `lightbox-mounted`]

## Data and Contentful

- **Every fetcher in `lib/api.ts` is wrapped in React `cache()`**, no
  exceptions, and none declares a defaulted or optional parameter.
  [→ `fetcher-cache`, `single-entry-cache`]
- **`generateMetadata` calls the same function the page calls, with the same
  arguments.** `cache()` dedupes identical calls, not equivalent ones. Do not
  "simplify" a metadata call back to a narrower helper.
  [→ `single-entry-cache`]
- **Three cache tags: `posts`, `pages`, `browseIntros`** (`CACHE_TAGS` in
  `lib/api.ts`). Anything unrecognised in the webhook purges everything, and a
  new fetcher passing no tag gets `posts`. `expire: 0` stays. [→ `cache-tags`]
- **Every unbounded collection query pages through
  `fetchAllCollectionItems`**, accepts `$limit: Int!` and `$skip: Int!`, and
  selects `total` beside `items`. Drop `total` and the first response silently
  becomes the whole result. [→ `collection-paging`]
- **The image loader passes only `w`, `q` and `fm=webp`.** Cropping is CSS-side.
  [→ `image-loader`]
- **A `priority` image renders opaque in the server HTML**, and a `sizes` value
  stops growing where its container does (984px). [→ `priority-opaque`]
- **Every rich-text hyperlink goes through `lib/rich-text-link.tsx`** as the
  `INLINES.HYPERLINK` override. Do not copy the renderer to a second location.
  [→ `rich-text-links`]
- **The locale is `en-GB` everywhere.** Any `en-US`, `en_US` or American date
  formatting is a regression. `contentful/export.json` and the Demo Site space
  are the two deliberate exceptions. [→ `locale`]
- **Posts carry `authors`, an ordered array capped at three**, first entry is
  the lead. The Contentful size validation and the GraphQL `limit` are both 3
  and move together. `author`, singular, still exists; do not query it in new
  code. [→ `authors-array`]
- **A schema change reaches both spaces first, then merges, then syncs
  `demo`** — live `rczsnwq9z69e` and Demo Site `18c3oqmr28q0`. Update
  `contentful/export.json`, `contentful/seed.json` and `public/llms.txt` in the
  same pass. Content type IDs are immutable. [→ `two-spaces`, `fixtures`]
- **Treat the Contentful MCP connector as read-only.** Activating a type,
  publishing, unpublishing, deleting and asset updates are web-UI jobs.
  [→ `two-spaces`]
- **The Node major is written once, in `engines.node`**, as an exact major.
  Do not add `.nvmrc`, `volta.node`, `devEngines.runtime` or a hardcoded
  `node-version:`. `@types/node` follows the runtime major, not latest.
  [→ `node-pin`]
- **Browse-page standfirst and meta description are CMS-editable** via a
  `browseIntro` entry; site identity (`SITE_TITLE`, `SITE_DESCRIPTION`) stays
  in code. [→ `browse-copy`]
- **Two copies of `@contentful/rich-text-types` ship on purpose** — the app
  resolves `17.x`, `contentful-management` nests its own `^16.6.1` dev copy.
  Do not force a resolution to dedupe it. [→ `rich-text-types-dupe`]
- **`'unsafe-inline'` stays global in the CSP.** `'wasm-unsafe-eval'` and
  `frame-ancestors` are relaxed per route only — `/search` plus
  `/pagefind/*`, and `/posts/*` respectively — never on the catch-all.
  [→ `csp-scoping`]

## Testing

- **Any new route goes in `app/routes.a11y.test.tsx`**, or it has no axe run
  anywhere and nothing in CI reports the gap. `app/a11y.test.tsx` covers six
  page shapes, not routes. [→ `guard-limits`]
- **Every pattern-matching guard carries a permanent known-bad control.**
  `app/posts/[slug]/opengraph-image.font.test.tsx` is the pattern to copy. Four
  guards here have passed while the thing they guarded was broken.
  [→ `known-bad-controls`]
- **Any font check imports from `next/og`, never from `satori`.**
  [→ `og-font-guard`]
- **Do not weaken a guard to make a change pass.** Each check has already caught
  a real defect. [→ `guard-limits`]

## Workflow constants

Protected main, squash merges only, one concern per PR, conventional commit
messages, descriptive branch names.

A settled call is reopened in writing, in its own commit, before the
implementing branch opens. A branch that edits the documentation and the code it
governs in the same push has removed the only check on itself.
[→ `reopening-decisions`]

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

Refresh the demo deliberately, when the template has changed in a way worth
showing:

```
git push origin main:demo
```

Do not automate this on push to `main`. [→ `demo-site`]
