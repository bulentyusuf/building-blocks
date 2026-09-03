/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { renderToReadableStream } from "react-dom/server";
import axe from "axe-core";
import type { AxeResults, Result } from "axe-core";
import type { ReactElement } from "react";

// Accessibility coverage for the routes app/a11y.test.tsx does not reach.
//
// That file composes six page SHAPES by hand — a listing, a banded listing, the
// index listing, home, the post page, the prompt block — which is the right way
// to test a shape shared by many routes. It leaves ten of the site's sixteen
// routes with no axe run at all, and those ten carry the least conventional
// markup on the site: the archive's two tab stops per row and its sr-only year,
// the glossary's grouped lists and count spans, the author portraits, the
// category thumbnails, the small-caps "read more" links, the error pages'
// helpful-links nav.
//
// So this file does the other thing: it renders the REAL route components, with
// only the CMS mocked, inside the real RootLayout. Between them the two files
// cover every route.
//
// Same two rules are disabled for the same reason as the other file — both need
// a layout engine, and jsdom computes no boxes and applies no stylesheet, so
// axe would report a false pass. Contrast is asserted numerically against the
// tokens in lib/palette-contrast.test.ts and lib/tag-pill.test.ts instead.

vi.mock("server-only", () => ({}));
vi.mock("next/font/google", () => ({
  Bricolage_Grotesque: () => ({ variable: "--font-bricolage" }),
  Literata: () => ({ variable: "--font-literata" }),
}));
vi.mock("next/headers", () => ({
  draftMode: async () => ({ isEnabled: false }),
}));
vi.mock("@vercel/analytics/react", () => ({ Analytics: () => null }));
vi.mock("@vercel/speed-insights/next", () => ({ SpeedInsights: () => null }));
vi.mock("@/lib/blur", () => ({ getBlurDataURL: async () => undefined }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/archive",
  notFound: () => {
    throw new Error("notFound() called — the fixture is missing an entry");
  },
}));

const asset = (name: string) => ({
  url: `https://images.ctfassets.net/x/y/${name}.jpg`,
  // A real description, not a filename stem: app/cover-image.tsx drops a
  // placeholder title to empty alt and warns, which would make every fixture
  // here decorative and quietly weaken the run.
  title: "A hand-lettered sign in a shop window",
  fileName: `${name}.jpg`,
});

const richText = (body: string) => ({
  json: {
    nodeType: "document",
    data: {},
    content: [
      {
        nodeType: "paragraph",
        data: {},
        content: [{ nodeType: "text", value: body, marks: [], data: {} }],
      },
    ],
  },
  links: { assets: { block: [] }, entries: { block: [], inline: [] } },
});

const tags = [
  { name: "Design", slug: "design", description: "How things get made." },
  { name: "Retro", slug: "retro", description: "Old machines, still running." },
];

const post = (slug: string, title: string, date: string) => ({
  slug,
  title,
  date,
  excerpt: `Everything worth knowing about ${title.toLowerCase()}.`,
  coverImage: asset(slug),
  updatedDate: undefined,
  author: { name: "Bulent Yusuf", slug: "bulent-yusuf", picture: asset("me") },
  category: { name: "Main Quest", slug: "main-quest" },
  tagsCollection: { items: tags },
});

// Three posts per tag so both clear MIN_POSTS_PER_TAG and the glossary, the
// sitemap and the tag pages agree — a fixture below the threshold would render
// an empty page and axe would pass on nothing.
const posts = [
  post("first-post", "The first post", "2026-03-02T00:00:00Z"),
  post("second-post", "The second post", "2026-02-11T00:00:00Z"),
  post("third-post", "The third post", "2025-12-24T00:00:00Z"),
];

const author = {
  name: "Bulent Yusuf",
  slug: "bulent-yusuf",
  picture: asset("me"),
  bio: richText("Writes about content, code and generative AI."),
};

