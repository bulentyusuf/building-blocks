---
name: audit-perf
description: Run a performance and deployment-weight regression audit on beuseful.net. Checks the caching, bundle and Vercel storage defects this repo has already fixed. Use on "audit perf", "performance audit", or after a Next or Shiki bump.
disable-model-invocation: true
context: fork
background: false
argument-hint: "[paths to narrow the audit, optional]"
---

# Performance audit

A regression checklist. Every item is a defect that has already cost this site
something measurable — deployment storage, a duplicated request, a delayed
LCP — and been fixed. The value is catching the return.

Two of these were expensive precisely because **the saving was visible
everywhere and the cost was visible nowhere**: not in the repo, not in CI, not
in a build log, only on a Vercel usage dashboard nobody opens until the
allowance email arrives. Weigh findings accordingly.

## Read first, before checking anything

1. `docs/decisions.md`, especially the entries keyed `og-card-on-demand`,
   `shiki-fine-grained`, `fetcher-cache`, `single-entry-cache`, `cache-tags`,
   `collection-paging`, `priority-opaque`, `image-loader` and `font-subsets`.
   Each carries measured numbers; use them as the baseline rather than
   re-deriving.
2. `CLAUDE.md`, section **Data and Contentful**.
3. Every file named in a check, in full.

If `$1` is given, narrow to those paths but still read the two documents.

## Checklist

### 1. The OG card must not be prerendered

`app/posts/[slug]/opengraph-image.tsx` must have **no** `generateStaticParams`.
It carried one for a while, baking one card per post into every deployment:
each card is a 1200x630 PNG of 828 to 968 KB, so twenty-two posts is roughly
19 MB per deployment, preview and production alike, at around thirteen
deployments a day against a 10 GB Hobby allowance.

```bash
grep -n "generateStaticParams" "app/posts/[slug]/opengraph-image.tsx" || echo "correct: absent"
```

The route's `ImageResponse` must still carry a long shared-cache lifetime with
a zero browser lifetime, so Vercel's CDN holds the rendered PNG without
re-rendering while browsers keep revalidating. Check the header is present.

**Do not verify that header by reading it back.** Vercel's proxy consumes the
shared-cache directive on every request and does not forward it, returning the
same string whether or not CDN caching works. Curl a card that has not been
fetched recently and read `x-vercel-cache` and `age` instead: a miss at age
zero, then a hit with a rising age, is the only evidence. Every deploy resets
this, so a fresh miss proves nothing.

Leave `dynamicParams` at its default, so a post published through the webhook
still gets a card on demand.

### 2. Shiki grammars are enumerated, never taken from the meta-package

Importing the entry point pulls in a runtime array of dynamic imports, one per
grammar, reachable at runtime so no bundler can eliminate them. Next's file
tracer followed every one: the post route's traced-file manifest pulled in
**260** grammars, about 8.7 MB on disk, against the ten the module loads. The
post route is the only one that traces any grammar at all.

```bash
grep -rn 'from "shiki"' app lib || echo "correct: no meta-package import"
```

Then confirm every language in `LANGS` in `lib/highlight.ts` has a matching
`@shikijs/langs/<name>` import wired into the highlighter. Two entries need
none: text is handled inside core, and bash is served by a two-line alias
re-exporting shellscript.

**Forgetting an import breaks nothing loudly.** The language stays in `LANGS`,
the highlighter throws for the unloaded grammar, the catch swallows it, and the
block renders as an unstyled block. `lib/highlight.langs.test.ts` runs a snippet
through every entry and fails if any comes back as the fallback, with a language
absent from `LANGS` as its known-bad control.

To count traced grammars after a build, use this exact form. The obvious grep is
wrong twice: a character class without a slash collapses every path to the
directory, and recursive globbing needs `setopt globstar` in zsh.

```bash
grep -rho '@shikijs/langs/dist/[a-z0-9+.-]*\.mjs' .next/server \
  --include='*.nft.json' | sort -u | wc -l
```

The count reads 260 to 0 while the deployment shrinks by about 7.7 MB, not 8.7:
the nine grammars actually used move inside the route's SSR chunk as tree-shaken
static imports, roughly 1 MB, where this grep can no longer see them. Functions
Storage on the Vercel dashboard is the only measurement that captures the real
figure.

Do not propose swapping the regex engine for the JavaScript one, and do not
propose a theme swap. Both are recorded refusals.

### 3. Font preloading

`subsets` in the Google font loader is a **preload selector, not a coverage
selector**. Next emits font-face blocks with explicit unicode ranges for every
subset and only preloads the ones listed.

`app/layout.tsx` must list `latin` alone. Adding the extended Latin subset
forced six font files, around 501 KB, into the document head at high priority,
saturating mobile bandwidth and delaying the LCP hero image. Restricting it
removed three high-priority preloads, 207 KiB, with no glyph coverage lost —
extended characters still render via unicode range and are fetched on demand.

`app/layout.font-subsets.test.ts` holds this with the two-subset configuration
as its known-bad control. **Do not re-add the extended subset for German
localisation work**; that is the exact reasoning that put it there.

### 4. Every fetcher is cache()-wrapped

Next memoises `GET` only, and `fetchGraphQL` issues `POST`, so nothing dedupes
for free. Every exported fetcher in `lib/api.ts` is wrapped, no exceptions,
including the one that is not itself a fetcher.
`lib/api.cache-invariant.test.ts` holds this with the unwrapped form as its
known-bad control.

No fetcher declares a defaulted or optional parameter. `cache()` keys on the
argument list **as passed**, so calling one with and without its argument makes
two memo entries meaning the same thing. Requiring the argument makes the
compiler hold every call site, which is why there is no guard scanning for
omitted arguments and should not be one.

