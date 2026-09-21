#!/usr/bin/env node
// Runs an accessibility audit against a deployed build of the site in a real
// browser. It is not a checklist. Every line it prints is a measurement taken
// from the rendered page, so it reports defects nobody anticipated rather than
// confirming that known fixes are intact.
//
// It covers the two things app/a11y.test.tsx structurally cannot. That suite
// runs axe under jsdom, which computes no boxes and applies no stylesheet, so
// it can check neither colour contrast nor target size, and it can never see a
// page scroll sideways. This runs a real engine with real layout.
//
// Routes come from the deployed sitemap rather than a list kept here, so a
// route that ships without anyone adding it to this file is still audited.
// One route per page shape by default, every route in the sitemap with --all.
//
// Each page is measured three times: a desktop width, a phone width, and a
// phone width at a 20px root font size, which is the size the author reads at
// and where rem-based layout overflows first.
//
// Usage:  npm run audit:a11y [-- --all] [-- --route /posts/some-post]
// Env:    SITE_URL     origin to audit (default https://beuseful.net)
//         CHROME_PATH  a browser executable, when the installed Google
//                      Chrome is not the one to use
//
// Add --self-test to prove axe is running before trusting a clean report. A
// silent axe reports no violations exactly like a clean page does.

import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const AXE = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

const BASE = new URL(process.env.SITE_URL || "https://beuseful.net").origin;
const ARGS = process.argv.slice(2);
const ALL = ARGS.includes("--all");
const ONE = ARGS[ARGS.indexOf("--route") + 1];

// wcag22aa is included for the criteria added in 2.2, target size among them,
// which is the one this repo has no other way to check.
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const PASSES = [
  { name: "desktop 1280, 16px", width: 1280, height: 900, root: 16 },
  { name: "phone 375, 16px", width: 375, height: 812, root: 16 },
  { name: "phone 375, 20px", width: 375, height: 812, root: 20 },
];

// playwright-core ships no browser and downloads nothing on install, which is
// why it is the dependency rather than playwright. The browser is one already
// on the machine: an explicit CHROME_PATH first, otherwise the installed Google
// Chrome. Chrome rather than Chromium is the better subject anyway, since it is
// what most readers use.
async function launch() {
  const explicit = process.env.CHROME_PATH;
  if (explicit) return chromium.launch({ executablePath: explicit });
  try {
    return await chromium.launch({ channel: "chrome" });
  } catch (err) {
    console.error(
      "Could not start a browser.\n" +
        "This needs Google Chrome installed, or CHROME_PATH pointing at a\n" +
        "Chromium-based browser executable. The underlying error was:\n  " +
        String(err.message).split("\n")[0],
    );
    process.exit(1);
  }
}

function shapeOf(pathname) {
  if (pathname === "/") return "/";
  const seg = pathname.replace(/^\/|\/$/g, "").split("/");
  return seg.length > 1 ? `/${seg[0]}/*` : `/${seg[0]}`;
}

async function sitemapRoutes(page) {
  await page.goto(`${BASE}/sitemap.xml`, { waitUntil: "domcontentloaded" });
  const xml = await page.content();
  const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => new URL(m[1]).pathname)
    .sort();
  if (!paths.length) {
    console.error(`No URLs found in ${BASE}/sitemap.xml. Nothing to audit.`);
    process.exit(1);
  }
  if (ALL) return paths;
  const first = new Map();
  for (const p of paths) if (!first.has(shapeOf(p))) first.set(shapeOf(p), p);
  return [...first.values()];
}

// Which element is actually responsible for the page scrolling sideways.
//
// Correlation is not enough here and getting it wrong is easy. An element whose
// box extends past the viewport may be clipped by an ancestor and cost nothing,
// while the real culprit may be text that overflows a box of normal width. So
// this hides one subtree at a time and re-measures: an element is the cause
// only when hiding it removes the overflow. Descend into the child that does.
const BISECT = `(() => {
  const d = document.documentElement;
  const limit = d.clientWidth;
  const over = () => d.scrollWidth - limit;
  if (over() <= 1) return null;

  const describe = (el) => {
    const cls = String(el.className || "").trim().split(/\\s+/).slice(0, 3).join(".");
    const b = el.getBoundingClientRect();
    return {
      tag: el.tagName.toLowerCase(),
      cls: cls ? "." + cls : "",
      width: Math.round(b.width),
      right: Math.round(b.right),
      text: (el.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 70),
    };
  };

  let node = document.body;
  let guard = 0;
  for (;;) {
    if (guard++ > 40) break;
    let descended = false;
    for (const child of [...node.children]) {
      const prev = child.style.display;
      child.style.display = "none";
      void d.offsetWidth;
      const gone = over() <= 1;
      child.style.display = prev;
      void d.offsetWidth;
      if (gone) {
        node = child;
        descended = true;
        break;
      }
    }
    if (!descended) break;
  }
  if (node === document.body) return { unattributed: true, over: over() };
  return { ...describe(node), over: over() };
})()`;

