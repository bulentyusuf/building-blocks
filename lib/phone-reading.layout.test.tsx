import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { renderToReadableStream } from "react-dom/server";
import { chromium, type Browser } from "playwright-core";
import type { ReactElement } from "react";

// Phones get no reading panel, so text runs between the gutters, and the ToC's
// entries are 44px tap targets there while xl keeps its gap. Measured in a
// real browser. [→ `post-page`, `guard-limits`]

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  draftMode: async () => ({ isEnabled: false }),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/about",
  notFound: () => {
    throw new Error("notFound() called — the fixture is missing an entry");
  },
}));

const paragraph = (value: string) => ({
  nodeType: "paragraph",
  data: {},
  content: [{ nodeType: "text", value, marks: [], data: {} }],
});

vi.mock("@/lib/api", () => ({
  getPage: async () => ({
    title: "About",
    slug: "about",
    sys: { publishedAt: "2026-10-02T00:00:00Z" },
    body: {
      json: {
        nodeType: "document",
        data: {},
        content: [
          paragraph(
            "Welcome. Pull up a chair. This is a personal blog about content, code, and the process of discovery while making things.",
          ),
        ],
      },
      links: { assets: { block: [] }, entries: { block: [] } },
    },
  }),
}));

const ROOT = path.join(__dirname, "..");

// The same lookup as lib/listing-rhythm.layout.test.tsx: no browser is a
// failure, not a skip.
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

type Measurement = {
  /** About's h1 and first paragraph, left edges and the paragraph's width. */
  h1Left: number;
  textLeft: number;
  textWidth: number;
  viewport: number;
  /** Heights of the visible ToC's entries. */
  tocHeights: number[];
};

// Runs in the page, so it closes over nothing.
function measureInPage(): Measurement {
  for (const d of document.querySelectorAll("details")) d.open = true;
  const box = (el: Element) => el.getBoundingClientRect();
  const h1 = document.querySelector("h1")!;
  const text = document.querySelector("article p")!;
  const links = [
    ...document.querySelectorAll('nav[aria-label="Table of contents"] a'),
  ].filter((a) => box(a).height > 0);
  return {
    h1Left: box(h1).left,
    textLeft: box(text).left,
    textWidth: box(text).width,
    viewport: window.innerWidth,
    tocHeights: links.map((a) => box(a).height),
  };
}

// WCAG 2.5.5 and Apple's guidance: 44px for a touch target.
const TAP = 44;

/** Every way the phone and desktop layouts break. Empty means they hold. */
function problems(m: Measurement, width: number): string[] {
  const out: string[] = [];
  if (m.tocHeights.length === 0) return ["no table of contents entries"];
  if (width < 768) {
    if (Math.abs(m.textLeft - m.h1Left) > 0.5) {
      out.push(`text starts ${m.textLeft - m.h1Left}px in from the h1`);
    }
    const short = m.tocHeights.filter((h) => h < TAP);
    if (short.length) out.push(`ToC entries under ${TAP}px: ${short}`);
  } else {
    // Edge plus padding, so well past the 2px edge alone.
    if (!(m.textLeft - m.h1Left > 16)) out.push("the panel lost its inset");
  }
  if (width >= 1280) {
    const tall = m.tocHeights.filter((h) => h >= TAP);
    if (tall.length) out.push(`desktop ToC entries padded: ${tall}`);
  }
  return out;
}

const WIDTHS = [375, 768, 1280];

let browser: Browser;
let stylesheet: string;
let html: string;

beforeAll(async () => {
  browser = await chromium.launch({ executablePath: browserPath() });
  stylesheet = await compileStylesheet();
  const About = (await import("@/app/about/page")).default;
  const TableOfContents = (await import("@/app/table-of-contents")).default;
  const headings = [
    { text: "What you'll find here", slug: "find" },
    { text: "The code", slug: "code" },
    { text: "The pictures", slug: "pictures" },
  ];
  html = await toHtml(
    <html lang="en-GB">
      <head />
      <body>
        <TableOfContents headings={headings} />
        {await About()}
      </body>
    </html>,
  );
}, 60_000);

afterAll(async () => {
  await browser?.close();
});

async function measure(width: number, breakage = ""): Promise<Measurement> {
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

describe.each(WIDTHS)("the reading column and ToC at %ipx", (width) => {
  it("hold", async () => {
    expect(problems(await measure(width), width)).toEqual([]);
  }, 30_000);
});

// Known-bad controls, each at a width where its check applies.
// [→ `known-bad-controls`]
it.each([
  [
    375,
    "the panel's padding back on a phone",
    "article{padding-left:1.25rem!important}",
  ],
  [375, "the phone ToC entries unpadded", "nav a{padding:0!important}"],
  [768, "the panel's inset dropped", "article{padding-left:0!important}"],
  [
    1280,
    "the phone padding leaking to desktop",
    "nav a{padding:12px 0!important}",
  ],
] as const)(
  "at %ipx, reports %s",
  async (width, _name, breakage) => {
    expect(problems(await measure(width, breakage), width)).not.toEqual([]);
  },
  30_000,
);