vi.mock("@/lib/api", () => ({
  getAllPosts: async () => posts,
  getAllTags: async () => tags,
  getAllAuthors: async () => [author],
  getAuthorBySlug: async () => author,
  getAllCategories: async () => [
    {
      name: "Main Quest",
      slug: "main-quest",
      description: "The long haul.",
      thumbnail: asset("main-quest"),
    },
  ],
  getRecentPostsByCategory: async () => posts.slice(0, 2),
  getBrowseIntro: async (slug: string) => ({
    title: slug,
    slug,
    standfirst: "A short line describing this index.",
    metaDescription: "A short line describing this index.",
  }),
  getPage: async () => ({
    slug: "about",
    title: "About",
    sys: { publishedAt: "2026-01-05T00:00:00Z", firstPublishedAt: null },
    body: richText("This site is about content, code and generative AI."),
  }),
}));

const RootLayout = (await import("@/app/layout")).default;

const LAYOUT_DEPENDENT_RULES = {
  "color-contrast": { enabled: false },
  "target-size": { enabled: false },
} as const;

async function toHtml(element: ReactElement): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return new Response(stream).text();
}

/**
 * Render a route through the real RootLayout and hand its body to axe.
 *
 * The body's contents are transplanted rather than the whole document parsed,
 * which is what app/a11y.test.tsx does and for the same reason: jsdom already
 * has an html/head/body of its own. The consequence is that document-level
 * rules (html-has-lang above all) never get a chance to run, so the <html>
 * attributes are checked separately by the caller rather than silently going
 * unasserted.
 */
async function auditRoute(page: () => Promise<ReactElement>): Promise<{
  violations: Result[];
  lang: string | null;
}> {
  const html = await toHtml(await RootLayout({ children: await page() }));
  document.body.innerHTML = html
    .replace(/^[\s\S]*?<body[^>]*>/i, "")
    .replace(/<\/body>[\s\S]*$/i, "");
  const results: AxeResults = await axe.run(document.body, {
    resultTypes: ["violations"],
    rules: LAYOUT_DEPENDENT_RULES,
  });
  return {
    violations: results.violations,
    lang: html.match(/<html[^>]*\slang="([^"]*)"/i)?.[1] ?? null,
  };
}

const describeViolations = (violations: Result[]) =>
  violations
    .map(
      (v) =>
        `  [${v.impact}] ${v.id} — ${v.help}\n` +
        v.nodes
          .slice(0, 3)
          .map((n) => `      ${n.html.slice(0, 160).replace(/\s+/g, " ")}`)
          .join("\n"),
    )
    .join("\n\n");

// Every route this file is responsible for, with the module it lives in. The
// list is the point: a route added to the site and not added here has no axe
// run anywhere, and nothing else in CI reports that.
const routes: [name: string, load: () => Promise<{ default: unknown }>][] = [
  ["/archive", () => import("@/app/archive/page")],
  ["/categories", () => import("@/app/categories/page")],
  ["/tags", () => import("@/app/tags/page")],
  ["/authors", () => import("@/app/authors/page")],
  ["/about", () => import("@/app/about/page")],
  ["/privacy", () => import("@/app/privacy/page")],
  ["/search", () => import("@/app/search/page")],
  ["not-found", () => import("@/app/not-found")],
];

