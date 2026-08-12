// Does an asset's Contentful `title` look like a filing label rather than a
// description of the picture?
//
// This exists because the obvious guard is vacuous. `title` is required by
// Contentful, so "warn when the title is missing" can never fire — it would
// pass forever while every figure on the site rendered `alt="wages"`. That is
// exactly what happened: the whole library carried filename stems and
// generator output as titles, and nothing anywhere said so.
//
// The two shapes below are the ones the library actually contained, so this
// catches the defect that shipped rather than a hypothetical one. It is
// deliberately conservative: it answers "is this obviously not alt text", not
// "is this good alt text", because only a human looking at the image can
// answer the second and a guard that guesses would cry wolf on every upload.

// Prefixes a camera, a phone, a screenshot tool or an image generator leaves
// behind. A real description never opens with one — note that these must not
// match a legitimate title that merely mentions the medium, which is why the
// screenshot entries carry the century and "img"/"dsc"/"pxl" carry the
// separator. "A screenshot of a search results page" is a fine description and
// must not trip this.
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

// Compared with punctuation, spacing and case stripped, so "content library"
// still matches content_library.jpg and "NH-PCB" still matches NH-PCB.webp.
function normalise(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

// Only the final extension comes off, so a double-barrelled upload such as
// Trippy_Robot.jpg.png keeps the inner ".jpg" and simply fails to match —
// a miss, not a false alarm, which is the direction this errs in.
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
