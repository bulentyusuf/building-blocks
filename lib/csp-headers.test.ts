import { describe, it, expect } from "vitest";
import nextConfig from "../next.config.js";

// CI cannot see runtime header precedence: format/test/build never issue a
// request, so a header-rules ordering bug ships green (PR #425 put the
// catch-all AFTER the /search rule; Next applies matching rules in array
// order and a later match overwrites the same key, which silently stripped
// 'wasm-unsafe-eval' from the page that needs it). This file imports the real
// next.config.js and resolves it through those documented semantics, then
// asserts the outcomes: the strict base policy everywhere except /search,
// whose document alone may compile WebAssembly for Pagefind.
//
// The matcher below covers only the source shapes this config uses
// ("/(.*)", exact paths, "/x/:path*"); anything fancier belongs in the config
// and here together.

type HeaderRule = {
  source: string;
  headers: { key: string; value: string }[];
};

const CSP_KEY = "content-security-policy";

type Resolved = Map<string, string>;

function sourceMatches(source: string, pathname: string): boolean {
  if (source === "/(.*)") return true;
  if (source.endsWith("/:path*")) {
    const base = source.slice(0, -"/:path*".length);
    return pathname === base || pathname.startsWith(`${base}/`);
  }
  return pathname === source;
}

let cachedRules: Promise<HeaderRule[]> | null = null;

function loadRules(): Promise<HeaderRule[]> {
  cachedRules ??= (
    nextConfig.headers as unknown as () => Promise<HeaderRule[]>
  )();
  return cachedRules;
}

async function resolveHeadersFor(pathname: string): Promise<Resolved> {
  // Mirrors the server's walk over matched rules (Next's
  // router-utils/resolve-routes.js): rules apply in array order, every match
  // writes its keys, and a later write replaces the same key. set-cookie
  // accumulates instead; no header here relies on that.
  const resolved: Resolved = new Map();
  for (const rule of await loadRules()) {
    if (!sourceMatches(rule.source, pathname)) continue;
    for (const { key, value } of rule.headers)
      resolved.set(key.toLowerCase(), value);
  }
  return resolved;
}

function cspOf(resolved: Resolved): string | undefined {
  return resolved.get(CSP_KEY);
}

async function cspFor(pathname: string): Promise<string | undefined> {
  return cspOf(await resolveHeadersFor(pathname));
}

const WASM_TOKEN = " 'wasm-unsafe-eval'";
const CMS_ORIGIN = "https://app.contentful.com";

function frameAncestorsOf(csp: string | undefined): string | undefined {
  return csp
    ?.split("; ")
    .find((directive) => directive.startsWith("frame-ancestors "));
}

