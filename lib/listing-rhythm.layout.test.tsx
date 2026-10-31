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
// hairline) is the same distance from the cover below it, /archive opens a
// non-zero gap below its rule, and the header sits the same distance above the
// rule on both. Home has no rule since the strand redesign, so only its bar and
// feature card are measured. [→ `strands`] Every check is a relation between
// two measured distances, never a pixel value, so a refactor that keeps the
// pixels keeps this green.

vi.mock("server-only", () => ({}));
vi.mock("next/font/google", () => ({
  Bricolage_Grotesque: () => ({ variable: "--font-bricolage" }),
  IBM_Plex_Mono: () => ({ variable: "--font-plex-mono" }),
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
  category: { name: "Blogging", slug: "blogging" },
  tagsCollection: { items: [tag] },
}));

vi.mock("@/lib/api", () => ({
  getAllPosts: async () => posts,
  // No German versions, so the archive rows measured here stay as they were.
  getGermanPostSlugs: async () => [],
  // No writers, so the footer renders no mascots.
  getAllAuthors: async () => [],
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
  /** Null on home, which has no rule. */
  headerToRule: number | null;
  /** From the rule to the top of the first element below it. */
  ruleToContent: number | null;
  /** Listing only: from the rule to the first item's cover. */
  ruleToFirstCover: number | null;
  /** Listing only: from each later item's hairline to its cover. */
  hairlineToCover: number[];
  /** The bar above every page. */
  barHeight: number;
  /** Home only: the feature card's title and the first card title's sizes. */
  featureTitlePx: number | null;
  cardTitlePx: number | null;
  /** Home only: the feature card's cover and text column boxes. */
  featureCover: { top: number; bottom: number; right: number } | null;
  featureText: { top: number; left: number } | null;
};

// Runs in the page, so it closes over nothing.
function measureInPage(): Measurement {
  const main = document.querySelector("main")!;
  const box = (el: Element) => el.getBoundingClientRect();
  const borderTop = (el: Element) =>
    parseFloat(getComputedStyle(el).borderTopWidth);
  const cover = (el: Element) => el.querySelector('[class*="aspect-"]');
  const size = (el: Element | null | undefined) =>
    el ? parseFloat(getComputedStyle(el).fontSize) : null;

  const header = main.querySelector("header");
  const rule = main.querySelector('[class*="border-t-[3px]"]');
  const below = rule?.nextElementSibling?.firstElementChild;
  const items = [...main.querySelectorAll("section article")];
  // Home's feature card is the first article; its children are cover, text.
  const feature = main.querySelector("section > article");
  const listing = !feature && items.length > 0;
  const featureCover = feature?.children[0];
  const featureText = feature?.children[1];

  return {
    headerToRule: header && rule ? box(rule).top - box(header).bottom : null,
    ruleToContent: rule && below ? box(below).top - box(rule).bottom : null,
    ruleToFirstCover:
      listing && rule ? box(cover(items[0])!).top - box(rule).bottom : null,
    hairlineToCover: listing
      ? items
          .slice(1)
          .map(
            (item) => box(cover(item)!).top - (box(item).top + borderTop(item)),
          )
      : [],
    barHeight: box(document.querySelector("body > header")!).height,
    featureTitlePx: size(feature?.querySelector("h3")),
    cardTitlePx: size(main.querySelector("li article h3")),
    featureCover: featureCover
      ? {
          top: box(featureCover).top,
          bottom: box(featureCover).bottom,
          right: box(featureCover).right,
        }
      : null,
    featureText: featureText
      ? { top: box(featureText).top, left: box(featureText).left }
      : null,
  };
}

type Page = "home" | "listing" | "archive";

const same = (a: number, b: number) => Math.abs(a - b) < 0.5;

/** Every way the measurements break the rhythm. Empty means it holds. */
function rhythmProblems(m: Record<Page, Measurement>): string[] {
  const problems: string[] = [];
  const { listing, archive } = m;
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
  if (archive.ruleToContent === null || !(archive.ruleToContent > 0))
    problems.push("archive's content sits flush against the rule");
  if (
    listing.headerToRule === null ||
    archive.headerToRule === null ||
    !same(listing.headerToRule, archive.headerToRule)
  ) {
    problems.push(
      `header to rule: listing ${listing.headerToRule}px, archive ${archive.headerToRule}px`,
    );
  }
  return problems;
}

// The bar and the feature card, each broken once in a way only a browser
// shows. [→ `strands`, `guard-limits`]
function chromeProblems(m: Record<Page, Measurement>, width: number): string[] {
  const problems: string[] = [];
  const { home } = m;
  for (const page of ["listing", "archive"] as const) {
    if (!same(m[page].barHeight, home.barHeight)) {
      problems.push(
        `bar height: home ${home.barHeight}px, ${page} ${m[page].barHeight}px`,
      );
    }
  }
  const { featureTitlePx, cardTitlePx, featureCover, featureText } = home;
  if (!featureTitlePx || !cardTitlePx || !featureCover || !featureText) {
    return [...problems, "home rendered no feature card or card title"];
  }
  // Below md the cover sits above the text; from md they share a row.
  if (width < 768 && !(featureText.top >= featureCover.bottom)) {
    problems.push("the feature card's text overlaps its cover on mobile");
  }
  if (width >= 768 && !(featureText.left >= featureCover.right)) {
    problems.push("the feature card's cover and text do not share a row");
  }
  if (width >= 1024 && !(featureTitlePx > cardTitlePx)) {
    problems.push(
      `feature title ${featureTitlePx}px, card title ${cardTitlePx}px`,
    );
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
  it("holds on a tag listing and the archive", async () => {
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
  ])(
    "reports %s",
    async (_name, breakage) => {
      expect(rhythmProblems(await measure(width, breakage))).not.toEqual([]);
    },
    30_000,
  );
});

describe.each(WIDTHS)("the bar and the feature card at %ipx", (width) => {
  it("keep the bar's height, the feature's layout and its title step", async () => {
    expect(chromeProblems(await measure(width), width)).toEqual([]);
  }, 30_000);
});

// Known-bad controls, each at a width where its check applies.
// [→ `known-bad-controls`]
it.each([
  [
    1280,
    "the bar's minimum height removed",
    { home: "body > header > div { min-height: 0 !important }" },
  ],
  [
    375,
    "the feature's text pulled over its cover",
    {
      home: "section > article > div:nth-child(2) { margin-top: -120px !important }",
    },
  ],
  [
    1280,
    "the feature card stacked at desktop",
    { home: "section > article { display: block !important }" },
  ],
  [
    1280,
    "the feature title at the card title's size",
    { home: "section > article h3 { font-size: 1.875rem !important }" },
  ],
] as const)(
  "at %ipx, reports %s",
  async (width, _name, breakage) => {
    expect(chromeProblems(await measure(width, breakage), width)).not.toEqual(
      [],
    );
  },
  30_000,
);
