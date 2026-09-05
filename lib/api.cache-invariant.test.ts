import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Every exported async function in lib/api.ts is cache()-wrapped, without
// exception. The invariant is a property of the fetchers, not a discipline for
// their callers, and that distinction is the whole point of this file.
//
// The bug this replaces: getAllPosts was uncached, and three prose rules in
// docs/decisions.md and lib/api.ts told call sites to route around that by
// fetching once and passing the list down. Two call sites obeyed the rule
// perfectly and still produced a double fetch, because getPostAndMorePosts
// called getAllPosts internally and PostPage called it again, and neither
// could see the other. A call-site rule cannot see composition. A wrapped
// fetcher does not need to.
//
// This is a pattern match on source, which is the guard shape that has passed
// here while the thing it guarded was broken, so it carries a known-bad control
// and a count assertion. A regex that stops matching reports zero violations
// and passes, which is exactly the failure this has to survive.

const API = join(process.cwd(), "lib/api.ts");

function uncachedExportedFetchers(source: string): string[] {
  return [...source.matchAll(/export async function (\w+)/g)].map((m) => m[1]);
}

function cacheWrappedExports(source: string): string[] {
  return [...source.matchAll(/export const (\w+) = cache\(/g)].map((m) => m[1]);
}

// The "?" test is a substring check rather than a parse. It would also fire on
// an inline object type carrying an optional property, async (opts: { limit?:
// number }), which no fetcher here has. Not worth handling, because an object
// argument defeats cache() outright anyway, a fresh literal being a fresh key
// on every call. That is a bigger problem than argument arity and belongs
// elsewhere. Do not widen this filter without settling which one you are
// fixing.
function defaultedOrOptionalFetcherParams(source: string): string[] {
  return [
    ...source.matchAll(/export const (\w+) = cache\(\s*async \(([^)]*)\)/gs),
  ]
    .filter(([, , params]) => params.includes("=") || params.includes("?"))
    .map(([, name]) => name);
}

describe("lib/api.ts fetcher caching", () => {
  const source = readFileSync(API, "utf8");

  it("exports no uncached async fetcher", () => {
    // Named rather than counted, so a failure says which one.
    expect(uncachedExportedFetchers(source)).toEqual([]);
  });

  it("still finds the wrapped exports it is meant to be checking", () => {
    // Fifteen after PR E. If a fetcher is added this fails and the author has
    // to make the same decision rather than inherit whatever they pasted. If
    // the regex goes stale this also fails, which the assertion above cannot
    // tell apart from a clean file on its own.
    expect(cacheWrappedExports(source).length).toBeGreaterThanOrEqual(15);
  });

  it("declares no defaulted or optional parameter on any fetcher", () => {
    // cache() keys on the arguments as passed, so a default or an optional
    // parameter lets two spellings of the same intent occupy two memo
    // entries. Requiring the argument is what makes tsc hold the call sites,
    // this holds the declarations.
    expect(defaultedOrOptionalFetcherParams(source)).toEqual([]);
  });
});

describe("the detectors themselves", () => {
  it("flags the shape this PR removed", () => {
    // Known-bad control, copied from getAllTags as it stood before PR E.
    const bad =
      "export async function getAllTags(isDraftMode = false): Promise<Tag[]> {";
    expect(uncachedExportedFetchers(bad)).toEqual(["getAllTags"]);
    expect(cacheWrappedExports(bad)).toEqual([]);
  });

  it("accepts the shape this PR introduces", () => {
    // The other direction. A detector that fired on the fixed form would be
    // turned off within a week.
    const good =
      "export const getAllTags = cache(async (isDraftMode = false): Promise<Tag[]> => {";
    expect(uncachedExportedFetchers(good)).toEqual([]);
    expect(cacheWrappedExports(good)).toEqual(["getAllTags"]);
  });

  it("ignores a non-async export", () => {
    // setRetryDelayForTests is exported, synchronous, and correctly unwrapped.
    // The invariant is about fetchers, and this proves the regex knows that.
    const sync =
      "export function setRetryDelayForTests(next: RetryDelay = realRetryDelay): void {";
    expect(uncachedExportedFetchers(sync)).toEqual([]);
  });

  it("flags a reintroduced default", () => {
    // Known-bad control, copied from getAllTags as it stood before PR F.
    const bad =
      "export const getAllTags = cache(async (isDraftMode = false): Promise<Tag[]> => {";
    expect(defaultedOrOptionalFetcherParams(bad)).toEqual(["getAllTags"]);
  });

  it("flags an optional parameter", () => {
    // Known-bad control: an optional parameter lets callers omit the argument
    // without triggering an '=' match, fragmenting the memo cache identically.
    const bad =
      "export const getAllTags = cache(async (isDraftMode?: boolean): Promise<Tag[]> => {";
    expect(defaultedOrOptionalFetcherParams(bad)).toEqual(["getAllTags"]);
  });

  it("accepts a required parameter", () => {
    // The other direction. A detector that fired on the fixed form would be
    // turned off within a week.
    const good =
      "export const getAllTags = cache(async (isDraftMode: boolean): Promise<Tag[]> => {";
    expect(defaultedOrOptionalFetcherParams(good)).toEqual([]);
  });
});