describe("resolved CSP headers", () => {
  it("grants 'wasm-unsafe-eval' on /search and /pagefind, nowhere else", async () => {
    // Non-vacuous on both halves: /search must actually carry the token (for
    // the document), /pagefind must carry it (for the SharedWorker that
    // compiles WASM), and representative other surfaces must not.
    expect(await cspFor("/search")).toContain(WASM_TOKEN.trim());
    expect(await cspFor("/pagefind/pagefind-worker.js")).toContain(
      WASM_TOKEN.trim(),
    );
    for (const path of ["/", "/posts/some-post"]) {
      expect(await cspFor(path), path).toBeDefined();
      expect(await cspFor(path), path).not.toContain("wasm-unsafe-eval");
    }
  });

  it("keeps the sitemap noindex special case intact", async () => {
    // Guards the untouched neighbour: the same array rewrite that regressed
    // ordering could equally drop this rule, and nothing else in CI would
    // notice.
    const resolved = await resolveHeadersFor("/sitemap-xml");
    expect(resolved.get("x-robots-tag")).toBe("noindex");
    expect(await cspFor("/sitemap-xml")).not.toContain("wasm-unsafe-eval");
  });

  it("extends the relaxed policy to /search subpaths", async () => {
    // No nested documents exist today; the rule is insurance, and this pins
    // what it is for rather than letting it imply asset coverage.
    expect(await cspFor("/search/some/nested/document")).toContain(
      WASM_TOKEN.trim(),
    );
  });

  it("places every relaxing rule after the catch-all", async () => {
    // The direct statement of the invariant, independent of the matcher
    // above: last-wins means any relaxation must FOLLOW the strict default.
    // Both relaxations are covered by one predicate rather than a list, so a
    // third one added later cannot be introduced above the catch-all without
    // this failing.
    const rules = await loadRules();
    const catchAllIndex = rules.findIndex((rule) => rule.source === "/(.*)");
    expect(catchAllIndex).toBeGreaterThanOrEqual(0);
    const relaxing = rules.filter((rule) =>
      rule.headers.some(
        ({ key, value }) =>
          key.toLowerCase() === CSP_KEY &&
          (value.includes("wasm-unsafe-eval") || value.includes(CMS_ORIGIN)),
      ),
    );
    // Non-vacuous: both relaxations must actually be present to be ordered.
    expect(relaxing.some((r) => r.source.startsWith("/search"))).toBe(true);
    expect(relaxing.some((r) => r.source.startsWith("/posts"))).toBe(true);
    for (const rule of relaxing) {
      expect(rules.indexOf(rule), rule.source).toBeGreaterThan(catchAllIndex);
    }
  });

  it("lets Contentful frame /posts and nothing else", async () => {
    // frame-ancestors carried the CMS origin on the catch-all for a long time,
    // so every published page on the site was framable by Contentful to buy
    // live preview on one route family. Both halves are asserted: preview must
    // still work, and the rest of the site must have stopped offering it.
    expect(frameAncestorsOf(await cspFor("/posts/some-post"))).toBe(
      `frame-ancestors 'self' ${CMS_ORIGIN}`,
    );
    for (const path of ["/", "/about", "/search", "/categories", "/archive"]) {
      expect(frameAncestorsOf(await cspFor(path)), path).toBe(
        "frame-ancestors 'self'",
      );
    }
  });

  it("relaxes framing on /posts by exactly the CMS origin", async () => {
    // Same shape as the wasm assertion below: the preview policy is built from
    // the same directive list, and every other directive must stay identical,
    // so a relaxation cannot ride in alongside the framing one.
    const base = await cspFor("/");
    const posts = await cspFor("/posts/some-post");
    expect(base).toBeDefined();
    expect(posts).toBeDefined();
    expect(base).not.toContain(CMS_ORIGIN);
    expect(posts!.replace(` ${CMS_ORIGIN}`, "")).toBe(base);
  });

  it("differs between base and search policies by exactly the wasm token", async () => {
    // The two policies are built from one directive list, but this catches
    // them drifting apart even if that is ever duplicated by hand: every
    // other directive must stay identical.
    const base = await cspFor("/");
    const search = await cspFor("/search");
    expect(base).toBeDefined();
    expect(search).toBeDefined();
    expect(base).not.toContain("wasm-unsafe-eval");
    expect(search!.replace(WASM_TOKEN, "")).toBe(base);
  });

  it("flags the inverted ordering when one is introduced", async () => {
    // Known-bad control, kept the way opengraph-image.font.test.tsx keeps
    // its wrong font: the live rules reordered exactly as PR #425 had them,
    // catch-all last. Asserting the resolver FAILS this input re-proves on
    // every run that the guards above can still see the defect they exist
    // for; without it, a refactor of resolveHeadersFor could go blind while
    // every other assertion stayed green.
    const rules = await loadRules();
    const catchAll = rules.find((rule) => rule.source === "/(.*)");
    expect(catchAll).toBeDefined();
    const inverted: HeaderRule[] = [
      ...rules.filter((rule) => rule !== catchAll),
      catchAll!,
    ];
    const resolvedOnSearch: Resolved = new Map();
    for (const rule of inverted) {
      if (!sourceMatches(rule.source, "/search")) continue;
      for (const { key, value } of rule.headers)
        resolvedOnSearch.set(key.toLowerCase(), value);
    }
    expect(cspOf(resolvedOnSearch)).not.toContain("wasm-unsafe-eval");

    // The same control for the framing rule, which is newer and has the same
    // failure mode: inverted, /posts loses the CMS origin and live preview
    // breaks in Contentful with a framing error naming nothing in this repo.
    const resolvedOnPost: Resolved = new Map();
    for (const rule of inverted) {
      if (!sourceMatches(rule.source, "/posts/some-post")) continue;
      for (const { key, value } of rule.headers)
        resolvedOnPost.set(key.toLowerCase(), value);
    }
    expect(cspOf(resolvedOnPost)).not.toContain(CMS_ORIGIN);
  });
});
