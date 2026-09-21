#!/usr/bin/env node
// Measures the bloat signals in this repository and prints them. Numbers only.
// What a given number means is a reading someone has to make, and the arguments
// that inform it are in docs/decisions.md.
//
// It reports the CLAUDE.md line budget, the longest rules in that file, the
// longest decision entries, which source comments share eight-word runs with
// the documentation, the longest comment blocks, and the runtime dependency
// count.
//
// Run from the repository root with npm run measure:bloat.
//
// Add --self-test to prove the duplication detector before trusting any figure
// it prints. The self test lifts real text out of docs/decisions.md, asserts it
// is found, then asserts invented text is not. If it fails, every duplication
// figure after it is meaningless.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const BUDGET = 280; // lib/docs-consistency.test.ts enforces this
const N = 8; // words per shingle, same window as the self-plagiarism check

const read = (p) => readFileSync(p, "utf8");

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

const words = (s) =>
  s
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^a-z0-9' ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);

function shingles(ws) {
  const set = new Set();
  for (let i = 0; i + N <= ws.length; i++)
    set.add(ws.slice(i, i + N).join(" "));
  return set;
}

function commentText(src) {
  const line = [...src.matchAll(/\/\/(.*)/g)].map((m) => m[1]);
  const block = [...src.matchAll(/\/\*([\s\S]*?)\*\//g)].map((m) =>
    m[1].replace(/^\s*\*/gm, " "),
  );
  return [...line, ...block].join(" ");
}

// Longest run of consecutive shared shingles, quoted so the reader can find it.
function longestRun(ws, other) {
  let best = [0, 0];
  let start = -1;
  for (let i = 0; i + N <= ws.length; i++) {
    const hit = other.has(ws.slice(i, i + N).join(" "));
    if (hit && start < 0) start = i;
    if ((!hit || i + N === ws.length) && start >= 0) {
      const end = hit ? i : i - 1;
      if (end - start > best[1] - best[0]) best = [start, end];
      start = -1;
    }
  }
  const [a, b] = best;
  return b > a ? ws.slice(a, b + N).join(" ") : "";
}

function duplication(files, decisions, rules) {
  const rows = [];
  for (const f of files) {
    const ws = words(commentText(read(f)));
    if (ws.length < N * 4) continue;
    const s = shingles(ws);
    let dec = 0;
    let rul = 0;
    for (const k of s) {
      if (decisions.has(k)) dec++;
      if (rules.has(k)) rul++;
    }
    if (dec || rul)
      rows.push({
        f,
        dec,
        rul,
        words: ws.length,
        run: longestRun(ws, decisions),
      });
  }
  return rows.sort((a, b) => b.dec + b.rul - (a.dec + a.rul));
}

// --- self test -------------------------------------------------------------

function selfTest() {
  const decText = read("docs/decisions.md");
  const decisions = shingles(words(decText));
  // Twenty real words lifted from the decisions file must be detected, and a
  // passage that exists nowhere in it must not. Both halves, or the check is
  // green for the wrong reason.
  const lifted = words(decText).slice(400, 420).join(" ");
  const invented =
    "zephyr marmalade quantum lighthouse accordion tangerine velvet orbit " +
    "parsnip glacier kettle saxophone meridian pumpkin lantern cobalt";
  const hit = [...shingles(words(lifted))].filter((k) =>
    decisions.has(k),
  ).length;
  const miss = [...shingles(words(invented))].filter((k) =>
    decisions.has(k),
  ).length;
  if (hit === 0) {
    console.error(
      "SELF TEST FAILED: text copied from decisions.md not detected.",
    );
    process.exit(1);
  }
  if (miss !== 0) {
    console.error("SELF TEST FAILED: invented text reported as duplicated.");
    process.exit(1);
  }
  console.log(`Self test passed: ${hit} copied shingles found, 0 invented.`);
}

// --- report ----------------------------------------------------------------

if (process.argv.includes("--self-test")) {
  selfTest();
  process.exit(0);
}

const claude = read("CLAUDE.md");
const decText = read("docs/decisions.md");
const lines = claude.trimEnd().split("\n").length;

console.log("BUDGET");
console.log(
  `  CLAUDE.md ${lines} of ${BUDGET} lines, ${BUDGET - lines} left\n`,
);

console.log("RULES OF FIVE LINES OR MORE IN CLAUDE.md");
const cl = claude.split("\n");
for (let i = 0; i < cl.length; i++) {
  if (!cl[i].startsWith("- **")) continue;
  let n = 1;
  while (cl[i + n]?.startsWith("  ")) n++;
  if (n >= 5) console.log(`  line ${i + 1}, ${n} lines  ${cl[i].slice(0, 64)}`);
}
console.log();

const entries = decText
  .split(/\n(?=### )/)
  .map((p) => ({
    key: p.match(/<!-- key: ([a-z0-9-]+) -->/)?.[1],
    n: p.split("\n").length,
  }))
  .filter((e) => e.key)
  .sort((a, b) => b.n - a.n);
const median = entries.map((e) => e.n).sort((a, b) => a - b)[
  Math.floor(entries.length / 2)
];
console.log(
  `LONGEST DECISIONS ENTRIES (${entries.length} entries, median ${median} lines)`,
);
for (const e of entries.slice(0, 8))
  console.log(`  ${String(e.n).padStart(4)}  ${e.key}`);
console.log();

const files = [...walk("app"), ...walk("lib")];
const dup = duplication(
  files,
  shingles(words(decText)),
  shingles(words(claude)),
);
console.log("CODE COMMENTS SHARING EIGHT-WORD RUNS WITH THE DOCUMENTATION");
console.log("  decisions  CLAUDE.md  comment words  file");
for (const r of dup.slice(0, 10)) {
  console.log(
    `  ${String(r.dec).padStart(9)}  ${String(r.rul).padStart(9)}  ${String(r.words).padStart(13)}  ${r.f}`,
  );
}
console.log("\n  Longest shared run in the top three:");
for (const r of dup.slice(0, 3))
  if (r.run) console.log(`  ${r.f}\n    "${r.run}"`);
console.log();

console.log("COMMENT BLOCKS OF 20 LINES OR MORE");
for (const f of files) {
  const L = read(f).split("\n");
  let run = 0;
  let start = 0;
  let inBlock = false;
  for (let i = 0; i <= L.length; i++) {
    const s = (L[i] ?? "").trim();
    if (s.startsWith("/*")) inBlock = true;
    const isComment = s && (s.startsWith("//") || s.startsWith("*") || inBlock);
    if (s.includes("*/")) inBlock = false;
    if (isComment) {
      if (!run) start = i + 1;
      run++;
    } else {
      if (run >= 20) console.log(`  ${String(run).padStart(3)}  ${f}:${start}`);
      run = 0;
    }
  }
}
console.log();

const HISTORY =
  /\b(used to|no longer|formerly|was retired|previously|once shipped|shipped once)\b/i;
const hist = {};
for (const f of files)
  for (const l of read(f).split("\n")) {
    const s = l.trim();
    if ((s.startsWith("//") || s.startsWith("*")) && HISTORY.test(s))
      hist[f] = (hist[f] ?? 0) + 1;
  }
const histTotal = Object.values(hist).reduce((a, b) => a + b, 0);
console.log(
  `COMMENT LINES NARRATING EARLIER BEHAVIOUR  ${histTotal} across ${Object.keys(hist).length} files`,
);
for (const [f, n] of Object.entries(hist)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 6))
  console.log(`  ${String(n).padStart(3)}  ${f}`);
console.log();

const deps = Object.keys(JSON.parse(read("package.json")).dependencies).length;
console.log(`RUNTIME DEPENDENCIES  ${deps}`);
