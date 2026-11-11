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
// Each page is measured four times: a desktop width, a phone width, a phone
// width at a 20px root font size, which is the size the author reads at and
// where rem-based layout overflows first, and the desktop width in dark mode.
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
  {
    name: "desktop 1280, dark",
    width: 1280,
    height: 900,
    root: 16,
    dark: true,
  },
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

// Text that sits straight on the graph paper, measured against the dots as the
// browser draws them. axe cannot see through the gradient, so this does it from
// pixels: screenshot with and without the text, and take the worst ground pixel
// under the letters themselves, so the gaps between words never count. Reports every box below AA, 4.5:1, or 3:1 for large text.
const GROUND_TEXT = `(() => {
  const opaque = (cs) =>
    cs.backgroundImage !== "none" ||
    !/rgba\\(.*,\\s*0\\)$|transparent/.test(cs.backgroundColor);
  const out = [];
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    if (!n.textContent.trim()) continue;
    const el = n.parentElement;
    const cs = getComputedStyle(el);
    if (cs.visibility !== "visible" || +cs.opacity === 0) continue;
    let onGround = true;
    for (let a = el; a && a !== document.body; a = a.parentElement) {
      const as = getComputedStyle(a);
      // Clipped text, such as screen-reader-only labels, is never drawn.
      if (opaque(as) || as.clip !== "auto" || as.clipPath !== "none")
        onGround = false;
    }
    if (!onGround) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    // The line boxes of the text itself, so an element's own border, outline
    // or padding is never mistaken for the ground behind its words.
    // Cut to every clipping ancestor, so a table cell scrolled out of its
    // scroll region is not read as text drawing no letters.
    let rects = [...range.getClientRects()].map((r) => ({ l: r.left, t: r.top, r: r.right, b: r.bottom }));
    for (let a = el; a && a !== document.body; a = a.parentElement) {
      const as = getComputedStyle(a);
      if (as.overflowX === "visible" && as.overflowY === "visible") continue;
      const c = a.getBoundingClientRect();
      rects = rects.map((r) => ({ l: Math.max(r.l, c.left), t: Math.max(r.t, c.top), r: Math.min(r.r, c.right), b: Math.min(r.b, c.bottom) }));
    }
    rects = rects
      .map((r) => ({ x: r.l + scrollX, y: r.t + scrollY, w: r.r - r.l, h: r.b - r.t }))
      .filter((r) => r.w >= 2 && r.h >= 2);
    if (!rects.length) continue;
    const size = parseFloat(cs.fontSize);
    const bold = parseInt(cs.fontWeight, 10) >= 700;
    out.push({
      id: el.id,
      tag: el.tagName.toLowerCase(),
      text: n.textContent.trim().replace(/\\s+/g, " ").slice(0, 60),
      color: cs.color,
      need: size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5,
      rects,
    });
  }
  return out;
})()`;

