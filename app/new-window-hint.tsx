// Announced by screen readers immediately after the link text, so a user knows
// the context is about to change. Visually hidden because sighted users get the
// same information from the browser opening a new tab. Kept as a component
// rather than a repeated span so the wording stays identical everywhere and can
// be localised in one place.
//
// Pagefind indexes built HTML with no browser and no accessibility tree, so
// sr-only does not keep this out of the index: without data-pagefind-ignore,
// every external link in every post body drops "(opens in a new window)"
// into the searchable text, and it lands inside excerpts near any of them.
export default function NewWindowHint() {
  return (
    <span className="sr-only" data-pagefind-ignore>
      {" "}
      (opens in a new window)
    </span>
  );
}
