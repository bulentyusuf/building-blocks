// Serialise a JSON-LD object for safe injection into a <script
// type="application/ld+json"> via dangerouslySetInnerHTML. Beyond plain
// JSON.stringify, the three HTML-significant characters that could break out of
// the script element or be misread by the parser are escaped to their \uXXXX
// forms. Values come from trusted CMS data today, so this is defence-in-depth —
// but every JSON-LD block in the app must go through here so the behaviour is
// consistent rather than per-call-site.
export function jsonLdHtml(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
