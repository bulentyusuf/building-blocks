import fs from "node:fs";
import path from "node:path";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { renderToReadableStream } from "react-dom/server";
import { chromium, type Browser } from "playwright-core";
import type { ReactElement } from "react";
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import Sidenote from "./sidenote";

// What a screen reader hears from a paragraph holding a sidenote, read from
// Chromium's accessibility tree at both layouts. Below 105rem the toggle names
// the note; from 105rem the note floats with no toggle, so its bounds must.
// [→ `sidenotes`, `guard-limits`] Not covered: the margin number's empty alt
// text, since ariaSnapshot reads no ::before content.

vi.mock("server-only", () => ({}));

const note = {
  json: {
    nodeType: "document",
    data: {},
    content: [
      {
        nodeType: "paragraph",
        data: {},
        content: [
          { nodeType: "text", value: "The aside.", marks: [], data: {} },
        ],
      },
    ],
  },
};

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

let browser: Browser;
let stylesheet: string;
let html: string;

beforeAll(async () => {
  browser = await chromium.launch({ executablePath: browserPath() });
  stylesheet = await compileStylesheet();
  html = await toHtml(
    <html lang="en-GB">
      <head />
      <body>
        <div className="prose">
          <p>
            Before the note
            <Sidenote content={note as never} number={1} />
            after it.
          </p>
        </div>
      </body>
    </html>,
  );
}, 60_000);

afterAll(async () => {
  await browser?.close();
});

/** The paragraph as the accessibility tree reads it, at one width. */
async function heard(width: number, breakage = ""): Promise<string> {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  try {
    await page.route("**/*", (route) => route.abort());
    await page.setContent(
      html.replace("</head>", `<style>${stylesheet}${breakage}</style></head>`),
    );
    return await page.locator("p").ariaSnapshot();
  } finally {
    await page.close();
  }
}

/** Every way the paragraph reads wrong. Empty means it reads right. */
function problems(text: string, width: number): string[] {
  if (width >= 1680) {
    return /Note 1: The aside\. End of note\./.test(text)
      ? []
      : ["the floated note is not bounded by Note 1: … End of note."];
  }
  const out: string[] = [];
  if (!text.includes('checkbox "Note 1"')) out.push("the toggle lost its name");
  if (/Note 1:|End of note/.test(text))
    out.push("the bounds double the toggle");
  return out;
}

describe.each([1279, 1680])("a sidenote at %ipx", (width) => {
  it("is announced once, start and end", async () => {
    const text = await heard(width);
    expect(problems(text, width), text).toEqual([]);
  }, 30_000);
});

// Known-bad controls: the bounds lost in the margin, and doubled inline.
// [→ `known-bad-controls`]
it.each([
  [1680, ".sidenote-bound { display: none !important }"],
  [1279, ".sidenote-bound { display: inline !important }"],
] as const)(
  "at %ipx, reports %s",
  async (width, breakage) => {
    expect(problems(await heard(width, breakage), width)).not.toEqual([]);
  },
  30_000,
);
