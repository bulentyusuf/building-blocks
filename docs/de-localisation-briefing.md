# Handover briefing — German (de-DE) localisation

Space `rczsnwq9z69e`, environment `master`. Blog `beuseful.net`, Next.js App Router, Contentful, Tailwind v4, Vercel Hobby.

Architecture decided: Contentful native field-level locales, de-DE fallback to en-GB, Next.js `[lang]` sub-path routing (`/de/posts/...`). Delivery gate is Contentful **locale-based publishing** (en-GB and de-DE published independently per entry). SEO gate is a space-level tag `de-ready`. The two are separate switches, see the publishing model below. Render behaviour is fallback (never hide). hreflang and the de sitemap key off `de-ready`, never off "the route resolved".

Default locale is `en-GB` (renamed in place from `en-US` on 4 July 2026, entries stayed keyed to the immutable internal_code, no breakage). Every locale string that reaches a browser or formatter must be `en-GB`, never `en-US`.

Content model verified live on 4 July 2026 against all three content types. Every field currently `localized: false`.

---

## Publishing model — read before Phase 0

The space uses **Locale-based (un)publishing** (Settings → confirmed on 4 July 2026). Consequence for this project:

- en-GB and de-DE publish and unpublish independently on the same entry. You can hold de-DE genuinely unpublished while en-GB is live, no reliance on fallback-masking for the delivery gate.
- Constraint from Contentful: the default locale (en-GB) must be published before any other locale. Matches the workflow anyway, EN always ships first.
- This does **not** replace the `de-ready` tag. Publishing controls whether German is _served_. The tag controls whether German is _emitted to hreflang and the sitemap_. A post can be German-published yet untagged, serving German while staying out of Google until you approve it. Keep both.

---

## Phase 0 — Contentful setup (manual, Bulent, do first, no Clode)

`update_content_type` is broken for this space, so all field flips are hand-toggled in the content-type editor UI. Marking a field localised is non-destructive, existing values become the en-GB locale value, no data migration.

### 0.1 Create the locale

Settings → Locales → Add locale.

- Language: German (Germany) `de-DE`
- Fallback locale: **English (United Kingdom) en-GB**
- Enable for CDA: yes
- Enable for CMA: yes
- Make optional for editors: yes (so empty de-DE never blocks publish)
  If de-DE was created before the en-GB rename, verify its `fallbackCode` still points at en-GB and did not orphan.

### 0.2 Flip six fields to localised

Content model → edit each field → Settings → "Enable localisation of this field" → save → **publish the content type**.

Post:

- `title`
- `slug` (unique + regexp validation, both enforce per-locale once localised, safe)
- `excerpt` (this is the standfirst, the field is literally named `excerpt`)
- `content` (RichText)
  Author:
- `bio` (RichText)
  Category:
- `description` (Text, max 300)
  Leave shared (do not flip): `post.date`, `post.updatedDate`, `post.coverImage`, `post.author`, `post.category`, `author.name`, `author.picture`, `author.slug`, `category.name`, `category.slug`, `category.thumbnail`.

Cover alt needs no flip. It lives on the asset `description`, which is natively locale-aware. Fill the de-DE asset description when translating a post's cover.

### 0.3 Create the ready-gate tag

Create a space tag `de-ready` (Contentful UI → Settings → Tags, or MCP `create_tag`). Applied per-post-entry only when the German is approved. Sole signal for hreflang emission and de sitemap inclusion.

### 0.4 Structural translations, once

- 3 author bios → de-DE (names stay as-is, personas)
- 2 category descriptions → de-DE (names stay English, decision closed)
- Site chrome dictionary → handled in code, Phase 3
  After 0.1–0.4 the `/de` surface is coherent regardless of how few posts are translated.

---

## Per-post workflow (the standardised loop)

1. Publish EN (en-GB) as normal. `/en` live. de-DE unpublished.
2. Translate `title`, `excerpt`, `content`, cover asset `description` into the same entry. Hand-write or translate `slug`.
3. Preview German on `/de` in draft mode. This is the real bottleneck, your read-and-verify time.
4. Fix, re-preview, repeat until the German reads right.
5. Apply `de-ready` tag.
6. Publish the de-DE locale (locale-based publish, en-GB stays untouched).
7. Revalidate so static paths rebuild.
   The de-DE publish in step 6 is the independent gate, per post. RichText caveat: `content` is a structured node tree, not a string, and there is no ready-made translate primitive on the Contentful MCP surface. `create_ai_action` and `invoke_ai_action` are prompt templates you author (variable types include `Locale` and `StandardInput`), not a locale-aware walker, so a node-tree walker that translates text nodes and leaves marks, embeds and `codeBlock` entries untouched is required either way. Engine decision is recorded separately. Formality: lean `du`, Bulent's call. Glossary-pin product and persona names so they never translate.

---

## Code build — conventions for all phases

