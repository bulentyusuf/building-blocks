import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const root = path.resolve(__dirname, "..");
const readJson = (rel: string) =>
  JSON.parse(readFileSync(path.join(root, rel), "utf8"));

const exportData = readJson("contentful/export.json");
const seedData = readJson("contentful/seed.json");

const defaultLocale =
  (exportData.locales || []).find((l: { default?: boolean }) => l.default)
    ?.code || "en-GB";

describe("contentful export.json", () => {
  it("has content types", () => {
    expect(Array.isArray(exportData.contentTypes)).toBe(true);
    expect(exportData.contentTypes.length).toBeGreaterThan(0);
  });

  it("marks every content type for activation with publishedVersion", () => {
    // Without this, contentful-import leaves the types as drafts and the
    // GraphQL schema never exposes them. Regression guard.
    for (const ct of exportData.contentTypes) {
      expect(
        ct.sys.publishedVersion,
        `content type "${ct.sys.id}" is missing sys.publishedVersion`,
      ).toBeTypeOf("number");
    }
  });

  it("ships every content type the post query asks for", () => {
    // The export backs the forkable-template story, so a type added to the
    // space but not to the export leaves a fork with a schema the query cannot
    // run against — an inline fragment on an absent type is a GraphQL error,
    // which fails every post query rather than just the affected field. Sidenote
    // shipped that way and this is the guard that would have caught it.
    const query = readFileSync(path.join(root, "lib/api.ts"), "utf8");
    const referenced = [
      ...new Set([...query.matchAll(/\.\.\. on ([A-Z]\w*)/g)].map((m) => m[1])),
    ];
    expect(referenced.length).toBeGreaterThan(0);

    const ids = new Set(
      exportData.contentTypes.map((ct: { sys: { id: string } }) => ct.sys.id),
    );
    for (const name of referenced) {
      // GraphQL type names are PascalCase; content type ids are camelCase.
      const id = name[0].toLowerCase() + name.slice(1);
      expect(
        ids.has(id),
        `lib/api.ts queries "... on ${name}" but export.json has no "${id}" content type`,
      ).toBe(true);
    }
  });

  it("ships every field the query fragments select", () => {
    // Sibling of the inline-fragment guard above, for the other half of the
    // same defect. That one only sees "... on X", so it catches a missing
    // TYPE and is blind to a missing FIELD — and Contentful rejects both the
    // same way, with a 400 that fails the whole query rather than the one
    // selection. Adding tagsCollection to LIST_GRAPHQL_FIELDS while a space
    // still lacked the field took the demo deployment down exactly this way,
    // and every test here passed.
    const source = readFileSync(path.join(root, "lib/api.ts"), "utf8");

    // Which content type each fragment is selected against.
    const fragments: Record<string, string> = {
      POST_GRAPHQL_FIELDS: "post",
      CARD_GRAPHQL_FIELDS: "post",
      LIST_GRAPHQL_FIELDS: "post",
      PAGE_GRAPHQL_FIELDS: "page",
    };

    for (const [constant, typeId] of Object.entries(fragments)) {
      const body = source.match(
        new RegExp(`const ${constant} = \`([\\s\\S]*?)\``),
      )?.[1];
      expect(body, `lib/api.ts has no ${constant}`).toBeTruthy();

      // Top-level selections only: anything indented further belongs to a
      // nested type, which this guard deliberately does not follow.
      const selected = [...body!.matchAll(/^ {2}([a-zA-Z_]\w*)/gm)].map(
        (m) => m[1],
      );

      const contentType = exportData.contentTypes.find(
        (ct: { sys: { id: string } }) => ct.sys.id === typeId,
      );
      expect(contentType, `export.json has no "${typeId}" type`).toBeTruthy();
      const fieldIds = new Set(
        contentType.fields.map((f: { id: string }) => f.id),
      );

      for (const selection of selected) {
        // `sys` is a GraphQL built-in, not a content-type field. Contentful
        // names an Array field's collection `<field>Collection`, so strip the
        // suffix before looking the field up.
        if (selection === "sys") continue;
        const fieldId = selection.replace(/Collection$/, "");
        expect(
          fieldIds.has(fieldId),
          `${constant} selects "${selection}" but export.json's "${typeId}" has no "${fieldId}" field`,
        ).toBe(true);
      }
    }
  });

  it("gives every content type an editor interface", () => {
    const ids = exportData.contentTypes.map(
      (ct: { sys: { id: string } }) => ct.sys.id,
    );
    const withInterface = new Set(
      (exportData.editorInterfaces || []).map(
        (ei: { sys: { contentType: { sys: { id: string } } } }) =>
          ei.sys.contentType.sys.id,
      ),
    );
    for (const id of ids) {
      expect(
        withInterface.has(id),
        `content type "${id}" has no editor interface`,
      ).toBe(true);
    }
  });

  it("keeps the authors field's size cap in step with MAX_AUTHORS", async () => {
    // The Contentful validation and lib/api.ts's authorsCollection(limit)
    // have no relationship the API enforces — the fragment already
    // interpolates MAX_AUTHORS, so this is the other half: a silent mismatch
    // with the CMS validation is the failure mode with no error message
    // anywhere, the same trap as tagsCollection(limit: 3).
    const { MAX_AUTHORS } = await import("./constants");
    const post = exportData.contentTypes.find(
      (ct: { sys: { id: string } }) => ct.sys.id === "post",
    );
    const authorsField = post.fields.find(
      (f: { id: string }) => f.id === "authors",
    );
    expect(authorsField, 'post has no "authors" field').toBeTruthy();
    const size = authorsField.validations.find(
      (v: { size?: { max?: number } }) => v.size,
    )?.size;
    expect(size?.max).toBe(MAX_AUTHORS);
    // No minimum: PR 437's export.json once shipped min: 1 on the
    // contributors field, which fails validation whenever an editor empties
    // an optional array rather than nulling it.
    expect(size?.min).toBeUndefined();
  });
});