describe.each(routes)("%s", (name, load) => {
  it("has no axe violations", async () => {
    const mod = (await load()) as { default: () => Promise<ReactElement> };
    const { violations, lang } = await auditRoute(mod.default);
    expect(violations, `${name}\n\n${describeViolations(violations)}`).toEqual(
      [],
    );
    // Checked here rather than by axe, which only sees the body — see
    // auditRoute. DEFAULT_LOCALE is asserted against elsewhere; what matters
    // for this run is that the attribute exists at all.
    expect(lang, `${name} rendered <html> with no lang`).toBeTruthy();
  });

  it("renders something for axe to have audited", async () => {
    // The non-vacuous half, and it is not decoration. An empty render passes
    // every rule, and a fixture drifting out of step with a route's data shape
    // is the likeliest way for that to happen quietly — the page would fall to
    // its empty state and the assertion above would stay green forever, on a
    // route nobody was watching in the first place.
    const mod = (await load()) as { default: () => Promise<ReactElement> };
    await auditRoute(mod.default);
    const main = document.querySelector("main");
    expect(main, `${name} rendered no <main>`).not.toBeNull();
    expect(
      main!.textContent!.trim().length,
      `${name} rendered almost nothing`,
    ).toBeGreaterThan(100);
    expect(main!.querySelector("h1"), `${name} rendered no h1`).not.toBeNull();
  });
});

/**
 * Links inside <main> sharing a destination AND an accessible name.
 *
 * axe does not implement this — both links are perfectly labelled, which is
 * exactly the problem — so app/a11y.test.tsx carries its own version for the
 * listing shapes. These routes were never run through it. The archive puts two
 * tab stops on every row, and the category and author indexes each point a
 * thumbnail, a heading and a "read more" at one destination, so this is where
 * the check has the most to say.
 *
 * A link hidden from assistive tech cannot duplicate an announcement, which is
 * how the cover and thumbnail links deliberately opt out.
 */
function duplicateAnnouncements(): string[] {
  const main = document.querySelector("main");
  if (!main) throw new Error("no <main> landmark rendered");
  const seen = new Map<string, number>();
  for (const link of main.querySelectorAll("a[href]")) {
    if (link.closest('[aria-hidden="true"]')) continue;
    if (link.getAttribute("aria-hidden") === "true") continue;
    const name = (
      link.getAttribute("aria-label") ??
      link.textContent ??
      ""
    ).replace(/\s+/g, " ");
    const key = `${link.getAttribute("href")} → "${name.trim()}"`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  return [...seen].filter(([, n]) => n > 1).map(([key]) => key);
}

/**
 * The two routes where a repeated link is the design, not a defect.
 *
 * Both are recorded decisions in CLAUDE.md, so the check accommodates them
 * rather than the designs accommodating the check. It is a pattern per route,
 * not a skip: a duplicate of any OTHER shape still fails on these pages, which
 * is the part a plain exemption would have thrown away.
 */
const EXPECTED_DUPLICATES: Record<string, { href: RegExp; because: string }> = {
  "/archive": {
    href: /^\/categories\//,
    // "Archive rows carry two tab stops each, title and category, because the
    // category links to its category page as it does on the home hero." Two
    // posts filed the same way therefore repeat that second link, and the
    // repetition is per row rather than gratuitous.
    because: "every row links its own category, by design",
  },
  "/tags": {
    href: /^\/posts\//,
    // The glossary groups every post under each of its tags, so a post with
    // three tags appears three times — that repetition IS the index. CLAUDE.md
    // notes the same property as the reason the page is data-pagefind-ignore.
    because: "the glossary lists each post once per tag it carries",
  },
};

describe.each(routes)("%s", (name, load) => {
  it("announces each destination at most once", async () => {
    const mod = (await load()) as { default: () => Promise<ReactElement> };
    await auditRoute(mod.default);
    const expected = EXPECTED_DUPLICATES[name];
    const duplicates = duplicateAnnouncements();
    const unexpected = expected
      ? duplicates.filter((d) => !expected.href.test(d))
      : duplicates;
    expect(unexpected, `${name}: ${unexpected.join(", ")}`).toEqual([]);

    if (expected) {
      // The carve-out has to keep earning itself. If the design it describes
      // ever goes away, this is what says so — otherwise the exemption sits
      // there forever, quietly excusing a defect that arrives later under the
      // same shape.
      expect(
        duplicates.some((d) => expected.href.test(d)),
        `${name} no longer duplicates any link, so the allowance for "${expected.because}" is stale and should be removed`,
      ).toBe(true);
    }
  });
});