async function measure(page, path, pass) {
  await page.setViewportSize({ width: pass.width, height: pass.height });
  await page.goto(BASE + path, { waitUntil: "load" });
  if (pass.root !== 16)
    await page.addStyleTag({ content: `html{font-size:${pass.root}px}` });
  await page.waitForTimeout(250);

  const reflow = await page.evaluate(BISECT);
  await page.addScriptTag({ content: AXE });
  const violations = await page.evaluate(async (tags) => {
    const r = await window.axe.run(document, {
      runOnly: { type: "tag", values: tags },
    });
    return r.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      count: v.nodes.length,
      sample: v.nodes[0]?.target?.join(" ") ?? "",
      why: (v.nodes[0]?.failureSummary ?? "")
        .split("\n")
        .slice(1, 2)
        .join(" ")
        .trim(),
    }));
  }, TAGS);

  return { reflow, violations };
}

// Proves axe runs and reports, using a defect planted on the real page. A clean
// report and a silent axe look identical from the outside, so the report is
// worth nothing until this has passed.
async function selfTest() {
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.addScriptTag({ content: AXE });
  const found = await page.evaluate(async (tags) => {
    const probe = document.createElement("div");
    probe.innerHTML =
      '<img src="data:image/gif;base64,R0lGODlhAQABAAAAACw="><a href="#"></a>';
    document.body.appendChild(probe);
    const bad = await window.axe.run(probe, {
      runOnly: { type: "tag", values: tags },
    });
    probe.remove();
    const clean = document.createElement("div");
    clean.innerHTML = "<p>Ordinary text with nothing wrong with it.</p>";
    document.body.appendChild(clean);
    const ok = await window.axe.run(clean, {
      runOnly: { type: "tag", values: tags },
    });
    clean.remove();
    return {
      bad: bad.violations.map((v) => v.id),
      ok: ok.violations.map((v) => v.id),
    };
  }, TAGS);
  await browser.close();

  if (!found.bad.includes("image-alt")) {
    console.error(
      "SELF TEST FAILED: axe did not flag an image with no alt text.",
    );
    process.exit(1);
  }
  if (found.ok.length) {
    console.error(
      `SELF TEST FAILED: axe flagged ordinary markup (${found.ok.join(", ")}).`,
    );
    process.exit(1);
  }
  console.log(
    `Self test passed: planted defects reported (${found.bad.join(", ")}), clean markup silent.`,
  );
}

if (ARGS.includes("--self-test")) {
  await selfTest();
  process.exit(0);
}

const browser = await launch();
const page = await browser.newPage();
const paths = ONE && !ONE.startsWith("--") ? [ONE] : await sitemapRoutes(page);

console.log(`Auditing ${BASE}`);
console.log(
  `${paths.length} route${paths.length === 1 ? "" : "s"}, ${PASSES.length} passes each\n`,
);

let findings = 0;
for (const path of paths) {
  for (const pass of PASSES) {
    const { reflow, violations } = await measure(page, path, pass);
    if (!reflow && !violations.length) continue;
    findings++;
    console.log(`${path}  [${pass.name}]`);
    if (reflow) {
      const where = reflow.unattributed
        ? "  (no single element accounts for it)"
        : `  ${reflow.tag}${reflow.cls}, ${reflow.width}px wide, right edge at ${reflow.right}px`;
      console.log(
        `  REFLOW    page scrolls sideways by ${reflow.over}px${where}`,
      );
      if (reflow.text) console.log(`            "${reflow.text}"`);
    }
    for (const v of violations) {
      console.log(
        `  ${String(v.impact ?? "n/a").padEnd(8)}  ${v.id} on ${v.count} element${v.count === 1 ? "" : "s"}. ${v.help}`,
      );
      console.log(`            ${v.sample}`);
      if (v.why) console.log(`            ${v.why}`);
    }
    console.log();
  }
}

console.log(
  findings
    ? `${findings} route/pass combinations with findings.`
    : "No findings.",
);
await browser.close();
