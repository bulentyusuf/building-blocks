// Does an asset's `title` look like a filing label rather than alt text?
// `title` is required in Contentful, so checking for a missing one never fires.
// Conservative on purpose: it flags the obvious, never guesses at quality.

// Left by a camera, phone, screenshot tool or generator. Anchored tightly, so
// "A screenshot of a search page" is not caught.
const GENERATED_PREFIXES = [
  "gemini generated image",
  "screenshot 20",
  "screen shot 20",
  "screenshot_20",
  "img_",
  "dsc_",
  "pxl_",
  "untitled",
];

// Punctuation, spacing and case stripped before comparing.
function normalise(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

// Only the last extension comes off; a double extension misses rather than
// false-alarms.
export function filenameStem(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "");
}

export function isPlaceholderTitle(
  title: string | null | undefined,
  fileName?: string | null,
): boolean {
  const trimmed = title?.trim() ?? "";
  if (!trimmed) return true;

  const lower = trimmed.toLowerCase();
  if (GENERATED_PREFIXES.some((prefix) => lower.startsWith(prefix)))
    return true;

  if (fileName) {
    const stem = normalise(filenameStem(fileName));
    if (stem && stem === normalise(trimmed)) return true;
  }

  return false;
}
