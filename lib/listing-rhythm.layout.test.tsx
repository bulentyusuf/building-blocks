import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { renderToReadableStream } from "react-dom/server";
import { chromium, type Browser } from "playwright-core";
import type { ReactElement } from "react";

// The spacing rhythm around WidePage's 3px rule, measured in a real browser
// rather than matched in source. [→ `guard-limits`, `band-retirement`]
//
// The rhythm: on a listing, whatever sits above an item (the 3px rule or a
// hairline) is the same distance from the cover below it. Home's ruled card
// grid opens with that same inset. Home and /archive, which are not ruled
// listings, open the same non-zero gap below the rule. And the header sits the
// same distance above the rule everywhere. Every check is a relation between
// two measured distances, never a pixel value, so a refactor that keeps the
// pixels keeps this green.

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
vi.mock("next/navigation", () => ({
  usePathname: () => "/archive",
  notFound: () => {
    throw new Error("notFound() called — the fixture is missing an entry");
  },
}));

const asset = (name: string) => ({
  url: `https://images.ctfassets.net/x/y/${name}.jpg`,
  title: "A hand-lettered sign in a shop window",
  fileName: `${name}.jpg`,
});

const tag = {
  name: "Design",
  slug: "design",
  description: "How things get made.",
};

// Five posts: home shows a hero plus a row of cards, and the tag listing gets
// enough items to measure a hairline-to-cover gap more than once.
const posts = [1, 2, 3, 4, 5].map((n) => ({
  slug: `post-${n}`,
  title: `Post number ${n}`,
  date: `2026-0${6 - n}-01T00:00:00Z`,
  excerpt: `Everything worth knowing about post number ${n}.`,
  coverImage: asset(`post-${n}`),
  authorsCollection: {
    items: [
      { name: "Bulent Yusuf", slug: "bulent-yusuf", picture: asset("me") },
    ],
  },
  category: { name: "Main Quest", slug: "main-quest" },
  tagsCollection: { items: [tag] },
}));

vi.mock("@/lib/api", () => ({
  getAllPosts: async () => posts,
  getTagBySlug: async () => tag,
  getBrowseIntro: async (slug: string) => ({
    title: slug,
    slug,
    standfirst: "A short line describing this index.",
    metaDescription: "A short line describing this index.",
  }),
}));

const ROOT = path.join(__dirname, "..");