- British spelling in any user-facing English copy. Locale strings `en-GB` / `en_GB`, never `en-US`.
- One PR per phase. Squash merge only after CI is green. Do not combine phases.
- No writes to production Contentful from code beyond reads. Translation writes happen through the per-post workflow, not the build.
- `coverImage` stays typed optional in code (Contentful required only enforces at publish, previews can return null). Keep this.
- **Font preloads & character coverage**: `subsets` in `next/font/google` (`app/layout.tsx`) is set to `["latin"]`. Do NOT re-add `latin-ext` for `de-DE`. In Next.js, `subsets` is a preload selector, not a coverage selector: Next emits `@font-face` with `unicode-range` for all subsets automatically. German glyphs (including capital eszett `ẞ`, `ä`, `ö`, `ü`) render seamlessly and are fetched on demand; eager preloading `latin-ext` wastes 207 KiB of critical-path mobile bandwidth.
- **Exact file paths and full file contents for phases 1–4 are pending a live tarball scan of `bulentyusuf/building-blocks`. This doc gives objective, scope, and known paths. Do not write code from these notes alone, wait for the scan-completed appendix.**

---

## Phase 1 — Routing and fallback render (PR 1)

Objective: serve `/en/...` and `/de/...`, both resolving for every post, de-DE falling back to English body under German chrome when de-DE is unpublished.

Scope:

- Introduce `[lang]` dynamic segment. Constrain to `en` | `de`.
- Thread a `locale` param through `lib/api.ts` (same function names and types, add locale arg). Map `en → en-GB`, `de → de-DE`.
- **Verify the fallback read behaviour first.** With de-DE unpublished on a post, confirm the CDA query returns the en-GB fallback value (so `/de` lists all posts) rather than null (which would 404 or drop the post from listings). This determines whether untranslated-on-`/de` means English fallback or absent. Target the former. This is the load-bearing unknown for this phase.
- `generateStaticParams` over slug × locale. For de, generate from the de-DE slug when present, else the en-GB slug via fallback. Consequence: once a German slug is added, the old `/de/posts/{en-slug}` path stops being generated and 404s. Acceptable, it was never in the sitemap or hreflang so never indexed. Note in PR description, no 301 required.
- Set `<html lang>` per route in the `[lang]` layout (`lang="de"` on de pages, `lang="en-GB"` on en pages). Required for screen readers, easy to miss.
- Fallback notice component. On a de post with no published de-DE `content` (detect via `locale: '*'` fetch or the absence of the `de-ready` tag), render one line: "Auf Deutsch noch nicht verfügbar, Text auf Englisch."
  Out of scope: hreflang, sitemap, switcher, dictionary. Later phases.

Acceptance: `/en/posts/x` and `/de/posts/x` both 200. Untranslated de post shows English body plus the notice and still appears in the `/de` listing. `html lang` correct per route.

## Phase 2 — SEO signals (PR 2)

Objective: correct hreflang and sitemap, gated on real translation completeness.

Scope:

- Reciprocal hreflang tags on both language versions of a post, emitted **only when the entry carries the `de-ready` tag**. en page (`en-GB`) points to de alternate and vice versa. Include `x-default` pointing at en.
- de post URLs enter the sitemap **only when `de-ready`**. Sitemap handler already lives at `app/sitemap-xml/route.ts` served via `afterFiles` rewrite (do not move it back to the reserved `/sitemap.xml` path).
- Per-locale canonical. de canonical is the de-slug URL.
- Per-locale OG (title, description, `og:locale` = `de_DE` on de, `en_GB` on en).
  Out of scope: RSS. Deferred to Phase 4.

Acceptance: untranslated de posts carry no de hreflang and are absent from the sitemap. Translated + tagged posts have reciprocal hreflang and appear in the sitemap. No English content served under a de hreflang.

## Phase 3 — Switcher and chrome (PR 3)

Objective: human-facing language switch and fully localised site chrome.

Scope:

- Microcopy dictionary keyed by lang (nav, breadcrumbs, pagination, "More stories", byline preposition by→von, 404, draft-mode banner).
- Date formatting via `Intl.DateTimeFormat` with `de-DE` on de routes and `en-GB` on en routes (en-GB gives `4 July 2026`, day-month, not the American order).
- Language switcher component. Must resolve the counterpart slug per entry, not just swap the path prefix, because slugs differ per locale. Pass both locale slugs into the switcher from the page. On listing pages it is a plain prefix swap. Fallback means it never dead-ends, so show the DE option plainly, no disabled state.
- Do not auto-redirect by Accept-Language (Google discourages it, crawler arrives as en and could be bounced). Manual switch only, optionally remember last choice in a session cookie.
- Switcher links carry `hreflang`, `lang`, and `rel="alternate"`. Two-item `EN | DE` toggle, active weighted. No flag icons, no dropdown for two locales.
  Acceptance: switching EN↔DE on any post lands on the correct counterpart URL. Chrome, dates, and byline read German on de routes. No auto-redirect.

## Phase 4 — RSS (deferred, PR 4, only when German volume justifies)

- `/de/feed.xml` filtered to `de-ready` posts.
- Keep Bluesky/Zapier syndication English-only until then.

---

## Pre-code gate

Before PR 1, run the tarball scan and append exact file paths and full intended file contents per phase. Verify: current `app/` tree and where `generateStaticParams`/`generateMetadata` live, the shape of `lib/api.ts`, `next.config.js` rewrites, and the CDA fallback-read behaviour for an unpublished de-DE locale (the Phase 1 load-bearing unknown).