describe("contentful seed.json", () => {
  it("has at least one asset and some entries", () => {
    expect(Array.isArray(seedData.assets)).toBe(true);
    expect(seedData.assets.length).toBeGreaterThan(0);
    expect(Array.isArray(seedData.entries)).toBe(true);
    expect(seedData.entries.length).toBeGreaterThan(0);
  });

  it("uses url and never upload for asset files", () => {
    // contentful-import validates asset files against url. An upload key
    // aborts the whole import. Regression guard.
    for (const asset of seedData.assets) {
      const file = asset.fields?.file?.[defaultLocale];
      expect(
        file,
        `asset "${asset.sys.id}" has no file for ${defaultLocale}`,
      ).toBeTruthy();
      expect(
        file.url,
        `asset "${asset.sys.id}" file is missing url`,
      ).toBeTypeOf("string");
      expect(
        "upload" in file,
        `asset "${asset.sys.id}" still uses upload`,
      ).toBe(false);
    }
  });

  it("marks assets and entries for publishing with publishedVersion", () => {
    // Otherwise seed content imports as drafts and the public site is empty.
    for (const asset of seedData.assets) {
      expect(
        asset.sys.publishedVersion,
        `asset "${asset.sys.id}" is missing sys.publishedVersion`,
      ).toBeTypeOf("number");
    }
    for (const entry of seedData.entries) {
      expect(
        entry.sys.publishedVersion,
        `entry "${entry.sys.id}" is missing sys.publishedVersion`,
      ).toBeTypeOf("number");
    }
  });

  it("only seeds entries whose content type the export ships", () => {
    const ids = new Set(
      exportData.contentTypes.map((ct: { sys: { id: string } }) => ct.sys.id),
    );
    for (const entry of seedData.entries) {
      const type = entry.sys?.contentType?.sys?.id;
      expect(
        ids.has(type),
        `entry "${entry.sys.id}" has content type "${type}", which export.json does not ship`,
      ).toBe(true);
    }
  });

  it("resolves every entry and asset embedded in seed rich text", () => {
    // A dangling link imports without complaint and then renders as nothing,
    // so the template looks broken in a way no import error explains.
    const entryIds = new Set(
      seedData.entries.map((e: { sys: { id: string } }) => e.sys.id),
    );
    const assetIds = new Set(
      seedData.assets.map((a: { sys: { id: string } }) => a.sys.id),
    );

    const dangling: string[] = [];
    const walk = (node: unknown, from: string) => {
      if (Array.isArray(node)) {
        for (const child of node) walk(child, from);
        return;
      }
      if (!node || typeof node !== "object") return;
      const record = node as Record<string, unknown>;
      const nodeType = record.nodeType;
      if (typeof nodeType === "string" && nodeType.includes("embedded-")) {
        const target = (
          record.data as {
            target?: { sys?: { id?: string; linkType?: string } };
          }
        )?.target?.sys;
        const pool = target?.linkType === "Asset" ? assetIds : entryIds;
        if (!target?.id || !pool.has(target.id)) {
          dangling.push(`${from} -> ${target?.linkType} ${target?.id}`);
        }
      }
      for (const value of Object.values(record)) walk(value, from);
    };

    for (const entry of seedData.entries) {
      walk(entry.fields, `entry "${entry.sys.id}"`);
    }
    expect(dangling, `dangling embeds: ${dangling.join(", ")}`).toEqual([]);
  });
});