// CHROME_PATH first, then CHROME_BIN, which GitHub's Ubuntu runners set to
// their preinstalled Chrome, then the usual install locations. No browser is a
// failure, not a skip: a skipped guard reads as a passing one.
function browserPath(): string {
  const candidates = [
    process.env.CHROME_PATH,
    process.env.CHROME_BIN,
    "/opt/pw-browsers/chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ];
  const found = candidates.find((p) => p && fs.existsSync(p));
  if (!found) {
    throw new Error(
      "No Chromium-family browser found. Set CHROME_PATH to one; this test measures layout and cannot run without it.",
    );
  }
  return found;
}

// The real stylesheet, scanning app/ and lib/ explicitly, so the rules under
// test are the ones the components ask for.
async function compileStylesheet(): Promise<string> {
  const source = fs
    .readFileSync(path.join(ROOT, "app/globals.css"), "utf8")
    .replace(
      /@import\s+["']tailwindcss["'];/,
      `@import "tailwindcss" source(none);\n@source "${ROOT}/app";\n@source "${ROOT}/lib";`,
    );
  const result = await postcss([tailwind({ optimize: false })]).process(
    source,
    { from: path.join(ROOT, "app/globals.css") },
  );
  return result.css;
}

async function toHtml(element: ReactElement): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return new Response(stream).text();
}

type Measurement = {
  headerToRule: number;
  /** From the rule to the top of the first element below it. */
  ruleToContent: number;
  /** Listing only: from the rule to the first item's cover. */
  ruleToFirstCover: number | null;
  /** Listing only: from each later item's hairline to its cover. */
  hairlineToCover: number[];
  /** Home only: from the card grid's opening hairline to its first cover. */
  gridRuleToCover: number | null;
};

// Runs in the page, so it closes over nothing.
function measureInPage(): Measurement {
  const main = document.querySelector("main")!;
  const box = (el: Element) => el.getBoundingClientRect();
  const borderTop = (el: Element) =>
    parseFloat(getComputedStyle(el).borderTopWidth);
  const cover = (el: Element) => el.querySelector('[class*="aspect-"]');

  const header = main.querySelector("header")!;
  const rule = main.querySelector('[class*="border-t-[3px]"]')!;
  const below = rule.nextElementSibling!.firstElementChild!;
  const grid = main.querySelector(
    '[class*="md:grid-cols-2"][class*="border-y"]',
  );
  const items = [...main.querySelectorAll("section article")];
  const listing = !grid && items.length > 0;

  return {
    headerToRule: box(rule).top - box(header).bottom,
    ruleToContent: box(below).top - box(rule).bottom,
    ruleToFirstCover: listing
      ? box(cover(items[0])!).top - box(rule).bottom
      : null,
    hairlineToCover: listing
      ? items
          .slice(1)
          .map(
            (item) => box(cover(item)!).top - (box(item).top + borderTop(item)),
          )
      : [],
    gridRuleToCover: grid
      ? box(cover(grid)!).top - (box(grid).top + borderTop(grid))
      : null,
  };
}

type Page = "home" | "listing" | "archive";

const same = (a: number, b: number) => Math.abs(a - b) < 0.5;

/** Every way the measurements break the rhythm. Empty means it holds. */
function rhythmProblems(m: Record<Page, Measurement>): string[] {
  const problems: string[] = [];
  const { home, listing, archive } = m;
  const inset = listing.ruleToFirstCover;

  if (inset === null || listing.hairlineToCover.length < 2) {
    return ["the listing rendered too few items with covers to measure"];
  }
  if (!(inset > 0))
    problems.push(`the first listing item sits ${inset}px under the rule`);
  for (const gap of listing.hairlineToCover) {
    if (!same(gap, inset)) {
      problems.push(
        `listing: rule to first cover ${inset}px, hairline to cover ${gap}px`,
      );
    }
  }
  if (home.gridRuleToCover === null) {
    problems.push("home rendered no ruled card grid");
  } else if (!same(home.gridRuleToCover, inset)) {
    problems.push(
      `home's card grid opens ${home.gridRuleToCover}px above its first cover, listings ${inset}px`,
    );
  }
  if (!(home.ruleToContent > 0))
    problems.push("home's content sits flush against the rule");
  if (!same(home.ruleToContent, archive.ruleToContent)) {
    problems.push(
      `below the rule: home ${home.ruleToContent}px, archive ${archive.ruleToContent}px`,
    );
  }
  for (const page of ["listing", "archive"] as const) {
    if (!same(m[page].headerToRule, home.headerToRule)) {
      problems.push(
        `header to rule: home ${home.headerToRule}px, ${page} ${m[page].headerToRule}px`,
      );
    }
  }
  return problems;
}

const WIDTHS = [375, 1280];

let browser: Browser;
let stylesheet: string;
let documents: Record<Page, string>;

beforeAll(async () => {
  browser = await chromium.launch({ executablePath: browserPath() });
  stylesheet = await compileStylesheet();
  const RootLayout = (await import("@/app/layout")).default;
  const pages: Record<Page, ReactElement> = {
    home: await (await import("@/app/page")).default(),
    listing: await (
      await import("@/app/tags/[slug]/page")
    ).default({
      params: Promise.resolve({ slug: "design" }),
    }),
    archive: await (await import("@/app/archive/page")).default(),
  };
  documents = {} as Record<Page, string>;
  for (const [name, page] of Object.entries(pages) as [Page, ReactElement][]) {
    documents[name] = await toHtml(await RootLayout({ children: page }));
  }
}, 60_000);

afterAll(async () => {
  await browser?.close();
});

/** Measures every page at one width, with optional CSS injected per page. */
async function measure(
  width: number,
  breakage: Partial<Record<Page, string>> = {},
): Promise<Record<Page, Measurement>> {
  const result = {} as Record<Page, Measurement>;
  for (const name of Object.keys(documents) as Page[]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    try {
      // Nothing leaves the page: fonts and images are sized by their boxes.
      await page.route("**/*", (route) => route.abort());
      const css = stylesheet + (breakage[name] ?? "");
      await page.setContent(
        documents[name].replace("</head>", `<style>${css}</style></head>`),
      );
      result[name] = await page.evaluate(measureInPage);
    } finally {
      await page.close();
    }
  }
  return result;
}

describe.each(WIDTHS)("the spacing rhythm at %ipx", (width) => {
  it("holds on home, a tag listing and the archive", async () => {
    expect(rhythmProblems(await measure(width))).toEqual([]);
  }, 30_000);

  // Known-bad controls. Each reruns the whole measurement on a page broken the
  // way this rhythm has actually broken, and requires it to be reported. A
  // selector that stopped matching, or a stylesheet that failed to compile,
  // would pass the check above and fail these. [→ `known-bad-controls`]
  it.each([
    [
      "the first listing item's top padding zeroed",
      {
        listing:
          "main section article:first-child { padding-top: 0 !important }",
      },
    ],
    [
      "a gap added below the rule on a listing",
      {
        listing:
          '[class*="border-t-[3px]"] + div { padding-top: 1.5rem !important }',
      },
    ],
    [
      "home's card grid losing its inset",
      {
        home: '[class*="md:grid-cols-2"][class*="border-y"] { padding-top: 0 !important }',
      },
    ],
  ])(
    "reports %s",
    async (_name, breakage) => {
      expect(rhythmProblems(await measure(width, breakage))).not.toEqual([]);
    },
    30_000,
  );
});
