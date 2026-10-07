// Builds the Pagefind index from the prerendered HTML. [→ `pagefind-ui`]
// Since Next 16.3.8, builds run with an adapter (Vercel's) write that HTML to
// .next/server/route-cache/APP_PAGE/<hash>/$/<route>.html instead of
// .next/server/app/<route>.html, so `pagefind --site` found nothing there.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SERVER_DIR = ".next/server";
const ROOTS = [
  path.join(SERVER_DIR, "route-cache", "APP_PAGE"),
  path.join(SERVER_DIR, "app"),
];

// The path Pagefind would have seen under the old `--site .next/server/app`,
// so result URLs stay exactly as they were.
export function sourcePathFor(file) {
  const rel = path.relative(SERVER_DIR, file).split(path.sep).join("/");
  if (rel.startsWith("route-cache/")) {
    const marker = rel.indexOf("/$/");
    if (marker === -1) throw new Error(`Unrecognised route-cache path: ${rel}`);
    return rel.slice(marker + 3);
  }
  if (rel.startsWith("app/")) return rel.slice("app/".length);
  throw new Error(`HTML outside the known build layouts: ${rel}`);
}

async function htmlFiles(dir) {
  const entries = await readdir(dir, {
    recursive: true,
    withFileTypes: true,
  }).catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
    .map((entry) => path.join(entry.parentPath, entry.name));
}

async function main() {
  const files = new Map();
  for (const root of ROOTS) {
    for (const file of await htmlFiles(root)) {
      const sourcePath = sourcePathFor(file);
      if (!files.has(sourcePath)) files.set(sourcePath, file);
    }
  }
  if (files.size === 0) {
    throw new Error(
      `No prerendered HTML under ${SERVER_DIR}; search would ship empty.`,
    );
  }

  const pagefind = await import("pagefind");
  const { index, errors } = await pagefind.createIndex();
  if (!index) throw new Error(errors.join("\n"));
  for (const [sourcePath, file] of files) {
    const { errors: fileErrors } = await index.addHTMLFile({
      sourcePath,
      content: await readFile(file, "utf8"),
    });
    if (fileErrors.length > 0) throw new Error(fileErrors.join("\n"));
  }
  const { errors: writeErrors } = await index.writeFiles({
    outputPath: "public/pagefind",
  });
  if (writeErrors.length > 0) throw new Error(writeErrors.join("\n"));
  await pagefind.close();
  console.log(`Pagefind: indexed ${files.size} prerendered pages.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
