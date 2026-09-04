import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// The cache() dedupe on /page/[page], which no other suite can see.
//
// getBrowseIntro is cache()-wrapped, so the two calls this route makes, one in
// generateMetadata and one in the component, collapse into a single POST per
// render. They collapse only while the ARGUMENTS MATCH, and that is the whole
// fragility: cache() dedupes identical calls rather than equivalent ones, so
// two spellings of the same intent issue two requests and nothing anywhere
// says so. The page renders correctly either way.
//
// Why this is asserted as source text rather than measured. React's cache()
// only memoises under the react-server export condition, which is the RSC
// runtime. Under vitest it is a passthrough, so counting fetches there reports
// two calls whether the route is right or wrong, which is a false negative
// rather than evidence. Measuring it honestly needs next dev against real
// credentials. What this file can do instead is hold the property the route
// actually controls that has a plausible way of drifting:
//
//   1. the same slug at both call sites, which is why it is a constant
//
// Argument-count drift — getBrowseIntro(slug) silently diverging from
// getBrowseIntro(slug, false) — used to be the second fragility here, but
// lib/api.ts now declares no defaulted parameters on any fetcher, so tsc
// rejects an omitted argument before this file ever sees it. The arity
// assertion below stays as a cheap double-check and a count-of-call-sites
// guard, but it is no longer the primary defence.
//
// Scoped to this route deliberately. The four section fronts reach
// getBrowseIntro through browsePageMetadata, which takes the slug as an
// argument, so their halves cannot drift the way two bare call sites can.
// /about and /privacy carry the same shape as this route and are NOT guarded
// here.

const ROOT = path.join(__dirname, "..");
const ROUTE = "app/page/[page]/page.tsx";
const source = fs.readFileSync(path.join(ROOT, ROUTE), "utf8");

const callArgs = () =>
  [...source.matchAll(/getBrowseIntro\(([^)]*)\)/g)].map((m) => m[1].trim());

describe("/page/[page] fetches its browse intro once per render", () => {
  it("calls getBrowseIntro exactly twice, once per half", () => {
    // Non-vacuous, and the guard the two below depend on. Every assertion here
    // compares one call site against another, so a pattern that stopped
    // matching would leave nothing to compare and pass on an empty list.
    expect(callArgs()).toHaveLength(2);
  });

  it("passes the identical argument list at both call sites", () => {
    const calls = callArgs();
    expect(calls).toHaveLength(2);
    // Textual identity is stricter than cache() needs and is the point. Two
    // call sites that read the same cannot drift apart unnoticed, whereas two
    // that merely evaluate the same today can.
    expect(calls[0]).toBe(calls[1]);
  });

  it("passes the slug as a constant and the draft flag explicitly", () => {
    const calls = callArgs();
    expect(calls).toHaveLength(2);

    for (const args of calls) {
      // Two arguments, never one. An omitted second argument is the drift that
      // looks most like a tidy: isDraftMode defaults to false, so dropping it
      // reads as harmless and silently doubles the requests.
      expect(args.split(",")).toHaveLength(2);
      expect(args).toMatch(/^INTRO_SLUG\s*,/);
    }

    // And the constant is real, declared once. Without this the check above
    // would pass against two call sites naming an identifier that does not
    // exist, which typechecks nowhere but greps fine.
    const declarations = [...source.matchAll(/const INTRO_SLUG = "[^"]+";/g)];
    expect(declarations).toHaveLength(1);
  });

  it("resolves draftMode() in both halves rather than defaulting it", () => {
    // The other half of the arity rule. Passing isEnabled at both call sites
    // only dedupes if both halves actually resolved it; a half that assumed
    // false would be passing a different value, not just a different spelling.
    expect([...source.matchAll(/await draftMode\(\)/g)]).toHaveLength(2);
  });
});
