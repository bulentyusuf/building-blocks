# Be Useful.

The source for [beuseful.net](https://beuseful.net), a personal blog about content, code, and making things with generative AI.

The code in this repo is an extension of the [Next.js Blog with Draft Mode](https://vercel.com/templates/next.js/nextjs-blog-draft-mode) starter template published by Vercel and shared under a MIT license.

## 👋 About

A small, statically generated blog. Posts are written and managed in a headless CMS, rendered by Next.js, and deployed continuously.

The content model is deliberately compact: a Post type backed by Author, Category and Tag, with a Code Block type for embedded snippets, a Prompt Block type for publishing the image prompt behind a cover, and a Sidenote type for asides set in the margin. There's also a Page type for standalone pages like the privacy notice, and a Browse Intro type holding the editable copy at the top of each browse page.

A recurring subject of the blog is the process of building and maintaining it. Much of the codebase has been developed in collaboration with [Claude](https://claude.ai), and several posts document what that's actually like in practice. The visual identity uses editorial-style cover images generated with [Midjourney](https://www.midjourney.com).

## 🧱 Stack

- **[Next.js](https://nextjs.org)** (App Router), rendering and routing
- **[Contentful](https://www.contentful.com)**, headless CMS queried over GraphQL, with draft mode and live preview
- **[Tailwind CSS](https://tailwindcss.com)**, styling
- **[Pagefind](https://pagefind.app)**, search index built after the site builds, running entirely in the browser
- **[Shiki](https://shiki.style)**, syntax highlighting at build time
- **[Vercel](https://vercel.com)**, hosting and deployment
- **TypeScript** throughout

## 🧩 Content model

- **Post**, the main entry type. Title, slug, publish and updated dates, cover image, excerpt, rich-text body, and links to one author and one category
- **Author**, name, picture, slug, and a short bio, with its own landing page
- **Category**, name, slug, description, and thumbnail, with its own landing page. Posts are filed under Main Quest or Side Quests
- **Tag**, name, slug, and a one-line description, with its own landing page. Cross-cutting topics, up to three per post: where Category says where a post lives, a Tag says what it is about
- **Code Block**, embedded into post bodies for syntax-highlighted snippets. Optional filename and a fixed list of languages
- **Prompt Block**, embedded into post bodies to publish the generative-image prompt behind a cover, with an optional label and image
- **Sidenote**, embedded inline in post bodies for asides set in the margin. A title for finding the entry in the CMS, and a rich-text note deliberately limited to bold, italic, and links
- **Page**, standalone rich-text pages such as About and Privacy
- **Browse Intro**, the editable standfirst and meta description for a browse page, keyed by route. Lets the copy on Tags, Categories, Authors and Archive be reworded in the CMS rather than deployed

## ✨ Features

**Publishing**

- Static generation with on-demand revalidation. Content edits in the CMS go live immediately via a webhook, without a full redeploy
- Draft mode and live preview for editing posts before publishing
- Syntax-highlighted code blocks with a copy button, powered by Shiki
- Published image prompts alongside the covers they generated

**Finding things**

- Site search that runs entirely in the visitor's browser, with no third-party service and no query leaving the page
- Tag landing pages, and a glossary indexing every topic with its posts grouped beneath it. Tag pills on each post and on every listing card
- Archive page listing every post grouped by year
- Paginated home, category, and author listings
- Category and author landing pages, each with a directory index
- Breadcrumb navigation with `BreadcrumbList` structured data

**Reading**

- Light and dark colour schemes, following the operating system preference
- Per-post table of contents and an image lightbox
- Sidenotes that float into the right margin on wide screens and collapse behind their reference number on narrow ones, opening without JavaScript
- Cross-page view transitions on cover images
- Skip link, a single visible focus indicator across the site, and reduced-motion support

**Metadata and machines**

- Auto-generated sitemap, `robots.txt`, and RSS feed
- Open Graph and Twitter card metadata for shareable links
- Hand-written `llms.txt`, with a CI job that checks its links still resolve
- Standfirsts and meta descriptions editable in the CMS, falling back gracefully when an entry is absent

**Engineering**

- Content Security Policy, HSTS, Permissions-Policy, and other security headers set in `next.config.js`
- Branch protection, CodeQL scanning, and dependency monitoring
- CI runs the test suite and a full build on every pull request

## 🚀 Getting started

This repository works as a template. Fork it, point it at your own Contentful space, and deploy your own version. It is MIT licensed.

### Prerequisites

- Node — the required version is `engines.node` in `package.json`
- A Contentful account with an empty space
- Optionally, a Vercel account for hosting

### 1. Install

```
git clone https://github.com/bulentyusuf/building-blocks.git
cd building-blocks
npm install
```

### 2. Configure environment

Copy the example file and fill in the values.

```
cp .env.local.example .env.local
```

- `CONTENTFUL_SPACE_ID`, your space ID, under Settings then General settings in Contentful
- `CONTENTFUL_ACCESS_TOKEN`, a Content Delivery API token from Settings then API keys
- `CONTENTFUL_PREVIEW_ACCESS_TOKEN`, the Content Preview API token from the same API keys page
- `CONTENTFUL_PREVIEW_SECRET`, any random string you choose, it guards the draft preview route
- `CONTENTFUL_REVALIDATE_SECRET`, any random string you choose, it guards the revalidation webhook
- `NEXT_PUBLIC_SITE_URL`, your public site URL such as `https://example.com`, used for canonical links, Open Graph tags, the sitemap, and the RSS feed. On Vercel this falls back to the project's production domain when unset, and to `http://localhost:3000` everywhere else

### 3. Import the content model

This creates the content types and locales in your space from `contentful/export.json`. It needs a Contentful Management token, which is different from the delivery and preview tokens above. It is passed only on the command line and never committed.

```
npm run import:contentful -- --space-id YOUR_SPACE_ID --management-token YOUR_MANAGEMENT_TOKEN
```

### 4. Add example content (optional)

Seeds a few placeholder posts, authors, categories, tags, browse intros, and pages, all published, so the site renders straight away.

```
npm run import:seed -- --space-id YOUR_SPACE_ID --management-token YOUR_MANAGEMENT_TOKEN
```

The seed ships a single placeholder image, reused for every cover, avatar, and thumbnail. This keeps the import light and free of bundled media. Replace it and the dummy text with your own once you are set up.

`contentful/seed.json` is generated, not hand-edited: `contentful/build-seed.mjs` is the source of truth, and `npm run build:seed` regenerates the JSON from it.

### 5. Run locally

```
npm run dev
```

The site runs at `http://localhost:3000`.

**Search will be empty on a fresh clone.** The search index is generated by the `postbuild` script and is not committed to the repo, so `npm run dev` on its own has nothing to search. Run a build once to create it.

```
npm run build
```

That writes the index to `public/pagefind`, after which the dev server will find it. Repeat whenever you want search to pick up new content locally.

### 6. Deploy

Push to GitHub and import the repository into Vercel, then set the same environment variables in the Vercel project settings.

### 7. Live updates and preview

A deployed build is static, so by default a published edit will not appear on the live site until the next deploy. The revalidation webhook is what makes edits go live on their own, and skipping it is the most common reason a fresh deploy shows stale content. Worth setting up.

**Revalidation.** In your space, go to Settings then Webhooks and add a webhook:

- URL `https://YOUR_DOMAIN/api/revalidate`, method `POST`
- Add a custom header `x-vercel-reval-key` with the value of your `CONTENTFUL_REVALIDATE_SECRET`
- Under triggers, select publish and unpublish for both Entry and Asset
- If your space has more than one environment, filter to `master` so staging edits do not revalidate production

Once it is live, publishing in Contentful refreshes the affected pages within seconds with no redeploy. Full reference in Contentful's docs at https://www.contentful.com/developers/docs/webhooks/configure-webhook/

**Preview.** Set the Post type's content preview URL to
`https://YOUR_DOMAIN/api/draft?secret=YOUR_PREVIEW_SECRET&slug={entry.fields.slug}`. Editors can then open a draft in place.

**What revalidation does not cover.** The search index is built during deployment, not during revalidation. A newly published post appears on the home page, in the listings, and in the RSS feed within seconds, but it will not be findable through search until the site is next deployed. On a blog that publishes occasionally this is rarely noticeable. If it does start to grate, the answer is a Vercel deploy hook triggered by the same Contentful webhook, which trades the delay for a rebuild on every publish.

## 🎨 Make it yours

Forking this template carries over the original author's specifics. Change these before you deploy:

- **Site URL (required).** Set `NEXT_PUBLIC_SITE_URL` to your own domain in `.env.local` and in your host. Without it the canonical links, sitemap, OG tags, and RSS fall back to the Vercel production domain, or to a localhost URL anywhere else.
- **Site identity.** Edit `SITE_TITLE`, `SITE_DESCRIPTION`, `SITE_AUTHOR`, `SITE_FOOTER_BLURB`, and `SITE_REPO_URL` in `lib/constants.ts`. All but `SITE_AUTHOR` also accept an environment override — `NEXT_PUBLIC_SITE_TITLE`, `NEXT_PUBLIC_SITE_DESCRIPTION`, `NEXT_PUBLIC_SITE_FOOTER_BLURB`, `NEXT_PUBLIC_SITE_REPO_URL` — which is worth using only when one repo feeds more than one deployment and each needs its own identity. For a single site, edit the constants.
- **llms.txt.** `public/llms.txt` is a hand-written file describing the original site. Replace it with your own, or delete it. If you delete it, drop the `llms-link-check` workflow too.
- **Brand assets.** Replace the Open Graph image `public/be_useful.jpg`, swap the favicon and app icon, and retune the palette tokens and `themeColor` in `app/globals.css` and `app/layout.tsx` if you want a different look. The header colour lives in both `globals.css` and `lib/constants.ts`, and both need changing, because the web manifest and viewport `themeColor` are generated in JavaScript and cannot read CSS custom properties.
- **Search illustration.** The empty-state emblem in `app/search/search-emblem.tsx` is bespoke artwork for this site. Replace or remove it.
- **Security headers (careful).** The Content Security Policy in `next.config.js` includes `'wasm-unsafe-eval'` in `script-src`. Search needs it, because Pagefind's matching runs as WebAssembly. Removing it breaks search with no visible error.
- **Seed images (optional).** If you re-run the seed, repoint `PLACEHOLDER_ASSET_URL` in `contentful/build-seed.mjs` to your own copy, then replace the placeholder cover, avatar, and thumbnail with real assets afterwards.
- **CLAUDE.md (optional).** Useful as-is for working with Claude Code on the repo. Review it for any notes specific to the original author.

`public/pagefind` is generated at build time and is not tracked in git. There is nothing to replace there.

## 🔧 Troubleshooting

**Edited content not showing on the deployed site?** Check two things. First, the entry is Published, not just saved, since the live site reads published content only. Second, the revalidation webhook above is set up, because without it static pages serve build-time content until the next deploy. Quick test, trigger a redeploy in Vercel. If the change then appears, the webhook is the missing piece.

**Search returns nothing at all, locally?** The index has not been built yet. Run `npm run build` once, which generates `public/pagefind`, then restart the dev server. The index is not committed, so this is expected on a fresh clone.

**Search cannot find a post that is definitely live?** Expected between deploys. Revalidation updates pages but not the search index, so the post is findable from the moment the site next deploys. See "What revalidation does not cover" above.

**Search broken on the deployed site but fine locally?** Check the Content Security Policy. `'wasm-unsafe-eval'` must be present in `script-src`, and the browser console will report a WebAssembly compilation refusal if it is missing.
