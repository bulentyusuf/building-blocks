// Returns the reader to the top of the page, and moves focus with them.
//
// Both halves matter and the second is the one that looks removable. Every
// control calling this hides itself once the reader reaches the top — the
// back-to-top button goes `inert` under 600px of scroll, the home wordmark
// fades to `visibility: hidden` as the masthead comes back into view. Either
// way the element holding focus stops being focusable a moment after it was
// activated, and the browser discards focus to <body>, dropping a keyboard
// reader out of the tab order at the exact moment they used the control.
//
// #main is already tabIndex={-1} for the skip link, so it takes focus
// programmatically without adding a tab stop, and it is where a reader
// arriving at the top of the page wants to be anyway. preventScroll stops the
// focus call fighting the smooth scroll that is still running.
//
// Shared rather than duplicated, which reverses the note this used to carry in
// app/site-wordmark.tsx saying a third call site would be the moment to
// extract. Two is enough here, because the two copies would not be two similar
// components — they would be one accessibility behaviour, and the half that
// makes it accessible is the half a copy-paste drops. lib/scroll-to-top.test.ts
// guards it once for both callers.
//
// Browser-only. Never import this from a server component.
export function scrollToTop(): void {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  document.getElementById("main")?.focus({ preventScroll: true });
}