// Walk every node of a seeded rich-text document, so the assertions below can
// read the parsed tree rather than matching strings in the JSON.
type RichTextNode = {
  nodeType?: string;
  value?: string;
  marks?: unknown[];
  data?: { target?: { sys?: { id?: string } } };
  content?: RichTextNode[];
};

function* walkNodes(node: RichTextNode | undefined): Generator<RichTextNode> {
  if (!node) return;
  yield node;
  for (const child of node.content ?? []) yield* walkNodes(child);
}

const seedEntries: {
  sys: { id: string; contentType: { sys: { id: string } } };
  fields: Record<string, Record<string, unknown>>;
}[] = seedData.entries;

const seedPosts = seedEntries.filter(
  (e) => e.sys.contentType.sys.id === "post",
);
const postBodies = seedPosts.map(
  (p) => p.fields.content?.[defaultLocale] as RichTextNode | undefined,
);
const allBodyNodes = postBodies.flatMap((body) => [...walkNodes(body)]);
const countIn = (body: RichTextNode | undefined, nodeType: string) =>
  [...walkNodes(body)].filter((n) => n.nodeType === nodeType).length;

describe("contentful seed generator", () => {
  it("has a seed.json that matches what build-seed.mjs produces", () => {
    // These drifted: seed.json carried the sidenote-example entry and an
    // inline embed in post-first that build-seed.mjs never emitted, so running
    // the generator silently deleted both. Nothing else in the suite noticed,
    // because the committed JSON was self-consistent. Regenerate into a temp
    // file and deep-compare. execFileSync rather than importing the .mjs from
    // TypeScript, which would need allowJs for no benefit.
    const out = path.join(
      mkdtempSync(path.join(os.tmpdir(), "seed-")),
      "seed.json",
    );
    execFileSync("node", [path.join(root, "contentful/build-seed.mjs"), out], {
      cwd: root,
    });
    expect(JSON.parse(readFileSync(out, "utf8"))).toEqual(seedData);
  });
});

describe("contentful seed feature coverage", () => {
  // Each assertion stands for a feature a fresh fork could not see working,
  // because nothing in the seed exercised it.

  it("gives at least one post enough H2s to render a table of contents", () => {
    // app/table-of-contents.tsx returns null below three headings, so a seed
    // with one H2 per post demonstrates the TOC by never rendering it.
    expect(
      Math.max(...postBodies.map((b) => countIn(b, "heading-2"))),
    ).toBeGreaterThanOrEqual(3);
  });

  it("keeps one post below the heading threshold as the control case", () => {
    expect(postBodies.some((b) => countIn(b, "heading-2") === 0)).toBe(true);
  });

  it("embeds a sidenote inline in a post body", () => {
    // The inline embed and its target entry are what regeneration used to eat.
    const targets = allBodyNodes
      .filter((n) => n.nodeType === "embedded-entry-inline")
      .map((n) => n.data?.target?.sys?.id);

    expect(targets.length).toBeGreaterThan(0);
    for (const id of targets) {
      const target = seedEntries.find((e) => e.sys.id === id);
      expect(
        target,
        `inline embed targets unseeded entry "${id}"`,
      ).toBeTruthy();
      expect(target!.sys.contentType.sys.id).toBe("sidenote");
    }
  });

  it("sets updatedDate on at least one post", () => {
    // Otherwise the "Published / Updated" line never renders on a fresh fork.
    expect(seedPosts.some((p) => p.fields.updatedDate)).toBe(true);
  });

  it("contains a hyperlink in a post body", () => {
    // Exercises renderHyperlink: scheme allowlisting, the external-link
    // treatment and the new-window hint.
    expect(allBodyNodes.some((n) => n.nodeType === "hyperlink")).toBe(true);
  });

  it("carries at least one text mark", () => {
    expect(
      allBodyNodes.some(
        (n) => n.nodeType === "text" && (n.marks?.length ?? 0) > 0,
      ),
    ).toBe(true);
  });

  it("has at least one seed entry for every content type in export.json", () => {
    // The converse of "only seeds entries whose content type the export ships":
    // a type in the schema that nothing seeds is a feature a forker cannot see.
    const seeded = new Set(seedEntries.map((e) => e.sys.contentType.sys.id));
    for (const ct of exportData.contentTypes) {
      expect(
        seeded.has(ct.sys.id),
        `content type "${ct.sys.id}" has no entry in seed.json`,
      ).toBe(true);
    }
  });
});
