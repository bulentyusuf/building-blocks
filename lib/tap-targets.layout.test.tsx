import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { renderToReadableStream } from "react-dom/server";
import { chromium, type Browser } from "playwright-core";
import type { ReactElement } from "react";

// Every standalone control has a 44px tap area on a touch screen, and keeps
// its own size with a mouse. Measured in a real browser by tapping the edges
// of a 44px square centred on each control. [→ `tap-targets`]

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ usePathname: () => "/archive" }));

const ROOT = path.join(__dirname, "..");

// The same lookup as the other layout tests: no browser is a failure.
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

const TAP = 44;
// Inside the square's edge, so a pixel of rounding is not a failure.
const REACH = TAP / 2 - 1;

// Runs in the page. For each control, taps the four edges of a 44px square
// centred on it and reports the ones that land on something else.
function missesInPage(reach: number): string[] {
  const misses: string[] = [];
  for (const el of document.querySelectorAll<HTMLElement>("[data-tap]")) {
    // elementFromPoint sees only the viewport, so bring the control into it.
    el.scrollIntoView({ block: "center", inline: "center" });
    const r = el.getClientRects()[0];
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const points: [string, number, number][] = [
      ["top", cx, cy - reach],
      ["bottom", cx, cy + reach],
      ["left", cx - reach, cy],
      ["right", cx + reach, cy],
    ];
    for (const [side, x, y] of points) {
      const hit = document.elementFromPoint(x, y);
      if (!hit || !el.contains(hit)) misses.push(`${el.dataset.tap} ${side}`);
    }
  }
  return misses;
}

let browser: Browser;
let stylesheet: string;
let html: string;

const post = {
  slug: "a-post",
  title: "A post about tap targets",
  date: "2026-11-04",
  category: { name: "Blogging", slug: "blogging" },
};
const tags = [
  { name: "AI", slug: "ai" },
  { name: "Accessibility", slug: "accessibility" },
  { name: "Design", slug: "design" },
  { name: "Search", slug: "search" },
  { name: "Typography", slug: "typography" },
];

beforeAll(async () => {
  browser = await chromium.launch({ executablePath: browserPath() });
  stylesheet = await compileStylesheet();
  const PostRow = (await import("@/app/post-row")).default;
  const { TagRow } = await import("@/app/tag-pill");
  const LanguageLink = (await import("@/app/language-link")).default;
  const SiteWordmark = (await import("@/app/site-wordmark")).default;
  const Avatar = (await import("@/app/avatar")).default;
  const Breadcrumb = (await import("@/app/breadcrumb")).default;
  const AuthorBioCard = (await import("@/app/author-bio-card")).default;
  const TableOfContents = (await import("@/app/table-of-contents")).default;
  const bio = {
    json: {
      nodeType: "document",
      data: {},
      content: [
        {
          nodeType: "paragraph",
          data: {},
          content: [
            { nodeType: "text", value: "A yeti.", marks: [], data: {} },
          ],
        },
      ],
    },
    links: { assets: { block: [] }, entries: { block: [] } },
  };
  html = await toHtml(
    <html lang="en-GB">
      <head />
      <body>
        <main className="space-y-12 p-4">
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Tags", href: "/tags" },
              { label: "Accessibility" },
            ]}
          />
          <ul data-tap-group="row">
            <PostRow post={post as never} german date="dayMonth" showStrand />
          </ul>
          {/* Narrow, so the pills wrap onto a second row. */}
          <div className="w-40">
            <TagRow tags={tags} className="" />
          </div>
          <LanguageLink
            href="/de/posts/a-post"
            lang="de-DE"
            label="Auf Deutsch"
          />
          <Avatar
            authors={[
              { name: "Bulent Yusuf", slug: "bulent-yusuf", picture: null },
            ]}
          />
          <AuthorBioCard
            author={{
              name: "Genial Yeti",
              slug: "genial-yeti",
              picture: null,
              bio: bio as never,
            }}
          />
          <TableOfContents
            headings={[
              { text: "What is a dark mode?", slug: "what" },
              { text: "Why it is hard", slug: "why" },
            ]}
          />
          <footer className="mt-8">
            <SiteWordmark title="Be Useful." size="footer" />
          </footer>
        </main>
      </body>
    </html>,
  );
}, 60_000);

afterAll(async () => {
  await browser?.close();
});

// Marks the controls under test. Done in the page, so the fixture above stays
// plain markup.
const MARK = `
  const mark = (sel, name) => [...document.querySelectorAll(sel)].filter((el) => el.getClientRects().length).forEach((el, i) => { el.dataset.tap = name + (i ? " " + (i + 1) : ""); });
  mark('a[href="/posts/a-post"]', "archive title");
  mark('a[href="/de/posts/a-post"][hreflang]:not(p a)', "archive DE");
  mark('a[href="/categories/blogging"]', "archive strand");
  mark('ul[aria-label="Tags"] a', "tag pill");
  mark('p > a[href="/de/posts/a-post"]', "language link");
  mark('a[href="/authors/bulent-yusuf"]', "byline name");
  mark('footer a[href="/"]', "wordmark");
  mark('nav[aria-label="Breadcrumb"] a', "breadcrumb");
  mark('a[href="/authors/genial-yeti"]', "more from");
  mark('nav[aria-label="Table of contents"] a', "contents");
`;

async function misses(
  width: number,
  touch: boolean,
  breakage = "",
): Promise<string[]> {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    hasTouch: touch,
    isMobile: touch,
  });
  const page = await context.newPage();
  try {
    await page.route("**/*", (route) => route.abort());
    await page.setContent(
      html.replace("</head>", `<style>${stylesheet}${breakage}</style></head>`),
    );
    await page.evaluate(MARK);
    const marked = await page.locator("[data-tap]").count();
    expect(marked, "fixture lost a control").toBeGreaterThanOrEqual(10);
    return await page.evaluate(missesInPage, REACH);
  } finally {
    await context.close();
  }
}

describe.each([375, 1280])("on a touch screen at %ipx", (width) => {
  it("every control answers a tap anywhere in its 44px square", async () => {
    expect(await misses(width, true)).toEqual([]);
  }, 30_000);

  it("still does at a 20px root, Bulent's reading size", async () => {
    expect(await misses(width, true, "html{font-size:20px}")).toEqual([]);
  }, 30_000);
});

describe("with a mouse", () => {
  it("controls keep their own size", async () => {
    // Not a failure to fix: proof the sizes change only for touch, and that
    // the probe can tell a small target from a big one.
    // [→ `known-bad-controls`]
    const found = await misses(1280, false);
    expect(found).toContain("archive DE top");
    expect(found).toContain("tag pill top");
  }, 30_000);
});

it("fails on a touch screen without the tap area", async () => {
  // Known-bad control: the utility switched off. [→ `known-bad-controls`]
  const found = await misses(375, true, ".tap-area::before{display:none}");
  expect(found).toContain("archive DE top");
  expect(found).toContain("tag pill top");
}, 30_000);