The rule that breaks from **outside** those functions, and the one worth
spending the audit on: **`generateMetadata` must call the same function the page
calls, with the same arguments.** `cache()` dedupes identical calls, not
equivalent ones. On the post route both call the composite fetcher, and
switching the metadata pass back to the slimmer single-post helper looks like an
optimisation while being the exact change that reintroduces the second request.
The four browse pages carry the same requirement, and `/about` and `/privacy`
pass the same slug constant for this reason.

Check every route with a `generateMetadata` against its own component.

### 5. Collection queries page, and keep selecting total

Seven unbounded fetchers go through `fetchAllCollectionItems`, which pages
through Contentful's 100-item ceiling. A query handed to it must accept both
paging variables as non-null integers, pass both to the collection, **and select
`total` beside `items`**. Drop `total` and the first response silently becomes
the whole result — the bug this replaced.

Deliberately not paged: the capped teaser fetcher, and every single-entry
fetcher on a limit of one. The page size stays at 100 rather than the documented
1000 maximum; raise it only against a real measurement.

### 6. Images

- **A `priority` image renders opaque in the server HTML.** Chromium's LCP
  algorithm skips fully transparent elements, so the fully transparent initial
  state every image once shipped with meant the measured paint was the React
  commit rather than the preloaded bitmap's arrival. A scripting media query
  does not cover the pre-hydration window. Lazy body images keep the full
  pending-to-revealed machine, and `lib/contentful-image.test.tsx` asserts both
  halves. Do not collapse the branch back to one initial state.
- **A `sizes` value must stop growing where its container does.** The container
  tops out at **984px**, so a bare viewport-width clause past that point buys a
  derivative one or two steps larger than anything on screen. The listing covers
  and the category thumbnails each carry the arithmetic for their own track; the
  home and post hero covers are capped in pixels and need nothing.
- The image loader passes only width, quality and the WebP format parameter.
  Cropping is CSS-side. The absence of crop, focus and height parameters is a
  decision, not an omission.

### 7. Revalidation

Three cache tags, carried in `CACHE_TAGS` in `lib/api.ts`. Every query used to
carry the post tag, which meant one tag on the site and no lever to invalidate
narrowly: editing `/about` re-rendered every post page.

**Only two split off, and the rest staying broad is a finding rather than
timidity.** A renamed tag or category shows on every card and pill, a new author
name appears in bylines across the archive, and a published post changes the
"Read Next" backfill and the sitewide tag-visibility threshold on every other
post page. Those types genuinely reach everywhere. `app/api/revalidate/route.ts`
maps a webhook's content type onto tags and **anything unrecognised purges
everything** — an asset firing, a type added later, an unparseable body.
Over-invalidating costs a render; under-invalidating serves stale content with
nothing anywhere to say so.

The zero expire stays, and it is a freshness choice. A non-zero value would
serve stale while regenerating, sparing the first visitor a cold render — but
that visitor is usually the author refreshing after publishing, and a listing
without their new post is what this webhook exists to prevent. Asserted in
`app/api/revalidate/route.test.ts` so it cannot be softened by accident.

### 8. Search index weight

Two regions carry the Pagefind body attribute: a post's `h1` and its article
element. The `h1` needs its own, because it sits in the shared header shell
outside the article — and `meta.title` survives regardless, since Pagefind reads
the page's first `h1` wherever it is, **so a results list looks perfectly
correct while every title-only term has silently dropped out of the searchable
text.** Check that attribute is still on both.

Three things inside the article carry the ignore attribute and must keep it:
the table of contents, which repeats every heading; the heading permalink glyph,
which renders as CSS generated content precisely so no text node exists for
Pagefind to read; and the foot-of-post author bio, which is byte-identical
across every post by that author and hands back the bio as the excerpt instead
of anything that matched. The tag glossary carries it for the same reason as the
table of contents.

The index is built by `postbuild`, so a post published through the webhook is
live via ISR but absent from search until the next deploy. Accepted, not a
finding.

### 9. Dead weight

Nothing in the codebase should name a view transition. The cross-document API
fires only when one document replaces another, and every link here is a client
-side navigation, so it never ran — it shipped dead and stayed dead for months.
If a view-transition name reappears without the decision entry being rewritten
first, it is dead code again.

Fifteen utilities once shipped unused, each generated by a sentence describing
markup that had been removed or rejected. Clearing them took the deployed
stylesheet from 68,608 to 67,568 bytes.

## Reporting

- Give measured numbers with their units and where they were measured. A
  bundle claim measured from a local compile is not a claim about the deployed
  bundle; say which one it is.
- Verify every mechanism claim by grep against the source. Do not derive
  behaviour from arithmetic or from what the code appears to do.
- Separate **regressions** from **gaps**, and say which measurement would
  settle anything you could not check from the repo alone.
- Where a check needs a deployed build or a Vercel dashboard, say so plainly
  rather than reporting the local proxy as the answer.

## Do not raise

- Prerendering the OG card for scrape latency. Scrape cost is a caching
  problem and it is met; the next lever is a static route segment, not the
  prerender.
- Shrinking the OG PNG. The renderer emits PNG only with no format option and
  the cover panel is already fetched at its exact pixel size.
- Deduplicating the two copies of the rich-text types package. One is a nested
  dev copy and no released version accepts the other's major.
- Removing the postcss, sharp or uuid overrides. They are the only reason the
  audit is clean; re-check them on every framework bump.
- Fetching once and passing the list down as a performance measure. Every
  fetcher is wrapped, so it is a legibility choice now. Getting it wrong costs
  a reader a moment, not a round trip.
- Search index staleness between deploys, and the search page being excluded
  from indexing.

End the report at the findings. No summary and no encouragement.