const WORST_GROUND = async ([withText, ground, boxes]) => {
  const load = async (png) => {
    const img = new Image();
    img.src = "data:image/png;base64," + png;
    await img.decode();
    const cv = document.createElement("canvas");
    cv.width = img.width;
    cv.height = img.height;
    const cx = cv.getContext("2d");
    cx.drawImage(img, 0, 0);
    return cx;
  };
  const textCtx = await load(withText);
  const ctx = await load(ground);
  const c = ctx.canvas;
  const lum = (r, g, b) =>
    [r, g, b]
      .map((v) => v / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
      .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
  const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  const bad = [];
  for (const t of boxes) {
    const [r, g, b] = t.color.match(/[\d.]+/g).map(Number);
    const ink = lum(r, g, b);
    let worst = Infinity;
    for (const box of t.rects) {
      // Rounded inwards, so a neighbour's background at the edge never counts.
      const x0 = Math.max(0, Math.ceil(box.x));
      const y0 = Math.max(0, Math.ceil(box.y));
      const w = Math.min(c.width, Math.floor(box.x + box.w)) - x0;
      const h = Math.min(c.height, Math.floor(box.y + box.h)) - y0;
      if (w < 1 || h < 1) continue;
      const d = ctx.getImageData(x0, y0, w, h).data;
      const g = textCtx.getImageData(x0, y0, w, h).data;
      for (let i = 0; i < d.length; i += 4) {
        // Only where a letter was drawn: the two screenshots differ there.
        const drawn =
          Math.abs(d[i] - g[i]) +
            Math.abs(d[i + 1] - g[i + 1]) +
            Math.abs(d[i + 2] - g[i + 2]) >
          24;
        if (drawn)
          worst = Math.min(worst, ratio(ink, lum(d[i], d[i + 1], d[i + 2])));
      }
    }
    // Text that draws no visible letter at all is indistinguishable from its
    // ground, the worst case there is.
    if (worst === Infinity) worst = 1;
    if (worst < t.need)
      bad.push({
        ...t,
        rects: undefined,
        ratio: Math.round(worst * 100) / 100,
      });
  }
  return bad;
};

async function groundContrast(page) {
  const boxes = await page.evaluate(GROUND_TEXT);
  // A full-page screenshot draws fixed elements once, where they sit on the
  // first screen, over whatever text is there. They float over the text rather
  // than sitting behind it, so they are left out of both screenshots.
  const floating = await page.evaluateHandle(() =>
    [...document.querySelectorAll("*")].filter((el) => {
      if (getComputedStyle(el).position !== "fixed") return false;
      el.dataset.groundHidden = el.style.visibility;
      el.style.visibility = "hidden";
      return true;
    }),
  );
  const shot = async () =>
    (await page.screenshot({ fullPage: true })).toString("base64");
  const withText = await shot();
  const hide = await page.addStyleTag({
    content:
      "*{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;text-decoration-color:transparent!important}",
  });
  const ground = await shot();
  await hide.evaluate((el) => el.remove());
  await floating.evaluate((els) =>
    els.forEach((el) => {
      el.style.visibility = el.dataset.groundHidden;
      delete el.dataset.groundHidden;
    }),
  );
  return page.evaluate(WORST_GROUND, [withText, ground, boxes]);
}

// axe reads no background through the dots' gradient, so contrast on the page
// ground lands in "incomplete", which this never prints. groundContrast covers
// that ground before the dots go. Self test proves both.
async function clearPageGround(page) {
  await page.addStyleTag({
    content: "body{background-image:none !important}",
  });
}

async function measure(page, path, pass) {
  await page.setViewportSize({ width: pass.width, height: pass.height });
  await page.emulateMedia({ colorScheme: pass.dark ? "dark" : "light" });
  await page.goto(BASE + path, { waitUntil: "load" });
  if (pass.root !== 16)
    await page.addStyleTag({ content: `html{font-size:${pass.root}px}` });
  await page.waitForTimeout(250);

  const reflow = await page.evaluate(BISECT);
  const ground = await groundContrast(page);
  await clearPageGround(page);
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

  return { reflow, violations, ground };
}

// Proves axe runs and reports, using a defect planted on the real page. A clean
// report and a silent axe look identical from the outside, so the report is
// worth nothing until this has passed.
async function selfTest() {
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await page.goto(BASE + "/", { waitUntil: "load" });
  // Muted text planted on the graph paper. It passes on the real dots, so it
  // must pass here, and must fail once the dots are darkened to a known-bad
  // value. Either way round proves the pixels are being read.
  await page.evaluate(() => {
    const p = document.createElement("p");
    p.id = "ground-control";
    p.textContent = "Muted text on the graph paper.";
    p.style.color = "#6B5A52";
    document.querySelector("main").prepend(p);
    // The same muted text in a scroll region, once in view and once scrolled
    // out of it. Only the first is drawn, so only the first may be measured.
    const scroller = document.createElement("div");
    scroller.style.cssText = "overflow-x:auto;width:200px";
    scroller.innerHTML =
      '<div style="display:flex;width:1200px"><p id="scroll-shown" style="color:#6B5A52;width:180px">Muted and in view.</p><p id="scroll-hidden" style="color:#6B5A52;margin-left:600px">Muted and scrolled away.</p></div>';
    document.querySelector("main").prepend(scroller);
    scroller.id = "scroll-control";
  });
  const real = await groundContrast(page);
  const dark = await page.addStyleTag({
    content: ":root{--color-dots:#8A7A72!important}",
  });
  const darkened = await groundContrast(page);
  await dark.evaluate((el) => el.remove());
  await page.evaluate(() => {
    document.getElementById("ground-control").remove();
    document.getElementById("scroll-control").remove();
  });
  await clearPageGround(page);
  await page.addScriptTag({ content: AXE });
  // Pale text straight on the page ground. If the dots come back, or
  // clearPageGround stops removing them, this lands in "incomplete" and fails.
  const contrast = await page.evaluate(async () => {
    const faint = document.createElement("p");
    faint.textContent = "Faint text on the page ground.";
    faint.style.color = "#CCCCCC";
    document.querySelector("main").prepend(faint);
    const r = await window.axe.run(faint, {
      runOnly: { type: "rule", values: ["color-contrast"] },
    });
    faint.remove();
    return r.violations.map((v) => v.id);
  });
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
  if (!contrast.includes("color-contrast")) {
    console.error(
      "SELF TEST FAILED: axe did not flag faint text on the page ground, so contrast there is going unchecked.",
    );
    process.exit(1);
  }
  if (real.some((t) => t.id === "ground-control")) {
    console.error(
      "SELF TEST FAILED: muted text failed against the real dots, so the dots or the measurement have changed.",
    );
    process.exit(1);
  }
  if ([...real, ...darkened].some((t) => t.id === "scroll-hidden")) {
    console.error(
      "SELF TEST FAILED: text scrolled out of its scroll region was measured, so every wide table on a phone reports a false 1:1.",
    );
    process.exit(1);
  }
  if (!darkened.some((t) => t.id === "scroll-shown")) {
    console.error(
      "SELF TEST FAILED: darkened dots under text in a scroll region went unreported, so the clipping skips text it should measure.",
    );
    process.exit(1);
  }
  if (!darkened.some((t) => t.id === "ground-control")) {
    console.error(
      "SELF TEST FAILED: darkened dots went unreported, so text on the graph paper is going unchecked.",
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
    `Self test passed: planted defects reported (${[...found.bad, ...contrast, "ground contrast"].join(", ")}), clean markup silent.`,
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
    const { reflow, violations, ground } = await measure(page, path, pass);
    if (!reflow && !violations.length && !ground.length) continue;
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
    for (const t of ground) {
      console.log(
        `  GROUND    ${t.ratio}:1 against the graph paper, needs ${t.need}:1, on ${t.tag}`,
      );
      console.log(`            "${t.text}"`);
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
