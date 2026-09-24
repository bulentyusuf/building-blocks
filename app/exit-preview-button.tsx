import { exitPreviewAction } from "./exit-preview-action";

export function ExitPreviewButton() {
  return (
    <form action={exitPreviewAction} className="fixed top-20 right-5 z-40">
      <button
        type="submit"
        // Two-tone ring, like app/back-to-top.tsx; crimson would vanish on the
        // button's own fill. [→ `focus-indicator`]
        className="bg-brand-crimson text-white px-3 py-1.5 rounded-md text-sm font-bold shadow-md hover:opacity-90 transition-opacity duration-200 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-surface-dark"
      >
        Exit preview
      </button>
    </form>
  );
}
