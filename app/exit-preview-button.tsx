import { exitPreviewAction } from "./exit-preview-action";

export function ExitPreviewButton() {
  return (
    <form action={exitPreviewAction} className="fixed top-20 right-5 z-40">
      <button
        type="submit"
        // Two-tone focus ring, for the same reason app/back-to-top.tsx has
        // one: this is a position:fixed control, so its indicator floats over
        // whatever the reader has scrolled to. The base crimson outline was
        // also the button's own fill — 1:1 against it, visible only where the
        // 2px offset happened to fall on the page behind. White ring on a
        // surface-dark offset keeps one tone legible on any ground.
        className="bg-brand-crimson text-white px-3 py-1.5 rounded-md text-sm font-bold shadow-md hover:opacity-90 transition-opacity duration-200 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-surface-dark"
      >
        Exit preview
      </button>
    </form>
  );
}
