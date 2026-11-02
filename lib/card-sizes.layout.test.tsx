import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { renderToReadableStream } from "react-dom/server";
import { chromium, type Browser } from "playwright-core";
import type { ReactElement } from "react";

// Each card cover's `sizes` against the width it renders at, in a real
// browser. Over-reporting downloads a larger file than anything on screen;
// under-reporting blurs it. [→ `priority-opaque`, `guard-limits`]

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

const route = vi.hoisted(() => ({ path: "/" }));
vi.mock("next/navigation", () => ({
  usePathname: () => route.path,
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

// Five posts: home shows a feature card plus a row of cards. The feature is
// the worst case: a title, an excerpt and three writers' names all longer
// than the card has room for, so its clamps are what hold it. [→ `strands`]
const writer = (name: string) => ({
  name,
  slug: name.toLowerCase().replace(/ /g, "-"),
  picture: asset("me"),
});
const posts = [1, 2, 3, 4, 5].map((n) => ({
  slug: `post-${n}`,
  title:
    n === 1
      ? "A headline far longer than any on the site, written to run past the three lines the feature card allows it"
      : `Post number ${n}`,
  date: n === 1 ? "2026-09-23T00:00:00Z" : `2026-0${6 - n}-01T00:00:00Z`,
  excerpt:
    n === 1
      ? "An excerpt long enough to run past three lines in the feature card's text column, so the clamp is what keeps the card at the height of its cover rather than the length of this sentence, which keeps going for a good while longer than any real excerpt on the site."
      : `Everything worth knowing about post number ${n}.`,
  coverImage: asset(`post-${n}`),
  authorsCollection: {
    items:
      n === 1
        ? [
            writer("Bulent Yusuf"),
            writer("Genial Yeti of the Mountains"),
            writer("Trippy Robot of the Arcade"),
          ]
        : [writer("Bulent Yusuf")],
  },
  category: { name: "Blogging", slug: "blogging" },
  tagsCollection: { items: [tag] },
}));

vi.mock("@/lib/blur", () => ({ getBlurDataURL: async () => undefined }));
vi.mock("@/lib/api", () => ({
  getAllPosts: async () => posts,
  // No German versions, so the archive rows measured here stay as they were.
  getGermanPostSlugs: async () => [],
  // No writers, so the footer renders no mascots.
  getAllAuthors: async () => [],
  getAllTags: async () => [tag],
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

type Cover = { sizes: string; rendered: number; claimed: number };

// Runs in the page, so it closes over nothing. Resolves each `sizes` as the
// browser would: the first matching media condition, its length laid out.
function measureInPage(): Cover[] {
  const resolve = (sizes: string) => {
    for (const part of sizes.split(/,\s*/)) {
      const match = part.match(/^(\(.*?\))\s+(.+)$/);
      if (match && !matchMedia(match[1]).matches) continue;
      const probe = document.createElement("div");
      probe.style.cssText = `position:absolute;width:${match ? match[2] : part}`;
      document.body.append(probe);
      const width = probe.getBoundingClientRect().width;
      probe.remove();
      return width;
    }
    return NaN;
  };
  return [...document.querySelectorAll("main article img[sizes]")].map(
    (img) => ({
      sizes: img.getAttribute("sizes")!,
      rendered: img.getBoundingClientRect().width,
      claimed: resolve(img.getAttribute("sizes")!),
    }),
  );
}

// A claim within 10% over is the slack a hand-written sizes needs; any under
// is a blurry image.
function problems(covers: Cover[]): string[] {
  if (covers.length < 2) return ["home rendered no feature card and cards"];
  return covers
    .filter(
      (c) => !(c.claimed >= c.rendered - 1 && c.claimed <= c.rendered * 1.1),
    )
    .map(
      (c) =>
        `renders ${Math.round(c.rendered)}px, sizes claims ${Math.round(c.claimed)}px: ${c.sizes}`,
    );
}

// Each side of every breakpoint the cards change at, and past the frame.
const WIDTHS = [375, 767, 768, 1024, 1199, 1279, 1280, 1440];

let browser: Browser;
let stylesheet: string;
let html: string;

beforeAll(async () => {
  browser = await chromium.launch({ executablePath: browserPath() });
  stylesheet = await compileStylesheet();
  const RootLayout = (await import("@/app/layout")).default;
  const Home = (await import("@/app/page")).default;
  html = await toHtml(await RootLayout({ children: await Home() }));
}, 60_000);

afterAll(async () => {
  await browser?.close();
});

async function measure(width: number, breakage = ""): Promise<Cover[]> {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  try {
    await page.route("**/*", (route) => route.abort());
    await page.setContent(
      html.replace("</head>", `<style>${stylesheet}${breakage}</style></head>`),
    );
    return await page.evaluate(measureInPage);
  } finally {
    await page.close();
  }
}

describe.each(WIDTHS)("card covers at %ipx", (width) => {
  it("claim the width they render at", async () => {
    expect(problems(await measure(width))).toEqual([]);
  }, 30_000);
});

// Known-bad controls: a cover rendered wider than its claim, and narrower.
// [→ `known-bad-controls`]
it.each([
  [
    "under",
    "main article img { max-width: none !important; width: 1400px !important }",
  ],
  ["over", "main li article { max-width: 200px !important }"],
])(
  "reports a claim %s the rendered width",
  async (_name, breakage) => {
    expect(problems(await measure(1440, breakage))).not.toEqual([]);
  },
  30_000,
);
