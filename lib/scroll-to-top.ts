// Scrolls to top and moves focus to #main. The focus half is not removable:
// both callers hide themselves at the top, so focus would drop to <body>.
// Browser-only.
export function scrollToTop(): void {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  document.getElementById("main")?.focus({ preventScroll: true });
}
