import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

// app/layout.tsx is imported below for its metadata alone, but importing it
// runs its module scope, and next/font/google reaches the network there. These
// are the same stubs app/a11y.test.tsx uses and are faithful for a metadata
// read, which touches none of them.
vi.mock("server-only", () => ({}));
vi.mock("next/font/google", () => ({
  Bricolage_Grotesque: () => ({ variable: "--font-bricolage" }),
  Literata: () => ({ variable: "--font-literata" }),
}));
vi.mock("next/headers", () => ({
  draftMode: async () => ({ isEnabled: false }),
}));
vi.mock("@vercel/analytics/react", () => ({ Analytics: () => null }));
vi.mock("@vercel/speed-insights/next", () => ({ SpeedInsights: () => null }));

// The icon set is the one identity override that resolves to file paths rather
// than to a string, which changes what can go wrong with it. A wrong string
// renders wrong text; a wrong path renders no icon at all, on every surface at
// once, and looks like a broken deployment. lib/constants.ts carries why it is
// allowlisted rather than passed through.
//
// So this checks both halves: that resolution falls back rather than emitting a
// dead path, and that every set the allowlist names is actually complete on
// disk. The second half is the one a code-only test would miss — an allowlist
// entry whose directory was never committed passes every assertion about
// resolution while serving four 404s.

const ICONS_DIR = path.join(__dirname, "..", "public", "icons");
const REQUIRED_FILES = [
  "favicon.ico",
  "apple-icon.png",
  "icon-192.png",
  "icon-512.png",
];

async function loadConstants(iconSet: string | undefined) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SITE_ICON_SET", iconSet ?? "");
  return import("./constants");
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.restoreAllMocks();
});

describe("site icon set resolution", () => {
  it("defaults to the live set when nothing is configured", async () => {
    const { SITE_ICON_SET, SITE_ICONS } = await loadConstants(undefined);

    expect(SITE_ICON_SET).toBe("beuseful");
    expect(SITE_ICONS.favicon).toBe("/icons/beuseful/favicon.ico");
    expect(SITE_ICONS.apple).toBe("/icons/beuseful/apple-icon.png");
    expect(SITE_ICONS.icon192).toBe("/icons/beuseful/icon-192.png");
    expect(SITE_ICONS.icon512).toBe("/icons/beuseful/icon-512.png");
  });

  it("takes a recognised set", async () => {
    const { SITE_ICON_SET, SITE_ICONS } = await loadConstants("template");

    expect(SITE_ICON_SET).toBe("template");
    expect(SITE_ICONS.favicon).toBe("/icons/template/favicon.ico");
    expect(SITE_ICONS.icon512).toBe("/icons/template/icon-512.png");
  });

  // The known-bad control: an unrecognised name must not become a path. Without
  // the allowlist this yields /icons/tempalte/favicon.ico, which resolves to
  // nothing and takes every icon on the site down with it.
  it("falls back and warns on an unrecognised set rather than building a dead path", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { SITE_ICON_SET, SITE_ICONS } = await loadConstants("tempalte");

    expect(SITE_ICON_SET).toBe("beuseful");
    expect(SITE_ICONS.favicon).toBe("/icons/beuseful/favicon.ico");
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toContain("tempalte");
  });

  it("falls back on an empty or whitespace-only value", async () => {
    const empty = await loadConstants("");
    expect(empty.SITE_ICON_SET).toBe("beuseful");

    const blank = await loadConstants("   ");
    expect(blank.SITE_ICON_SET).toBe("beuseful");
  });
});

describe("the committed icon sets", () => {
  it("gives every allowlisted set all four files", async () => {
    // Read the allowlist out of the source rather than restating it, so adding
    // a set to lib/constants.ts without committing its art fails here.
    const source = fs.readFileSync(
      path.join(__dirname, "constants.ts"),
      "utf8",
    );
    const declared = /const ICON_SETS = \[([^\]]+)\]/.exec(source)?.[1];
    expect(declared, "ICON_SETS not found in lib/constants.ts").toBeTruthy();

    const sets = [...declared!.matchAll(/["']([^"']+)["']/g)].map((m) => m[1]);
    expect(sets.length).toBeGreaterThan(1);

    for (const set of sets) {
      for (const file of REQUIRED_FILES) {
        const full = path.join(ICONS_DIR, set, file);
        expect(fs.existsSync(full), `missing public/icons/${set}/${file}`).toBe(
          true,
        );
        expect(
          fs.statSync(full).size,
          `public/icons/${set}/${file} is empty`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("gives each set its own artwork rather than a copy of the default", () => {
    // Two sets pointing at identical bytes is a mechanism that works and does
    // nothing, which is indistinguishable from working correctly until someone
    // looks at a tab.
    const beuseful = fs.readFileSync(
      path.join(ICONS_DIR, "beuseful", "icon-512.png"),
    );
    const template = fs.readFileSync(
      path.join(ICONS_DIR, "template", "icon-512.png"),
    );

    expect(beuseful.equals(template)).toBe(false);
  });

  // The bare path some crawlers still request directly, bypassing the declared
  // links. It has to keep existing or the live site regresses to a 404 there.
  it("keeps a root favicon.ico as the legacy fallback", () => {
    const root = path.join(__dirname, "..", "public", "favicon.ico");
    expect(fs.existsSync(root), "public/favicon.ico is missing").toBe(true);
  });

  // The two file conventions this replaced. Reintroducing either puts a second
  // rel="icon" in the head alongside the declared one and the browser picks.
  it("has no app/ icon file conventions left", () => {
    for (const file of ["favicon.ico", "apple-icon.png", "icon.png"]) {
      const full = path.join(__dirname, "..", "app", file);
      expect(fs.existsSync(full), `app/${file} should not exist`).toBe(false);
    }
  });
});

// Resolving the set correctly proves nothing if a consumer still holds a
// hardcoded path, which is exactly the shape of the defect this replaced: the
// manifest and the document head each named their icons literally, in two
// places, and neither would have moved with the constant.
describe("the icon consumers read the resolved set", () => {
  it("puts the set's paths in the web manifest", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SITE_ICON_SET", "template");

    const { default: manifest } = await import("../app/manifest");
    const sources = manifest().icons?.map((icon) => icon.src) ?? [];

    expect(sources).toHaveLength(4);
    for (const src of sources) {
      expect(src).toContain("/icons/template/");
    }
  });

  it("puts the set's paths in the document head", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SITE_ICON_SET", "template");

    const { metadata } = await import("../app/layout");
    const icons = metadata.icons as Record<string, string>;

    expect(icons.icon).toBe("/icons/template/favicon.ico");
    expect(icons.shortcut).toBe("/icons/template/favicon.ico");
    expect(icons.apple).toBe("/icons/template/apple-icon.png");
  });
});
