import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// /page/[page] used to call getBrowseIntro from both generateMetadata and the
// component, relying on cache() to collapse the two into one POST per render.
// It no longer does: the component has no standfirst to render any more —
// /page/[page] only ever exists for page 2 and up (page 1 lives at "/" and
// redirects there), and a listing's identity, including its standfirst, is
// stated once, on page 1 — so getBrowseIntro is called from generateMetadata
// alone now. This guards that there is exactly one call site, in the right
// shape, rather than the two-call dedupe the route used to need.
//
// Why this is asserted as source text rather than measured: see the sibling
// guards in this file's history — jsdom/vitest render neither collapses nor
// preserves cache() the way the real RSC runtime does, so counting fetches at
// runtime would be a false negative either way.

const ROOT = path.join(__dirname, "..");
const ROUTE = "app/page/[page]/page.tsx";
const source = fs.readFileSync(path.join(ROOT, ROUTE), "utf8");

const callArgs = () =>
  [...source.matchAll(/getBrowseIntro\(([^)]*)\)/g)].map((m) => m[1].trim());

describe("/page/[page] fetches its browse intro once, in generateMetadata alone", () => {
  it("calls getBrowseIntro exactly once", () => {
    // Non-vacuous: a pattern that stopped matching would report zero, not one.
    expect(callArgs()).toHaveLength(1);
  });

  it("passes the slug as a constant and the draft flag explicitly", () => {
    const [args] = callArgs();

    // Two arguments, never one. An omitted second argument is the drift that
    // looks most like a tidy: isDraftMode defaults to false, so dropping it
    // reads as harmless and silently changes the result under draft mode.
    expect(args.split(",")).toHaveLength(2);
    expect(args).toMatch(/^INTRO_SLUG\s*,/);

    // And the constant is real, declared once. Without this the check above
    // would pass against a call site naming an identifier that does not
    // exist, which typechecks nowhere but greps fine.
    const declarations = [...source.matchAll(/const INTRO_SLUG = "[^"]+";/g)];
    expect(declarations).toHaveLength(1);
  });

  it("the component itself never calls getBrowseIntro", () => {
    // The regression this file now exists to catch: the component regaining
    // a standfirst (and so a second getBrowseIntro call) without also
    // restoring the arity/constant discipline the old two-call-site version
    // enforced. If a standfirst legitimately comes back here, this test
    // should change alongside it, not silently keep passing.
    const componentStart = source.indexOf("export default async function");
    expect(componentStart).toBeGreaterThan(-1);
    expect(source.slice(componentStart)).not.toMatch(/getBrowseIntro\(/);
  });

  it("still resolves draftMode() once, for the posts fetch", () => {
    const componentStart = source.indexOf("export default async function");
    expect([
      ...source.slice(componentStart).matchAll(/await draftMode\(\)/g),
    ]).toHaveLength(1);
  });
});
